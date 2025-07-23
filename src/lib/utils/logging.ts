import { settingsStore } from "@/lib/state/settings";

/**
 * Debug logging function that only logs when debug logging is enabled in settings
 * Use this to replace console.log calls
 */
// biome-ignore lint/suspicious/noExplicitAny: any by design
export function log(...args: any[]): void {
  if (settingsStore.debugLoggingEnabled) {
    console.log("%c[AB Suite]", "color: #ee0e6a", ...args);
  }
}

/**
 * Debug warning function
 */
// biome-ignore lint/suspicious/noExplicitAny: any by design
export function warn(...args: any[]): void {
  console.warn("%c[AB Suite]", "color: #ee0e6a", ...args);
}

/**
 * Debug error function
 */
// biome-ignore lint/suspicious/noExplicitAny: any by design
export function err(...args: any[]): void {
  console.error("%c[AB Suite]", "color: #ee0e6a", ...args);
}

const timers = new Map<string, number>();

/**
 * Starts a custom, named timer.
 * @param label A name for the timer.
 */
export function time(label: string): void {
  // Store the start time using high-resolution performance.now()
  timers.set(label, performance.now());
}

/**
 * Ends a custom, named timer and logs the duration with the styled prefix.
 * @param label The name of the timer to end. Must match a previous call to time().
 */
export function timeEnd(label: string): void {
  const startTime = timers.get(label);

  if (startTime === undefined) {
    console.warn(`Timer '${label}' was never started.`);
    return;
  }

  const endTime = performance.now();
  const duration = endTime - startTime;

  // Only log if debug logging is enabled
  if (settingsStore.debugLoggingEnabled) {
    console.log("%c[AB Suite]", "color: #ee0e6a", `${label}: ${duration.toFixed(3)}ms`);
  }

  // Clean up the timer to prevent memory leaks
  timers.delete(label);
}
