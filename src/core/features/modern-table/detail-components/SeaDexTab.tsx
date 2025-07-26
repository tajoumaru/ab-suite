import type { SeaDexData } from "./types";

interface SeaDexTabProps {
  seadexData: SeaDexData | null;
}

/**
 * Component for rendering the SeaDex tab content
 */
export function SeaDexTab({ seadexData }: SeaDexTabProps) {
  if (!seadexData) {
    return (
      <div text="white">
        <div text="center #888" p="20px">
          No SeaDex data available.
        </div>
      </div>
    );
  }

  return (
    <div text="white">
      <div text="white" dangerouslySetInnerHTML={{ __html: seadexData.html || "" }} />
    </div>
  );
}
