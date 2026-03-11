import { useState } from "react";
import { Copy, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { nightOwl } from "react-syntax-highlighter/dist/esm/styles/prism";

interface CodeBlockProps {
  language: string;
  code: string;
}

const CodeBlock = ({ language, code }: CodeBlockProps) => {
  const [copied, setCopied] = useState(false);
  const { toast } = useToast();

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // clipboard.writeText throws in non-secure contexts (HTTP) or if permission denied
      toast({ title: "Copy failed", description: "Could not access clipboard.", variant: "destructive" });
    }
  };

  return (
    <div className="mb-6 rounded-lg border border-white/10 overflow-hidden font-mono text-sm">
      {/* Header bar */}
      <div className="flex items-center justify-between px-4 py-2 bg-[#1e1b3a] border-b border-white/10">
        <span className="text-xs text-gray-400 select-none">{language}</span>
        <Button
          variant="ghost"
          size="icon"
          aria-label={copied ? "Copied" : "Copy code"}
          className="h-7 w-7 text-gray-400 hover:text-white hover:bg-white/10"
          onClick={handleCopy}
        >
          {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
        </Button>
      </div>
      {/* Code body */}
      <SyntaxHighlighter
        language={language}
        style={nightOwl}
        customStyle={{ background: "#0f0d1f", margin: 0, padding: "1rem", borderRadius: 0 }}
        PreTag="div"
      >
        {code}
      </SyntaxHighlighter>
    </div>
  );
};

export default CodeBlock;
