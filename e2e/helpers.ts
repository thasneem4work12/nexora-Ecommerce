import path from "path";
import fs from "fs";
import { Browser, BrowserContext } from "@playwright/test";

export const PILOT_AUTH_PATH = path.join(__dirname, "..", "playwright", ".auth", "pilot-session.json");

/**
 * Clears all user session and authentication cookies while preserving
 * the pilot perimeter access gate cookie (nexora_pilot_session).
 */
export async function clearAuthCookies(context: BrowserContext): Promise<void> {
  await context.clearCookies({ name: /^(?!nexora_pilot_session$).*$/ });
}

/**
 * Creates a browser context pre-loaded with the pilot perimeter access session.
 */
export async function createPilotContext(
  browser: Browser,
  options: Parameters<Browser["newContext"]>[0] = {}
): Promise<BrowserContext> {
  const hasPilotSession = fs.existsSync(PILOT_AUTH_PATH);
  return await browser.newContext({
    storageState: hasPilotSession ? PILOT_AUTH_PATH : undefined,
    ...options,
  });
}
