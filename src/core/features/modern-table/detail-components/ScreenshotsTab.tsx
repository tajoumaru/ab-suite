import { ChevronLeft, ChevronRight, Loader2, X } from "lucide-preact";
import { useEffect, useState } from "preact/hooks";
import type { ScreenshotItem } from "./types";

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
      <div text="white">
        <div text="center" p="20px">
          <Loader2 size={24} animate="spin" />
          <div mt="8px">Loading screenshots...</div>
        </div>
      </div>
    );
  }

  // Show "no screenshots found" message if loaded but empty
  if (isLoaded && screenshots.length === 0) {
    return (
      <div text="white">
        <div text="center #888" p="20px">
          No screenshots found for this torrent.
        </div>
      </div>
    );
  }

  // Show placeholder while not yet loaded
  if (!isLoaded && screenshots.length === 0) {
    return (
      <div text="white">
        <div text="center #888" p="20px">
          Loading screenshots...
        </div>
      </div>
    );
  }

  return (
    <div text="white" text-align="center">
      {/* Load All Full-Res Button */}
      {fullResLoadedIndices.size < screenshots.length && (
        <button
          type="button"
          bg="#4a5568"
          text="white"
          border="none"
          rounded="4px"
          p="[8px_16px]"
          cursor="pointer"
          text-size="12px"
          inline-flex
          items="center"
          gap="6px"
          transition="background"
          mb="16px"
          hover="bg-#5a6578"
          disabled={loadingAllFullRes}
          op={loadingAllFullRes ? "60" : "100"}
          style={{ cursor: loadingAllFullRes ? "not-allowed" : "pointer" }}
          onClick={loadAllFullRes}
        >
          {loadingAllFullRes ? (
            <>
              <Loader2 size={14} animate="spin" />
              Loading Full-Res...
            </>
          ) : (
            `Load All Full-Res (${screenshots.length})`
          )}
        </button>
      )}

      <div grid grid-cols="[repeat(4,1fr)]" gap="8px" text-align="left">
        {screenshots.map((screenshot, index) => {
          const isFullResLoaded = fullResLoadedIndices.has(index);
          const imageUrl = isFullResLoaded ? screenshot.fullUrl : screenshot.thumbnailUrl;

          return (
            <button
              key={`screenshot-${screenshot.id}`}
              type="button"
              position="relative"
              cursor="pointer"
              rounded="4px"
              overflow="hidden"
              border="1px solid #333"
              p="0"
              bg="[none]"
              transition="border-color"
              hover="border-#555"
              onClick={() => openModal(index)}
            >
              <img src={imageUrl} alt={screenshot.title} title={screenshot.title} size-w="full" size-h="auto" block />
              {isFullResLoaded && (
                <div
                  pos="absolute top-1 right-1"
                  pointer-events-none
                  bg="[rgba(0,0,0,0.7)]"
                  text="white"
                  text-size="10px"
                  p="[2px_4px]"
                  rounded="2px"
                >
                  HD
                </div>
              )}
            </button>
          );
        })}
      </div>

      {/* Modal for full-size screenshot */}
      {selectedScreenshot && (
        <button
          type="button"
          pos="fixed inset-0 z-10000"
          bg="[rgba(0,0,0,0.9)]"
          flex
          items="center"
          justify="center"
          border="none"
          p="0"
          onClick={closeModal}
        >
          {/* Close button */}
          <button
            type="button"
            pos="absolute top-20px right-20px z-10001"
            bg="[rgba(0,0,0,0.7)]"
            border="none"
            rounded="50%"
            size-w-40px
            size-h-40px
            flex
            items="center"
            justify="center"
            cursor="pointer"
            text="white"
            transition="background"
            hover="bg-[rgba(0,0,0,0.9)]"
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
              pos="absolute top-50% left-20px z-10001"
              transform="-translate-y-50%"
              bg="[rgba(0,0,0,0.7)]"
              border="none"
              rounded="50%"
              size-w-50px
              size-h-50px
              flex
              items="center"
              justify="center"
              cursor="pointer"
              text="white"
              transition="background"
              hover="bg-[rgba(0,0,0,0.9)]"
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
              pos="absolute top-50% right-20px z-10001"
              transform="-translate-y-50%"
              bg="[rgba(0,0,0,0.7)]"
              border="none"
              rounded="50%"
              size-w-50px
              size-h-50px
              flex
              items="center"
              justify="center"
              cursor="pointer"
              text="white"
              transition="background"
              hover="bg-[rgba(0,0,0,0.9)]"
              onClick={(e) => {
                e.stopPropagation();
                goToNext();
              }}
            >
              <ChevronRight size={24} />
            </button>
          )}

          {/* Screenshot image */}
          <img
            src={selectedScreenshot.fullUrl}
            alt={selectedScreenshot.title}
            object-contain
            max-w="90vw"
            max-h="90vh"
            cursor="default"
          />

          {/* Screenshot info */}
          <div
            pos="absolute bottom-20px left-50%"
            transform="-translate-x-50%"
            bg="[rgba(0,0,0,0.7)]"
            text="white"
            p="[8px_16px]"
            rounded="4px"
            text-size="12px"
            text-align="center"
          >
            {selectedScreenshotIndex ? selectedScreenshotIndex + 1 : 0} of {screenshots.length}
            {selectedScreenshot.title && (
              <div mt="4px" text-size="11px" text="#ccc">
                {selectedScreenshot.title}
              </div>
            )}
          </div>
        </button>
      )}
    </div>
  );
}
