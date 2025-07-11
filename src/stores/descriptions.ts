import { useEffect, useState } from "preact/hooks";

interface DescriptionState {
  original: string;
  full: string;
  isExpanded: boolean;
  isLoading: boolean;
}

// Global state - Map of torrent URL to description state
const descriptionStates = new Map<string, DescriptionState>();

// Simple event emitter for state changes
const stateChangeListeners = new Set<() => void>();

function notifyStateChange() {
  stateChangeListeners.forEach((listener) => listener());
}

export function useDescriptionStore() {
  const [, forceUpdate] = useState({});

  // Subscribe to state changes
  useEffect(() => {
    const listener = () => forceUpdate({});
    stateChangeListeners.add(listener);
    return () => stateChangeListeners.delete(listener);
  }, []);

  const getDescriptionState = (torrentUrl: string): DescriptionState => {
    if (!descriptionStates.has(torrentUrl)) {
      // Initialize with default state
      const newState: DescriptionState = {
        original: "",
        full: "",
        isExpanded: false,
        isLoading: false,
      };
      descriptionStates.set(torrentUrl, newState);
    }
    const state = descriptionStates.get(torrentUrl);
    if (!state) {
      throw new Error(`Description state not found for ${torrentUrl}`);
    }
    return state;
  };

  const setDescriptionState = (torrentUrl: string, updates: Partial<DescriptionState>) => {
    const currentState = getDescriptionState(torrentUrl);
    const newState = { ...currentState, ...updates };
    descriptionStates.set(torrentUrl, newState);
    notifyStateChange();
  };

  const initializeDescription = (torrentUrl: string, originalContent: string) => {
    if (!descriptionStates.has(torrentUrl)) {
      const newState: DescriptionState = {
        original: originalContent,
        full: originalContent,
        isExpanded: !originalContent.trim().endsWith("..."),
        isLoading: false,
      };
      descriptionStates.set(torrentUrl, newState);
      notifyStateChange();
    }
  };

  const setLoading = (torrentUrl: string, isLoading: boolean) => {
    setDescriptionState(torrentUrl, { isLoading });
  };

  const setFullDescription = (torrentUrl: string, fullContent: string) => {
    setDescriptionState(torrentUrl, {
      full: fullContent,
      isExpanded: true,
      isLoading: false,
    });
  };

  const getCurrentDescription = (torrentUrl: string): string => {
    const state = getDescriptionState(torrentUrl);
    return state.isExpanded ? state.full : state.original;
  };

  const isDescriptionExpanded = (torrentUrl: string): boolean => {
    return getDescriptionState(torrentUrl).isExpanded;
  };

  const isDescriptionLoading = (torrentUrl: string): boolean => {
    return getDescriptionState(torrentUrl).isLoading;
  };

  const needsReadMore = (torrentUrl: string): boolean => {
    const state = getDescriptionState(torrentUrl);
    return !state.isExpanded && state.original.trim().endsWith("...");
  };

  return {
    getDescriptionState,
    setDescriptionState,
    initializeDescription,
    setLoading,
    setFullDescription,
    getCurrentDescription,
    isDescriptionExpanded,
    isDescriptionLoading,
    needsReadMore,
  };
}
