import type { ComponentType } from "preact";
import { render } from "preact";
// Hooks and utilities
import { withSettings } from "@/hooks/withSettings";
// Components
import { AniListHostIntegration } from "@/modules/anilist";
import { AnimeBytesHostIntegration } from "@/modules/animebytes";
import { SearchPage } from "@/modules/animebytes/search-page";
import { SeriesPage } from "@/modules/animebytes/series-page";
import { TorrentGroupPage } from "@/modules/animebytes/torrent-page";
import { ReleasesIntegration } from "@/modules/releases";
import { SeaDexIntegration } from "@/modules/seadex";
import { YouTubeIntegration } from "@/modules/youtube";
import { log, warn } from "@/utils/logging";
// Styles
import "@/styles";

function AniListAppBase() {
  return <AniListHostIntegration />;
}

function AnimeBytesAppBase() {
  return (
    <>
      <AnimeBytesHostIntegration />
      <SearchPage />
      <SeaDexIntegration />
      <TorrentGroupPage />
      <SeriesPage />
    </>
  );
}

function ReleasesAppBase() {
  return <ReleasesIntegration />;
}

function YouTubeAppBase() {
  return <YouTubeIntegration />;
}

// Wrap all page components with settings HOC
const AniListApp = withSettings(AniListAppBase);
const AnimeBytesApp = withSettings(AnimeBytesAppBase);
const ReleasesApp = withSettings(ReleasesAppBase);
const YouTubeApp = withSettings(YouTubeAppBase);

// Hostname-based routing configuration
const pageMap: Record<string, ComponentType<object>> = {
  "anilist.co": AniListApp,
  "animebytes.tv": AnimeBytesApp,
  "releases.moe": ReleasesApp,
  "www.youtube-nocookie.com": YouTubeApp,
  "www.youtube.com": YouTubeApp,
};

function App() {
  const hostname = window.location.hostname;

  // Log initialization
  log("Initialized on", hostname);

  const PageComponent = pageMap[hostname];

  if (!PageComponent) {
    warn("Unknown hostname", hostname);
    return null;
  }

  return <PageComponent />;
}

// Initialize the app
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", () => {
    const container = document.createElement("div");
    container.id = "ab-suite-root";
    container.style.display = "none"; // Hidden container for logic-only components
    document.body.appendChild(container);

    render(<App />, container);
  });
} else {
  const container = document.createElement("div");
  container.id = "ab-suite-root";
  container.style.display = "none";
  document.body.appendChild(container);

  render(<App />, container);
}
