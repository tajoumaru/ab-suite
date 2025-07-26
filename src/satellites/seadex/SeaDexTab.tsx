import type { SeaDexEntry } from "@/lib/types";

interface SeaDexTabProps {
  entry: SeaDexEntry;
}

export function SeaDexTab({ entry }: SeaDexTabProps) {
  return (
    <div p="10px" text="inherit">
      <div>
        <a
          href={`https://releases.moe/${entry.alID}`}
          target="_blank"
          rel="noopener noreferrer"
          text="1.1em"
          font="bold"
          inline-block
          mb="8px"
          hover="underline"
          un-break="all"
        >
          SeaDex Entry
        </a>
      </div>

      <div border="t-1 t-solid t-#bbb" />

      {entry.notes && (
        <div>
          <h2 mt="16px" mb="4px" first="mt-0">
            Notes
          </h2>
          <div un-ws="pre-wrap">{entry.notes}</div>
        </div>
      )}

      {entry.comparison && entry.comparison.length > 0 && (
        <div>
          <h2 mt="16px" mb="4px" first="mt-0">
            Comparisons
          </h2>
          <ul list="none" p="0" m="y-8px x-0">
            {entry.comparison.map((link) => (
              <li key={link} mb="4px" p="y-4px x-0">
                <a href={link} target="_blank" rel="noopener noreferrer" hover="underline" un-break="all">
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
