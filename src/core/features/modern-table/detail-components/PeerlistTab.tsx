import { Loader2 } from "lucide-preact";
import type { PeerlistItem } from "./types";

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
      <div text="white">
        <div text="center" p="20px">
          <Loader2 size={24} animate="spin" />
          <div mt="8px">Loading peer list...</div>
        </div>
      </div>
    );
  }

  // Show "no peers found" message if loaded but empty
  if (isLoaded && peerlist.length === 0) {
    return (
      <div text="white">
        <div text="center #888" p="20px">
          No peers found for this torrent.
        </div>
      </div>
    );
  }

  // Show placeholder while not yet loaded
  if (!isLoaded && peerlist.length === 0) {
    return (
      <div text="white">
        <div text="center #888" p="20px">
          Loading peer list...
        </div>
      </div>
    );
  }

  return (
    <div text="white">
      <table size-w="full" border-collapse="collapse" text-size="12px">
        <thead>
          <tr bg="#2a2a2a" text="white" font="bold">
            <th p="8px" text="left" border-b="1px solid #555">
              User
            </th>
            <th p="8px" text="left" border-b="1px solid #555">
              Down
            </th>
            <th p="8px" text="left" border-b="1px solid #555">
              Up
            </th>
            <th p="8px" text="left" border-b="1px solid #555">
              %
            </th>
          </tr>
        </thead>
        <tbody>
          {peerlist.map((peer, index) => (
            <tr
              key={`${torrentId}-peer-${peer.username}-${index}`}
              text="white"
              bg={index % 2 === 0 ? "#222" : "#1a1a1a"}
            >
              <td p="[6px_8px]" border-b="1px solid #333">
                <div flex items="center" gap="8px">
                  {peer.isAnonymous ? (
                    <span>Anonymous</span>
                  ) : (
                    <a href={peer.profileUrl} text="#007bff" un-decoration="none" hover="decoration-underline">
                      {peer.username}
                    </a>
                  )}
                  {peer.badges.map((badge: string, badgeIndex: number) => (
                    <span key={`${peer.username}-badge-${badgeIndex}`} dangerouslySetInnerHTML={{ __html: badge }} />
                  ))}
                </div>
              </td>
              <td p="[6px_8px]" border-b="1px solid #333">
                {peer.downloaded}
              </td>
              <td p="[6px_8px]" border-b="1px solid #333">
                {peer.uploaded}
              </td>
              <td p="[6px_8px]" border-b="1px solid #333">
                {peer.percentage}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
