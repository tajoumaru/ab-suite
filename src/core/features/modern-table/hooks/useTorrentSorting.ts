import { useMemo, useState } from "preact/hooks";
import type { GroupedTorrents, SortColumn, SortDirection } from "../types";
import { sortTorrents } from "../utils/sorting";

export function useTorrentSorting(enhancedGroupedData: GroupedTorrents) {
  const [sortColumn, setSortColumn] = useState<SortColumn>(null);
  const [sortDirection, setSortDirection] = useState<SortDirection>("asc");

  // Handle sorting
  const handleSort = (column: SortColumn) => {
    if (sortColumn === column) {
      // Cycle through: asc -> desc -> unsorted
      if (sortDirection === "asc") {
        setSortDirection("desc");
      } else {
        // Reset to unsorted state
        setSortColumn(null);
        setSortDirection("asc");
      }
    } else {
      // New column, start with ascending
      setSortColumn(column);
      setSortDirection("asc");
    }
  };

  // Memoized sorted grouped data - sort within groups, preserve group order
  const sortedGroupedData = useMemo(() => {
    if (!sortColumn) return enhancedGroupedData;

    return {
      sections: enhancedGroupedData.sections.map(({ section, torrents: sectionTorrents }) => ({
        section,
        torrents: sortTorrents([...sectionTorrents], sortColumn, sortDirection),
      })),
    };
  }, [enhancedGroupedData, sortColumn, sortDirection]);

  return {
    sortColumn,
    sortDirection,
    handleSort,
    sortedGroupedData,
  };
}
