// Userscript GM API type declarations

declare global {
  // GM APIs
  function GM_addStyle(css: string): HTMLStyleElement;
  function GM_deleteValue(key: string): void;
  function GM_listValues(): string[];
  function GM_setValue(key: string, value: unknown): void;
  function GM_getValue(key: string, defaultValue?: unknown): unknown;
  function GM_addValueChangeListener(
    key: string,
    listener: (key: string, oldValue: unknown, newValue: unknown, remote: boolean) => void,
  ): number;
  function GM_removeValueChangeListener(listenerId: number): void;
  function GM_getResourceText(resourceName: string): string;
  function GM_getResourceURL(resourceName: string): string;
  function GM_log(message: string): void;
  function GM_notification(
    details:
      | string
      | {
          text: string;
          title?: string;
          image?: string;
          highlight?: boolean;
          silent?: boolean;
          timeout?: number;
          url?: string;
          onclick?: () => void;
          ondone?: () => void;
        },
    ondone?: () => void,
  ): void;
  function GM_openInTab(
    url: string,
    options?:
      | boolean
      | {
          active?: boolean;
          insert?: boolean;
          setParent?: boolean;
        },
  ): void;
  function GM_registerMenuCommand(caption: string, commandFunc: () => void, accessKey?: string): number;
  function GM_unregisterMenuCommand(menuCmdId: number): void;
  function GM_setClipboard(data: string, info?: string | { type?: string; mimetype?: string }): void;
  function GM_xmlhttpRequest(details: {
    method?: "GET" | "POST" | "HEAD";
    url: string;
    headers?: Record<string, string>;
    data?: string;
    binary?: boolean;
    nocache?: boolean;
    revalidate?: boolean;
    timeout?: number;
    context?: unknown;
    responseType?: "arraybuffer" | "blob" | "json";
    overrideMimeType?: string;
    anonymous?: boolean;
    fetch?: boolean;
    user?: string;
    password?: string;
    onload?: (response: {
      status: number;
      statusText: string;
      responseText: string;
      response: unknown;
      responseHeaders: string;
      finalUrl: string;
    }) => void;
    onerror?: (response: {
      status: number;
      statusText: string;
      responseText: string;
      response: unknown;
      responseHeaders: string;
      finalUrl: string;
    }) => void;
    ontimeout?: () => void;
    onloadstart?: (response: {
      status: number;
      statusText: string;
      responseText: string;
      response: unknown;
      responseHeaders: string;
      finalUrl: string;
    }) => void;
    onprogress?: (response: { lengthComputable: boolean; loaded: number; total: number }) => void;
    onreadystatechange?: (response: {
      readyState: number;
      status: number;
      statusText: string;
      responseText: string;
      response: unknown;
      responseHeaders: string;
      finalUrl: string;
    }) => void;
  }): {
    abort: () => void;
  };
  function GM_download(
    details:
      | string
      | {
          url: string;
          name: string;
          headers?: Record<string, string>;
          saveAs?: boolean;
          onerror?: (error: {
            error: "not_enabled" | "not_whitelisted" | "not_permitted" | "not_supported" | "not_succeeded";
            details?: string;
          }) => void;
          onload?: () => void;
          ontimeout?: () => void;
          onprogress?: (response: { lengthComputable: boolean; loaded: number; total: number }) => void;
        },
  ): {
    abort: () => void;
  };
  function GM_getTab(callback: (tab: object) => void): void;
  function GM_saveTab(tab: object): void;
  function GM_getTabs(callback: (tabs: { [key: number]: object }) => void): void;
  function GM_addElement(
    parentNode: Node,
    tagName: string,
    attributes: Record<string, string | (() => void)>,
  ): HTMLElement;
  const GM_info: {
    script: {
      author: string;
      copyright: string;
      description: string;
      excludes: string[];
      homepage: string;
      icon: string;
      icon64: string;
      includes: string[];
      lastUpdated: number;
      matches: string[];
      name: string;
      namespace: string;
      options: {
        check_for_updates: boolean;
        comment: string;
        compat_foreach: boolean;
        compat_metadata: boolean;
        compat_powerful_this: boolean;
        compat_prototypes: boolean;
        compat_wrappedjsobject: boolean;
        compatopts_for_requires: boolean;
        noframes: boolean;
        override: {
          excludes: false;
          includes: false;
          orig_excludes: string[];
          orig_includes: string[];
          use_excludes: string[];
          use_includes: string[];
        };
        run_at: string;
        sandbox: string;
        unwrap: boolean;
        version: string;
      };
      resources: {
        name: string;
        url: string;
      }[];
      requires: {
        url: string;
      }[];
      system: boolean;
      unwrap: boolean;
      version: string;
    };
    scriptMetaStr: string;
    scriptHandler: string;
    version: string;
  };

  // Other userscript globals
  const unsafeWindow: Window & typeof globalThis;
}

export {};
