import type { ComponentType } from "preact";
import { render } from "preact";
// Hooks and utilities
import { withSettings } from "@/hooks/withSettings";
// Components
import { AniListHostIntegration } from "@/modules/anilist";
import { AnimeBytesHostIntegration } from "@/modules/animebytes";
import { SearchPage } from "@/modules/animebytes/search-page";
import { TorrentGroupPage } from "@/modules/animebytes/torrent-page";
import { ReleasesIntegration } from "@/modules/releases";
import { SeaDexIntegration } from "@/modules/seadex";
// Styles
import "@/styles/common.css";

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
    </>
  );
}

function ReleasesAppBase() {
  return <ReleasesIntegration />;
}

// Wrap all page components with settings HOC
const AniListApp = withSettings(AniListAppBase);
const AnimeBytesApp = withSettings(AnimeBytesAppBase);
const ReleasesApp = withSettings(ReleasesAppBase);

// Hostname-based routing configuration
const pageMap: Record<string, ComponentType<object>> = {
  "anilist.co": AniListApp,
  "animebytes.tv": AnimeBytesApp,
  "releases.moe": ReleasesApp,
};

function App() {
  const hostname = window.location.hostname;

  // Log initialization
  console.log("AB Suite: Initialized on", hostname);

  const PageComponent = pageMap[hostname];

  if (!PageComponent) {
    console.warn("AB Suite: Unknown hostname", hostname);
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
