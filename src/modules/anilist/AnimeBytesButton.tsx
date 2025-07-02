import { useEffect, useState } from "preact/hooks";
import { useMediaPageReady, useNavigation } from "@/hooks/useNavigation";
import { useSettingsStore } from "@/stores/settings";
import "@/styles/anilist.css";
import {
  buildAnimeBytesUrl,
  extractMediaInfo,
  getAnimeBytesFormats,
  getMediaTypeFromFormat,
} from "@/utils/format-mapping";

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
    if (!anilistIntegrationEnabled || (!isAnimePage && !isMangaPage) || !isPageReady) {
      setState((prev) => ({ ...prev, visible: false }));
      return;
    }

    setState((prev) => ({ ...prev, loading: true, error: null }));

    try {
      const mediaInfo = extractMediaInfo();
      if (!mediaInfo) {
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

      const abFormats = getAnimeBytesFormats(format, urlType as "anime" | "manga");
      if (abFormats.length === 0) {
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
