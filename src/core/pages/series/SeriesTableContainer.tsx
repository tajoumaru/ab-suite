import { render } from "preact";
import { useEffect, useRef } from "preact/hooks";
import type { GroupedTorrents, TableType } from "@/core/features/modern-table";
import { TorrentTable } from "@/core/features/modern-table";
import { log, time, timeEnd } from "@/lib/utils/logging";
import { SeriesTableTitle } from "./SeriesTableTitle";

interface SeriesTableContainerProps {
  tableType: TableType;
  title: string;
  groupedData: GroupedTorrents;
  isCollapsed: boolean;
  onToggleCollapse: () => void;
}

/**
 * Container for a single table with its title and content
 */
export function SeriesTableContainer({
  tableType,
  title,
  groupedData,
  isCollapsed,
  onToggleCollapse,
}: SeriesTableContainerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const hasRenderedRef = useRef<boolean>(false);
  const prevCollapsedRef = useRef<boolean>(isCollapsed);
  const prevGroupedDataRef = useRef<GroupedTorrents>(groupedData);

  // Calculate total torrents count for logging
  const totalTorrents = groupedData.sections.reduce((sum, s) => sum + s.torrents.length, 0);

  // Only render when actually necessary (expanding or data changes)
  useEffect(() => {
    time(`SeriesTableContainer render - ${title}`);
    log(`SeriesTableContainer effect triggered`, {
      title,
      tableType,
      torrentsLength: totalTorrents,
      isCollapsed,
      prevCollapsed: prevCollapsedRef.current,
      hasRendered: hasRenderedRef.current,
      hasContainer: !!containerRef.current,
    });

    const wasCollapsed = prevCollapsedRef.current;
    const isExpanding = wasCollapsed && !isCollapsed;
    const isCollapsing = !wasCollapsed && isCollapsed;
    const dataChanged = prevGroupedDataRef.current !== groupedData;

    // Only render if:
    // 1. Never rendered before and table is not collapsed
    // 2. Table is expanding (was collapsed, now not)
    // 3. Data changed and table is currently expanded
    // Skip rendering if just collapsing or if nothing meaningful changed
    const shouldRender =
      (!hasRenderedRef.current && !isCollapsed) ||
      isExpanding ||
      (dataChanged && !isCollapsed && hasRenderedRef.current);

    if (containerRef.current && totalTorrents > 0 && !isCollapsed && shouldRender) {
      time(`TorrentTable render - ${title}`);
      render(
        <TorrentTable groupedData={groupedData} tableType={tableType} isSeriesPage={true} />,
        containerRef.current,
      );
      timeEnd(`TorrentTable render - ${title}`);
      hasRenderedRef.current = true;
    } else {
      log(`SeriesTableContainer skipping render`, {
        title,
        hasContainer: !!containerRef.current,
        torrentsLength: totalTorrents,
        isCollapsed,
        shouldRender,
        isExpanding,
        isCollapsing,
        dataChanged,
      });
    }

    // Update previous state
    prevCollapsedRef.current = isCollapsed;
    prevGroupedDataRef.current = groupedData;

    timeEnd(`SeriesTableContainer render - ${title}`);
  }, [groupedData, tableType, isCollapsed, totalTorrents, title]);

  return (
    <div mb="30px">
      <SeriesTableTitle title={title} isCollapsed={isCollapsed} onToggle={onToggleCollapse} />
      <div ref={containerRef} className={isCollapsed ? "hidden" : "block"} mt="10px" />
    </div>
  );
}
