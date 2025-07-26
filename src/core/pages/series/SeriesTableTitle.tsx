import { ChevronDown, ChevronRight } from "lucide-preact";
import { log, time, timeEnd } from "@/lib/utils/logging";

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
    time(`SeriesTableTitle onClick - ${title}`);
    log(`SeriesTableTitle clicked`, { title, isCollapsed });
    onToggle();
    timeEnd(`SeriesTableTitle onClick - ${title}`);
  };

  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      handleClick();
    }
  };

  return (
    <h2 hover="opacity-80">
      <button
        type="button"
        bg="[none]"
        border="none"
        text="inherit"
        font="inherit"
        cursor="pointer"
        p="0"
        flex
        gap="12px"
        size-w="full"
        onClick={handleClick}
        onKeyDown={handleKeyDown}
        aria-expanded={!isCollapsed}
      >
        <span>{isCollapsed ? <ChevronRight size={16} /> : <ChevronDown size={16} />}</span>
        <span flex="1" text="left">
          {title}
        </span>
      </button>
    </h2>
  );
}
