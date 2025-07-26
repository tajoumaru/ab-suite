import { err, log } from "@/lib/utils/logging";
import type {
  FilelistItem,
  PeerlistItem,
  ScreenshotItem,
  SeaDexData,
  TorrentDetailsData,
  UploadDescriptionData,
} from "./types";

/**
 * Extract structured torrent details data from the original HTML
 */
export function extractTorrentDetailsData(torrentId: string, groupId: string, detailsHtml: string): TorrentDetailsData {
  log("Extracting torrent details data", { torrentId, groupId });

  const parser = new DOMParser();
  const doc = parser.parseFromString(detailsHtml, "text/html");

  // Extract upload description (top-level blockquote)
  const uploadDescription = extractUploadDescription(doc);

  // Extract description tab content
  const description = extractDescription(doc, torrentId);

  // Extract MediaInfo raw text
  const mediaInfo = extractMediaInfo(doc, torrentId);

  // Extract filelist
  const filelist = extractFilelist(doc, torrentId);

  // Extract SeaDex data if present
  const seadexData = extractSeaDexData(doc, torrentId);

  // Screenshots and peerlist start empty (loaded dynamically)
  const screenshots: ScreenshotItem[] = [];
  const peerlist: PeerlistItem[] = [];

  const extractedData: TorrentDetailsData = {
    uploadDescription,
    description,
    mediaInfo,
    filelist,
    screenshots,
    peerlist,
    seadexData,
  };

  log("Extracted torrent details data", {
    torrentId,
    uploaderName: uploadDescription.uploader.name,
    descriptionLength: description.length,
    mediaInfoLength: mediaInfo.length,
    filelistCount: filelist.length,
    hasSeadexData: !!seadexData,
  });

  return extractedData;
}

/**
 * Extract upload description from top-level blockquote and parse into structured data
 */
function extractUploadDescription(doc: Document): UploadDescriptionData {
  const blockquote = doc.querySelector("blockquote");

  if (!blockquote) {
    return {
      uploader: { name: "Unknown", isAnonymous: true },
      uploadDate: { absolute: "", relative: "" },
      ratioInfo: { type: "freeleech" },
    };
  }

  const html = blockquote.innerHTML;

  // Extract uploader information
  const uploaderLink = blockquote.querySelector('a[href*="/user/profile/"]');
  const uploader = uploaderLink
    ? {
        name: uploaderLink.textContent?.trim() || "Unknown",
        profileUrl: uploaderLink.getAttribute("href") || undefined,
        isAnonymous: false,
      }
    : {
        name: "Anonymous",
        isAnonymous: true,
      };

  // Extract upload date from span
  const dateSpan = blockquote.querySelector("span[title]");
  const uploadDate = {
    absolute: dateSpan?.textContent?.trim() || "",
    relative: dateSpan?.getAttribute("title") || "",
  };

  // Extract ratio information
  let ratioInfo: UploadDescriptionData["ratioInfo"];

  if (html.includes("won't count against your ratio")) {
    ratioInfo = { type: "freeleech" };
  } else if (html.includes("your ratio will be")) {
    // Extract ratio value from span with class starting with "r"
    const ratioSpan = blockquote.querySelector('span[class*="r"]');
    const ratioValue = ratioSpan?.textContent?.trim() || "";
    ratioInfo = {
      type: "ratio_impact",
      ratioValue,
    };
  } else {
    // Fallback
    ratioInfo = { type: "freeleech" };
  }

  return {
    uploader,
    uploadDate,
    ratioInfo,
  };
}

/**
 * Extract description from description tab
 */
function extractDescription(doc: Document, torrentId: string): string {
  try {
    const escapedId = CSS.escape(`${torrentId}_description`);
    const descriptionDiv = doc.querySelector(`#${escapedId}`);
    const blockquote = descriptionDiv?.querySelector("blockquote");
    return blockquote?.innerHTML || "";
  } catch (error) {
    err(`Error extracting description for torrent ${torrentId}:`, error);
    return "";
  }
}

/**
 * Extract raw MediaInfo text from pre element
 */
function extractMediaInfo(doc: Document, torrentId: string): string {
  const escapedId = CSS.escape(`${torrentId}_mediainfo`);
  const mediaInfoDiv = doc.querySelector(`#${escapedId}`);
  const preElement = mediaInfoDiv?.querySelector(".spoiler .codeBox pre");
  return preElement?.textContent || "";
}

/**
 * Extract filelist from table
 */
function extractFilelist(doc: Document, torrentId: string): FilelistItem[] {
  const escapedId = CSS.escape(`${torrentId}_filelist`);
  const filelistDiv = doc.querySelector(`#${escapedId}`);
  const table = filelistDiv?.querySelector("table");
  const rows = table?.querySelectorAll("tr:not(.colhead_dark)");

  if (!rows) return [];

  const filelist: FilelistItem[] = [];

  rows.forEach((row) => {
    const cells = row.querySelectorAll("td");
    if (cells.length >= 2) {
      const filename = cells[0].textContent?.trim() || "";
      const size = cells[1].textContent?.trim() || "";
      if (filename && size) {
        filelist.push({ filename, size });
      }
    }
  });

  return filelist;
}

/**
 * Extract SeaDex data if present
 */
function extractSeaDexData(doc: Document, torrentId: string): SeaDexData | null {
  const escapedId = CSS.escape(`seadex_${torrentId}`);
  const seadexDiv = doc.querySelector(`#${escapedId}`);
  if (!seadexDiv) return null;

  // If SeaDex div exists, extract its content
  // This is a placeholder - the actual SeaDex data structure depends on implementation
  return {
    html: seadexDiv.innerHTML,
    // Add other SeaDex-specific data extraction as needed
  };
}

/**
 * Fetch and extract screenshots data
 */
export async function fetchScreenshotsData(torrentId: string, groupId: string): Promise<ScreenshotItem[]> {
  try {
    log("Fetching screenshots data", { torrentId, groupId });

    const response = await fetch(`/torrents.php?id=${groupId}&torrentid=${torrentId}&screenshots=${torrentId}`);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const html = await response.text();
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, "text/html");

    const escapedId = CSS.escape(`${torrentId}_screenshots`);
    const screenshotsDiv = doc.querySelector(`#${escapedId}`);
    if (!screenshotsDiv) {
      log("No screenshots div found in response");
      return [];
    }

    const screenshots: ScreenshotItem[] = [];
    const screenshotLinks = screenshotsDiv.querySelectorAll("a.screenshot");

    screenshotLinks.forEach((link) => {
      const href = link.getAttribute("href");
      const dataImage = link.getAttribute("data-image");
      const img = link.querySelector("img");
      const title = img?.getAttribute("title") || "";

      if (href && dataImage) {
        const idMatch = href.match(/id=(\d+)/);
        const groupIdMatch = href.match(/groupid=(\d+)/);

        if (idMatch) {
          screenshots.push({
            id: idMatch[1],
            groupId: groupIdMatch ? groupIdMatch[1] : groupId,
            thumbnailUrl: img?.getAttribute("src") || "",
            fullUrl: dataImage,
            title,
          });
        }
      }
    });

    log("Extracted screenshots data", {
      torrentId,
      screenshotCount: screenshots.length,
    });

    return screenshots;
  } catch (error) {
    err("Error fetching screenshots data", error);
    return [];
  }
}

/**
 * Fetch and extract peerlist data
 */
export async function fetchPeerlistData(torrentId: string, groupId: string): Promise<PeerlistItem[]> {
  try {
    log("Fetching peerlist data", { torrentId, groupId });

    const response = await fetch(`/torrents.php?id=${groupId}&torrentid=${torrentId}&peers=${torrentId}`);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const html = await response.text();
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, "text/html");

    const escapedId = CSS.escape(`${torrentId}_peerlist`);
    const peerlistDiv = doc.querySelector(`#${escapedId}`);
    if (!peerlistDiv) {
      log("No peerlist div found in response");
      return [];
    }

    const peerlist: PeerlistItem[] = [];
    const table = peerlistDiv.querySelector("table");
    const rows = table?.querySelectorAll("tr:not(.colhead_dark)");

    if (!rows) return [];

    rows.forEach((row) => {
      const cells = row.querySelectorAll("td");
      if (cells.length >= 4) {
        const userCell = cells[0];
        const downloadedCell = cells[1];
        const uploadedCell = cells[2];
        const percentageCell = cells[3];

        const userLink = userCell.querySelector("a");
        const username = userLink?.textContent?.trim() || userCell.textContent?.trim() || "";
        const profileUrl = userLink?.getAttribute("href") || undefined;
        const isAnonymous = username.toLowerCase() === "anonymous";

        const downloaded = downloadedCell.textContent?.trim() || "";
        const uploaded = uploadedCell.textContent?.trim() || "";
        const percentage = percentageCell.textContent?.trim() || "";

        // Extract badges (donor icons, etc.)
        const badges: string[] = [];
        const badgeElements = userCell.querySelectorAll("img");
        badgeElements.forEach((badge) => {
          badges.push(badge.outerHTML);
        });

        peerlist.push({
          username,
          profileUrl,
          downloaded,
          uploaded,
          percentage,
          isAnonymous,
          badges,
        });
      }
    });

    log("Extracted peerlist data", {
      torrentId,
      peerCount: peerlist.length,
    });

    return peerlist;
  } catch (error) {
    err("Error fetching peerlist data", error);
    return [];
  }
}
