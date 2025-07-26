import type { ComponentType } from "preact";
import { render } from "preact";
import { SearchPage } from "@/core/pages/search";
import { SeriesPage } from "@/core/pages/series";
import { TorrentGroupPage } from "@/core/pages/torrent";
import { AnimeBytesHostIntegration } from "@/core/shared";
// Hooks and utilities
import { withSettings } from "@/lib/hooks/withSettings";
import { log, warn } from "@/lib/utils/logging";
// Components
import { AniListHostIntegration } from "@/satellites/anilist";
import { ReleasesIntegration } from "@/satellites/releases";
import { SeaDexIntegration } from "@/satellites/seadex";
import { YouTubeIntegration } from "@/satellites/youtube";
// Styles
//import "@/styles";
import "virtual:uno.css";

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
