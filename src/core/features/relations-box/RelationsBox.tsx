import { useEffect, useRef, useState } from "preact/hooks";
import { useMediaInfo } from "@/core/shared/hooks/useMediaInfo";
import { useSettingsStore } from "@/lib/state/settings";
import { err } from "@/lib/utils/logging";
import { getAniListData } from "./anilistService";
import { matchRelations } from "./relationMatcher";
import { fetchSeriesPageData, type SeriesEntry } from "./seriesPageService";

interface RelationItem {
  animeBytesEntry?: SeriesEntry;
  aniListRelation?: AniListRelation;
  relationType: string;
  title: string;
  type: string;
  year?: number;
  url?: string;
  coverImage?: string;
}

interface AniListRelation {
  relationType: string;
  node: {
    title: {
      english: string | null;
      romaji: string | null;
    };
    type: string;
    source: string;
    format: string;
    startDate: {
      year: number | null;
    };
    coverImage: {
      extraLarge: string | null;
    };
  };
}

interface RelationCardProps {
  relation: RelationItem;
  compact?: boolean;
}

/**
 * Individual relation card component styled like character cards
 */
function RelationCard({ relation, compact = false }: RelationCardProps) {
  const [imageError, setImageError] = useState(false);
  const imageRef = useRef<HTMLDivElement>(null);

  // Use GM_addElement for images to bypass CSP
  useEffect(() => {
    if (relation.coverImage && !imageError && imageRef.current) {
      // Clear existing content
      imageRef.current.innerHTML = "";

      // Add image using GM_addElement
      try {
        const imgElement = GM_addElement(imageRef.current, "img", {
          src: relation.coverImage,
          alt: relation.title,
          loading: "lazy",
          style: "width: 100%; height: 100%; object-fit: cover;",
        });

        // Add onerror handler after creation since GM_addElement doesn't support function properties
        if (imgElement) {
          imgElement.onerror = () => setImageError(true);
        }
      } catch (error) {
        err("Failed to add relation cover image:", error);
        setImageError(true);
      }
    }
  }, [relation.coverImage, imageError, relation.title]);

  return (
    <div
      flex
      bg={compact ? "transparent" : "#292929"}
      rounded={compact ? "8px" : "8px"}
      border={compact ? "none" : "1 solid #444"}
      transition={compact ? "all" : "transform, box-shadow"}
      min-h={compact ? "144px" : "144px"}
      position="relative"
      flex-direction={compact ? "col" : "row"}
      w={compact ? "96px" : "auto"}
    >
      <div flex="shrink-0" w={compact ? "full" : "96px"} position="relative">
        {relation.url ? (
          <a href={relation.url} block transition="opacity" rounded={compact ? "8px" : "8px 0 0 8px"} overflow="hidden">
            <div
              w={compact ? "full" : "96px"}
              size-h-144px
              overflow="hidden"
              flex
              items="center"
              justify="center"
              bg="#333"
              ref={imageRef}
            >
              {(!relation.coverImage || imageError) && (
                <div
                  size-w="full"
                  size-h="full"
                  flex
                  items="center"
                  justify="center"
                  bg="#444"
                  text="#888 24px"
                  font="bold"
                >
                  <span>?</span>
                </div>
              )}
            </div>
          </a>
        ) : (
          <div
            w={compact ? "full" : "96px"}
            size-h-144px
            overflow="hidden"
            flex
            items="center"
            justify="center"
            bg="#333"
            ref={imageRef}
          >
            {(!relation.coverImage || imageError) && (
              <div
                size-w="full"
                size-h="full"
                flex
                items="center"
                justify="center"
                bg="#444"
                text="#888 24px"
                font="bold"
              >
                <span>?</span>
              </div>
            )}
          </div>
        )}
        {compact && (
          <div
            position="absolute bottom-0 left-0 right-0"
            bg="[rgba(30,30,30,0.7)]"
            text="white 10px"
            font="bold"
            un-tracking="0.5px"
            p="[10px_0]"
            text-align="center"
          >
            {relation.relationType}
          </div>
        )}
      </div>

      <div
        p={compact ? "12px" : "[12px_16px]"}
        min-w="0"
        flex="1"
        op={compact ? "0" : "100"}
        position={compact ? "absolute" : "relative"}
        pos-top={compact ? "0" : "auto"}
        pos-left={compact ? "100%" : "auto"}
        w={compact ? "320px" : "auto"}
        min-h={compact ? "144px" : "auto"}
        bg={compact ? "#292929" : "transparent"}
        box="border"
        z={compact ? "10" : "auto"}
        transition={compact ? "opacity 300" : "none"}
        pointer-events={compact ? "none" : "auto"}
        rounded={compact ? "[0_8px_8px_0]" : "none"}
      >
        <div text="11px white" font="bold" un-tracking="0.5px" mb="6px">
          {relation.relationType}
        </div>
        <div font="bold" mb="6px" overflow="hidden" text="14px ellipsis">
          {relation.url ? <a href={relation.url}>{relation.title}</a> : relation.title}
        </div>
        <div text="12px #bbb" position="absolute bottom-12px">
          {relation.type}
        </div>
      </div>
    </div>
  );
}

export function RelationsBox() {
  const settings = useSettingsStore();
  const [relations, setRelations] = useState<RelationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  if (!settings.relationsBoxEnabled) {
    return null;
  }

  const mediaInfo = useMediaInfo();

  useEffect(() => {
    if (!mediaInfo?.apiData?.anilist) {
      setLoading(false);
      return;
    }

    async function fetchRelations() {
      try {
        setLoading(true);
        setError(null);

        // Get series page link
        const seriesLink = document.querySelector("#content h2 > a") as HTMLAnchorElement;
        if (!seriesLink) {
          throw new Error("Could not find series page link");
        }

        // Fetch data from both sources in parallel
        if (!mediaInfo?.apiData?.anilist) {
          setRelations([]);
          return;
        }

        const [seriesData, aniListData] = await Promise.all([
          fetchSeriesPageData(seriesLink.href),
          getAniListData(mediaInfo.apiData.anilist),
        ]);

        if (!aniListData?.relations?.edges) {
          setRelations([]);
          return;
        }

        // Match the relations
        const matchedRelations = matchRelations(seriesData, aniListData.relations.edges, window.location.href);

        setRelations(matchedRelations);
      } catch (err) {
        console.error("Failed to fetch relations:", err);
        setError(err instanceof Error ? err.message : "Failed to fetch relations");
      } finally {
        setLoading(false);
      }
    }

    fetchRelations();
  }, [mediaInfo?.apiData?.anilist]);

  if (loading) {
    return (
      <div className="box" mb="20px" data-ab-section="relations">
        <div className="head">
          <strong>
            <a href="#relations" id="relations">
              Relations
            </a>
          </strong>
        </div>
        <div class="body" p="10px">
          <div text="center #666" p="20px">
            Loading relations...
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="box" mb="20px" data-ab-section="relations">
        <div className="head">
          <strong>
            <a href="#relations" id="relations">
              Relations
            </a>
          </strong>
        </div>
        <div class="body" p="10px">
          <div text="center #c44" p="20px">
            Error: {error}
          </div>
        </div>
      </div>
    );
  }

  if (!relations.length) {
    return null;
  }

  return (
    <div className="box" mb="20px" data-ab-section="relations">
      <div className="head">
        <strong>
          <a href="#relations" id="relations">
            Relations
          </a>
        </strong>
      </div>
      <div class="body" p="0">
        <div grid grid-cols={relations.length > 3 ? "[repeat(10,1fr)]" : "[repeat(3,1fr)]"} gap="12px" p="12px">
          {relations.map((relation) => (
            <RelationCard
              key={`${relation.relationType}-${relation.title}-${relation.url || ""}`}
              relation={relation}
              compact={relations.length > 3}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
