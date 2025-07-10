import type { SeaDexData } from "@/types/modern-table";

interface SeaDexTabProps {
  seadexData: SeaDexData | null;
}

/**
 * Component for rendering the SeaDex tab content
 */
export function SeaDexTab({ seadexData }: SeaDexTabProps) {
  if (!seadexData) {
    return <div className="ab-details-tab-content ab-no-content">No SeaDex data available.</div>;
  }

  return (
    <div className="ab-details-tab-content">
      <div className="ab-seadex-content" dangerouslySetInnerHTML={{ __html: seadexData.html || "" }} />
    </div>
  );
}
