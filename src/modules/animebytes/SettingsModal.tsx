import { useEffect, useState } from "preact/hooks";
import { useSettingsStore } from "@/stores/settings";
import "@/styles/animebytes.css";
import { log } from "@/utils/logging";

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const CloseIcon = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="24"
    height="24"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
  >
    <path d="M18 6 6 18" />
    <path d="m6 6 12 12" />
  </svg>
);

export function SettingsModal({ isOpen, onClose }: SettingsModalProps) {
  const {
    anilistIntegrationEnabled,
    seadexEnabled,
    tableRestructureEnabled,
    compactResolutionMode,
    showRegionColumn,
    showDualAudioColumn,
    mediainfoParserEnabled,
    interactiveSearchEnabled,
    autocompleteSearchEnabled,
    sectionsCollapsedByDefault,
    debugLoggingEnabled,
    RatingsEnabled,
    simklClientId,
    tmdbApiToken,
    toggleSetting,
    updateStringSetting,
  } = useSettingsStore();

  const [isClosing, setIsClosing] = useState(false);

  // Handle escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        handleClose();
      }
    };

    if (isOpen) {
      document.addEventListener("keydown", handleEscape);
      // Prevent body scroll when modal is open
      document.body.style.overflow = "hidden";
    }

    return () => {
      document.removeEventListener("keydown", handleEscape);
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  const handleClose = () => {
    setIsClosing(true);
    setTimeout(() => {
      setIsClosing(false);
      onClose();
    }, 150);
  };

  const handleBackdropClick = (e: Event) => {
    if (e.target === e.currentTarget) {
      handleClose();
    }
  };

  const handleBackdropKeyDown = (e: KeyboardEvent) => {
    if ((e.key === "Enter" || e.key === " ") && e.target === e.currentTarget) {
      handleClose();
    }
  };

  const handleToggle = (
    key:
      | "anilistIntegrationEnabled"
      | "seadexEnabled"
      | "tableRestructureEnabled"
      | "compactResolutionMode"
      | "showRegionColumn"
      | "showDualAudioColumn"
      | "mediainfoParserEnabled"
      | "interactiveSearchEnabled"
      | "autocompleteSearchEnabled"
      | "sectionsCollapsedByDefault"
      | "debugLoggingEnabled"
      | "RatingsEnabled",
  ) => {
    toggleSetting(key);

    // Show a brief notification that settings will apply after reload
    if (
      key === "anilistIntegrationEnabled" ||
      key === "seadexEnabled" ||
      key === "tableRestructureEnabled" ||
      key === "compactResolutionMode" ||
      key === "showRegionColumn" ||
      key === "showDualAudioColumn" ||
      key === "mediainfoParserEnabled" ||
      key === "interactiveSearchEnabled" ||
      key === "autocompleteSearchEnabled" ||
      key === "sectionsCollapsedByDefault" ||
      key === "debugLoggingEnabled" ||
      key === "RatingsEnabled"
    ) {
      // Could add a toast notification here in the future
      log("AB Suite: Setting updated. Some changes may require a page reload.");
    }
  };

  if (!isOpen && !isClosing) {
    return null;
  }

  return (
    <div
      className={`ab-settings-modal ${isClosing ? "ab-fade-out" : "ab-fade-in"}`}
      onClick={handleBackdropClick}
      onKeyDown={handleBackdropKeyDown}
      role="dialog"
      aria-modal="true"
      aria-labelledby="ab-settings-title"
      tabIndex={-1}
    >
      <div className="ab-settings-content">
        <div className="ab-settings-header">
          <h3 id="ab-settings-title">AnimeBytes Suite Settings</h3>
          <button className="ab-settings-close" onClick={handleClose} aria-label="Close settings" type="button">
            <CloseIcon />
          </button>
        </div>

        <div className="ab-settings-option">
          <div className="ab-settings-option-content">
            <strong>AniList Integration</strong>
            <div>Adds AB buttons to AniList and AniList/MD links to AB.</div>
          </div>
          <button
            className={`ab-settings-toggle ${anilistIntegrationEnabled ? "active" : ""}`}
            onClick={() => handleToggle("anilistIntegrationEnabled")}
            aria-label={`Toggle AniList integration ${anilistIntegrationEnabled ? "off" : "on"}`}
            type="button"
          />
        </div>

        <div className="ab-settings-option">
          <div className="ab-settings-option-content">
            <strong>Comprehensive Ratings</strong>
            <div>
              Shows ratings from AniDB, AniList, Kitsu, MyAnimeList, TMDB, and IMDb with detailed score breakdowns.
            </div>
          </div>
          <button
            className={`ab-settings-toggle ${RatingsEnabled ? "active" : ""}`}
            onClick={() => handleToggle("RatingsEnabled")}
            aria-label={`Toggle comprehensive ratings ${RatingsEnabled ? "off" : "on"}`}
            type="button"
          />
        </div>

        <div className="ab-settings-option">
          <div className="ab-settings-option-content">
            <strong>SIMKL Client ID</strong>
            <div>
              Optional API key for SIMKL integration to fetch additional IDs (TMDB, IMDB). Get yours at
              simkl.com/settings/developer
            </div>
            <input
              type="text"
              placeholder="Enter SIMKL Client ID (optional)"
              value={simklClientId}
              onChange={(e) => updateStringSetting("simklClientId", (e.target as HTMLInputElement).value)}
              className="ab-settings-input"
            />
          </div>
        </div>

        <div className="ab-settings-option">
          <div className="ab-settings-option-content">
            <strong>TMDB API Token</strong>
            <div>
              Required for TMDB and IMDb ratings in Comprehensive Ratings. Get yours at themoviedb.org/settings/api
            </div>
            <input
              type="text"
              placeholder="Enter TMDB API Bearer Token (required for TMDB/IMDb ratings)"
              value={tmdbApiToken}
              onChange={(e) => updateStringSetting("tmdbApiToken", (e.target as HTMLInputElement).value)}
              className="ab-settings-input"
            />
          </div>
        </div>

        <div className="ab-settings-option">
          <div className="ab-settings-option-content">
            <strong>SeaDex Integration</strong>
            <div>Tags recommended releases on torrent pages.</div>
          </div>
          <button
            className={`ab-settings-toggle ${seadexEnabled ? "active" : ""}`}
            onClick={() => handleToggle("seadexEnabled")}
            aria-label={`Toggle SeaDex integration ${seadexEnabled ? "off" : "on"}`}
            type="button"
          />
        </div>

        <div className="ab-settings-option">
          <div className="ab-settings-option-content">
            <strong>Modern Table Layout</strong>
            <div>Restructures torrent tables with organized columns for format info.</div>
          </div>
          <button
            className={`ab-settings-toggle ${tableRestructureEnabled ? "active" : ""}`}
            onClick={() => handleToggle("tableRestructureEnabled")}
            aria-label={`Toggle modern table layout ${tableRestructureEnabled ? "off" : "on"}`}
            type="button"
          />
        </div>

        <div className="ab-settings-option">
          <div className="ab-settings-option-content">
            <strong>Compact Resolution Display</strong>
            <div>Shows resolution as width×height instead of separate aspect ratio and resolution columns.</div>
          </div>
          <button
            className={`ab-settings-toggle ${compactResolutionMode ? "active" : ""}`}
            onClick={() => handleToggle("compactResolutionMode")}
            aria-label={`Toggle compact resolution display ${compactResolutionMode ? "off" : "on"}`}
            type="button"
          />
        </div>

        <div className="ab-settings-option">
          <div className="ab-settings-option-content">
            <strong>Show Region Column</strong>
            <div>Displays the region column (R1, R2, A, B, etc.) in the modern table layout.</div>
          </div>
          <button
            className={`ab-settings-toggle ${showRegionColumn ? "active" : ""}`}
            onClick={() => handleToggle("showRegionColumn")}
            aria-label={`Toggle region column ${showRegionColumn ? "off" : "on"}`}
            type="button"
          />
        </div>

        <div className="ab-settings-option">
          <div className="ab-settings-option-content">
            <strong>Show Dual Audio Column</strong>
            <div>Displays the dual audio column (checkmark/X indicator) in the modern table layout.</div>
          </div>
          <button
            className={`ab-settings-toggle ${showDualAudioColumn ? "active" : ""}`}
            onClick={() => handleToggle("showDualAudioColumn")}
            aria-label={`Toggle dual audio column ${showDualAudioColumn ? "off" : "on"}`}
            type="button"
          />
        </div>

        <div className="ab-settings-option">
          <div className="ab-settings-option-content">
            <strong>MediaInfo Parser</strong>
            <div>Uses MediaInfo data to correct potentially mislabeled torrent information with actual file specs.</div>
          </div>
          <button
            className={`ab-settings-toggle ${mediainfoParserEnabled ? "active" : ""}`}
            onClick={() => handleToggle("mediainfoParserEnabled")}
            aria-label={`Toggle MediaInfo parser ${mediainfoParserEnabled ? "off" : "on"}`}
            type="button"
          />
        </div>

        <div className="ab-settings-option">
          <div className="ab-settings-option-content">
            <strong>Interactive Search Categories</strong>
            <div>
              Highlights current categories and preserves search parameters when switching between Anime and Music
              sections.
            </div>
          </div>
          <button
            className={`ab-settings-toggle ${interactiveSearchEnabled ? "active" : ""}`}
            onClick={() => handleToggle("interactiveSearchEnabled")}
            aria-label={`Toggle interactive search ${interactiveSearchEnabled ? "off" : "on"}`}
            type="button"
          />
        </div>

        <div className="ab-settings-option">
          <div className="ab-settings-option-content">
            <strong>Search Autocomplete</strong>
            <div>
              Adds autocomplete functionality to search bars with keyboard navigation and caching for improved search
              experience.
            </div>
          </div>
          <button
            className={`ab-settings-toggle ${autocompleteSearchEnabled ? "active" : ""}`}
            onClick={() => handleToggle("autocompleteSearchEnabled")}
            aria-label={`Toggle search autocomplete ${autocompleteSearchEnabled ? "off" : "on"}`}
            type="button"
          />
        </div>

        <div className="ab-settings-option">
          <div className="ab-settings-option-content">
            <strong>Load Sections Collapsed</strong>
            <div>
              When enabled, torrent table sections and groups will load collapsed by default. When disabled, they will
              load expanded.
            </div>
          </div>
          <button
            className={`ab-settings-toggle ${sectionsCollapsedByDefault ? "active" : ""}`}
            onClick={() => handleToggle("sectionsCollapsedByDefault")}
            aria-label={`Toggle load sections collapsed ${sectionsCollapsedByDefault ? "off" : "on"}`}
            type="button"
          />
        </div>

        <div className="ab-settings-option">
          <div className="ab-settings-option-content">
            <strong>Debug Logging</strong>
            <div>Enables debug logging for troubleshooting purposes.</div>
          </div>
          <button
            className={`ab-settings-toggle ${debugLoggingEnabled ? "active" : ""}`}
            onClick={() => handleToggle("debugLoggingEnabled")}
            aria-label={`Toggle debug logging ${debugLoggingEnabled ? "off" : "on"}`}
            type="button"
          />
        </div>

        <div className="ab-settings-footer">
          <p>Some changes may require refreshing the page to take effect.</p>
        </div>
      </div>
    </div>
  );
}

export function SettingsButton() {
  const [isModalOpen, setIsModalOpen] = useState(false);

  return (
    <>
      <li>
        <button
          className="ab-settings-btn"
          onClick={() => setIsModalOpen(true)}
          type="button"
          aria-label="Open AnimeBytes Suite settings"
        >
          AB Suite
        </button>
      </li>
      <SettingsModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} />
    </>
  );
}
