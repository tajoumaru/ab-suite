import { ChevronLeft, ChevronRight, Loader2, X } from "lucide-preact";
import { useEffect, useState } from "preact/hooks";
import type { ScreenshotItem } from "../types";

interface ScreenshotsTabProps {
  screenshots: ScreenshotItem[];
  isLoading: boolean;
  isLoaded: boolean;
}

/**
 * Component for rendering the screenshots tab content
 */
export function ScreenshotsTab({ screenshots, isLoading, isLoaded }: ScreenshotsTabProps) {
  const [selectedScreenshotIndex, setSelectedScreenshotIndex] = useState<number | null>(null);
  const [fullResLoadedIndices, setFullResLoadedIndices] = useState<Set<number>>(new Set());
  const [loadingAllFullRes, setLoadingAllFullRes] = useState(false);

  // Navigation functions
  const goToNext = () => {
    if (selectedScreenshotIndex !== null && screenshots.length > 0) {
      const nextIndex = (selectedScreenshotIndex + 1) % screenshots.length;
      setSelectedScreenshotIndex(nextIndex);
      // Mark the new image as loaded since we're about to display it
      setFullResLoadedIndices((prev) => new Set(prev).add(nextIndex));
    }
  };

  const goToPrev = () => {
    if (selectedScreenshotIndex !== null && screenshots.length > 0) {
      const prevIndex = (selectedScreenshotIndex - 1 + screenshots.length) % screenshots.length;
      setSelectedScreenshotIndex(prevIndex);
      // Mark the new image as loaded since we're about to display it
      setFullResLoadedIndices((prev) => new Set(prev).add(prevIndex));
    }
  };

  const closeModal = () => {
    setSelectedScreenshotIndex(null);
  };

  const openModal = (index: number) => {
    setSelectedScreenshotIndex(index);
    // Mark this image as loaded in full-res since we're about to display it
    setFullResLoadedIndices((prev) => new Set(prev).add(index));
  };

  const loadAllFullRes = async () => {
    setLoadingAllFullRes(true);

    // Create promises to preload all full-res images
    const imagePromises = screenshots.map((screenshot) => {
      return new Promise<void>((resolve) => {
        const img = new Image();
        img.onload = () => resolve();
        img.onerror = () => resolve(); // Still resolve on error to avoid hanging
        img.src = screenshot.fullUrl;
      });
    });

    // Wait for all images to load
    await Promise.all(imagePromises);

    // Mark all images as loaded
    setFullResLoadedIndices(new Set(screenshots.map((_, index) => index)));
    setLoadingAllFullRes(false);
  };

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (selectedScreenshotIndex !== null) {
        switch (e.key) {
          case "ArrowLeft":
            e.preventDefault();
            goToPrev();
            break;
          case "ArrowRight":
            e.preventDefault();
            goToNext();
            break;
          case "Escape":
            e.preventDefault();
            closeModal();
            break;
        }
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [selectedScreenshotIndex, screenshots.length]);

  const selectedScreenshot = selectedScreenshotIndex !== null ? screenshots[selectedScreenshotIndex] : null;

  // Show loading state
  if (isLoading) {
    return (
      <div className="ab-details-tab-content">
        <div className="ab-loading">
          <Loader2 size={24} className="animate-spin" />
          <div>Loading screenshots...</div>
        </div>
      </div>
    );
  }

  // Show "no screenshots found" message if loaded but empty
  if (isLoaded && screenshots.length === 0) {
    return (
      <div className="ab-details-tab-content">
        <div className="ab-no-content">No screenshots found for this torrent.</div>
      </div>
    );
  }

  // Show placeholder while not yet loaded
  if (!isLoaded && screenshots.length === 0) {
    return (
      <div className="ab-details-tab-content">
        <div className="ab-no-content">Loading screenshots...</div>
      </div>
    );
  }

  return (
    <div className="ab-details-tab-content ab-screenshots-tab-content">
      {/* Load All Full-Res Button */}
      {fullResLoadedIndices.size < screenshots.length && (
        <button type="button" className="ab-load-all-fullres" onClick={loadAllFullRes} disabled={loadingAllFullRes}>
          {loadingAllFullRes ? (
            <>
              <Loader2 size={14} className="animate-spin" />
              Loading Full-Res...
            </>
          ) : (
            `Load All Full-Res (${screenshots.length})`
          )}
        </button>
      )}

      <div className="ab-screenshots-grid">
        {screenshots.map((screenshot, index) => {
          const isFullResLoaded = fullResLoadedIndices.has(index);
          const imageUrl = isFullResLoaded ? screenshot.fullUrl : screenshot.thumbnailUrl;

          return (
            <button
              key={`screenshot-${screenshot.id}`}
              type="button"
              className="ab-screenshot-item"
              onClick={() => openModal(index)}
            >
              <img src={imageUrl} alt={screenshot.title} title={screenshot.title} />
              {isFullResLoaded && <div className="ab-fullres-indicator">HD</div>}
            </button>
          );
        })}
      </div>

      {/* Modal for full-size screenshot */}
      {selectedScreenshot && (
        <button type="button" className="ab-screenshot-modal" onClick={closeModal}>
          {/* Close button */}
          <button
            type="button"
            className="ab-screenshot-close"
            onClick={(e) => {
              e.stopPropagation();
              closeModal();
            }}
          >
            <X size={20} />
          </button>

          {/* Previous button */}
          {screenshots.length > 1 && (
            <button
              type="button"
              className="ab-screenshot-nav ab-screenshot-prev"
              onClick={(e) => {
                e.stopPropagation();
                goToPrev();
              }}
            >
              <ChevronLeft size={24} />
            </button>
          )}

          {/* Next button */}
          {screenshots.length > 1 && (
            <button
              type="button"
              className="ab-screenshot-nav ab-screenshot-next"
              onClick={(e) => {
                e.stopPropagation();
                goToNext();
              }}
            >
              <ChevronRight size={24} />
            </button>
          )}

          {/* Screenshot image */}
          <img src={selectedScreenshot.fullUrl} alt={selectedScreenshot.title} />

          {/* Screenshot info */}
          <div className="ab-screenshot-info">
            {selectedScreenshotIndex ? selectedScreenshotIndex + 1 : 0} of {screenshots.length}
            {selectedScreenshot.title && <div className="ab-screenshot-info-title">{selectedScreenshot.title}</div>}
          </div>
        </button>
      )}
    </div>
  );
}
