import { CollageTableIntegration } from "@/core/features/collage-table/CollageTable";
import "../collage-table.css";

export function AiringPage() {
  return <CollageTableIntegration pageType="airing" settingKey="seriesTitlesEnabled" />;
}
