import { ChevronDown, ChevronRight } from "lucide-preact";
import type { GroupHeader, TableSection } from "@/types/modern-table";

interface SectionHeaderProps {
  section: TableSection | GroupHeader;
  isCollapsed: boolean;
  onToggle: () => void;
  isOddSection: boolean;
}

/**
 * Section header component with expand/collapse functionality
 */
export function SectionHeader({ section, isCollapsed, onToggle, isOddSection }: SectionHeaderProps) {
  // Group headers use their own class, section headers use alternating colors
  const headerClass =
    section.type === "group"
      ? "ab-group-header"
      : isOddSection
        ? "ab-section-header ab-group-odd"
        : "ab-section-header";

  return (
    <tr className={headerClass} onClick={onToggle} style={{ cursor: "pointer" }}>
      <td colSpan={100}>
        {section.type === "group" && section.fullHtml ? (
          // Render full HTML content for group headers
          <div style={{ display: "flex", alignItems: "flex-start", gap: "8px" }}>
            <div style={{ marginTop: "4px" }}>
              {isCollapsed ? <ChevronRight size={16} /> : <ChevronDown size={16} />}
            </div>
            <div dangerouslySetInnerHTML={{ __html: section.fullHtml }} />
          </div>
        ) : (
          // Simple text display for section headers with newline support
          <div style={{ display: "flex", alignItems: "flex-start", gap: "8px" }}>
            <div style={{ marginTop: "2px" }}>
              {isCollapsed ? <ChevronRight size={16} /> : <ChevronDown size={16} />}
            </div>
            <strong style={{ whiteSpace: "pre-line" }}>{section.title}</strong>
          </div>
        )}
      </td>
    </tr>
  );
}
