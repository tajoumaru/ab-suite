import { render } from "preact";
import type { JSX } from "preact/jsx-runtime";

/**
 * Mount a Preact component to a DOM element
 */
export function mountComponent(
  component: JSX.Element,
  target: string | Element,
  insertMode: "append" | "prepend" | "replace" = "append",
  wrapperElement: string = "div",
): () => void {
  const container = typeof target === "string" ? document.querySelector(target) : target;

  if (!container) {
    console.warn(`AB Suite: Mount target not found: ${target}`);
    return () => {};
  }

  let mountPoint: Element;

  switch (insertMode) {
    case "replace":
      mountPoint = container;
      break;
    case "prepend":
      mountPoint = document.createElement(wrapperElement);
      container.insertBefore(mountPoint, container.firstChild);
      break;
    default:
      mountPoint = document.createElement(wrapperElement);
      container.appendChild(mountPoint);
      break;
  }

  render(component, mountPoint);

  // Return cleanup function
  return () => {
    if (mountPoint.parentNode) {
      mountPoint.parentNode.removeChild(mountPoint);
    }
  };
}

/**
 * Wait for an element to appear in the DOM
 */
export function waitForElement(selector: string, timeout = 5000): Promise<Element> {
  return new Promise((resolve, reject) => {
    const element = document.querySelector(selector);
    if (element) {
      resolve(element);
      return;
    }

    const observer = new MutationObserver(() => {
      const element = document.querySelector(selector);
      if (element) {
        observer.disconnect();
        resolve(element);
      }
    });

    observer.observe(document.body, { childList: true, subtree: true });

    setTimeout(() => {
      observer.disconnect();
      reject(new Error(`Element not found: ${selector}`));
    }, timeout);
  });
}

/**
 * Insert element after a reference element
 */
export function insertAfter(newNode: Node, referenceNode: Node): void {
  referenceNode.parentNode?.insertBefore(newNode, referenceNode.nextSibling);
}

/**
 * Create a DOM element with attributes
 */
export function createElement(tag: string, attributes: Record<string, string> = {}, content?: string): HTMLElement {
  const element = document.createElement(tag);

  Object.entries(attributes).forEach(([key, value]) => {
    element.setAttribute(key, value);
  });

  if (content) {
    element.textContent = content;
  }

  return element;
}
