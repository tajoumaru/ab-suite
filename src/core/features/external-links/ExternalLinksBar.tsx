import type { MediaInfo } from "@/core/shared/hooks/useMediaInfo";

interface ExternalLinksBarProps {
  mediaInfo: MediaInfo;
}

/**
 * Declarative component that renders external links based on media information.
 * This replaces the imperative DOM manipulation from the old ExternalLinks component.
 */
export function ExternalLinksBar({ mediaInfo }: ExternalLinksBarProps) {
  const { externalLinks, searchTitle } = mediaInfo;

  return (
    <span className="ab-external-links">
      {externalLinks.map((link: { name: string; url: string }) => (
        <span key={link.name}>
          <span> | </span>
          <a
            href={link.url}
            target="_blank"
            rel="noopener noreferrer"
            title={`Search "${searchTitle}" on ${link.name}`}
          >
            {link.name}
          </a>
        </span>
      ))}
    </span>
  );
}
