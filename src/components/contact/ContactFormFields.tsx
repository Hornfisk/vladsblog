import { useForm } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

type FormData = {
  name: string;
  email: string;
  message: string;
  website: string; // honeypot field
};

interface ContactFormFieldsProps {
  submitTime: number;
  onSuccess: () => void;
}

export const ContactFormFields = ({ submitTime, onSuccess }: ContactFormFieldsProps) => {
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<FormData>();

  const onSubmit = async (data: FormData) => {
    // Spam checks
    const timeDiff = Date.now() - submitTime;
    if (data.website || timeDiff < 3000) {
      toast.error("Something went wrong. Please try again later.");
      return;
    }

    try {
      console.log("Sending contact form data:", { 
        name: data.name, 
        email: data.email,
        messageLength: data.message.length 
      });

      const { data: response, error } = await supabase.functions.invoke('send-contact-email', {
        body: {
          name: data.name,
          email: data.email,
          message: data.message,
        },
      });

      console.log("Response from edge function:", { response, error });

      if (error) {
        console.error('Edge function error:', error);
        throw error;
      }

      toast.success("Message sent successfully! I'll get back to you soon.");
      onSuccess();
      reset();
    } catch (error) {
      console.error('Error sending message:', error);
      toast.error("Failed to send message. Please try again later.");
    }
  };

  return (
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
        disabled={isSubmitting}
        className="w-full bg-gradient-to-r from-accent1 to-accent2 hover:opacity-90"
      >
        {isSubmitting ? "Sending..." : "Send Message"}
      </Button>
    </form>
  );
};