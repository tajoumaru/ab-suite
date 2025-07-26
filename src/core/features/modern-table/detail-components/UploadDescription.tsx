import type { UploadDescriptionData } from "./types";

interface UploadDescriptionProps {
  uploadDescription: UploadDescriptionData;
}

/**
 * Component for rendering the upload description with structured data
 */
export function UploadDescription({ uploadDescription }: UploadDescriptionProps) {
  const { uploader, uploadDate, ratioInfo } = uploadDescription;

  return (
    <div mb="16px">
      <blockquote
        bg="#2a2a2a"
        border="1px solid #555"
        rounded="4px"
        p="12px"
        m="[0_0_16px_0]"
        text-size="12px"
        text="#ccc"
      >
        <div mb="8px">
          Uploaded by{" "}
          {uploader.isAnonymous ? (
            <span text="#888">Anonymous</span>
          ) : (
            <a href={uploader.profileUrl} text="#007bff" un-decoration="none">
              {uploader.name}
            </a>
          )}{" "}
          on{" "}
          <span text="white" cursor="help" title={uploadDate.relative}>
            {uploadDate.absolute}
          </span>
        </div>

        <div text="white">
          {ratioInfo.type === "freeleech" ? (
            <>
              If you download this torrent, it{" "}
              <span text="#28a745" font="bold">
                won't count against your ratio
              </span>
              .
            </>
          ) : (
            <>
              If you download this torrent, your ratio will be{" "}
              <span text="#ffc107" font="bold">
                {ratioInfo.ratioValue}
              </span>
            </>
          )}
        </div>
      </blockquote>
    </div>
  );
}
