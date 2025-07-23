import type { AniListMediaData } from "../../../services/anilist";
import { aniListService } from "../../../services/anilist";

export async function getAniListData(anilistId: number): Promise<AniListMediaData | null> {
  return aniListService.fetchMediaData(anilistId);
}
