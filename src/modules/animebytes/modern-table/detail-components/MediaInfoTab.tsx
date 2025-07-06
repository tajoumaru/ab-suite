import { ChevronDown, ChevronRight } from "lucide-preact";
import { useState } from "preact/hooks";

interface MediaInfoTabProps {
  mediaInfo: string;
}

/**
 * Component for rendering the MediaInfo tab content with spoiler functionality
 */
export function MediaInfoTab({ mediaInfo }: MediaInfoTabProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  if (!mediaInfo) {
    return <div className="ab-details-tab-content ab-no-content">No MediaInfo available.</div>;
  }

  const toggleExpanded = () => {
    setIsExpanded(!isExpanded);
  };

  return (
    <div className="ab-details-tab-content">
      <div className="ab-spoiler-container">
        <button type="button" className="ab-spoiler-button" onClick={toggleExpanded}>
          {isExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
          Show MediaInfo
        </button>
        {isExpanded && (
          <div className="ab-spoiler-content">
            <div className="ab-code-box">
              <pre>{mediaInfo}</pre>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
