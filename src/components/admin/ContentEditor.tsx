import { useRef } from "react";
import { Textarea } from "@/components/ui/textarea";
import ImageUpload from "./ImageUpload";

interface ContentEditorProps {
  id: string;
  value: string;
  onChange: (value: string) => void;
}

const ContentEditor = ({ id, value, onChange }: ContentEditorProps) => {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const cursorPos = useRef<number>(value.length);

  const saveCursor = () => {
    if (textareaRef.current) {
      cursorPos.current = textareaRef.current.selectionStart;
    }
  };

  const handleInsert = (markdown: string) => {
    const pos = cursorPos.current;
    const before = value.slice(0, pos);
    const after = value.slice(pos);
    const newValue = before + "\n" + markdown + "\n" + after;
    onChange(newValue);

    const newPos = pos + markdown.length + 2;
    requestAnimationFrame(() => {
      if (textareaRef.current) {
        textareaRef.current.focus();
        textareaRef.current.setSelectionRange(newPos, newPos);
      }
    });
  };

  return (
    <div className="space-y-2">
      <label htmlFor={id} className="block text-sm font-medium text-gray-200">
        Content
      </label>
      <Textarea
        id={id}
        ref={textareaRef}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onBlur={saveCursor}
        onMouseUp={saveCursor}
        onKeyUp={saveCursor}
        className="min-h-[300px] bg-blogBg border-accent1/20 focus:border-accent1 text-gray-200 font-mono text-sm"
        placeholder="Write your post content in markdown..."
        required
      />
      <div className="flex justify-end">
        <ImageUpload onInsert={handleInsert} />
      </div>
    </div>
  );
};

export default ContentEditor;
