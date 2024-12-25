import { useState } from "react";
import { useForm } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

type FormData = {
  name: string;
  email: string;
  message: string;
  website: string; // honeypot field
};

export const ContactForm = () => {
  const [open, setOpen] = useState(false);
  const [submitTime, setSubmitTime] = useState<number>(0);
  
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<FormData>();

  const onSubmit = (data: FormData) => {
    // Spam checks
    const timeDiff = Date.now() - submitTime;
    if (data.website || timeDiff < 3000) {
      toast.error("Something went wrong. Please try again later.");
      return;
    }

    // Construct mailto URL with form data
    const subject = encodeURIComponent("Contact Form Submission");
    const body = encodeURIComponent(
      `Name: ${data.name}\nEmail: ${data.email}\n\nMessage:\n${data.message}`
    );
    const mailtoUrl = `mailto:vladsblog.zeaxg@simplelogin.com?subject=${subject}&body=${body}`;
    
    // Open default email client
    window.location.href = mailtoUrl;
    
    toast.success("Opening your email client...");
    setOpen(false);
    reset();
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button 
          onClick={() => setSubmitTime(Date.now())}
          variant="outline"
          className="bg-accent1/10 hover:bg-accent1/20 border-accent1/50"
        >
          Contact Me
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold bg-gradient-to-r from-accent1 to-accent2 text-transparent bg-clip-text">
            Send me a message
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 mt-4">
          <div>
            <Input
              placeholder="Your Name"
              {...register("name", { required: "Name is required" })}
              className="bg-background"
            />
            {errors.name && (
              <span className="text-sm text-red-500">{errors.name.message}</span>
            )}
          </div>
          
          <div>
            <Input
              type="email"
              placeholder="Your Email"
              {...register("email", { 
                required: "Email is required",
                pattern: {
                  value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
                  message: "Invalid email address"
                }
              })}
              className="bg-background"
            />
            {errors.email && (
              <span className="text-sm text-red-500">{errors.email.message}</span>
            )}
          </div>

          <div>
            <Textarea
              placeholder="Your Message"
              {...register("message", { required: "Message is required" })}
              className="bg-background min-h-[120px]"
            />
            {errors.message && (
              <span className="text-sm text-red-500">{errors.message.message}</span>
            )}
          </div>

          {/* Honeypot field - hidden from real users */}
          <Input
            type="text"
            {...register("website")}
            className="hidden"
            tabIndex={-1}
            autoComplete="off"
          />

          <Button 
            type="submit"
            className="w-full bg-gradient-to-r from-accent1 to-accent2 hover:opacity-90"
          >
            Send Message
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
};