import { Button } from "@/components/ui/button";
import { Pencil, Trash2 } from "lucide-react";

interface PostItemProps {
  post: {
    id: string;
    title: string;
    excerpt?: string;
    published: boolean;
    created_at: string;
    author_id: string;
  };
  onEdit: (post: any) => void;
  onDelete: (postId: string) => void;
}

export const PostItem = ({ post, onEdit, onDelete }: PostItemProps) => {
  const handleDelete = () => {
    if (window.confirm('Are you sure you want to delete this post?')) {
      onDelete(post.id);
    }
  };

  return (
    <div className="p-4 border border-accent1/20 rounded-lg bg-blogBg/50 shadow-sm">
      <div className="flex items-center justify-between">
        <div className="flex-1">
          <h3 className="text-lg font-semibold text-gray-200">{post.title}</h3>
          <div className="flex items-center gap-2 mt-1">
            <span className={`px-2 py-1 rounded text-xs ${
              post.published 
                ? "bg-green-500/20 text-green-400" 
                : "bg-yellow-500/20 text-yellow-400"
            }`}>
              {post.published ? "Published" : "Draft"}
            </span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => onEdit(post)}
            className="h-8 w-8 text-accent1 hover:text-accent1/80 hover:bg-accent1/10"
          >
            <Pencil className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={handleDelete}
            className="h-8 w-8 text-red-500 hover:text-red-400 hover:bg-red-500/10"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </div>
      <p className="text-gray-400 text-sm mt-2">{post.excerpt || "No excerpt"}</p>
      <div className="mt-2 text-xs text-gray-500">
        Created: {new Date(post.created_at).toLocaleDateString()}
      </div>
    </div>
  );
};