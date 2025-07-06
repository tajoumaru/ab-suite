import { settingsStore } from "@/stores/settings";

/**
 * Debug logging function that only logs when debug logging is enabled in settings
 * Use this to replace console.log calls
 */
// biome-ignore lint/suspicious/noExplicitAny: any by design
export function log(...args: any[]): void {
  if (settingsStore.debugLoggingEnabled) {
    console.log("AB Suite:", ...args);
  }
}

/**
 * Debug logging function that only logs when debug logging is enabled in settings
 * Use this to replace console.time/console.timeEnd calls
 */
export function logTime(label: string): void {
  if (settingsStore.debugLoggingEnabled) {
    console.time(`AB Suite: ${label}`);
  }
}

export function logTimeEnd(label: string): void {
  if (settingsStore.debugLoggingEnabled) {
    console.timeEnd(`AB Suite: ${label}`);
  }
}
