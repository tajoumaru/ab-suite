/**
 * Shared DOM manipulation utilities to reduce code duplication
 */

/**
 * Element creation utilities with consistent patterns
 */
export const ElementFactory = {
  /**
   * Creates a div with specified classes and optional content
   */
  div(classes?: string | string[], content?: string): HTMLDivElement {
    const div = document.createElement("div");
    if (classes) {
      const classList = Array.isArray(classes) ? classes : [classes];
      div.className = classList.join(" ");
    }
    if (content) {
      div.textContent = content;
    }
    return div;
  },

  /**
   * Creates a button with specified attributes
   */
  button(options: {
    text?: string;
    classes?: string | string[];
    onClick?: (event: MouseEvent) => void;
    disabled?: boolean;
    type?: "button" | "submit" | "reset";
    ariaLabel?: string;
  }): HTMLButtonElement {
    const button = document.createElement("button");

    if (options.text) button.textContent = options.text;
    if (options.classes) {
      const classList = Array.isArray(options.classes) ? options.classes : [options.classes];
      button.className = classList.join(" ");
    }
    if (options.onClick) button.addEventListener("click", options.onClick);
    if (options.disabled) button.disabled = options.disabled;
    if (options.type) button.type = options.type;
    if (options.ariaLabel) button.setAttribute("aria-label", options.ariaLabel);

    return button;
  },

  /**
   * Creates an input element with specified attributes
   */
  input(options: {
    type?: string;
    placeholder?: string;
    value?: string;
    classes?: string | string[];
    onChange?: (event: Event) => void;
    onInput?: (event: Event) => void;
    maxLength?: number;
  }): HTMLInputElement {
    const input = document.createElement("input");

    if (options.type) input.type = options.type;
    if (options.placeholder) input.placeholder = options.placeholder;
    if (options.value) input.value = options.value;
    if (options.classes) {
      const classList = Array.isArray(options.classes) ? options.classes : [options.classes];
      input.className = classList.join(" ");
    }
    if (options.onChange) input.addEventListener("change", options.onChange);
    if (options.onInput) input.addEventListener("input", options.onInput);
    if (options.maxLength) input.maxLength = options.maxLength;

    return input;
  },

  /**
   * Creates a table with basic structure
   */
  table(options: { classes?: string | string[]; headers?: string[]; rows?: string[][] }): HTMLTableElement {
    const table = document.createElement("table");

    if (options.classes) {
      const classList = Array.isArray(options.classes) ? options.classes : [options.classes];
      table.className = classList.join(" ");
    }

    if (options.headers) {
      const thead = document.createElement("thead");
      const headerRow = document.createElement("tr");

      options.headers.forEach((headerText) => {
        const th = document.createElement("th");
        th.textContent = headerText;
        headerRow.appendChild(th);
      });

      thead.appendChild(headerRow);
      table.appendChild(thead);
    }

    if (options.rows) {
      const tbody = document.createElement("tbody");

      options.rows.forEach((rowData) => {
        const tr = document.createElement("tr");

        rowData.forEach((cellText) => {
          const td = document.createElement("td");
          td.textContent = cellText;
          tr.appendChild(td);
        });

        tbody.appendChild(tr);
      });

      table.appendChild(tbody);
    }

    return table;
  },
};

/**
 * DOM query utilities with consistent error handling
 */
export const QueryUtils = {
  /**
   * Safe querySelector with optional type casting
   */
  select<T extends Element = Element>(selector: string, context: Document | Element = document): T | null {
    try {
      return context.querySelector(selector) as T | null;
    } catch (error) {
      console.warn(`Invalid selector: ${selector}`, error);
      return null;
    }
  },

  /**
   * Safe querySelectorAll with type casting
   */
  selectAll<T extends Element = Element>(selector: string, context: Document | Element = document): T[] {
    try {
      return Array.from(context.querySelectorAll(selector)) as T[];
    } catch (error) {
      console.warn(`Invalid selector: ${selector}`, error);
      return [];
    }
  },

  /**
   * Find element by text content
   */
  findByText(text: string, tagName?: string, context: Document | Element = document): Element | null {
    const selector = tagName ? tagName : "*";
    const elements = this.selectAll(selector, context);

    return elements.find((el) => el.textContent?.trim().toLowerCase().includes(text.toLowerCase())) || null;
  },

  /**
   * Find closest parent element matching selector
   */
  findParent<T extends Element = Element>(element: Element, selector: string): T | null {
    try {
      return element.closest(selector) as T | null;
    } catch (error) {
      console.warn(`Invalid selector: ${selector}`, error);
      return null;
    }
  },
};

/**
 * DOM manipulation utilities
 */
export const DOMUtils = {
  /**
   * Insert element with position options
   */
  insert(element: Element, target: Element, position: "before" | "after" | "prepend" | "append" = "append"): void {
    switch (position) {
      case "before":
        target.parentNode?.insertBefore(element, target);
        break;
      case "after":
        target.parentNode?.insertBefore(element, target.nextSibling);
        break;
      case "prepend":
        target.insertBefore(element, target.firstChild);
        break;
      default:
        target.appendChild(element);
        break;
    }
  },

  /**
   * Remove elements matching selector
   */
  removeAll(selector: string, context: Document | Element = document): number {
    const elements = QueryUtils.selectAll(selector, context);
    elements.forEach((el) => el.remove());
    return elements.length;
  },

  /**
   * Set multiple attributes at once
   */
  setAttributes(element: Element, attributes: Record<string, string>): void {
    Object.entries(attributes).forEach(([key, value]) => {
      element.setAttribute(key, value);
    });
  },

  /**
   * Toggle classes with conditional logic
   */
  toggleClasses(element: Element, classMap: Record<string, boolean>): void {
    Object.entries(classMap).forEach(([className, shouldAdd]) => {
      element.classList.toggle(className, shouldAdd);
    });
  },

  /**
   * Create DocumentFragment for efficient batch DOM operations
   */
  createFragment(children: (Node | string)[]): DocumentFragment {
    const fragment = document.createDocumentFragment();

    children.forEach((child) => {
      if (typeof child === "string") {
        fragment.appendChild(document.createTextNode(child));
      } else {
        fragment.appendChild(child);
      }
    });

    return fragment;
  },

  /**
   * Safely get numeric value from element
   */
  getNumericValue(element: Element, attribute: "textContent" | "value" | string): number {
    let value: string | null;

    if (attribute === "textContent") {
      value = element.textContent;
    } else if (attribute === "value" && element instanceof HTMLInputElement) {
      value = element.value;
    } else {
      value = element.getAttribute(attribute);
    }

    const parsed = parseFloat(value || "0");
    return Number.isNaN(parsed) ? 0 : parsed;
  },

  /**
   * Check if element is visible in viewport
   */
  isInViewport(element: Element): boolean {
    const rect = element.getBoundingClientRect();
    return (
      rect.top >= 0 &&
      rect.left >= 0 &&
      rect.bottom <= (window.innerHeight || document.documentElement.clientHeight) &&
      rect.right <= (window.innerWidth || document.documentElement.clientWidth)
    );
  },

  /**
   * Measure element dimensions without affecting layout
   */
  measureElement(element: Element): { width: number; height: number } {
    const rect = element.getBoundingClientRect();
    return {
      width: rect.width,
      height: rect.height,
    };
  },
};

/**
 * Event handling utilities
 */
export const EventUtils = {
  /**
   * Add event listener with automatic cleanup
   */
  addListener<K extends keyof HTMLElementEventMap>(
    element: Element,
    type: K,
    listener: (event: HTMLElementEventMap[K]) => void,
    options?: AddEventListenerOptions,
  ): () => void {
    element.addEventListener(type, listener as EventListener, options);

    return () => {
      element.removeEventListener(type, listener as EventListener, options);
    };
  },

  /**
   * Throttle event handler
   */
  throttle<T extends unknown[]>(fn: (...args: T) => void, delay: number): (...args: T) => void {
    let timeoutId: number | undefined;
    let lastExecTime = 0;

    return (...args: T) => {
      const currentTime = Date.now();

      if (currentTime - lastExecTime > delay) {
        fn(...args);
        lastExecTime = currentTime;
      } else {
        clearTimeout(timeoutId);
        timeoutId = window.setTimeout(
          () => {
            fn(...args);
            lastExecTime = Date.now();
          },
          delay - (currentTime - lastExecTime),
        );
      }
    };
  },

  /**
   * Debounce event handler
   */
  debounce<T extends unknown[]>(fn: (...args: T) => void, delay: number): (...args: T) => void {
    let timeoutId: number | undefined;

    return (...args: T) => {
      clearTimeout(timeoutId);
      timeoutId = window.setTimeout(() => fn(...args), delay);
    };
  },

  /**
   * One-time event listener
   */
  once<K extends keyof HTMLElementEventMap>(
    element: Element,
    type: K,
    listener: (event: HTMLElementEventMap[K]) => void,
  ): void {
    const onceListener = (event: HTMLElementEventMap[K]) => {
      listener(event);
      element.removeEventListener(type, onceListener as EventListener);
    };

    element.addEventListener(type, onceListener as EventListener);
  },
};

/**
 * Style utilities for consistent styling
 */
export const StyleUtils = {
  /**
   * Apply multiple styles at once
   */
  setStyles(element: HTMLElement, styles: Partial<CSSStyleDeclaration>): void {
    Object.assign(element.style, styles);
  },

  /**
   * Show/hide element with display property
   */
  toggle(element: HTMLElement, visible?: boolean): void {
    const shouldShow = visible !== undefined ? visible : element.style.display === "none";
    element.style.display = shouldShow ? "" : "none";
  },

  /**
   * Fade in/out animation
   */
  fade(element: HTMLElement, direction: "in" | "out", duration = 150): Promise<void> {
    return new Promise((resolve) => {
      const start = direction === "in" ? 0 : 1;
      const end = direction === "in" ? 1 : 0;

      element.style.opacity = start.toString();
      element.style.transition = `opacity ${duration}ms ease`;

      // Force reflow
      element.offsetHeight;

      element.style.opacity = end.toString();

      setTimeout(() => {
        element.style.transition = "";
        if (direction === "out") {
          element.style.display = "none";
        }
        resolve();
      }, duration);
    });
  },
};
