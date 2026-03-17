import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

interface LinkDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialText: string;
  onConfirm: (text: string, url: string) => void;
}

const LinkDialog = ({ open, onOpenChange, initialText, onConfirm }: LinkDialogProps) => {
  const hasSelection = initialText.length > 0;
  const [caption, setCaption] = useState(initialText);
  const [url, setUrl] = useState("");

  useEffect(() => {
    if (open) {
      setCaption(initialText);
      setUrl("");
    }
  }, [open, initialText]);

  const handleConfirm = () => {
    console.log("[LinkDialog] handleConfirm called", { caption, url });
    if (!url) return;
    onConfirm(caption, url);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm bg-blogBg border-accent1/20 text-gray-200">
        <DialogHeader>
          <DialogTitle className="text-gray-100">Insert link</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          {hasSelection ? (
            <div className="space-y-1">
              <p className="text-xs text-gray-400">Link text</p>
              <p className="font-mono text-sm text-accent1 bg-black/30 px-3 py-2 rounded border border-accent1/20 truncate">
                {caption}
              </p>
            </div>
          ) : (
            <div className="space-y-1">
              <label className="text-xs text-gray-400">Link text</label>
              <Input
                autoFocus
                value={caption}
                onChange={(e) => setCaption(e.target.value)}
                placeholder="Link text"
                className="bg-black/30 border-accent1/20 text-gray-200 focus:border-accent1"
              />
            </div>
          )}
          <div className="space-y-1">
            <label className="text-xs text-gray-400">URL</label>
            <Input
              autoFocus={hasSelection}
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://"
              type="text"
              className="bg-black/30 border-accent1/20 text-gray-200 focus:border-accent1"
            />
          </div>
          {(caption || url) && (
            <p className="font-mono text-xs text-accent1/60 bg-black/20 px-2 py-1.5 rounded border border-accent1/10 truncate">
              [{caption || "link text"}]({url || "https://..."})
            </p>
          )}
          <DialogFooter className="pt-1">
            <Button
              type="button"
              variant="ghost"
              onClick={() => onOpenChange(false)}
              className="text-gray-400 hover:text-gray-200"
            >
              Cancel
            </Button>
            <Button
              type="button"
              disabled={!url}
              onClick={handleConfirm}
              className="bg-accent1 hover:bg-accent1/80 text-black"
            >
              Insert
            </Button>
          </DialogFooter>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default LinkDialog;
