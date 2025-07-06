import { ChevronDown, ChevronRight } from "lucide-preact";
import { log, logTime, logTimeEnd } from "@/utils/logging";

interface SeriesTableTitleProps {
  title: string;
  isCollapsed: boolean;
  onToggle: () => void;
}

/**
 * Declarative table title component with expand/collapse functionality
 */
export function SeriesTableTitle({ title, isCollapsed, onToggle }: SeriesTableTitleProps) {
  const handleClick = () => {
    logTime(`AB Suite: SeriesTableTitle onClick - ${title}`);
    log(`AB Suite: SeriesTableTitle clicked`, { title, isCollapsed });
    onToggle();
    logTimeEnd(`AB Suite: SeriesTableTitle onClick - ${title}`);
  };

  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      handleClick();
    }
  };

  return (
    <h2 className="ab-table-title">
      <button
        type="button"
        className="ab-table-title-button"
        onClick={handleClick}
        onKeyDown={handleKeyDown}
        aria-expanded={!isCollapsed}
      >
        <span className="ab-table-title-icon">
          {isCollapsed ? <ChevronRight size={16} /> : <ChevronDown size={16} />}
        </span>
        <span className="ab-table-title-text">{title}</span>
      </button>
    </h2>
  );
}
