import { useAsync } from "@/hooks/useAsync";
import { useMediaPageReady, useNavigation } from "@/hooks/useNavigation";
import { useSettingsStore } from "@/stores/settings";
import "@/styles/anilist.css";
import { buildAnimeBytesUrl, getAnimeBytesFormats, getMediaTypeFromFormat } from "@/utils/format-mapping";
import { err, log } from "@/utils/logging";
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
        err("Failed to initialize AnimeBytes button", error);
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
    <div className="ab-fade-in" {...(buttonAsync.loading ? { "data-ab-cloak": "" } : {})}>
      <a
        href={buttonData.url}
        onClick={handleClick}
        target="_blank"
        rel="noopener noreferrer"
        title={`Search "${buttonData.title}" on AnimeBytes`}
      >
        <div className={`ab-button ${buttonAsync.loading ? "ab-loading" : ""}`}>
          <img className="ab-logo" src="https://animebytes.tv/static/favicon-5fc4df4e68.ico" alt="AnimeBytes" />
          <img
            className="ab-banner"
            src="https://animebytes.tv/static/css/coalbytes/images/logo-b6ffe89f0a.svg"
            alt="AnimeBytes"
          />
        </div>
      </a>
      {buttonAsync.error && <div className="ab-error">{buttonAsync.error}</div>}
    </div>
  );
}
