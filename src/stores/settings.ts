import { GM_getValue, GM_setValue } from "$";
import { useEffect, useState } from "preact/hooks";

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
}

interface SettingsStore extends Settings {
  isLoaded: boolean;
  loadSettings: () => void;
  updateSetting: (key: keyof Settings, value: boolean) => void;
  toggleSetting: (key: keyof Settings) => void;
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
};

// Simple store implementation
class SimpleSettingsStore {
  private state = {
    ...DEFAULT_SETTINGS,
    isLoaded: false,
  };

  private subscribers = new Set<() => void>();

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

  get isLoaded() {
    return this.state.isLoaded;
  }

  loadSettings = () => {
    try {
      const anilistIntegrationEnabled = GM_getValue(
        "ab-suite-anilistIntegrationEnabled",
        DEFAULT_SETTINGS.anilistIntegrationEnabled,
      );
      const seadexEnabled = GM_getValue("ab-suite-seadexEnabled", DEFAULT_SETTINGS.seadexEnabled);
      const tableRestructureEnabled = GM_getValue(
        "ab-suite-tableRestructureEnabled",
        DEFAULT_SETTINGS.tableRestructureEnabled,
      );
      const compactResolutionMode = GM_getValue(
        "ab-suite-compactResolutionMode",
        DEFAULT_SETTINGS.compactResolutionMode,
      );
      const showRegionColumn = GM_getValue("ab-suite-showRegionColumn", DEFAULT_SETTINGS.showRegionColumn);
      const showDualAudioColumn = GM_getValue("ab-suite-showDualAudioColumn", DEFAULT_SETTINGS.showDualAudioColumn);
      const mediainfoParserEnabled = GM_getValue("ab-suite-mediainfoParserEnabled", DEFAULT_SETTINGS.mediainfoParserEnabled);
      const interactiveSearchEnabled = GM_getValue("ab-suite-interactiveSearchEnabled", DEFAULT_SETTINGS.interactiveSearchEnabled);
      const autocompleteSearchEnabled = GM_getValue("ab-suite-autocompleteSearchEnabled", DEFAULT_SETTINGS.autocompleteSearchEnabled);

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
        isLoaded: true,
      };
      this.notifySubscribers();
    } catch (error) {
      console.error("AB Suite: Failed to load settings", error);
      this.state = { ...this.state, isLoaded: true };
      this.notifySubscribers();
    }
  };

  updateSetting = (key: keyof Settings, value: boolean) => {
    try {
      GM_setValue(`ab-suite-${key}`, value);
      this.state = { ...this.state, [key]: value };
      this.notifySubscribers();
    } catch (error) {
      console.error(`AB Suite: Failed to save setting ${key}`, error);
    }
  };

  toggleSetting = (key: keyof Settings) => {
    const current = this.state[key];
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
