import { ChevronDown, ChevronsUpDown, ChevronUp, Maximize2, Minimize2 } from "lucide-preact";
import type { SortColumn, SortDirection, TableType } from "./types";

interface TorrentHeaderProps {
  sortColumn: SortColumn;
  sortDirection: SortDirection;
  onSort: (column: SortColumn) => void;
  tableType: TableType;
  showRegionColumn: boolean;
  showDualAudioColumn: boolean;
  compactResolutionMode: boolean;
  hasAnySections?: boolean;
  allSectionsExpanded?: boolean;
  onToggleAllSections?: () => void;
}

/**
 * Table header component with comprehensive column layout matching the original implementation
 */
export function TorrentHeader({
  sortColumn,
  sortDirection,
  onSort,
  tableType,
  showRegionColumn,
  showDualAudioColumn,
  compactResolutionMode,
  hasAnySections = false,
  allSectionsExpanded = true,
  onToggleAllSections,
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
      return <ChevronsUpDown size={14} op="60" transition="opacity" flex-shrink="0" />;
    }

    return sortDirection === "asc" ? (
      <ChevronUp size={14} op="100" text="#e91e63" transition="opacity" flex-shrink="0" />
    ) : (
      <ChevronDown size={14} op="100" text="#e91e63" transition="opacity" flex-shrink="0" />
    );
  };

  const SortableHeader = ({
    column,
    children,
    width,
    title,
  }: {
    column: SortColumn;
    children: preact.ComponentChildren;
    width?: string;
    title?: string;
  }) => (
    <td
      style={`width: ${width}`}
      cursor="pointer"
      select="none"
      position="relative"
      transition="background-color"
      hover="bg-[hsl(213,32%,20%)]"
      p="[8px_6px]"
      border="1px solid [hsl(0,0%,20%)]"
      text-size="12px"
      text="center"
      un-align="middle"
      onClick={() => handleSort(column)}
      onKeyDown={(e) => handleSortKeyDown(e, column)}
      title={title}
    >
      <div flex items="center" justify="center" gap="4px" min-h="16px">
        {children}
        {renderSortIndicator(column)}
      </div>
    </td>
  );

  const handleToggleAllKeyDown = (e: KeyboardEvent) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      if (onToggleAllSections) {
        onToggleAllSections();
      }
    }
  };

  // Common header elements for all table types
  const commonHeaderStart = (
    <>
      <td
        size-w-40px
        cursor={hasAnySections && onToggleAllSections ? "pointer" : undefined}
        select={hasAnySections && onToggleAllSections ? "none" : undefined}
        position={hasAnySections && onToggleAllSections ? "relative" : undefined}
        transition={hasAnySections && onToggleAllSections ? "background-color" : undefined}
        hover={hasAnySections && onToggleAllSections ? "bg-[hsl(213,32%,20%)]" : undefined}
        p="[8px_6px]"
        border="1px solid [hsl(0,0%,20%)]"
        text-size="12px"
        text="center"
        un-align="middle"
        onClick={hasAnySections && onToggleAllSections ? onToggleAllSections : undefined}
        onKeyDown={hasAnySections && onToggleAllSections ? handleToggleAllKeyDown : undefined}
        title={
          hasAnySections && onToggleAllSections
            ? allSectionsExpanded
              ? "Collapse all sections"
              : "Expand all sections"
            : undefined
        }
      >
        {hasAnySections && onToggleAllSections && (
          <div flex items="center" justify="center" gap="4px" min-h="16px">
            {allSectionsExpanded ? (
              <Minimize2 size={14} op="60" transition="opacity" flex-shrink="0" />
            ) : (
              <Maximize2 size={14} op="60" transition="opacity" flex-shrink="0" />
            )}
          </div>
        )}
      </td>

      {/* Only show Group column for anime tables */}
      {tableType === "anime" && (
        <SortableHeader column="group" width="100px" title="Sort by Group">
          Group
        </SortableHeader>
      )}
    </>
  );

  const commonHeaderEnd = (
    <>
      <SortableHeader column="size" width="60px" title="Sort by Size">
        Size
      </SortableHeader>

      <SortableHeader column="snatches" width="40px" title="Sort by Snatches">
        <img src="/static/css/coalbytes/images/snatched.svg" alt="Snatches" title="Snatches" />
      </SortableHeader>

      <SortableHeader column="seeders" width="40px" title="Sort by Seeders">
        <img src="/static/css/coalbytes/images/seeders.svg" alt="Seeders" title="Seeders" />
      </SortableHeader>

      <SortableHeader column="leechers" width="40px" title="Sort by Leechers">
        <img src="/static/css/coalbytes/images/leechers.svg" alt="Leechers" title="Leechers" />
      </SortableHeader>

      <SortableHeader column="flags" width="60px" title="Sort by Flags">
        Flags
      </SortableHeader>

      <td
        size-w-20px
        p="[8px_6px]"
        border="1px solid [hsl(0,0%,20%)]"
        text-size="12px"
        text="center"
        un-align="middle"
      ></td>
    </>
  );

  // Render different columns based on table type
  const renderTableSpecificHeaders = () => {
    switch (tableType) {
      case "anime":
        return (
          <>
            <SortableHeader column="format" width="60px" title="Sort by Source">
              Source
            </SortableHeader>

            {showRegionColumn && (
              <SortableHeader column="region" width="60px" title="Sort by Region">
                Region
              </SortableHeader>
            )}

            <SortableHeader column="container" width="60px" title="Sort by Container">
              Container
            </SortableHeader>

            <SortableHeader column="videoCodec" width="70px" title="Sort by Codec">
              Codec
            </SortableHeader>

            {!compactResolutionMode && (
              <td
                size-w-60px
                p="[8px_6px]"
                border="1px solid [hsl(0,0%,20%)]"
                text-size="12px"
                text="center"
                un-align="middle"
              >
                Aspect
              </td>
            )}

            <SortableHeader column="resolution" width="70px" title="Sort by Resolution">
              Resolution
            </SortableHeader>

            <SortableHeader column="audio" width="50px" title="Sort by Audio">
              Audio
            </SortableHeader>

            <SortableHeader column="audioChannels" width="40px" title="Sort by Channels">
              Channels
            </SortableHeader>

            {showDualAudioColumn && (
              <SortableHeader column="hasDualAudio" width="40px" title="Sort by Dual Audio">
                Dual Audio
              </SortableHeader>
            )}

            <SortableHeader column="subtitles" width="80px" title="Sort by Subtitles">
              Subtitles
            </SortableHeader>
          </>
        );

      case "printed_media":
        return (
          <>
            <SortableHeader column="printedMediaType" title="Sort by Type">
              Type
            </SortableHeader>

            <SortableHeader column="translator" title="Sort by Translator">
              Translator
            </SortableHeader>

            <SortableHeader column="isDigital" title="Sort by Digital">
              Digital
            </SortableHeader>

            <SortableHeader column="printedFormat" title="Sort by Format">
              Format
            </SortableHeader>

            <SortableHeader column="isOngoing" title="Sort by Ongoing">
              Ongoing
            </SortableHeader>
          </>
        );

      case "games":
        return (
          <>
            <SortableHeader column="gameType" title="Sort by Type">
              Type
            </SortableHeader>

            <SortableHeader column="platform" title="Sort by Platform">
              Platform
            </SortableHeader>

            <SortableHeader column="gameRegion" title="Sort by Region">
              Region
            </SortableHeader>

            <SortableHeader column="isArchived" title="Sort by Archived">
              Archived
            </SortableHeader>
          </>
        );

      case "music":
        return (
          <>
            <SortableHeader column="musicCodec" title="Sort by Codec">
              Codec
            </SortableHeader>

            <SortableHeader column="bitrate" title="Sort by Bitrate">
              Bitrate
            </SortableHeader>

            <SortableHeader column="media" title="Sort by Media">
              Media
            </SortableHeader>

            <SortableHeader column="hasLog" title="Sort by Log">
              Log
            </SortableHeader>

            <SortableHeader column="hasCue" title="Sort by Cue">
              Cue
            </SortableHeader>
          </>
        );

      default:
        return null;
    }
  };

  return (
    <thead>
      <tr bg="[hsl(218,32%,15%)]" text="white" font="bold">
        {commonHeaderStart}
        {renderTableSpecificHeaders()}
        {commonHeaderEnd}
      </tr>
    </thead>
  );
}
