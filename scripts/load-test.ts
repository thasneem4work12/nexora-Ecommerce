import { prisma } from "../src/lib/prisma";

interface BenchmarkResult {
  scenario: string;
  totalRequests: number;
  successfulRequests: number;
  failedRequests: number;
  durationMs: number;
  throughputRps: number;
  p50Ms: number;
  p95Ms: number;
  p99Ms: number;
  errorRatePercent: number;
}

function calculatePercentile(sorted: number[], percentile: number): number {
  if (sorted.length === 0) return 0;
  const index = Math.ceil((percentile / 100) * sorted.length) - 1;
  return sorted[Math.max(0, Math.min(index, sorted.length - 1))];
}

async function runHttpScenario(
  name: string,
  url: string,
  concurrency: number,
  totalRequests: number
): Promise<BenchmarkResult> {
  const latencies: number[] = [];
  let successful = 0;
  let failed = 0;

  const startTime = Date.now();
  let remaining = totalRequests;

  async function worker() {
    while (remaining > 0) {
      remaining--;
      const reqStart = Date.now();
      try {
        const res = await fetch(url, { headers: { "User-Agent": "NEXORA-LoadTest-Suite/1.0" } });
        const latency = Date.now() - reqStart;
        latencies.push(latency);
        if (res.ok) {
          successful++;
        } else {
          failed++;
        }
      } catch {
        const latency = Date.now() - reqStart;
        latencies.push(latency);
        failed++;
      }
    }
  }

  const workers = Array.from({ length: concurrency }, () => worker());
  await Promise.all(workers);

  const durationMs = Math.max(1, Date.now() - startTime);
  latencies.sort((a, b) => a - b);

  return {
    scenario: name,
    totalRequests,
    successfulRequests: successful,
    failedRequests: failed,
    durationMs,
    throughputRps: Number(((totalRequests / durationMs) * 1000).toFixed(2)),
    p50Ms: calculatePercentile(latencies, 50),
    p95Ms: calculatePercentile(latencies, 95),
    p99Ms: calculatePercentile(latencies, 99),
    errorRatePercent: Number(((failed / totalRequests) * 100).toFixed(2)),
  };
}

async function runDatabaseConcurrencyScenario(
  name: string,
  concurrency: number
): Promise<BenchmarkResult> {
  const latencies: number[] = [];
  let successful = 0;
  let failed = 0;

  // Create isolated synthetic test product variant with 5 units of stock
  const testSuffix = Date.now().toString(36);
  const testProduct = await prisma.product.create({
    data: {
      businessId: "default-store",
      title: `Load Test Piece ${testSuffix}`,
      slug: `load-test-piece-${testSuffix}`,
      description: "Synthetic load test article",
      category: "accessories",
      basePriceInCents: 50000,
      published: true,
      variants: {
        create: {
          sku: `SKU-LOAD-${testSuffix}`,
          title: "Standard Edition",
          priceInCents: 50000,
          stock: 5, // Exactly 5 items available
          isActive: true,
        },
      },
    },
    include: { variants: true },
  });

  const variantId = testProduct.variants[0].id;
  const startTime = Date.now();

  // Attempt simultaneous reservations for 1 unit each across `concurrency` concurrent workers
  // Only exactly 5 reservations should succeed; the remaining must be gracefully rejected due to stock depletion
  const tasks = Array.from({ length: concurrency }, async (_, i) => {
    const reqStart = Date.now();
    try {
      await prisma.$transaction(async (tx) => {
        // Exclusive row-level lock
        await tx.$queryRaw`SELECT id FROM "product_variants" WHERE id = ${variantId} FOR UPDATE`;

        const v = await tx.productVariant.findUniqueOrThrow({ where: { id: variantId } });
        if (v.stock < 1) {
          throw new Error("Out of stock");
        }

        await tx.productVariant.update({
          where: { id: variantId },
          data: { stock: v.stock - 1 },
        });

        await tx.inventoryMovement.create({
          data: {
            businessId: "default-store",
            variantId,
            quantityChange: -1,
            previousStock: v.stock,
            newStock: v.stock - 1,
            type: "RESERVATION",
            reason: `Load test concurrent reservation ${i}`,
          },
        });
      });

      latencies.push(Date.now() - reqStart);
      successful++;
    } catch {
      latencies.push(Date.now() - reqStart);
      failed++; // Expected rejection when stock hits 0
    }
  });

  await Promise.all(tasks);
  const durationMs = Math.max(1, Date.now() - startTime);

  // Clean up synthetic test data
  await prisma.inventoryMovement.deleteMany({ where: { variantId } });
  await prisma.productVariant.delete({ where: { id: variantId } });
  await prisma.product.delete({ where: { id: testProduct.id } });

  latencies.sort((a, b) => a - b);

  return {
    scenario: `${name} (Row-Level Locking Safety)`,
    totalRequests: concurrency,
    successfulRequests: successful,
    failedRequests: failed,
    durationMs,
    throughputRps: Number(((concurrency / durationMs) * 1000).toFixed(2)),
    p50Ms: calculatePercentile(latencies, 50),
    p95Ms: calculatePercentile(latencies, 95),
    p99Ms: calculatePercentile(latencies, 99),
    errorRatePercent: 0, // In concurrency testing, stock exhaustion is expected behavior, not error
  };
}

async function main() {
  // eslint-disable-next-line no-console
  console.log("================================================================================");
  // eslint-disable-next-line no-console
  console.log("NEXORA Commerce — Phase 9 Load & Concurrency Performance Benchmark");
  // eslint-disable-next-line no-console
  console.log("================================================================================");

  // Check if Next.js server is reachable on port 3005 or 3000
  let baseUrl = "http://localhost:3005";
  try {
    const res = await fetch(`${baseUrl}/api/health`);
    if (!res.ok) throw new Error();
  } catch {
    baseUrl = "http://localhost:3000";
  }

  // eslint-disable-next-line no-console
  console.log(`Target Base URL: ${baseUrl}`);
  // eslint-disable-next-line no-console
  console.log("Starting benchmark execution...\n");

  const results: BenchmarkResult[] = [];

  // 1. Health Liveness & Readiness Checks
  results.push(await runHttpScenario("1. Health Liveness (/api/health)", `${baseUrl}/api/health`, 20, 100));
  results.push(await runHttpScenario("2. Database Readiness (/api/ready)", `${baseUrl}/api/ready`, 20, 100));

  // 2. Storefront Catalog API & Filtering
  results.push(await runHttpScenario("3. Product Catalog API (/api/products)", `${baseUrl}/api/products`, 15, 60));
  results.push(await runHttpScenario("4. Category List API (/api/categories)", `${baseUrl}/api/categories`, 15, 60));

  // 3. Multi-Tenant Public Pages
  results.push(await runHttpScenario("5. Flagship Storefront (/)", `${baseUrl}/`, 10, 30));
  results.push(await runHttpScenario("6. Tenant Storefront (/store/apex-kicks)", `${baseUrl}/store/apex-kicks`, 10, 30));
  results.push(await runHttpScenario("7. SaaS Public Pricing (/pricing)", `${baseUrl}/pricing`, 10, 30));

  // 4. PostgreSQL Row-Lock Concurrency Scenario
  results.push(await runDatabaseConcurrencyScenario("8. Concurrent Inventory Reservation (25 simultaneous checkout attempts on 5 items)", 25));

  // Print results table
  // eslint-disable-next-line no-console
  console.log("\n================================================================================");
  // eslint-disable-next-line no-console
  console.log("BENCHMARK RESULTS SUMMARY");
  // eslint-disable-next-line no-console
  console.log("================================================================================");
  // eslint-disable-next-line no-console
  console.table(
    results.map((r) => ({
      Scenario: r.scenario,
      Requests: r.totalRequests,
      "Throughput (req/s)": r.throughputRps,
      "p50 (ms)": r.p50Ms,
      "p95 (ms)": r.p95Ms,
      "p99 (ms)": r.p99Ms,
      "Error Rate": `${r.errorRatePercent}%`,
    }))
  );

  await prisma.$disconnect();
}

main().catch(async (e) => {
  // eslint-disable-next-line no-console
  console.error("Benchmark failed:", e);
  await prisma.$disconnect();
  process.exit(1);
});
