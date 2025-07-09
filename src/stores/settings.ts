import { useEffect, useState } from "preact/hooks";

// Constant for settings keys prefix to avoid magic strings
const SETTINGS_KEY_PREFIX = "ab-suite-";

export interface Settings {
  anilistIntegrationEnabled: boolean;
  seadexEnabled: boolean;
  tableRestructureEnabled: boolean;
  compactResolutionMode: boolean;
  showRegionColumn: boolean;
  showDualAudioColumn: boolean;
  mediainfoParserEnabled: boolean;
  interactiveSearchEnabled: boolean;
  autocompleteSearchEnabled: boolean;
  sectionsCollapsedByDefault: boolean;
  debugLoggingEnabled: boolean;
  RatingsEnabled: boolean;
  TrailersEnabled: boolean;
  galleryViewEnabled: boolean;
  treeFilelistEnabled: boolean;
  readMoreEnabled: boolean;
  simklClientId: string;
  tmdbApiToken: string;
  youtubeApiKey: string;
}

interface SettingsStore extends Settings {
  isLoaded: boolean;
  loadSettings: () => void;
  updateSetting: <K extends keyof Settings>(key: K, value: Settings[K]) => void;
  updateStringSetting: (
    key: keyof Pick<Settings, "simklClientId" | "tmdbApiToken" | "youtubeApiKey">,
    value: string,
  ) => void;
  toggleSetting: (key: keyof Omit<Settings, "simklClientId" | "tmdbApiToken" | "youtubeApiKey">) => void;
}

const DEFAULT_SETTINGS: Settings = {
  anilistIntegrationEnabled: true,
  seadexEnabled: true,
  tableRestructureEnabled: true,
  compactResolutionMode: true,
  showRegionColumn: true,
  showDualAudioColumn: true,
  mediainfoParserEnabled: true,
  interactiveSearchEnabled: true,
  autocompleteSearchEnabled: true,
  sectionsCollapsedByDefault: true,
  debugLoggingEnabled: false,
  RatingsEnabled: true,
  TrailersEnabled: true,
  galleryViewEnabled: false,
  treeFilelistEnabled: false,
  readMoreEnabled: true,
  simklClientId: "",
  tmdbApiToken: "",
  youtubeApiKey: "",
};

// Simple store implementation
class SimpleSettingsStore {
  private state = {
    ...DEFAULT_SETTINGS,
    isLoaded: false,
  };

  private subscribers = new Set<() => void>();

  // Direct access to state properties instead of individual getters
  get anilistIntegrationEnabled() {
    return this.state.anilistIntegrationEnabled;
  }

  get seadexEnabled() {
    return this.state.seadexEnabled;
  }

  get tableRestructureEnabled() {
    return this.state.tableRestructureEnabled;
  }

  get compactResolutionMode() {
    return this.state.compactResolutionMode;
  }

  get showRegionColumn() {
    return this.state.showRegionColumn;
  }

  get showDualAudioColumn() {
    return this.state.showDualAudioColumn;
  }

  get mediainfoParserEnabled() {
    return this.state.mediainfoParserEnabled;
  }

  get interactiveSearchEnabled() {
    return this.state.interactiveSearchEnabled;
  }

  get autocompleteSearchEnabled() {
    return this.state.autocompleteSearchEnabled;
  }

  get sectionsCollapsedByDefault() {
    return this.state.sectionsCollapsedByDefault;
  }

  get debugLoggingEnabled() {
    return this.state.debugLoggingEnabled;
  }

  get RatingsEnabled() {
    return this.state.RatingsEnabled;
  }

  get simklClientId() {
    return this.state.simklClientId;
  }

  get tmdbApiToken() {
    return this.state.tmdbApiToken;
  }

  get TrailersEnabled() {
    return this.state.TrailersEnabled;
  }

  get youtubeApiKey() {
    return this.state.youtubeApiKey;
  }

  get galleryViewEnabled() {
    return this.state.galleryViewEnabled;
  }

  get treeFilelistEnabled() {
    return this.state.treeFilelistEnabled;
  }

  get readMoreEnabled() {
    return this.state.readMoreEnabled;
  }

  get isLoaded() {
    return this.state.isLoaded;
  }

  loadSettings = () => {
    try {
      const anilistIntegrationEnabled = GM_getValue(
        `${SETTINGS_KEY_PREFIX}anilistIntegrationEnabled`,
        DEFAULT_SETTINGS.anilistIntegrationEnabled,
      ) as boolean;
      const seadexEnabled = GM_getValue(
        `${SETTINGS_KEY_PREFIX}seadexEnabled`,
        DEFAULT_SETTINGS.seadexEnabled,
      ) as boolean;
      const tableRestructureEnabled = GM_getValue(
        `${SETTINGS_KEY_PREFIX}tableRestructureEnabled`,
        DEFAULT_SETTINGS.tableRestructureEnabled,
      ) as boolean;
      const compactResolutionMode = GM_getValue(
        `${SETTINGS_KEY_PREFIX}compactResolutionMode`,
        DEFAULT_SETTINGS.compactResolutionMode,
      ) as boolean;
      const showRegionColumn = GM_getValue(
        `${SETTINGS_KEY_PREFIX}showRegionColumn`,
        DEFAULT_SETTINGS.showRegionColumn,
      ) as boolean;
      const showDualAudioColumn = GM_getValue(
        `${SETTINGS_KEY_PREFIX}showDualAudioColumn`,
        DEFAULT_SETTINGS.showDualAudioColumn,
      ) as boolean;
      const mediainfoParserEnabled = GM_getValue(
        `${SETTINGS_KEY_PREFIX}mediainfoParserEnabled`,
        DEFAULT_SETTINGS.mediainfoParserEnabled,
      ) as boolean;
      const interactiveSearchEnabled = GM_getValue(
        `${SETTINGS_KEY_PREFIX}interactiveSearchEnabled`,
        DEFAULT_SETTINGS.interactiveSearchEnabled,
      ) as boolean;
      const autocompleteSearchEnabled = GM_getValue(
        `${SETTINGS_KEY_PREFIX}autocompleteSearchEnabled`,
        DEFAULT_SETTINGS.autocompleteSearchEnabled,
      ) as boolean;
      const sectionsCollapsedByDefault = GM_getValue(
        `${SETTINGS_KEY_PREFIX}sectionsCollapsedByDefault`,
        DEFAULT_SETTINGS.sectionsCollapsedByDefault,
      ) as boolean;
      const debugLoggingEnabled = GM_getValue(
        `${SETTINGS_KEY_PREFIX}debugLoggingEnabled`,
        DEFAULT_SETTINGS.debugLoggingEnabled,
      ) as boolean;
      const RatingsEnabled = GM_getValue(
        `${SETTINGS_KEY_PREFIX}RatingsEnabled`,
        DEFAULT_SETTINGS.RatingsEnabled,
      ) as boolean;
      const simklClientId = GM_getValue(
        `${SETTINGS_KEY_PREFIX}simklClientId`,
        DEFAULT_SETTINGS.simklClientId,
      ) as string;
      const tmdbApiToken = GM_getValue(`${SETTINGS_KEY_PREFIX}tmdbApiToken`, DEFAULT_SETTINGS.tmdbApiToken) as string;
      const TrailersEnabled = GM_getValue(
        `${SETTINGS_KEY_PREFIX}TrailersEnabled`,
        DEFAULT_SETTINGS.TrailersEnabled,
      ) as boolean;
      const youtubeApiKey = GM_getValue(
        `${SETTINGS_KEY_PREFIX}youtubeApiKey`,
        DEFAULT_SETTINGS.youtubeApiKey,
      ) as string;
      const galleryViewEnabled = GM_getValue(
        `${SETTINGS_KEY_PREFIX}galleryViewEnabled`,
        DEFAULT_SETTINGS.galleryViewEnabled,
      ) as boolean;
      const treeFilelistEnabled = GM_getValue(
        `${SETTINGS_KEY_PREFIX}treeFilelistEnabled`,
        DEFAULT_SETTINGS.treeFilelistEnabled,
      ) as boolean;
      const readMoreEnabled = GM_getValue(
        `${SETTINGS_KEY_PREFIX}readMoreEnabled`,
        DEFAULT_SETTINGS.readMoreEnabled,
      ) as boolean;

      this.state = {
        ...this.state,
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
        TrailersEnabled,
        galleryViewEnabled,
        treeFilelistEnabled,
        readMoreEnabled,
        simklClientId,
        tmdbApiToken,
        youtubeApiKey,
        isLoaded: true,
      };
      this.notifySubscribers();
    } catch (error) {
      console.error("AB Suite: Failed to load settings", error);
      this.state = { ...this.state, isLoaded: true };
      this.notifySubscribers();
    }
  };

  updateSetting = <K extends keyof Settings>(key: K, value: Settings[K]) => {
    try {
      GM_setValue(`${SETTINGS_KEY_PREFIX}${key}`, value);
      this.state = { ...this.state, [key]: value };
      this.notifySubscribers();
    } catch (error) {
      console.error(`AB Suite: Failed to save setting ${key}`, error);
    }
  };

  updateStringSetting = (
    key: keyof Pick<Settings, "simklClientId" | "tmdbApiToken" | "youtubeApiKey">,
    value: string,
  ) => {
    this.updateSetting(key, value);
  };

  toggleSetting = (key: keyof Omit<Settings, "simklClientId" | "tmdbApiToken" | "youtubeApiKey">) => {
    const current = this.state[key] as boolean;
    this.updateSetting(key, !current);
  };

  subscribe = (callback: () => void) => {
    this.subscribers.add(callback);
    return () => this.subscribers.delete(callback);
  };

  private notifySubscribers() {
    this.subscribers.forEach((callback) => callback());
  }
}

export const settingsStore = new SimpleSettingsStore();

// Hook for React/Preact components
export function useSettingsStore(): SettingsStore {
  const [, forceUpdate] = useState({});

  useEffect(() => {
    return settingsStore.subscribe(() => {
      forceUpdate({});
    });
  }, []);

  return settingsStore;
}
