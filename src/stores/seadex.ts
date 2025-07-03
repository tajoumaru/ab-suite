import { useEffect, useState } from "preact/hooks";
import type { SeaDexEntry } from "@/types";

interface SeaDexData {
  [torrentId: string]: SeaDexEntry;
}

interface SeaDexStore {
  data: SeaDexData;
  isProcessing: boolean;
  lastUpdate: number;
  subscribe: (callback: () => void) => () => void;
  getData: (torrentId: string) => SeaDexEntry | null;
}

class SimpleSeaDexStore {
  private state = {
    data: {} as SeaDexData,
    isProcessing: false,
    lastUpdate: 0,
  };

  private subscribers = new Set<() => void>();

  get data() {
    return this.state.data;
  }

  get isProcessing() {
    return this.state.isProcessing;
  }

  get lastUpdate() {
    return this.state.lastUpdate;
  }

  getData = (torrentId: string): SeaDexEntry | null => {
    return this.state.data[torrentId] || null;
  };

  updateData = (newData: SeaDexData) => {
    this.state = {
      ...this.state,
      data: { ...this.state.data, ...newData },
      lastUpdate: Date.now(),
    };
    this.notifySubscribers();
  };

  setProcessing = (isProcessing: boolean) => {
    this.state = { ...this.state, isProcessing };
    this.notifySubscribers();
  };

  clear = () => {
    this.state = {
      data: {},
      isProcessing: false,
      lastUpdate: 0,
    };
    this.notifySubscribers();
  };

  subscribe = (callback: () => void) => {
    this.subscribers.add(callback);
    return () => this.subscribers.delete(callback);
  };

  private notifySubscribers() {
    this.subscribers.forEach((callback) => callback());
  }
}

export const seadexStore = new SimpleSeaDexStore();

// Hook for React/Preact components
export function useSeaDexStore(): SeaDexStore {
  const [, forceUpdate] = useState({});

  useEffect(() => {
    return seadexStore.subscribe(() => {
      forceUpdate({});
    });
  }, []);

  return seadexStore;
}

// Hook to listen for SeaDex processing completion
export function useSeaDexUpdates(callback: () => void) {
  useEffect(() => {
    const handleSeaDexComplete = () => {
      callback();
    };

    document.addEventListener("seadex-processing-complete", handleSeaDexComplete);
    return () => {
      document.removeEventListener("seadex-processing-complete", handleSeaDexComplete);
    };
  }, [callback]);
}
