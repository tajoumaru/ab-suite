import { render } from "preact";
import { useEffect, useRef } from "preact/hooks";
import { log, time, timeEnd } from "@/lib/utils/logging";
import type { ParsedTorrentRow, TableType } from "@/core/features/modern-table";
import { TorrentTable } from "@/core/features/modern-table";
import { SeriesTableTitle } from "./SeriesTableTitle";

interface SeriesTableContainerProps {
  tableType: TableType;
  title: string;
  torrents: ParsedTorrentRow[];
  originalTable: HTMLTableElement;
  isCollapsed: boolean;
  onToggleCollapse: () => void;
}

/**
 * Container for a single table with its title and content
 */
export function SeriesTableContainer({
  tableType,
  title,
  torrents,
  originalTable,
  isCollapsed,
  onToggleCollapse,
}: SeriesTableContainerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const hasRenderedRef = useRef<boolean>(false);
  const prevCollapsedRef = useRef<boolean>(isCollapsed);
  const prevTorrentsRef = useRef<ParsedTorrentRow[]>(torrents);

  // Only render when actually necessary (expanding or data changes)
  useEffect(() => {
    time(`SeriesTableContainer render - ${title}`);
    log(`SeriesTableContainer effect triggered`, {
      title,
      tableType,
      torrentsLength: torrents.length,
      isCollapsed,
      prevCollapsed: prevCollapsedRef.current,
      hasRendered: hasRenderedRef.current,
      hasContainer: !!containerRef.current,
    });

    const wasCollapsed = prevCollapsedRef.current;
    const isExpanding = wasCollapsed && !isCollapsed;
    const isCollapsing = !wasCollapsed && isCollapsed;
    const dataChanged = prevTorrentsRef.current !== torrents;

    // Only render if:
    // 1. Never rendered before and table is not collapsed
    // 2. Table is expanding (was collapsed, now not)
    // 3. Data changed and table is currently expanded
    // Skip rendering if just collapsing or if nothing meaningful changed
    const shouldRender =
      (!hasRenderedRef.current && !isCollapsed) ||
      isExpanding ||
      (dataChanged && !isCollapsed && hasRenderedRef.current);

    if (containerRef.current && torrents.length > 0 && !isCollapsed && shouldRender) {
      time(`TorrentTable render - ${title}`);
      render(
        <TorrentTable torrents={torrents} originalTable={originalTable} isSeriesPage={true} />,
        containerRef.current,
      );
      timeEnd(`TorrentTable render - ${title}`);
      hasRenderedRef.current = true;
    } else {
      log(`SeriesTableContainer skipping render`, {
        title,
        hasContainer: !!containerRef.current,
        torrentsLength: torrents.length,
        isCollapsed,
        shouldRender,
        isExpanding,
        isCollapsing,
        dataChanged,
      });
    }

    // Update previous state
    prevCollapsedRef.current = isCollapsed;
    prevTorrentsRef.current = torrents;

    timeEnd(`SeriesTableContainer render - ${title}`);
  }, [torrents, originalTable, isCollapsed]);

  return (
    <div className="ab-series-table-section">
      <SeriesTableTitle title={title} isCollapsed={isCollapsed} onToggle={onToggleCollapse} />
      <div
        ref={containerRef}
        className={`ab-series-table-content ${isCollapsed ? "ab-gallery-display-none" : "ab-gallery-display-block"}`}
      />
    </div>
  );
}
