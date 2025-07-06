import type { FilelistItem } from "../types";

interface FilelistTabProps {
  filelist: FilelistItem[];
  torrentId: string;
}

/**
 * Component for rendering the filelist tab content
 */
export function FilelistTab({ filelist, torrentId }: FilelistTabProps) {
  if (filelist.length === 0) {
    return <div className="ab-details-tab-content ab-no-content">No files available.</div>;
  }

  return (
    <div className="ab-details-tab-content">
      <table className="ab-filelist-table">
        <thead>
          <tr className="ab-filelist-header">
            <th>
              <strong>File Name</strong>
            </th>
            <th>
              <strong>Size</strong>
            </th>
          </tr>
        </thead>
        <tbody>
          {filelist.map((file) => (
            <tr key={`${torrentId}-${file.filename}-${file.size}`} className="ab-filelist-row">
              <td className="ab-filelist-cell ab-filelist-cell-filename">{file.filename}</td>
              <td className="ab-filelist-cell ab-filelist-cell-size">{file.size}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
