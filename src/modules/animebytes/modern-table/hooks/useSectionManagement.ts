import { useEffect, useState } from "preact/hooks";
import type { GroupedTorrents } from "@/types/modern-table";

export function useSectionManagement(groupedData: GroupedTorrents, sectionsCollapsedByDefault: boolean) {
  const [collapsedSections, setCollapsedSections] = useState<Set<string>>(new Set());

  // Initialize sections as collapsed or expanded based on setting
  useEffect(() => {
    const sectionsWithIds = groupedData.sections
      .filter(({ section }) => section !== null)
      .map(({ section }) => section?.id)
      .filter((id): id is string => id !== undefined);

    if (sectionsWithIds.length > 0) {
      if (sectionsCollapsedByDefault) {
        setCollapsedSections(new Set(sectionsWithIds));
      } else {
        setCollapsedSections(new Set());
      }
    }
  }, [groupedData, sectionsCollapsedByDefault]);

  // Toggle section collapse
  const toggleSectionCollapsed = (sectionId: string) => {
    setCollapsedSections((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(sectionId)) {
        newSet.delete(sectionId);
      } else {
        newSet.add(sectionId);
      }
      return newSet;
    });
  };

  // Toggle all sections - create a wrapper that takes the current data
  const createToggleAllSections = (currentGroupedData: GroupedTorrents) => () => {
    const sectionsWithIds = currentGroupedData.sections
      .filter(({ section }) => section !== null)
      .map(({ section }) => section?.id)
      .filter((id): id is string => id !== undefined);

    if (sectionsWithIds.length === 0) return;

    // If all sections are expanded (collapsedSections is empty or doesn't contain any section IDs)
    const allExpanded = sectionsWithIds.every((id) => !collapsedSections.has(id));

    if (allExpanded) {
      // Collapse all sections
      setCollapsedSections(new Set(sectionsWithIds));
    } else {
      // Expand all sections
      setCollapsedSections(new Set());
    }
  };

  return {
    collapsedSections,
    toggleSectionCollapsed,
    createToggleAllSections,
  };
}
