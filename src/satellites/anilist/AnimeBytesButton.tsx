import { useAsync } from "@/lib/hooks/useAsync";
import { useSettingsStore } from "@/lib/state/settings";
import { err, log } from "@/lib/utils/logging";
import { useMediaPageReady, useNavigation } from "@/satellites/anilist/useNavigation";
import { buildAnimeBytesUrl, getAnimeBytesFormats, getMediaTypeFromFormat } from "@/utils/format-mapping";
import { extractMediaInfo } from "./utils";

interface ButtonData {
  visible: boolean;
  title: string;
  url: string;
}

export function AnimeBytesButton() {
  const { anilistIntegrationEnabled } = useSettingsStore(["anilistIntegrationEnabled"]);
  const { isAnimePage, isMangaPage } = useNavigation();
  const isPageReady = useMediaPageReady();

  const buttonAsync = useAsync(
    async (): Promise<ButtonData> => {
      log("AnimeBytesButton async function triggered", {
        anilistIntegrationEnabled,
        isAnimePage,
        isMangaPage,
        isPageReady,
        currentUrl: window.location.href,
        currentPath: window.location.pathname,
      });

      if (!anilistIntegrationEnabled || (!isAnimePage && !isMangaPage) || !isPageReady) {
        log("AnimeBytesButton early return", {
          anilistIntegrationEnabled,
          isOnMediaPage: isAnimePage || isMangaPage,
          isPageReady,
        });
        return { visible: false, title: "", url: "#" };
      }

      const mediaInfo = extractMediaInfo();
      log("Extracted media info", mediaInfo);

      if (!mediaInfo) {
        log("No media info extracted");
        throw new Error("Could not extract media information");
      }

      const { title, year, format } = mediaInfo;
      const urlType = window.location.pathname.split("/")[1];
      log("Processing media", { title, year, format, urlType });

      const abFormats = getAnimeBytesFormats(format, urlType as "anime" | "manga");
      log("AB formats", abFormats);

      if (abFormats.length === 0) {
        log("No supported formats for", format);
        throw new Error(`Unsupported format: ${format}`);
      }

      const mediaType = getMediaTypeFromFormat(format, urlType);
      const searchUrl = buildAnimeBytesUrl({
        title: title.replace("&amp;", "%26"),
        year,
        mediaType,
        formats: abFormats,
      });

      log("Button will be visible", { searchUrl });

      return {
        visible: true,
        title,
        url: searchUrl,
      };
    },
    {
      deps: [anilistIntegrationEnabled, isAnimePage, isMangaPage, isPageReady],
      onError: (error) => {
        err("Failed to initialize animebytes button", error);
      },
    },
  );

  const buttonData = buttonAsync.data || { visible: false, title: "", url: "#" };

  log("AnimeBytesButton render", {
    visible: buttonData.visible,
    loading: buttonAsync.loading,
    error: buttonAsync.error,
  });

  if (!buttonData.visible) {
    return null;
  }

  const handleClick = (e: Event) => {
    e.preventDefault();
    if (buttonData.url && buttonData.url !== "#") {
      window.open(buttonData.url, "_blank", "noopener,noreferrer");
    }
  };

  return (
    <div
      op={buttonAsync.loading ? "0" : "100"}
      transition="opacity 300 ease"
      {...(buttonAsync.loading ? { "data-ab-cloak": "" } : {})}
    >
      <a
        href={buttonData.url}
        onClick={handleClick}
        target="_blank"
        rel="noopener noreferrer"
        title={`Search "${buttonData.title}" on animebytes`}
      >
        <div
          size-h="34.4px"
          mb="16px"
          rounded="3px"
          block
          p="[8px_10px]"
          size-w="full"
          bg={buttonAsync.loading ? "gray-400" : "hover-#c50d58 #ed106a"}
          text="white"
          overflow="hidden"
          transition="background-color"
          un-decoration="no-underline"
          border="none"
          cursor={buttonAsync.loading ? "not-allowed" : "pointer"}
          op={buttonAsync.loading ? "60" : "100"}
        >
          <img
            size-h="17.2px"
            filter="brightness-0 invert"
            mr="10px"
            src="https://animebytes.tv/static/favicon-5fc4df4e68.ico"
            alt="animebytes"
          />
          <img pt="2px" src="https://animebytes.tv/static/css/coalbytes/images/logo-b6ffe89f0a.svg" alt="animebytes" />
        </div>
      </a>
      {buttonAsync.error && (
        <div text="red-500 sm" mt="8px">
          {buttonAsync.error}
        </div>
      )}
    </div>
  );
}
