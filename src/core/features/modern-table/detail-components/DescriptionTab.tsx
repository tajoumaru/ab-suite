// TODO: HERE

interface DescriptionTabProps {
  description: string;
}

/**
 * Component for rendering the description tab content
 */
export function DescriptionTab({ description }: DescriptionTabProps) {
  if (!description) {
    return (
      <div text="white">
        <div text="center #888" p="20px">
          No description available.
        </div>
      </div>
    );
  }

  return (
    <div text="white">
      <blockquote dangerouslySetInnerHTML={{ __html: description }} />
    </div>
  );
}
