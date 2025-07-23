import { useEffect, useState } from "preact/hooks";
import { log } from "@/lib/utils/logging";
import type { GroupedTorrents } from "@/types/modern-table";

export function useRowExpansion(enhancedGroupedData: GroupedTorrents, isSeriesPage: boolean) {
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());

  // Auto-expand torrent details if torrentid is in URL (torrent pages only)
  useEffect(() => {
    if (!isSeriesPage && enhancedGroupedData.sections.length > 0) {
      const urlParams = new URLSearchParams(window.location.search);
      const torrentId = urlParams.get("torrentid");

      if (torrentId) {
        // Check if this torrent exists in our data
        const torrentExists = enhancedGroupedData.sections.some(({ torrents: sectionTorrents }) =>
          sectionTorrents.some((torrent) => torrent.torrentId === torrentId),
        );

        if (torrentExists) {
          log(`Auto-expanding torrent details for torrentid=${torrentId}`);
          setExpandedRows(new Set([torrentId]));
        }
      }
    }
  }, [isSeriesPage, enhancedGroupedData.sections]);

  // Toggle row expansion
  const toggleRowExpanded = (torrentId: string) => {
    setExpandedRows((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(torrentId)) {
        newSet.delete(torrentId);
      } else {
        newSet.add(torrentId);
      }
      return newSet;
    });
  };

  return {
    expandedRows,
    toggleRowExpanded,
  };
}
