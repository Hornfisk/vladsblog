import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useQueryClient } from "@tanstack/react-query";

interface InlineEditProps {
  content: string;
  pageName: string;
  className?: string;
}

export const InlineEdit = ({ content, pageName, className = "" }: InlineEditProps) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editedContent, setEditedContent] = useState(content);
  const { session } = useAuth();
  const queryClient = useQueryClient();

  const handleSave = async () => {
    if (!session?.user) {
      toast.error("You must be logged in to edit content");
      return;
    }

    try {
      // First check if a record exists
      const { data: existingContent } = await supabase
        .from('page_content')
        .select('id')
        .eq('page_name', pageName)
        .single();

      if (existingContent) {
        // Update existing record
        const { error: updateError } = await supabase
          .from('page_content')
          .update({ content: editedContent })
          .eq('page_name', pageName);

        if (updateError) throw updateError;
      } else {
        // Insert new record
        const { error: insertError } = await supabase
          .from('page_content')
          .insert([
            {
              page_name: pageName,
              content: editedContent,
              author_id: session.user.id,
            },
          ]);

        if (insertError) throw insertError;
      }

      queryClient.invalidateQueries({ queryKey: ['page-content', pageName] });
      setIsEditing(false);
      toast.success("Content updated successfully");
    } catch (error: any) {
      toast.error(`Failed to update content: ${error.message}`);
    }
  };

  if (!session?.user) {
    return <div className={className}>{content}</div>;
  }

  return (
    <div className="relative group">
      {isEditing ? (
        <div className="space-y-2">
          <Textarea
            value={editedContent}
            onChange={(e) => setEditedContent(e.target.value)}
            className="min-h-[100px] bg-gray-800/50 text-gray-100 border-accent1/20"
          />
          <div className="flex gap-2">
            <Button
              onClick={handleSave}
              className="bg-accent1 hover:bg-accent1/80 text-white"
            >
              Save
            </Button>
            <Button
              variant="outline"
              onClick={() => {
                setIsEditing(false);
                setEditedContent(content);
              }}
              className="border-accent1/20 text-gray-300 hover:bg-accent1/10"
            >
              Cancel
            </Button>
          </div>
        </div>
      ) : (
        <div className="flex items-start gap-2 relative">
          <div className={className}>{content}</div>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setIsEditing(true)}
            className="h-8 w-8 text-accent1/50 hover:text-accent1 hover:bg-accent1/10 absolute -right-10 top-0 opacity-0 group-hover:opacity-100 transition-opacity sm:static sm:opacity-100"
          >
            <Pencil className="h-4 w-4" />
          </Button>
        </div>
      )}
    </div>
  );
};