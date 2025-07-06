import { useEffect, useState } from "preact/hooks";
import { useMediaPageReady, useNavigation } from "@/hooks/useNavigation";
import { useSettingsStore } from "@/stores/settings";
import "@/styles/anilist.css";
import { buildAnimeBytesUrl, getAnimeBytesFormats, getMediaTypeFromFormat } from "@/utils/format-mapping";
import { log } from "@/utils/logging";
import { extractMediaInfo } from "./utils";

interface ButtonState {
  visible: boolean;
  title: string;
  url: string;
  loading: boolean;
  error: string | null;
}

export function AnimeBytesButton() {
  const { anilistIntegrationEnabled } = useSettingsStore();
  const { isAnimePage, isMangaPage } = useNavigation();
  const isPageReady = useMediaPageReady();

  const [state, setState] = useState<ButtonState>({
    visible: false,
    title: "",
    url: "#",
    loading: false,
    error: null,
  });

  useEffect(() => {
    log("AB Suite: AnimeBytesButton useEffect triggered", {
      anilistIntegrationEnabled,
      isAnimePage,
      isMangaPage,
      isPageReady,
      currentUrl: window.location.href,
      currentPath: window.location.pathname,
    });

    if (!anilistIntegrationEnabled || (!isAnimePage && !isMangaPage) || !isPageReady) {
      log("AB Suite: AnimeBytesButton early return", {
        anilistIntegrationEnabled,
        isOnMediaPage: isAnimePage || isMangaPage,
        isPageReady,
      });
      setState((prev) => ({ ...prev, visible: false }));
      return;
    }

    setState((prev) => ({ ...prev, loading: true, error: null }));

    try {
      const mediaInfo = extractMediaInfo();
      log("AB Suite: Extracted media info", mediaInfo);

      if (!mediaInfo) {
        log("AB Suite: No media info extracted");
        setState((prev) => ({
          ...prev,
          visible: false,
          loading: false,
          error: "Could not extract media information",
        }));
        return;
      }

      const { title, year, format } = mediaInfo;
      const urlType = window.location.pathname.split("/")[1];
      log("AB Suite: Processing media", { title, year, format, urlType });

      const abFormats = getAnimeBytesFormats(format, urlType as "anime" | "manga");
      log("AB Suite: AB formats", abFormats);

      if (abFormats.length === 0) {
        log("AB Suite: No supported formats for", format);
        setState((prev) => ({
          ...prev,
          visible: false,
          loading: false,
          error: `Unsupported format: ${format}`,
        }));
        return;
      }

      const mediaType = getMediaTypeFromFormat(format, urlType);
      const searchUrl = buildAnimeBytesUrl({
        title: title.replace("&amp;", "%26"),
        year,
        mediaType,
        formats: abFormats,
      });

      log("AB Suite: Button will be visible", { searchUrl });

      setState({
        visible: true,
        title,
        url: searchUrl,
        loading: false,
        error: null,
      });
    } catch (error) {
      console.error("AB Suite: Failed to initialize AnimeBytes button", error);
      setState((prev) => ({
        ...prev,
        visible: false,
        loading: false,
        error: "Failed to initialize button",
      }));
    }
  }, [anilistIntegrationEnabled, isAnimePage, isMangaPage, isPageReady]);

  log("AB Suite: AnimeBytesButton render", {
    visible: state.visible,
    loading: state.loading,
    error: state.error,
  });

  if (!state.visible) {
    return null;
  }

  const handleClick = (e: Event) => {
    e.preventDefault();
    if (state.url && state.url !== "#") {
      window.open(state.url, "_blank", "noopener,noreferrer");
    }
  };

  return (
    <div className="ab-fade-in" {...(state.loading ? { "data-ab-cloak": "" } : {})}>
      <a
        href={state.url}
        onClick={handleClick}
        target="_blank"
        rel="noopener noreferrer"
        title={`Search "${state.title}" on AnimeBytes`}
      >
        <div className={`ab-button ${state.loading ? "ab-loading" : ""}`}>
          <img className="ab-logo" src="https://animebytes.tv/static/favicon-5fc4df4e68.ico" alt="AnimeBytes" />
          <img
            className="ab-banner"
            src="https://animebytes.tv/static/css/coalbytes/images/logo-b6ffe89f0a.svg"
            alt="AnimeBytes"
          />
        </div>
      </a>
      {state.error && <div className="ab-error">{state.error}</div>}
    </div>
  );
}
