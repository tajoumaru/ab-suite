import { useEffect, useRef, useState } from "preact/hooks";
import { err } from "@/lib/utils/logging";
import { useSettingsStore } from "@/lib/state/settings";
import { useMediaInfo } from "@/core/shared/hooks/useMediaInfo";
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
        GM_addElement(imageRef.current, "img", {
          src: relation.coverImage,
          alt: relation.title,
          loading: "lazy",
          style: "width: 100%; height: 100%; object-fit: cover;",
          onerror: () => setImageError(true),
        });
      } catch (error) {
        err("Failed to add relation cover image:", error);
        setImageError(true);
      }
    }
  }, [relation.coverImage, imageError, relation.title]);

  return (
    <div className={`ab-relation-card ${compact ? "ab-relation-card-compact" : ""}`}>
      <div className="ab-relation-image-section">
        {relation.url ? (
          <a href={relation.url} className="ab-relation-image-link">
            <div className="ab-relation-image" ref={imageRef}>
              {(!relation.coverImage || imageError) && (
                <div className="ab-relation-placeholder">
                  <span>?</span>
                </div>
              )}
            </div>
          </a>
        ) : (
          <div className="ab-relation-image" ref={imageRef}>
            {(!relation.coverImage || imageError) && (
              <div className="ab-relation-placeholder">
                <span>?</span>
              </div>
            )}
          </div>
        )}
        {compact && <div className="ab-relation-type-overlay">{relation.relationType}</div>}
      </div>

      <div className="ab-relation-info">
        <div className="ab-relation-type">{relation.relationType}</div>
        <div className="ab-relation-title">
          {relation.url ? <a href={relation.url}>{relation.title}</a> : relation.title}
        </div>
        <div className="ab-relation-details">{relation.type}</div>
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
      <div className="box ab-enhanced-relations" data-ab-section="relations">
        <div className="head">
          <strong>
            <a href="#relations" id="relations">
              Relations
            </a>
          </strong>
        </div>
        <div className="body ab-relations-body">
          <div className="ab-relations-loading">Loading relations...</div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="box ab-enhanced-relations" data-ab-section="relations">
        <div className="head">
          <strong>
            <a href="#relations" id="relations">
              Relations
            </a>
          </strong>
        </div>
        <div className="body ab-relations-body">
          <div className="ab-relations-error">Error: {error}</div>
        </div>
      </div>
    );
  }

  if (!relations.length) {
    return null;
  }

  return (
    <div className="box ab-enhanced-relations" data-ab-section="relations">
      <div className="head">
        <strong>
          <a href="#relations" id="relations">
            Relations
          </a>
        </strong>
      </div>
      <div className="body ab-relations-body-no-padding">
        <div className={`ab-relations-grid ${relations.length > 3 ? "ab-relations-grid-compact" : ""}`}>
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
