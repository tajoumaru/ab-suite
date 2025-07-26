import { ChevronDown, ChevronRight } from "lucide-preact";
import type { GroupHeader, TableSection } from "../types";

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
  // Determine background color based on section type and group
  const getBackgroundColor = () => {
    if (section.type === "group") {
      return "[hsl(219,100%,10%)]";
    }
    return isOddSection ? "[hsl(218,32%,10%)]" : "[hsl(218,32%,15%)]";
  };

  return (
    <tr cursor="pointer" onClick={onToggle}>
      <td
        colSpan={100}
        p="[4px_8px]"
        border="1px solid [hsl(0,0%,20%)]"
        text="white 12px left"
        font="bold"
        un-align="middle"
        style={{ backgroundColor: getBackgroundColor() }}
      >
        {section.type === "group" && section.fullHtml ? (
          // Render full HTML content for group headers
          <div flex items="start" gap="8px">
            <div mt="4px">{isCollapsed ? <ChevronRight size={16} /> : <ChevronDown size={16} />}</div>
            <div dangerouslySetInnerHTML={{ __html: section.fullHtml }} />
          </div>
        ) : (
          // Simple text display for section headers with newline support
          <div flex items="start" gap="8px">
            <div mt="2px">{isCollapsed ? <ChevronRight size={16} /> : <ChevronDown size={16} />}</div>
            <strong un-ws="pre-line">{section.title}</strong>
          </div>
        )}
      </td>
    </tr>
  );
}
