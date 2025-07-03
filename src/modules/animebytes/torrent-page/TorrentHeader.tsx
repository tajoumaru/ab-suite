import { ChevronDown, ChevronsUpDown, ChevronUp } from "lucide-preact";
import type { SortColumn, SortDirection } from "./types";

interface TorrentHeaderProps {
  sortColumn: SortColumn;
  sortDirection: SortDirection;
  onSort: (column: SortColumn) => void;
  showRegionColumn: boolean;
  showDualAudioColumn: boolean;
  compactResolutionMode: boolean;
}

/**
 * Table header component with comprehensive column layout matching the original implementation
 */
export function TorrentHeader({
  sortColumn,
  sortDirection,
  onSort,
  showRegionColumn,
  showDualAudioColumn,
  compactResolutionMode,
}: TorrentHeaderProps) {
  const handleSort = (column: SortColumn) => {
    onSort(column);
  };

  const handleSortKeyDown = (e: KeyboardEvent, column: SortColumn) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      handleSort(column);
    }
  };

  const renderSortIndicator = (column: SortColumn) => {
    if (sortColumn !== column) {
      return <ChevronsUpDown size={14} className="ab-sort-indicator" />;
    }

    return sortDirection === "asc" ? (
      <ChevronUp size={14} className="ab-sort-indicator ab-sort-active" />
    ) : (
      <ChevronDown size={14} className="ab-sort-indicator ab-sort-active" />
    );
  };

  const SortableHeader = ({
    column,
    children,
    className = "",
    title,
  }: {
    column: SortColumn;
    children: preact.ComponentChildren;
    className?: string;
    title?: string;
  }) => (
    <td
      className={`${className} ab-sortable`}
      onClick={() => handleSort(column)}
      onKeyDown={(e) => handleSortKeyDown(e, column)}
      title={title}
    >
      <div className="ab-header-content">
        {children}
        {renderSortIndicator(column)}
      </div>
    </td>
  );

  return (
    <thead>
      <tr className="ab-modern-header">
        <td className="ab-col-download"></td>

        <SortableHeader column="group" className="ab-col-group" title="Sort by Group">
          Group
        </SortableHeader>

        <SortableHeader column="format" className="ab-col-format" title="Sort by Source">
          Source
        </SortableHeader>

        {showRegionColumn && (
          <SortableHeader column="region" className="ab-col-region" title="Sort by Region">
            Region
          </SortableHeader>
        )}

        <SortableHeader column="container" className="ab-col-container" title="Sort by Container">
          Container
        </SortableHeader>

        <SortableHeader column="videoCodec" className="ab-col-video-codec" title="Sort by Codec">
          Codec
        </SortableHeader>

        {!compactResolutionMode && <td className="ab-col-aspect-ratio">Aspect</td>}

        <SortableHeader column="resolution" className="ab-col-resolution" title="Sort by Resolution">
          Resolution
        </SortableHeader>

        <SortableHeader column="audio" className="ab-col-audio" title="Sort by Audio">
          Audio
        </SortableHeader>

        <SortableHeader column="audioChannels" className="ab-col-audio-channels" title="Sort by Channels">
          Channels
        </SortableHeader>

        {showDualAudioColumn && (
          <SortableHeader column="hasDualAudio" className="ab-col-dual-audio" title="Sort by Dual Audio">
            Dual Audio
          </SortableHeader>
        )}

        <SortableHeader column="subtitles" className="ab-col-subtitles" title="Sort by Subtitles">
          Subtitles
        </SortableHeader>

        <SortableHeader column="size" className="ab-col-size" title="Sort by Size">
          Size
        </SortableHeader>

        <SortableHeader column="snatches" className="ab-col-snatches" title="Sort by Snatches">
          <img src="/static/css/coalbytes/images/snatched.svg" alt="Snatches" title="Snatches" />
        </SortableHeader>

        <SortableHeader column="seeders" className="ab-col-seeders" title="Sort by Seeders">
          <img src="/static/css/coalbytes/images/seeders.svg" alt="Seeders" title="Seeders" />
        </SortableHeader>

        <SortableHeader column="leechers" className="ab-col-leechers" title="Sort by Leechers">
          <img src="/static/css/coalbytes/images/leechers.svg" alt="Leechers" title="Leechers" />
        </SortableHeader>

        <SortableHeader column="flags" className="ab-col-flags" title="Sort by Flags">
          Flags
        </SortableHeader>

        <td className="ab-col-report"></td>
      </tr>
    </thead>
  );
}
