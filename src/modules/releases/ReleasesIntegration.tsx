import { useEffect } from "preact/hooks";
import { useSettingsStore } from "@/stores/settings";

// Component for releases.moe site integration
export function ReleasesIntegration() {
  const { seadexEnabled } = useSettingsStore(["seadexEnabled"]);

  useEffect(() => {
    if (!seadexEnabled) return;

    const observer = new MutationObserver((mutations) => {
      for (const mutation of mutations) {
        for (const node of Array.from(mutation.addedNodes)) {
          if (node.nodeType !== Node.ELEMENT_NODE) continue;

          const element = node as Element;
          const elements = element.matches("a.pt-button, button.pt-button")
            ? [element]
            : Array.from(element.querySelectorAll("a.pt-button, button.pt-button"));

          elements.forEach((elm) => {
            const button = elm as HTMLAnchorElement;
            if (button.dataset.href) {
              button.href = new URL(button.dataset.href, "https://animebytes.tv").toString();
              button.classList.remove("pointer-events-none");
              button.removeAttribute("data-href");

              const img = button.querySelector("img");
              if (img) {
                img.src = "https://animebytes.tv/favicon.ico";
              }

              const textNode = Array.from(button.childNodes).find(
                (n) => n.nodeType === Node.TEXT_NODE && n.textContent?.trim(),
              ) as Text;

              if (textNode?.textContent?.includes("Private")) {
                textNode.textContent = " AnimeBytes";
              }
            }
          });
        }
      }
    });

    observer.observe(document.body, { childList: true, subtree: true });

    return () => {
      observer.disconnect();
    };
  }, [seadexEnabled]);

  return null;
}
