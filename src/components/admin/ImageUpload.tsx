import { useRef, useState } from "react";
import { ImagePlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

interface ImageUploadProps {
  onInsert: (markdown: string) => void;
}

const ImageUpload = ({ onInsert }: ImageUploadProps) => {
  const [uploading, setUploading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!inputRef.current) return;
    inputRef.current.value = "";
    if (!file) return;

    setUploading(true);
    try {
      const ext = file.name.split(".").pop();
      const filename = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;

      const { error } = await supabase.storage
        .from("post-images")
        .upload(filename, file, { upsert: false });

      if (error) throw error;

      const { data } = supabase.storage
        .from("post-images")
        .getPublicUrl(filename);

      onInsert(`![${file.name}](${data.publicUrl})`);
    } catch (err: any) {
      toast({ title: "Upload failed", description: err.message, variant: "destructive" });
    } finally {
      setUploading(false);
    }
  };

  return (
    <>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleFileChange}
      />
      <Button
        type="button"
        variant="ghost"
        size="sm"
        disabled={uploading}
        className="text-gray-400 hover:text-gray-200 hover:bg-accent1/10 border border-accent1/20"
        onClick={() => inputRef.current?.click()}
      >
        <ImagePlus className="h-4 w-4 mr-2" />
        {uploading ? "Uploading..." : "Insert Image"}
      </Button>
    </>
  );
};

export default ImageUpload;
