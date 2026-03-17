import { useTheme } from "next-themes"
import { Toaster as Sonner } from "sonner"

type ToasterProps = React.ComponentProps<typeof Sonner>

const Toaster = ({ ...props }: ToasterProps) => {
  const { theme = "system" } = useTheme()

  return (
    <Sonner
      theme={theme as ToasterProps["theme"]}
      className="toaster group"
      toastOptions={{
        classNames: {
          toast:
            "group toast group-[.toaster]:bg-[#1a1a2e] group-[.toaster]:text-gray-100 group-[.toaster]:border-[#9b87f5]/40 group-[.toaster]:shadow-lg",
          title: "group-[.toast]:text-gray-100",
          description: "group-[.toast]:text-gray-400",
          success: "group-[.toaster]:border-[#9b87f5]/60 group-[.toaster]:text-[#9b87f5]",
          error: "group-[.toaster]:border-red-500/40 group-[.toaster]:text-red-400",
          actionButton:
            "group-[.toast]:bg-[#9b87f5] group-[.toast]:text-black",
          cancelButton:
            "group-[.toast]:bg-[#1a1a2e] group-[.toast]:text-gray-400",
        },
      }}
      {...props}
    />
  )
}

export { Toaster }
