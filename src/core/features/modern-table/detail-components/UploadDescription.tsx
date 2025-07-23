import type { UploadDescriptionData } from "@/types/modern-table";

interface UploadDescriptionProps {
  uploadDescription: UploadDescriptionData;
}

/**
 * Component for rendering the upload description with structured data
 */
export function UploadDescription({ uploadDescription }: UploadDescriptionProps) {
  const { uploader, uploadDate, ratioInfo } = uploadDescription;

  return (
    <div className="ab-upload-description">
      <blockquote>
        <div className="ab-upload-meta">
          Uploaded by{" "}
          {uploader.isAnonymous ? (
            <span className="ab-uploader-anonymous">Anonymous</span>
          ) : (
            <a href={uploader.profileUrl} className="ab-uploader-link">
              {uploader.name}
            </a>
          )}{" "}
          on{" "}
          <span className="ab-upload-date" title={uploadDate.relative}>
            {uploadDate.absolute}
          </span>
        </div>

        <div className="ab-ratio-info">
          {ratioInfo.type === "freeleech" ? (
            <>
              If you download this torrent, it{" "}
              <span className="ab-ratio-freeleech">won't count against your ratio</span>.
            </>
          ) : (
            <>
              If you download this torrent, your ratio will be{" "}
              <span className="ab-ratio-value">{ratioInfo.ratioValue}</span>
            </>
          )}
        </div>
      </blockquote>
    </div>
  );
}
