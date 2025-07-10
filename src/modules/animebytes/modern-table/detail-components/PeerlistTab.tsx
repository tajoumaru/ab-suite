import { Loader2 } from "lucide-preact";
import type { PeerlistItem } from "@/types/modern-table";

interface PeerlistTabProps {
  peerlist: PeerlistItem[];
  torrentId: string;
  isLoading: boolean;
  isLoaded: boolean;
}

/**
 * Component for rendering the peerlist tab content
 */
export function PeerlistTab({ peerlist, torrentId, isLoading, isLoaded }: PeerlistTabProps) {
  // Show loading state
  if (isLoading) {
    return (
      <div className="ab-details-tab-content">
        <div className="ab-loading">
          <Loader2 size={24} className="animate-spin" />
          <div>Loading peer list...</div>
        </div>
      </div>
    );
  }

  // Show "no peers found" message if loaded but empty
  if (isLoaded && peerlist.length === 0) {
    return (
      <div className="ab-details-tab-content">
        <div className="ab-no-content">No peers found for this torrent.</div>
      </div>
    );
  }

  // Show placeholder while not yet loaded
  if (!isLoaded && peerlist.length === 0) {
    return (
      <div className="ab-details-tab-content">
        <div className="ab-no-content">Loading peer list...</div>
      </div>
    );
  }

  return (
    <div className="ab-details-tab-content">
      <table className="ab-peerlist-table">
        <thead>
          <tr className="ab-peerlist-header">
            <th>User</th>
            <th>Down</th>
            <th>Up</th>
            <th>%</th>
          </tr>
        </thead>
        <tbody>
          {peerlist.map((peer, index) => (
            <tr key={`${torrentId}-peer-${peer.username}-${index}`} className="ab-peerlist-row">
              <td className="ab-peerlist-cell">
                <div className="ab-peerlist-user">
                  {peer.isAnonymous ? (
                    <span>Anonymous</span>
                  ) : (
                    <a href={peer.profileUrl} className="ab-peerlist-user-link">
                      {peer.username}
                    </a>
                  )}
                  {peer.badges.map((badge: string, badgeIndex: number) => (
                    <span key={`${peer.username}-badge-${badgeIndex}`} dangerouslySetInnerHTML={{ __html: badge }} />
                  ))}
                </div>
              </td>
              <td className="ab-peerlist-cell">{peer.downloaded}</td>
              <td className="ab-peerlist-cell">{peer.uploaded}</td>
              <td className="ab-peerlist-cell">{peer.percentage}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
