import { Check, Download, Flag, Link, X } from "lucide-preact";
import { memo } from "preact/compat";
import type { ParsedTorrentRow, TableType } from "@/types/modern-table";
import { TorrentDetails } from "./TorrentDetails";

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

  // Determine row classes for styling
  const getRowClasses = (): string => {
    const classes = ["ab-modern-row"];

    // Add alternating group background
    if (isOddGroup) {
      classes.push("ab-group-odd");
    }

    // Check for freeleech using legacy field or flags
    if (torrent.isFreeleech || torrent.flags.some((flag) => flag.toLowerCase().includes("freeleech"))) {
      classes.push("ab-freeleech");
    }

    // Check for SeaDex indicators using legacy fields or flags
    if (
      torrent.isSeaDexBest ||
      torrent.flags.some((flag) => flag.toLowerCase().includes("seadex") && flag.toLowerCase().includes("best"))
    ) {
      classes.push("ab-seadex-best");
    } else if (torrent.isSeaDexAlt || torrent.flags.some((flag) => flag.toLowerCase().includes("seadex"))) {
      classes.push("ab-seadex-alt");
    }

    // Add details indicator
    if (torrent.hasDetails || torrent.detailsHtml) {
      classes.push("ab-has-details");
    }

    // Add series page styling for clickable rows
    if (isSeriesPage && torrent.detailsLink) {
      classes.push("ab-series-clickable");
    }

    return classes.join(" ");
  };

  // Common row elements for all table types
  const commonRowStart = (
    <>
      <td className="ab-col-download">
        <div className="ab-download-container">
          <a href={torrent.downloadLink} title="Download torrent" className="ab-download-btn">
            <Download size={16} />
          </a>
          <a
            href={torrent.torrentLink}
            title="Permalink to torrent"
            className="ab-permalink-btn"
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
      {tableType === "anime" && <td className="ab-col-group">{torrent.group || ""}</td>}
    </>
  );

  const commonRowEnd = (
    <>
      <td className="ab-col-size">{torrent.size}</td>

      <td className="ab-col-snatches">{torrent.snatches}</td>

      <td className="ab-col-seeders">{torrent.seeders}</td>

      <td className="ab-col-leechers">{torrent.leechers}</td>

      <td className="ab-col-flags">
        {torrent.flags.length > 0 && (
          <div className="ab-flags">
            {torrent.flags.map((flag: string, index: number) => (
              <span
                key={`${torrent.torrentId}-${index}`}
                className="ab-flag"
                dangerouslySetInnerHTML={{ __html: flag }}
              />
            ))}
          </div>
        )}
      </td>

      <td className="ab-col-report">
        <a
          href={`/reports.php?action=report&type=torrent&id=${torrent.torrentId}`}
          title="Report torrent"
          className="ab-report-btn"
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
            <td className="ab-col-format">{torrent.format || ""}</td>

            {showRegionColumn && <td className="ab-col-region">{torrent.region || ""}</td>}

            <td className="ab-col-container">{torrent.container || ""}</td>

            <td className="ab-col-video-codec">{torrent.videoCodec || ""}</td>

            {!compactResolutionMode && <td className="ab-col-aspect-ratio">{torrent.aspectRatio || ""}</td>}

            <td className="ab-col-resolution">{getCompactResolution()}</td>

            <td className="ab-col-audio">{torrent.audio || ""}</td>

            <td className="ab-col-audio-channels">{torrent.audioChannels || ""}</td>

            {showDualAudioColumn && (
              <td className="ab-col-dual-audio">
                {torrent.hasDualAudio ? (
                  <Check size={14} className="ab-dual-audio-check" />
                ) : (
                  <X size={14} className="ab-dual-audio-cross" />
                )}
              </td>
            )}

            <td className="ab-col-subtitles">{torrent.subtitles || ""}</td>
          </>
        );

      case "printed_media":
        return (
          <>
            <td className="ab-col-printed-type">{torrent.printedMediaType || ""}</td>

            <td className="ab-col-translator">{torrent.translator || ""}</td>

            <td className="ab-col-digital">
              {torrent.isDigital ? (
                <Check size={14} className="ab-digital-check" />
              ) : (
                <X size={14} className="ab-digital-cross" />
              )}
            </td>

            <td className="ab-col-printed-format">{torrent.printedFormat || ""}</td>

            <td className="ab-col-ongoing">
              {torrent.isOngoing ? (
                <Check size={14} className="ab-ongoing-check" />
              ) : (
                <X size={14} className="ab-ongoing-cross" />
              )}
            </td>
          </>
        );

      case "games":
        return (
          <>
            <td className="ab-col-game-type">{torrent.gameType || ""}</td>

            <td className="ab-col-platform">{torrent.platform || ""}</td>

            <td className="ab-col-game-region">{torrent.gameRegion || ""}</td>

            <td className="ab-col-archived">
              {torrent.isArchived ? (
                <Check size={14} className="ab-archived-check" />
              ) : (
                <X size={14} className="ab-archived-cross" />
              )}
            </td>
          </>
        );

      case "music":
        return (
          <>
            <td className="ab-col-music-codec">{torrent.musicCodec || ""}</td>

            <td className="ab-col-bitrate">{torrent.bitrate || ""}</td>

            <td className="ab-col-media">{torrent.media || ""}</td>

            <td className="ab-col-log">
              {torrent.hasLog ? <Check size={14} className="ab-log-check" /> : <X size={14} className="ab-log-cross" />}
            </td>

            <td className="ab-col-cue">
              {torrent.hasCue ? <Check size={14} className="ab-cue-check" /> : <X size={14} className="ab-cue-cross" />}
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
      <tr className={getRowClasses()} data-torrent-id={torrent.torrentId} onClick={handleRowClick}>
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
