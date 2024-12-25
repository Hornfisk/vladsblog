import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

interface FormFieldProps {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: "text" | "textarea";
  placeholder?: string;
  required?: boolean;
  readOnly?: boolean;
}

export const FormField = ({
  id,
  label,
  value,
  onChange,
  type = "text",
  placeholder,
  required = false,
  readOnly = false,
}: FormFieldProps) => {
  return (
    <div>
      <label htmlFor={id} className="block text-sm font-medium text-gray-200 mb-1">
        {label}
      </label>
      {type === "textarea" ? (
        <Textarea
          id={id}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="min-h-[200px] bg-blogBg border-accent1/20 focus:border-accent1 text-gray-200"
          placeholder={placeholder}
          required={required}
          readOnly={readOnly}
        />
      ) : (
        <Input
          id={id}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="bg-blogBg border-accent1/20 focus:border-accent1 text-gray-200"
          placeholder={placeholder}
          required={required}
          readOnly={readOnly}
        />
      )}
    </div>
  );
};