import { useState } from "react";
import { Pencil, Check, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface InlineEditProps {
  content: string;
  pageName: string;
  className?: string;
}

export function InlineEdit({ content, pageName, className = "" }: InlineEditProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editedContent, setEditedContent] = useState(content);
  const { session } = useAuth();

  const handleSave = async () => {
    try {
      const { error } = await supabase
        .from('page_content')
        .upsert({
          page_name: pageName,
          content: editedContent,
          author_id: session?.user.id
        });

      if (error) throw error;
      
      toast.success("Content updated successfully");
      setIsEditing(false);
    } catch (error: any) {
      toast.error("Failed to update content: " + error.message);
    }
  };

  if (!session) return <div className={className}>{content}</div>;

  return (
    <div className="relative group">
      {!isEditing ? (
        <>
          <div className={className}>{editedContent}</div>
          <Button
            variant="ghost"
            size="icon"
            className="absolute -right-10 top-0 opacity-0 group-hover:opacity-100 transition-opacity"
            onClick={() => setIsEditing(true)}
          >
            <Pencil className="h-4 w-4 text-accent1" />
          </Button>
        </>
      ) : (
        <div className="space-y-2">
          <Textarea
            value={editedContent}
            onChange={(e) => setEditedContent(e.target.value)}
            className="min-h-[100px] bg-blogBg border-accent1/20 focus:border-accent1 text-gray-200"
          />
          <div className="flex gap-2 justify-end">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => {
                setEditedContent(content);
                setIsEditing(false);
              }}
            >
              <X className="h-4 w-4 text-red-500" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={handleSave}
            >
              <Check className="h-4 w-4 text-green-500" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}