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
    return (
      <div text="white">
        <div text="center #888" p="20px">
          No MediaInfo available.
        </div>
      </div>
    );
  }

  const toggleExpanded = () => {
    setIsExpanded(!isExpanded);
  };

  return (
    <div text="white">
      <div m="0">
        <button
          type="button"
          flex
          items="center"
          gap="8px"
          p="[8px_12px]"
          bg="#2a2a2a"
          border="1px solid #555"
          rounded="4px"
          text="white"
          cursor="pointer"
          transition="background"
          hover="bg-#333"
          onClick={toggleExpanded}
        >
          {isExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
          Show MediaInfo
        </button>
        {isExpanded && (
          <div mt="8px">
            <div bg="#1a1a1a" border="1px solid #555" rounded="4px" p="12px" overflow="auto">
              <pre
                m="0"
                un-ws="pre-wrap"
                un-wrap="break-word"
                font="mono"
                text-size="12px"
                line-height="[1.4]"
                text="white"
              >
                {mediaInfo}
              </pre>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
