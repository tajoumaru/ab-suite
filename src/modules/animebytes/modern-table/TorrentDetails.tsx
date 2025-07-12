import { useEffect, useState } from "preact/hooks";
import { useSettingsStore } from "@/stores/settings";
import type { TorrentDetailsData, TorrentDetailsProps } from "@/types/modern-table";
import { err, log } from "@/utils/logging";
import {
  DescriptionTab,
  FilelistTab,
  MediaInfoTab,
  PeerlistTab,
  ScreenshotsTab,
  SeaDexTab,
  TreeFilelistTab,
  UploadDescription,
} from "./detail-components";
import { extractTorrentDetailsData, fetchPeerlistData, fetchScreenshotsData } from "./details-extraction";

/**
 * Modern declarative torrent details component.
 * Extracts structured data from the original HTML and renders it using individual tab components.
 */
export function TorrentDetails({ torrentId, groupId, detailsHtml, onDataExtracted }: TorrentDetailsProps) {
  const [detailsData, setDetailsData] = useState<TorrentDetailsData | null>(null);
  const [activeTab, setActiveTab] = useState<string>("description");
  const [screenshotsLoading, setScreenshotsLoading] = useState(false);
  const [peerlistLoading, setPeerlistLoading] = useState(false);
  const [screenshotsLoaded, setScreenshotsLoaded] = useState(false);
  const [peerlistLoaded, setPeerlistLoaded] = useState(false);
  const { treeFilelistEnabled } = useSettingsStore(["treeFilelistEnabled"]);

  // Extract data on mount
  useEffect(() => {
    try {
      log("Starting torrent details extraction", { torrentId, groupId });
      const extractedData = extractTorrentDetailsData(torrentId, groupId, detailsHtml);
      setDetailsData(extractedData);
      onDataExtracted?.(extractedData);
      log("Successfully extracted torrent details data");
    } catch (error) {
      err("Error extracting torrent details data", error);
      // Set empty data to prevent infinite loading
      setDetailsData({
        uploadDescription: {
          uploader: { name: "Unknown", isAnonymous: true },
          uploadDate: { absolute: "", relative: "" },
          ratioInfo: { type: "freeleech" },
        },
        description: "",
        mediaInfo: "",
        filelist: [],
        screenshots: [],
        peerlist: [],
        seadexData: null,
      });
    }
  }, [torrentId, groupId, detailsHtml, onDataExtracted]);

  // Load screenshots dynamically
  const loadScreenshots = async () => {
    if (!detailsData || screenshotsLoaded || screenshotsLoading) return;

    setScreenshotsLoading(true);
    try {
      const screenshots = await fetchScreenshotsData(torrentId, groupId);
      setDetailsData((prev) => (prev ? { ...prev, screenshots } : null));
      setScreenshotsLoaded(true);
    } catch (error) {
      err("Error loading screenshots", error);
    } finally {
      setScreenshotsLoading(false);
    }
  };

  // Load peerlist dynamically
  const loadPeerlist = async () => {
    if (!detailsData || peerlistLoaded || peerlistLoading) return;

    setPeerlistLoading(true);
    try {
      const peerlist = await fetchPeerlistData(torrentId, groupId);
      setDetailsData((prev) => (prev ? { ...prev, peerlist } : null));
      setPeerlistLoaded(true);
    } catch (error) {
      err("Error loading peerlist", error);
    } finally {
      setPeerlistLoading(false);
    }
  };

  // Auto-load data and hook screenshots on tab change
  useEffect(() => {
    if (activeTab === "screenshots") {
      // Auto-load screenshots if not loaded yet
      if (!screenshotsLoaded && !screenshotsLoading) {
        loadScreenshots();
      }

      // Add a small delay to ensure DOM is ready
      setTimeout(() => {
        if (window.hookScreenshots) {
          window.hookScreenshots();
        }
      }, 100);
    } else if (activeTab === "peerlist") {
      // Auto-load peerlist if not loaded yet
      if (!peerlistLoaded && !peerlistLoading) {
        loadPeerlist();
      }
    }
  }, [activeTab, screenshotsLoaded, screenshotsLoading, peerlistLoaded, peerlistLoading]);

  if (!detailsData) {
    return (
      <tr className="ab-details-row">
        <td colSpan={100} className="ab-details-cell">
          <div className="ab-details-content">
            <div className="ab-loading">Loading torrent details...</div>
          </div>
        </td>
      </tr>
    );
  }

  // Determine available tabs
  const availableTabs = [
    { id: "description", label: "Description", available: true },
    { id: "filelist", label: "Filelist", available: detailsData.filelist.length > 0 },
    { id: "mediainfo", label: "MediaInfo", available: detailsData.mediaInfo.length > 0 },
    { id: "screenshots", label: "Screenshots", available: true },
    { id: "peerlist", label: "Peer list", available: true },
    { id: "seadex", label: "SeaDex", available: !!detailsData.seadexData },
  ].filter((tab) => tab.available);

  const renderActiveTab = () => {
    switch (activeTab) {
      case "description":
        return <DescriptionTab description={detailsData.description} />;
      case "filelist":
        return treeFilelistEnabled ? (
          <TreeFilelistTab filelist={detailsData.filelist} torrentId={torrentId} />
        ) : (
          <FilelistTab filelist={detailsData.filelist} torrentId={torrentId} />
        );
      case "mediainfo":
        return <MediaInfoTab mediaInfo={detailsData.mediaInfo} />;
      case "screenshots":
        return (
          <ScreenshotsTab
            screenshots={detailsData.screenshots}
            isLoading={screenshotsLoading}
            isLoaded={screenshotsLoaded}
          />
        );
      case "peerlist":
        return (
          <PeerlistTab
            peerlist={detailsData.peerlist}
            torrentId={torrentId}
            isLoading={peerlistLoading}
            isLoaded={peerlistLoaded}
          />
        );
      case "seadex":
        return <SeaDexTab seadexData={detailsData.seadexData} />;
      default:
        return <div>Unknown tab</div>;
    }
  };

  return (
    <tr className="ab-details-row">
      <td colSpan={100} className="ab-details-cell">
        <div className="ab-details-content">
          {/* Upload description */}
          <UploadDescription uploadDescription={detailsData.uploadDescription} />

          {/* Tabs */}
          <div className="ab-details-tabs">
            {/* Tab navigation */}
            <div className="ab-tabs-nav">
              <ul className="ab-tabs-list">
                {availableTabs.map((tab) => (
                  <li key={tab.id} className={`ab-tab ${activeTab === tab.id ? "ab-tab-active" : ""}`}>
                    <button type="button" className="ab-tab-btn" onClick={() => setActiveTab(tab.id)}>
                      {tab.label}
                    </button>
                  </li>
                ))}
              </ul>
            </div>

            {/* Tab content */}
            <div className="ab-tab-content">{renderActiveTab()}</div>
          </div>
        </div>
      </td>
    </tr>
  );
}

// Extend Window interface for animebytes site functions
declare global {
  interface Window {
    hookScreenshots?: () => void;
  }
}
