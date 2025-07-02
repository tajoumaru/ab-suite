import { useSettingsStore } from "@/stores/settings";
import type { SeadexEntry } from "@/types";
import "@/styles/seadex.css";

interface SeaDexIconProps {
  entry: SeadexEntry;
  separator?: string;
}

// Base64 encoded icons from the legacy script
const SEADEX_BEST_ICON =
  "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAACIAAAAJCAYAAABXLP43AAAAAXNSR0IArs4c6QAAAMJJREFUOE9jZBgkgFE1TWwaAwNDJhb3TCdOnHE+K8u/vN9/GLug6qffnvUqC8lcMB+bf5HVgBzyP6skH0PdtJ6JDMSIg9QxMDDOZ2D4nwhSD+EzgD0B49+e9YoR3QKYI2Bq4A6BGoCiHslgnOIINaiOQXMUSD8o1FFCC1kN0SGCy6ewEMUmj2QxONTxqcGaRmCaqB0iWMyFpx+iQwQWN+hph9g0gp4mYKEFM5fiXPP/z//5bBwMROUafDkJIzUPVLECALBqyRj71YzpAAAAAElFTkSuQmCC";

const SEADEX_STANDARD_ICON =
  "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAACIAAAAJCAYAAABXLP43AAAAAXNSR0IArs4c6QAAALJJREFUOE/NlMEOgkAMRN961Z/kqAfOfoLxA+S4n+lJMd1QUmohTTRRbi2zs9NhSuFPntLBDTgGeoZM/wl1D/0drhN+qHAyvK2O5rUYETKeA9QFyPQFJ2J20AleaqANoXWF4q9QEYqZhUwEC7whXu0rxotxouS8uL5wy2LSjqxNqo5G783FzfUtTJgRPfRtRwLeOT9pR/Tb+OxkM+IzoW4p78db84B6SG7N1ia9pflXv5UXtZlmWNmuM34AAAAASUVORK5CYII=";

export function SeaDexIcon({ entry, separator = " | " }: SeaDexIconProps) {
  const { seadexEnabled } = useSettingsStore();

  if (!seadexEnabled) {
    return null;
  }

  const handleClick = (e: Event) => {
    e.preventDefault();
    e.stopImmediatePropagation();
    window.open(`https://releases.moe/${entry.alID}`, "_blank", "noopener,noreferrer");
  };

  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      e.stopImmediatePropagation();
      window.open(`https://releases.moe/${entry.alID}`, "_blank", "noopener,noreferrer");
    }
  };

  const iconSrc = entry.isBest ? SEADEX_BEST_ICON : SEADEX_STANDARD_ICON;
  const tooltip = entry.notes ? `SeaDex Notes:\n${entry.notes}` : "View on SeaDex";

  return (
    <>
      {separator}
      <button
        type="button"
        className="ab-seadex-icon"
        onClick={handleClick}
        onKeyDown={handleKeyDown}
        title={tooltip}
        aria-label={`Open SeaDex entry for ${entry.alID}${entry.isBest ? " (Best Choice)" : ""}`}
        style={{ background: "none", border: "none", padding: 0, cursor: "pointer" }}
      >
        <img src={iconSrc} alt={entry.isBest ? "SeaDex Best Choice" : "SeaDex Standard"} style={{ display: "block" }} />
      </button>
    </>
  );
}
