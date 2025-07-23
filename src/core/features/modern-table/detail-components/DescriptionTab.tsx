interface DescriptionTabProps {
  description: string;
}

/**
 * Component for rendering the description tab content
 */
export function DescriptionTab({ description }: DescriptionTabProps) {
  if (!description) {
    return <div className="ab-details-tab-content ab-no-content">No description available.</div>;
  }

  return (
    <div className="ab-details-tab-content">
      <blockquote dangerouslySetInnerHTML={{ __html: description }} />
    </div>
  );
}
