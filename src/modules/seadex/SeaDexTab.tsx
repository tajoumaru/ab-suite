import type { SeaDexEntry } from "@/types";
import "@/styles/seadex.css";

interface SeaDexTabProps {
  entry: SeaDexEntry;
}

export function SeaDexTab({ entry }: SeaDexTabProps) {
  return (
    <div className="ab-seadex-tab-content">
      <div>
        <a
          href={`https://releases.moe/${entry.alID}`}
          target="_blank"
          rel="noopener noreferrer"
          className="ab-seadex-main-link"
        >
          SeaDex Entry
        </a>
      </div>

      <div className="ab-seadex-divider" />

      {entry.notes && (
        <div>
          <h2>Notes</h2>
          <div className="notes">{entry.notes}</div>
        </div>
      )}

      {entry.comparison && entry.comparison.length > 0 && (
        <div>
          <h2>Comparisons</h2>
          <ul className="ab-seadex-comparison-list">
            {entry.comparison.map((link) => (
              <li key={link}>
                <a href={link} target="_blank" rel="noopener noreferrer">
                  {link}
                </a>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
