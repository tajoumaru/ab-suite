// Userscript GM API type declarations

declare global {
  // GM APIs
  function GM_addStyle(css: string): HTMLStyleElement;
  function GM_setValue(key: string, value: unknown): void;
  function GM_getValue(key: string, defaultValue?: unknown): unknown;
  function GM_xmlhttpRequest(details: {
    method?: string;
    url: string;
    headers?: Record<string, string>;
    data?: string;
    onload?: (response: {
      status: number;
      statusText: string;
      responseText: string;
      response: unknown;
      responseHeaders: string;
      finalUrl: string;
    }) => void;
    onerror?: () => void;
    ontimeout?: () => void;
  }): void;

  // Other userscript globals
  const unsafeWindow: Window & typeof globalThis;
}

export {};
