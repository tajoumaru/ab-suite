import { useDescriptionStore } from "@/core/shared/descriptions";

interface DescriptionRendererProps {
  torrentLink: string;
  className?: string;
}

export function DescriptionRenderer({ torrentLink, className }: DescriptionRendererProps) {
  const descriptionStore = useDescriptionStore();

  const currentDescription = descriptionStore.getCurrentDescription(torrentLink);

  return <div className={className} dangerouslySetInnerHTML={{ __html: currentDescription }} />;
}
