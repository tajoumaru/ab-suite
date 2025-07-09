import { useState } from "preact/hooks";
import { useSettingsStore } from "@/stores/settings";

interface ReadMoreProps {
  description: HTMLElement;
  torrentLink: string;
}

export function ReadMore({ description, torrentLink }: ReadMoreProps) {
  const { readMoreEnabled } = useSettingsStore();
  const [isExpanded, setIsExpanded] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  if (!readMoreEnabled) {
    console.log("AB Suite: ReadMore disabled via settings");
    return null;
  }

  // Check if description ends with "..." indicating truncation (trim to handle spaces)
  const isTruncated = description.textContent?.trim().endsWith("...");

  if (!isTruncated) {
    return null;
  }

  const handleReadMore = async () => {
    if (isExpanded || isLoading) return;

    setIsLoading(true);
    try {
      const fullDescription = await getFullDescription(torrentLink);
      description.innerHTML = fullDescription;
      setIsExpanded(true);
    } catch (error) {
      console.error("AB Suite: Failed to fetch full description", error);
    } finally {
      setIsLoading(false);
    }
  };

  console.log("AB Suite: ReadMore rendering button");
  return (
    <button
      onClick={handleReadMore}
      style={{
        color: "#007bff",
        textDecoration: "none",
        cursor: "pointer",
        fontSize: "0.9em",
        marginLeft: "4px",
        background: "none",
        border: "none",
        padding: 0,
      }}
      type="button"
    >
      {isLoading ? "Loading..." : "Read all"}
    </button>
  );
}

async function getFullDescription(url: string): Promise<string> {
  const response = await fetch(url);
  const html = await response.text();
  const parser = new DOMParser();
  const doc = parser.parseFromString(html, "text/html");

  // Use XPath to find the target element
  const xpathResult = doc.evaluate(
    "//strong[text()='Plot Synopsis' or text()='Torrent info']",
    doc,
    null,
    XPathResult.FIRST_ORDERED_NODE_TYPE,
    null,
  );

  const target = xpathResult.singleNodeValue as HTMLElement;

  if (!target || !target.parentElement || !target.parentElement.nextElementSibling) {
    throw new Error("Could not find full description");
  }

  return target.parentElement.nextElementSibling.innerHTML;
}
