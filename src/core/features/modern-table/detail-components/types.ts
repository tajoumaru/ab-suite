/**
 * Torrent details and tab-specific types
 * Co-located with detail-components for better maintainability
 */

/**
 * Upload description information
 */
export interface UploadDescriptionData {
  uploader: {
    name: string;
    profileUrl?: string; // undefined for anonymous uploads
    isAnonymous: boolean;
  };
  uploadDate: {
    absolute: string; // e.g., "Oct 08 2018, 22:03 UTC"
    relative: string; // e.g., "6 years, 8 months ago"
  };
  ratioInfo: {
    type: "freeleech" | "ratio_impact";
    ratioValue?: string; // Only present for ratio_impact type
  };
}

/**
 * File list item in torrent
 */
export interface FilelistItem {
  filename: string;
  size: string;
}

/**
 * Screenshot information
 */
export interface ScreenshotItem {
  id: string;
  groupId: string;
  thumbnailUrl: string;
  fullUrl: string;
  title: string;
}

/**
 * Peer information
 */
export interface PeerlistItem {
  username: string;
  profileUrl?: string;
  downloaded: string;
  uploaded: string;
  percentage: string;
  isAnonymous: boolean;
  badges: string[]; // HTML for badges like donor icons
}

/**
 * SeaDex data for torrent details
 */
export interface SeaDexData {
  html?: string;
  // Add other SeaDex properties as needed
}

/**
 * Complete torrent details data structure
 */
export interface TorrentDetailsData {
  uploadDescription: UploadDescriptionData;
  description: string;
  mediaInfo: string;
  filelist: FilelistItem[];
  screenshots: ScreenshotItem[];
  peerlist: PeerlistItem[];
  seadexData: SeaDexData | null;
}

/**
 * Props for TorrentDetails component
 */
export interface TorrentDetailsProps {
  torrentId: string;
  groupId: string;
  detailsHtml: string;
  onDataExtracted?: (data: TorrentDetailsData) => void;
}
