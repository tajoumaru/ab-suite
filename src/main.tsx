import { render } from "preact";
import { useEffect } from "preact/hooks";
// Components
import { AnimeBytesButton } from "@/modules/anilist";
import { ExternalLinks, SettingsButton, TableRestructure } from "@/modules/animebytes";
import { ReleasesIntegration, SeaDexIntegration } from "@/modules/seadex";
// Hooks and utilities
import { useSettingsStore } from "@/stores/settings";
import { mountComponent, waitForElement } from "@/utils/dom";
// Styles
import "@/styles/common.css";

function AniListApp() {
  const { loadSettings, isLoaded } = useSettingsStore();

  useEffect(() => {
    loadSettings();
  }, []);

  useEffect(() => {
    if (!isLoaded) return;

    const mountButton = async () => {
      try {
        const sidebar = await waitForElement(".sidebar");
        mountComponent(<AnimeBytesButton />, sidebar, "prepend");
      } catch (error) {
        console.error("AB Suite: Failed to mount AniList button", error);
      }
    };

    mountButton();
  }, [isLoaded]);

  return null;
}

function AnimeBytesApp() {
  const { loadSettings, isLoaded } = useSettingsStore();

  useEffect(() => {
    loadSettings();
  }, []);

  useEffect(() => {
    if (!isLoaded) return;

    const mountSettings = async () => {
      try {
        const userInfoMinor = await waitForElement("#userinfo_minor");
        mountComponent(<SettingsButton />, userInfoMinor, "prepend", "li");
      } catch (error) {
        console.error("AB Suite: Failed to mount settings button", error);
      }
    };

    mountSettings();
  }, [isLoaded]);

  return (
    <>
      <ExternalLinks />
      <SeaDexIntegration />
      <TableRestructure />
    </>
  );
}

function ReleasesApp() {
  const { loadSettings, isLoaded } = useSettingsStore();

  useEffect(() => {
    loadSettings();
  }, []);

  if (!isLoaded) return null;

  return <ReleasesIntegration />;
}

function App() {
  const hostname = window.location.hostname;

  // Add common styles
  useEffect(() => {
    // The CSS imports will be handled by vite-plugin-monkey
    console.log("AB Suite: Initialized on", hostname);
  }, []);

  switch (hostname) {
    case "anilist.co":
      return <AniListApp />;
    case "animebytes.tv":
      return <AnimeBytesApp />;
    case "releases.moe":
      return <ReleasesApp />;
    default:
      console.warn("AB Suite: Unknown hostname", hostname);
      return null;
  }
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
