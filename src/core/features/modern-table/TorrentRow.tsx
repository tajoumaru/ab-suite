import { Check, Download, Flag, Link, X } from "lucide-preact";
import { memo } from "preact/compat";
import { TorrentDetails } from "./TorrentDetails";
import type { ParsedTorrentRow, TableType } from "./types";

interface TorrentRowProps {
  torrent: ParsedTorrentRow;
  isExpanded: boolean;
  onToggleExpanded: (torrentId: string) => void;
  tableType: TableType;
  compactResolutionMode: boolean;
  showRegionColumn: boolean;
  showDualAudioColumn: boolean;
  isOddGroup: boolean;
  isSeriesPage?: boolean;
}

/**
 * Comprehensive torrent row component matching the original implementation
 */
function TorrentRowComponent({
  torrent,
  isExpanded,
  onToggleExpanded,
  tableType,
  compactResolutionMode,
  showRegionColumn,
  showDualAudioColumn,
  isOddGroup,
  isSeriesPage = false,
}: TorrentRowProps) {
  const handleToggleExpanded = () => {
    onToggleExpanded(torrent.torrentId);
  };

  const handleRowClick = (e: MouseEvent) => {
    // Only handle row clicks if not clicking on buttons/links
    const target = e.target as HTMLElement;
    if (!target.closest("a, button")) {
      if (isSeriesPage) {
        // On series pages, navigate to the details page
        if (torrent.detailsLink) {
          window.location.href = torrent.detailsLink;
        }
      } else {
        // On torrent pages, toggle expanded details
        if (torrent.detailsHtml) {
          handleToggleExpanded();
        }
      }
    }
  };

  // Helper function to get compact resolution format
  const getCompactResolution = (): string => {
    if (!compactResolutionMode) {
      return torrent.resolution || "";
    }

    const resolution = torrent.resolution || "";
    const aspectRatio = torrent.aspectRatio || "";

    // If already in wxh format, keep as-is
    if (resolution.match(/^\d+x\d+[ip]?$/)) {
      return resolution;
    }

    // Convert p/i formats to wxh
    const match = resolution.match(/^(\d+)([pi])$/);
    if (match) {
      const height = parseInt(match[1]);
      const progressive = match[2];
      let width: number;

      // Use aspect ratio if available, otherwise assume 16:9
      if (aspectRatio?.includes(":")) {
        const [w, h] = aspectRatio.split(":").map((n) => parseFloat(n));
        width = Math.round((height * w) / h);
      } else {
        // Default to 16:9 for common resolutions
        width = Math.round((height * 16) / 9);
      }

      return progressive === "i" ? `${width}x${height}i` : `${width}x${height}`;
    }

    return resolution;
  };

  // Determine row state flags
  const isFreeleech = torrent.isFreeleech || torrent.flags.some((flag) => flag.toLowerCase().includes("freeleech"));
  const isSeaDexBest =
    torrent.isSeaDexBest ||
    torrent.flags.some((flag) => flag.toLowerCase().includes("seadex") && flag.toLowerCase().includes("best"));
  const isSeaDexAlt = torrent.isSeaDexAlt || torrent.flags.some((flag) => flag.toLowerCase().includes("seadex"));

  // Check if row should be clickable
  const isClickable = torrent.hasDetails || torrent.detailsHtml || (isSeriesPage && torrent.detailsLink);

  // Common row elements for all table types
  const commonRowStart = (
    <>
      <td size-w-40px text="center" p="[6px_4px]" border="1px solid [hsl(0,0%,20%)]" text-size="11px" un-align="middle">
        <div flex="~ row" items="center" gap="6px" justify="center">
          <a
            href={torrent.downloadLink}
            title="Download torrent"
            text-color="[hsl(213,85%,72%)]"
            text-size="10px"
            un-decoration="none"
            font="bold"
            hover="decoration-underline"
          >
            <Download size={16} />
          </a>
          <a
            href={torrent.torrentLink}
            title="Permalink to torrent"
            text-color="[hsl(213,85%,72%)]"
            un-decoration="none"
            text-size="10px"
            font="bold"
            hover="decoration-underline"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              navigator.clipboard.writeText(`https://animebytes.tv${torrent.torrentLink}`);
            }}
          >
            <Link size={16} />
          </a>
        </div>
      </td>

      {/* Only show Group column for anime tables */}
      {tableType === "anime" && (
        <td
          size-w-100px
          p="[6px_4px]"
          border="1px solid [hsl(0,0%,20%)]"
          text-size="11px"
          text="center"
          un-align="middle"
        >
          {torrent.group || ""}
        </td>
      )}
    </>
  );

  const commonRowEnd = (
    <>
      <td size-w-60px p="[6px_4px]" border="1px solid [hsl(0,0%,20%)]" text-size="11px" text="center" un-align="middle">
        {torrent.size}
      </td>

      <td size-w-40px p="[6px_4px]" border="1px solid [hsl(0,0%,20%)]" text-size="11px" text="center" un-align="middle">
        {torrent.snatches}
      </td>

      <td size-w-40px p="[6px_4px]" border="1px solid [hsl(0,0%,20%)]" text-size="11px" text="center" un-align="middle">
        {torrent.seeders}
      </td>

      <td size-w-40px p="[6px_4px]" border="1px solid [hsl(0,0%,20%)]" text-size="11px" text="center" un-align="middle">
        {torrent.leechers}
      </td>

      <td size-w-60px p="[6px_4px]" border="1px solid [hsl(0,0%,20%)]" text-size="11px" text="center" un-align="middle">
        {torrent.flags.length > 0 && (
          <div flex="~ wrap" gap="4px" justify="center" line-height="[0]">
            {torrent.flags.map((flag: string, index: number) => (
              <span key={`${torrent.torrentId}-${index}`} dangerouslySetInnerHTML={{ __html: flag }} />
            ))}
          </div>
        )}
      </td>

      <td size-w-20px text="center" p="[6px_4px]" border="1px solid [hsl(0,0%,20%)]" text-size="11px" un-align="middle">
        <a
          href={`/reports.php?action=report&type=torrent&id=${torrent.torrentId}`}
          title="Report torrent"
          text-color="[hsl(213,85%,72%)]"
          un-decoration="none"
          text-size="10px"
          font="bold"
          hover="decoration-underline"
        >
          <Flag size={16} />
        </a>
      </td>
    </>
  );

  // Render different columns based on table type
  const renderTableSpecificCells = () => {
    switch (tableType) {
      case "anime":
        return (
          <>
            <td
              size-w-60px
              p="[6px_4px]"
              border="1px solid [hsl(0,0%,20%)]"
              text-size="11px"
              text="center"
              un-align="middle"
            >
              {torrent.format || ""}
            </td>

            {showRegionColumn && (
              <td
                size-w-60px
                p="[6px_4px]"
                border="1px solid [hsl(0,0%,20%)]"
                text-size="11px"
                text="center"
                un-align="middle"
              >
                {torrent.region || ""}
              </td>
            )}

            <td
              size-w-60px
              p="[6px_4px]"
              border="1px solid [hsl(0,0%,20%)]"
              text-size="11px"
              text="center"
              un-align="middle"
            >
              {torrent.container || ""}
            </td>

            <td
              size-w-70px
              p="[6px_4px]"
              border="1px solid [hsl(0,0%,20%)]"
              text-size="11px"
              text="center"
              un-align="middle"
            >
              {torrent.videoCodec || ""}
            </td>

            {!compactResolutionMode && (
              <td
                size-w-60px
                p="[6px_4px]"
                border="1px solid [hsl(0,0%,20%)]"
                text-size="11px"
                text="center"
                un-align="middle"
              >
                {torrent.aspectRatio || ""}
              </td>
            )}

            <td
              size-w-70px
              p="[6px_4px]"
              border="1px solid [hsl(0,0%,20%)]"
              text-size="11px"
              text="center"
              un-align="middle"
            >
              {getCompactResolution()}
            </td>

            <td
              size-w-50px
              p="[6px_4px]"
              border="1px solid [hsl(0,0%,20%)]"
              text-size="11px"
              text="center"
              un-align="middle"
            >
              {torrent.audio || ""}
            </td>

            <td
              size-w-40px
              p="[6px_4px]"
              border="1px solid [hsl(0,0%,20%)]"
              text-size="11px"
              text="center"
              un-align="middle"
            >
              {torrent.audioChannels || ""}
            </td>

            {showDualAudioColumn && (
              <td
                size-w-40px
                text="center"
                p="[6px_4px]"
                border="1px solid [hsl(0,0%,20%)]"
                text-size="11px"
                un-align="middle"
              >
                {torrent.hasDualAudio ? (
                  <Check size={14} text-color="[hsl(142,69%,58%)]" />
                ) : (
                  <X size={14} text-color="[hsl(0,91%,71%)]" op="60" />
                )}
              </td>
            )}

            <td
              size-w-80px
              p="[6px_4px]"
              border="1px solid [hsl(0,0%,20%)]"
              text-size="11px"
              text="center"
              un-align="middle"
            >
              {torrent.subtitles || ""}
            </td>
          </>
        );

      case "printed_media":
        return (
          <>
            <td p="[6px_4px]" border="1px solid [hsl(0,0%,20%)]" text-size="11px" text="center" un-align="middle">
              {torrent.printedMediaType || ""}
            </td>

            <td p="[6px_4px]" border="1px solid [hsl(0,0%,20%)]" text-size="11px" text="center" un-align="middle">
              {torrent.translator || ""}
            </td>

            <td p="[6px_4px]" border="1px solid [hsl(0,0%,20%)]" text-size="11px" text="center" un-align="middle">
              {torrent.isDigital ? (
                <Check size={14} text-color="[hsl(142,69%,58%)]" />
              ) : (
                <X size={14} text-color="[hsl(0,91%,71%)]" op="60" />
              )}
            </td>

            <td p="[6px_4px]" border="1px solid [hsl(0,0%,20%)]" text-size="11px" text="center" un-align="middle">
              {torrent.printedFormat || ""}
            </td>

            <td p="[6px_4px]" border="1px solid [hsl(0,0%,20%)]" text-size="11px" text="center" un-align="middle">
              {torrent.isOngoing ? (
                <Check size={14} text-color="[hsl(142,69%,58%)]" />
              ) : (
                <X size={14} text-color="[hsl(0,91%,71%)]" op="60" />
              )}
            </td>
          </>
        );

      case "games":
        return (
          <>
            <td p="[6px_4px]" border="1px solid [hsl(0,0%,20%)]" text-size="11px" text="center" un-align="middle">
              {torrent.gameType || ""}
            </td>

            <td p="[6px_4px]" border="1px solid [hsl(0,0%,20%)]" text-size="11px" text="center" un-align="middle">
              {torrent.platform || ""}
            </td>

            <td p="[6px_4px]" border="1px solid [hsl(0,0%,20%)]" text-size="11px" text="center" un-align="middle">
              {torrent.gameRegion || ""}
            </td>

            <td p="[6px_4px]" border="1px solid [hsl(0,0%,20%)]" text-size="11px" text="center" un-align="middle">
              {torrent.isArchived ? (
                <Check size={14} text-color="[hsl(142,69%,58%)]" />
              ) : (
                <X size={14} text-color="[hsl(0,91%,71%)]" op="60" />
              )}
            </td>
          </>
        );

      case "music":
        return (
          <>
            <td p="[6px_4px]" border="1px solid [hsl(0,0%,20%)]" text-size="11px" text="center" un-align="middle">
              {torrent.musicCodec || ""}
            </td>

            <td p="[6px_4px]" border="1px solid [hsl(0,0%,20%)]" text-size="11px" text="center" un-align="middle">
              {torrent.bitrate || ""}
            </td>

            <td p="[6px_4px]" border="1px solid [hsl(0,0%,20%)]" text-size="11px" text="center" un-align="middle">
              {torrent.media || ""}
            </td>

            <td p="[6px_4px]" border="1px solid [hsl(0,0%,20%)]" text-size="11px" text="center" un-align="middle">
              {torrent.hasLog ? (
                <Check size={14} text-color="[hsl(142,69%,58%)]" />
              ) : (
                <X size={14} text-color="[hsl(0,91%,71%)]" op="60" />
              )}
            </td>

            <td p="[6px_4px]" border="1px solid [hsl(0,0%,20%)]" text-size="11px" text="center" un-align="middle">
              {torrent.hasCue ? (
                <Check size={14} text-color="[hsl(142,69%,58%)]" />
              ) : (
                <X size={14} text-color="[hsl(0,91%,71%)]" op="60" />
              )}
            </td>
          </>
        );

      default:
        return null;
    }
  };

  return (
    <>
      {/* Main torrent row */}
      <tr
        text="white"
        border-b="1px solid [hsl(0,0%,13%)]"
        cursor={isClickable ? "pointer" : "default"}
        transition="background-color 150ms"
        bg={
          isSeaDexBest
            ? isOddGroup
              ? "[rgba(121,237,163,0.08)]"
              : "[rgba(121,237,163,0.1)]"
            : isSeaDexAlt
              ? isOddGroup
                ? "[rgba(251,136,136,0.08)]"
                : "[rgba(251,136,136,0.1)]"
              : isFreeleech
                ? isOddGroup
                  ? "[rgba(207,181,59,0.05)]"
                  : "[rgba(207,181,59,0.12)]"
                : isOddGroup
                  ? "[hsl(0,0%,8%)]"
                  : "transparent"
        }
        hover-bg={
          !isClickable
            ? undefined
            : isSeriesPage && torrent.detailsLink
              ? isOddGroup
                ? "[hsl(0,0%,20%)]"
                : "[hsl(0,0%,18%)]"
              : isSeaDexBest
                ? isOddGroup
                  ? "[rgba(121,237,163,0.15)]"
                  : "[rgba(121,237,163,0.2)]"
                : isSeaDexAlt
                  ? isOddGroup
                    ? "[rgba(251,136,136,0.15)]"
                    : "[rgba(251,136,136,0.2)]"
                  : isFreeleech
                    ? isOddGroup
                      ? "[rgba(207,181,59,0.1)]"
                      : "[rgba(207,181,59,0.2)]"
                    : isOddGroup
                      ? "[hsl(0,0%,12%)]"
                      : "[hsl(0,0%,16%)]"
        }
        data-torrent-id={torrent.torrentId}
        onClick={handleRowClick}
      >
        {commonRowStart}
        {renderTableSpecificCells()}
        {commonRowEnd}
      </tr>

      {/* Expanded details row */}
      {isExpanded && torrent.detailsHtml && (
        <TorrentDetails torrentId={torrent.torrentId} groupId={torrent.groupId} detailsHtml={torrent.detailsHtml} />
      )}
    </>
  );
}

/**
 * Memoized TorrentRow component with custom comparison function
 * Only re-renders when critical props change to optimize performance for large lists
 */
export const TorrentRow = memo(TorrentRowComponent, (prevProps, nextProps) => {
  // Compare torrent identity - most important for performance
  if (prevProps.torrent.torrentId !== nextProps.torrent.torrentId) {
    return false;
  }

  // Compare expansion state
  if (prevProps.isExpanded !== nextProps.isExpanded) {
    return false;
  }

  // Compare table configuration that affects rendering
  if (prevProps.tableType !== nextProps.tableType) {
    return false;
  }

  // Compare display options that affect columns
  if (
    prevProps.compactResolutionMode !== nextProps.compactResolutionMode ||
    prevProps.showRegionColumn !== nextProps.showRegionColumn ||
    prevProps.showDualAudioColumn !== nextProps.showDualAudioColumn
  ) {
    return false;
  }

  // Compare group styling
  if (prevProps.isOddGroup !== nextProps.isOddGroup) {
    return false;
  }

  // Compare page type for different behaviors
  if (prevProps.isSeriesPage !== nextProps.isSeriesPage) {
    return false;
  }

  // Compare torrent data that affects display
  // Only check key fields that are commonly dynamic
  if (
    prevProps.torrent.seeders !== nextProps.torrent.seeders ||
    prevProps.torrent.leechers !== nextProps.torrent.leechers ||
    prevProps.torrent.snatches !== nextProps.torrent.snatches
  ) {
    return false;
  }

  // Compare SeaDex status that affects row styling and flags
  if (
    prevProps.torrent.isSeaDexBest !== nextProps.torrent.isSeaDexBest ||
    prevProps.torrent.isSeaDexAlt !== nextProps.torrent.isSeaDexAlt ||
    prevProps.torrent.flags.length !== nextProps.torrent.flags.length
  ) {
    return false;
  }

  // If all critical props are the same, prevent re-render
  return true;
});
