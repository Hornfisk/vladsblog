import { useRef, useState } from "react";
import { Textarea } from "@/components/ui/textarea";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger,
} from "@/components/ui/context-menu";
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

  const handleContextMenu = () => {
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
    const newValue = value.slice(0, start) + markdown + value.slice(end);
    console.log("[ContentEditor] handleInsertLink", { text, url, start, end, valueLen: value.length, newValue });
    onChange(newValue);
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
      <ContextMenu>
        <ContextMenuTrigger asChild>
          <Textarea
            id={id}
            ref={textareaRef}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            onBlur={saveSelection}
            onClick={saveSelection}
            onMouseUp={saveSelection}
            onKeyUp={saveSelection}
            onContextMenu={handleContextMenu}
            className="min-h-[300px] bg-blogBg border-accent1/20 focus:border-accent1 text-gray-200 font-mono text-sm"
            placeholder="Write your post content in markdown..."
            required
          />
        </ContextMenuTrigger>
        <ContextMenuContent className="w-44 bg-blogBg border-accent1/20">
          <ContextMenuItem
            onSelect={openLinkDialog}
            className="cursor-pointer text-gray-200 focus:bg-accent1/10 focus:text-gray-100"
          >
            Insert link
          </ContextMenuItem>
        </ContextMenuContent>
      </ContextMenu>
      <div className="flex justify-end">
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
