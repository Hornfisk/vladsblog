import { useRef, useState } from "react";
import { Link as LinkIcon } from "lucide-react";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import ImageUpload from "./ImageUpload";
import LinkDialog from "./LinkDialog";

interface ContentEditorProps {
  id: string;
  value: string;
  onChange: (value: string) => void;
}

const ContentEditor = ({ id, value, onChange }: ContentEditorProps) => {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const selectionRef = useRef<{ start: number; end: number }>({ start: 0, end: 0 });
  const insertionRef = useRef<{ start: number; end: number }>({ start: 0, end: 0 });
  const valueRef = useRef(value);
  valueRef.current = value;
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;
  const [linkDialogOpen, setLinkDialogOpen] = useState(false);
  const [linkText, setLinkText] = useState("");

  const saveSelection = () => {
    if (textareaRef.current) {
      selectionRef.current = {
        start: textareaRef.current.selectionStart,
        end: textareaRef.current.selectionEnd,
      };
    }
  };

  const openLinkDialog = () => {
    const { start, end } = selectionRef.current;
    insertionRef.current = { start, end };
    setLinkText(value.slice(start, end));
    setLinkDialogOpen(true);
  };

  const handleInsertLink = (text: string, url: string) => {
    const { start, end } = insertionRef.current;
    const markdown = `[${text}](${url})`;
    const newValue = valueRef.current.slice(0, start) + markdown + valueRef.current.slice(end);
    onChangeRef.current(newValue);
    const newPos = start + markdown.length;
    requestAnimationFrame(() => {
      if (textareaRef.current) {
        textareaRef.current.focus({ preventScroll: true });
        textareaRef.current.setSelectionRange(newPos, newPos);
      }
    });
  };

  const handleInsert = (markdown: string) => {
    const pos = selectionRef.current.start;
    const before = value.slice(0, pos);
    const after = value.slice(pos);
    const newValue = before + "\n" + markdown + "\n" + after;
    onChange(newValue);

    const newPos = pos + markdown.length + 2;
    requestAnimationFrame(() => {
      if (textareaRef.current) {
        textareaRef.current.focus({ preventScroll: true });
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
        onBlur={saveSelection}
        onClick={saveSelection}
        onMouseUp={saveSelection}
        onKeyUp={saveSelection}
        className="min-h-[300px] bg-blogBg border-accent1/20 focus:border-accent1 text-gray-200 font-mono text-sm"
        placeholder="Write your post content in markdown..."
        required
      />
      <div className="flex justify-end gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={openLinkDialog}
          className="border-accent1/20 text-gray-200 hover:bg-accent1/10 hover:text-gray-100"
        >
          <LinkIcon className="mr-2 h-4 w-4" />
          Insert link
        </Button>
        <ImageUpload onInsert={handleInsert} />
      </div>
      <LinkDialog
        open={linkDialogOpen}
        onOpenChange={setLinkDialogOpen}
        initialText={linkText}
        onConfirm={handleInsertLink}
      />
    </div>
  );
};

export default ContentEditor;
