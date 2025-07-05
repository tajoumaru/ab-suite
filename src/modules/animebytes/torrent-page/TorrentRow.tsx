import { Check, Download, Flag, X } from "lucide-preact";
import { TorrentDetails } from "./TorrentDetails";
import type { ParsedTorrentRow } from "./types";

interface TorrentRowProps {
  torrent: ParsedTorrentRow;
  isExpanded: boolean;
  onToggleExpanded: (torrentId: string) => void;
  compactResolutionMode: boolean;
  showRegionColumn: boolean;
  showDualAudioColumn: boolean;
  isOddGroup: boolean;
}

/**
 * Comprehensive torrent row component matching the original implementation
 */
export function TorrentRow({
  torrent,
  isExpanded,
  onToggleExpanded,
  compactResolutionMode,
  showRegionColumn,
  showDualAudioColumn,
  isOddGroup,
}: TorrentRowProps) {
  const handleToggleExpanded = () => {
    onToggleExpanded(torrent.torrentId);
  };

  const handleRowClick = (e: MouseEvent) => {
    // Only toggle if clicking on the row itself, not on buttons/links
    const target = e.target as HTMLElement;
    if (torrent.detailsHtml && !target.closest("a, button")) {
      handleToggleExpanded();
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

    return classes.join(" ");
  };

  return (
    <>
      {/* Main torrent row */}
      <tr className={getRowClasses()} data-torrent-id={torrent.torrentId} onClick={handleRowClick}>
        <td className="ab-col-download">
          <div className="ab-download-container">
            <a href={torrent.downloadLink} title="Download torrent" className="ab-download-btn">
              <Download size={16} />
            </a>
          </div>
        </td>

        <td className="ab-col-group">{torrent.group || ""}</td>

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
      </tr>

      {/* Expanded details row */}
      {isExpanded && torrent.detailsHtml && <TorrentDetails detailsHtml={torrent.detailsHtml} />}
    </>
  );
}
