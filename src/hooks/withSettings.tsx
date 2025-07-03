import type { ComponentType } from "preact";
import { useEffect } from "preact/hooks";
import { useSettingsStore } from "@/stores/settings";

/**
 * Higher-Order Component that wraps page components with settings loading logic.
 * This eliminates the boilerplate of checking isLoaded in every page component.
 */
export function withSettings<P extends object>(WrappedComponent: ComponentType<P>) {
  return function WithSettingsComponent(props: P) {
    const { loadSettings, isLoaded } = useSettingsStore();

    useEffect(() => {
      loadSettings();
    }, []);

    // Only render the wrapped component once settings are loaded
    if (!isLoaded) {
      return null;
    }

    return <WrappedComponent {...props} />;
  };
}
