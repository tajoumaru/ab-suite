import { useEffect, useState } from "preact/hooks";
import { err } from "@/utils/logging";

// Constant for settings keys prefix to avoid magic strings
const SETTINGS_KEY_PREFIX = "ab-suite-";

export interface Settings {
  anilistIntegrationEnabled: boolean;
  aniListMetadataEnabled: boolean;
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
  disableCaching: boolean;
  RatingsEnabled: boolean;
  TrailersEnabled: boolean;
  galleryViewEnabled: boolean;
  treeFilelistEnabled: boolean;
  readMoreEnabled: boolean;
  enhancedTagStylingEnabled: boolean;
  youtubeOverlayHidingEnabled: boolean;
  youtubePrivacyModeEnabled: boolean;
  quickNavigationEnabled: boolean;
  enhancedBbcodeToolbarEnabled: boolean;
  seriesTitlesEnabled: boolean;
  relationsBoxEnabled: boolean;
  characterPageEnhancements: boolean;
  collageTableEnhancements: boolean;
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
  getSettingsByType: <T extends "boolean" | "string">(
    type: T,
  ) => Record<string, T extends "boolean" ? boolean : string>;
  getAllSettings: () => Settings;
  resetToDefaults: () => void;
  subscribe: (callback: () => void) => () => void;
  subscribeToKeys: (keys: (keyof Settings)[], callback: (changedKeys: (keyof Settings)[]) => void) => () => void;
}

const DEFAULT_SETTINGS: Settings = {
  anilistIntegrationEnabled: true,
  aniListMetadataEnabled: true,
  seadexEnabled: true,
  tableRestructureEnabled: true,
  compactResolutionMode: true,
  showRegionColumn: false,
  showDualAudioColumn: false,
  mediainfoParserEnabled: true,
  interactiveSearchEnabled: true,
  autocompleteSearchEnabled: true,
  sectionsCollapsedByDefault: true,
  debugLoggingEnabled: false,
  disableCaching: false,
  RatingsEnabled: true,
  TrailersEnabled: true,
  galleryViewEnabled: true,
  treeFilelistEnabled: true,
  readMoreEnabled: true,
  enhancedTagStylingEnabled: true,
  youtubeOverlayHidingEnabled: true,
  youtubePrivacyModeEnabled: false,
  quickNavigationEnabled: true,
  enhancedBbcodeToolbarEnabled: true,
  seriesTitlesEnabled: true,
  relationsBoxEnabled: true,
  characterPageEnhancements: true,
  collageTableEnhancements: true,
  simklClientId: "",
  tmdbApiToken: "",
  youtubeApiKey: "",
};

// Add the Settings properties to the class interface via declaration merging
// biome-ignore lint/correctness/noUnusedVariables: used via declaration merging
interface SimpleSettingsStore extends Settings {
  isLoaded: boolean;
}

// Simple store implementation
// biome-ignore lint/suspicious/noUnsafeDeclarationMerging: intentional pattern for settings store
class SimpleSettingsStore {
  private state = {
    ...DEFAULT_SETTINGS,
    isLoaded: false,
  };

  private subscribers = new Set<() => void>();
  private selectiveSubscribers = new Map<(changedKeys: (keyof Settings)[]) => void, (keyof Settings)[]>();

  // Dynamic property access using getters
  // This eliminates the need for individual getter methods while maintaining type safety

  // Create dynamic getters for all settings properties
  static {
    // Add getters for all settings keys dynamically
    Object.keys(DEFAULT_SETTINGS).forEach((key) => {
      Object.defineProperty(SimpleSettingsStore.prototype, key, {
        get: function (this: SimpleSettingsStore) {
          return this.state[key as keyof Settings];
        },
        enumerable: true,
        configurable: true,
      });
    });

    // Add isLoaded getter
    Object.defineProperty(SimpleSettingsStore.prototype, "isLoaded", {
      get: function (this: SimpleSettingsStore) {
        return this.state.isLoaded;
      },
      enumerable: true,
      configurable: true,
    });
  }

  loadSettings = () => {
    try {
      // Load all settings dynamically using Object.keys to eliminate duplication
      const loadedSettings: Partial<Settings> = {};

      (Object.keys(DEFAULT_SETTINGS) as (keyof Settings)[]).forEach((key) => {
        const value = GM_getValue(`${SETTINGS_KEY_PREFIX}${key}`, DEFAULT_SETTINGS[key]);
        (loadedSettings as Record<string, unknown>)[key] = value;
      });

      this.state = {
        ...this.state,
        ...loadedSettings,
        isLoaded: true,
      };
      this.notifySubscribers();
    } catch (error) {
      err("Failed to load settings", error);
      this.state = { ...this.state, isLoaded: true };
      this.notifySubscribers();
    }
  };

  updateSetting = <K extends keyof Settings>(key: K, value: Settings[K]) => {
    try {
      GM_setValue(`${SETTINGS_KEY_PREFIX}${key}`, value);
      this.state = { ...this.state, [key]: value };
      this.notifySubscribers([key]);
    } catch (error) {
      err(`Failed to save setting ${key}`, error);
    }
  };

  // Helper type definitions for better type safety are now inlined where needed

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

  subscribeToKeys = (keys: (keyof Settings)[], callback: (changedKeys: (keyof Settings)[]) => void) => {
    this.selectiveSubscribers.set(callback, keys);
    return () => this.selectiveSubscribers.delete(callback);
  };

  // Utility methods for common operations
  getSettingsByType<T extends "boolean" | "string">(type: T): Record<string, T extends "boolean" ? boolean : string> {
    const result: Record<string, T extends "boolean" ? boolean : string> = {};
    (Object.keys(DEFAULT_SETTINGS) as (keyof Settings)[]).forEach((key) => {
      if (typeof DEFAULT_SETTINGS[key] === type) {
        (result as Record<string, unknown>)[key] = this.state[key];
      }
    });
    return result;
  }

  getAllSettings(): Settings {
    const { isLoaded: _isLoaded, ...settings } = this.state;
    return settings;
  }

  resetToDefaults = () => {
    try {
      // Clear all settings from GM storage
      (Object.keys(DEFAULT_SETTINGS) as (keyof Settings)[]).forEach((key) => {
        GM_deleteValue(`${SETTINGS_KEY_PREFIX}${key}`);
      });

      // Reset state to defaults
      this.state = {
        ...DEFAULT_SETTINGS,
        isLoaded: true,
      };
      this.notifySubscribers(Object.keys(DEFAULT_SETTINGS) as (keyof Settings)[]);
    } catch (error) {
      err("Failed to reset settings", error);
    }
  };

  private notifySubscribers(changedKeys?: (keyof Settings)[]) {
    // Notify general subscribers (for backward compatibility)
    this.subscribers.forEach((callback) => callback());

    // Notify selective subscribers only if their keys changed
    if (changedKeys && changedKeys.length > 0) {
      this.selectiveSubscribers.forEach((subscribedKeys, callback) => {
        if (subscribedKeys.some((key) => changedKeys.includes(key))) {
          callback(changedKeys);
        }
      });
    }
  }
}

export const settingsStore = new SimpleSettingsStore() as SettingsStore;

// Hook for React/Preact components
export function useSettingsStore(): SettingsStore;
export function useSettingsStore<K extends keyof Settings>(keys: K[]): SettingsStore;
export function useSettingsStore<K extends keyof Settings>(keys?: K[]): SettingsStore {
  const [, forceUpdate] = useState({});

  useEffect(() => {
    if (keys && keys.length > 0) {
      // Use selective subscription for specific keys
      return settingsStore.subscribeToKeys(keys, () => {
        forceUpdate({});
      });
    } else {
      // Use general subscription for all changes (backward compatibility)
      return settingsStore.subscribe(() => {
        forceUpdate({});
      });
    }
  }, [keys]);

  return settingsStore;
}
