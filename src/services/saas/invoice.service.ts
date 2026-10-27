import { prisma } from "@/lib/prisma";
import { Prisma, SaaSInvoiceStatus, SaaSPaymentStatus } from "@prisma/client";

export interface CreateInvoiceLineInput {
  description: string;
  quantity?: number;
  unitAmountInCents: number;
  totalAmountInCents: number;
  currency?: string;
  priceId?: string;
}

export interface CreateInvoiceInput {
  businessId: string;
  subscriptionId: string;
  billingPeriodStartsAt: Date;
  billingPeriodEndsAt: Date;
  dueDate?: Date;
  subtotalInCents: number;
  taxInCents?: number;
  discountInCents?: number;
  totalInCents: number;
  currency?: string;
  notes?: string;
  lines: CreateInvoiceLineInput[];
}

export function generateInvoiceNumber(businessSlug?: string): string {
  const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, "");
  const randomSuffix = Math.floor(1000 + Math.random() * 9000);
  const prefix = businessSlug ? businessSlug.slice(0, 4).toUpperCase() : "NXRA";
  return `INV-SAAS-${dateStr}-${prefix}-${randomSuffix}`;
}

export function generatePaymentNumber(): string {
  const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, "");
  const randomSuffix = Math.floor(1000 + Math.random() * 9000);
  return `PAY-SAAS-${dateStr}-${randomSuffix}`;
}

export async function createSaaSInvoice(data: CreateInvoiceInput) {
  // Financial arithmetic integrity checks
  const linesTotal = data.lines.reduce((acc, line) => acc + line.totalAmountInCents, 0);
  if (linesTotal !== data.subtotalInCents) {
    throw new Error(
      `Invoice arithmetic error: line items sum (${linesTotal} cents) does not match subtotal (${data.subtotalInCents} cents).`
    );
  }

  const tax = data.taxInCents ?? 0;
  const discount = data.discountInCents ?? 0;
  const expectedTotal = data.subtotalInCents + tax - discount;
  if (expectedTotal !== data.totalInCents) {
    throw new Error(
      `Invoice arithmetic error: calculated total (${expectedTotal} cents) does not match totalInCents (${data.totalInCents} cents).`
    );
  }

  const business = await prisma.business.findUnique({
    where: { id: data.businessId },
    select: { slug: true },
  });

  const invoiceNumber = generateInvoiceNumber(business?.slug);
  const dueDate = data.dueDate || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

  return prisma.saaSInvoice.create({
    data: {
      invoiceNumber,
      businessId: data.businessId,
      subscriptionId: data.subscriptionId,
      status: SaaSInvoiceStatus.OPEN,
      billingPeriodStartsAt: data.billingPeriodStartsAt,
      billingPeriodEndsAt: data.billingPeriodEndsAt,
      subtotalInCents: data.subtotalInCents,
      taxInCents: data.taxInCents ?? 0,
      discountInCents: data.discountInCents ?? 0,
      totalInCents: data.totalInCents,
      currency: data.currency ?? "USD",
      dueDate,
      notes: data.notes,
      lines: {
        create: data.lines.map((line) => ({
          description: line.description,
          quantity: line.quantity ?? 1,
          unitAmountInCents: line.unitAmountInCents,
          totalAmountInCents: line.totalAmountInCents,
          currency: line.currency ?? (data.currency || "USD"),
          priceId: line.priceId,
        })),
      },
    },
    include: {
      lines: true,
      subscription: {
        include: { plan: true },
      },
      business: true,
    },
  });
}

export async function recordSaaSPayment(params: {
  invoiceId: string;
  subscriptionId: string;
  businessId: string;
  amountInCents: number;
  currency?: string;
  provider?: string;
  providerPaymentId?: string;
  status?: SaaSPaymentStatus;
  metadata?: Record<string, unknown>;
}) {
  const paymentNumber = generatePaymentNumber();
  const now = new Date();
  const status = params.status ?? SaaSPaymentStatus.SUCCEEDED;

  return prisma.$transaction(async (tx) => {
    const payment = await tx.saaSPayment.create({
      data: {
        paymentNumber,
        subscriptionId: params.subscriptionId,
        invoiceId: params.invoiceId,
        businessId: params.businessId,
        provider: params.provider ?? "SIMULATED",
        providerPaymentId: params.providerPaymentId,
        amountInCents: params.amountInCents,
        currency: params.currency ?? "USD",
        status,
        paidAt: status === SaaSPaymentStatus.SUCCEEDED ? now : null,
        metadata: params.metadata as Prisma.InputJsonValue | undefined,
      },
    });

    if (status === SaaSPaymentStatus.SUCCEEDED) {
      await tx.saaSInvoice.update({
        where: { id: params.invoiceId },
        data: {
          status: SaaSInvoiceStatus.PAID,
          paidAt: now,
        },
      });
    } else if (status === SaaSPaymentStatus.FAILED) {
      await tx.saaSInvoice.update({
        where: { id: params.invoiceId },
        data: {
          status: SaaSInvoiceStatus.UNCOLLECTIBLE,
        },
      });
    }

    return payment;
  });
}

export async function getBusinessInvoices(businessId: string) {
  return prisma.saaSInvoice.findMany({
    where: { businessId },
    include: {
      lines: true,
      payments: true,
      subscription: {
        include: { plan: true },
      },
    },
    orderBy: { createdAt: "desc" },
  });
}

export async function getInvoiceById(invoiceId: string, businessId?: string) {
  const where: { id: string; businessId?: string } = { id: invoiceId };
  if (businessId) {
    where.businessId = businessId;
  }

  return prisma.saaSInvoice.findFirst({
    where,
    include: {
      lines: true,
      payments: true,
      subscription: {
        include: { plan: true },
      },
      business: true,
    },
  });
}
