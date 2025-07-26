import type { FilelistItem } from "./types";

interface FilelistTabProps {
  filelist: FilelistItem[];
  torrentId: string;
}

/**
 * Component for rendering the filelist tab content
 */
export function FilelistTab({ filelist, torrentId }: FilelistTabProps) {
  if (filelist.length === 0) {
    return (
      <div text="#888" text-align="center" p="20px">
        No files available.
      </div>
    );
  }

  return (
    <div text="white">
      <table size-w="full" border="collapse" text-size="12px">
        <thead>
          <tr bg="#2a2a2a" text="white">
            <th p="8px" text="left" border-b="1px solid #555">
              <strong>File Name</strong>
            </th>
            <th p="8px" text="left" border-b="1px solid #555">
              <strong>Size</strong>
            </th>
          </tr>
        </thead>
        <tbody>
          {filelist.map((file, index) => (
            <tr
              key={`${torrentId}-${file.filename}-${file.size}`}
              text="white"
              bg={index % 2 === 0 ? "#222" : "#1a1a1a"}
            >
              <td p="[6px_8px]" border-b="1px solid #333" un-wrap="break-word">
                {file.filename}
              </td>
              <td p="[6px_8px]" border-b="1px solid #333" text="right" un-ws="nowrap">
                {file.size}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
