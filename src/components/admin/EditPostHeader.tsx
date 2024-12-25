import { Button } from "@/components/ui/button";
import { X } from "lucide-react";

interface EditPostHeaderProps {
  onClose: () => void;
}

export const EditPostHeader = ({ onClose }: EditPostHeaderProps) => (
  <div className="flex items-center justify-between mb-4">
    <h2 className="text-xl font-bold text-gray-200">Edit Post</h2>
    <Button
      type="button"
      variant="ghost"
      size="icon"
      onClick={onClose}
      className="h-8 w-8"
    >
      <X className="h-4 w-4" />
    </Button>
  </div>
);