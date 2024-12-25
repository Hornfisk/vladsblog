interface PublishToggleProps {
  isPublished: boolean;
  onChange: (checked: boolean) => void;
}

export const PublishToggle = ({ isPublished, onChange }: PublishToggleProps) => {
  return (
    <div className="flex items-center space-x-2">
      <input
        type="checkbox"
        id="published"
        checked={isPublished}
        onChange={(e) => onChange(e.target.checked)}
        className="rounded border-accent1/20 bg-blogBg text-accent1"
      />
      <label htmlFor="published" className="text-sm font-medium text-gray-200">
        Publish immediately
      </label>
    </div>
  );
};