import { useDescriptionStore } from "@/stores/descriptions";
import { useSettingsStore } from "@/stores/settings";

interface ReadMoreProps {
  torrentLink: string;
}

export function ReadMore({ torrentLink }: ReadMoreProps) {
  const { readMoreEnabled } = useSettingsStore(["readMoreEnabled"]);
  const descriptionStore = useDescriptionStore();

  if (!readMoreEnabled) {
    return null;
  }

  const isLoading = descriptionStore.isDescriptionLoading(torrentLink);
  const isExpanded = descriptionStore.isDescriptionExpanded(torrentLink);
  const needsReadMore = descriptionStore.needsReadMore(torrentLink);

  if (!needsReadMore) {
    return null;
  }

  const handleReadMore = async () => {
    if (isExpanded || isLoading) return;

    descriptionStore.setLoading(torrentLink, true);
    try {
      const fullDescription = await getFullDescription(torrentLink);
      descriptionStore.setFullDescription(torrentLink, fullDescription);
    } catch (error) {
      console.error("AB Suite: Failed to fetch full description", error);
      descriptionStore.setLoading(torrentLink, false);
    }
  };

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
