import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ContactFormFields } from "./ContactFormFields";
import { useState } from "react";

export const ContactDialog = () => {
  const [open, setOpen] = useState(false);
  const [submitTime, setSubmitTime] = useState<number>(0);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button 
          onClick={() => setSubmitTime(Date.now())}
          variant="outline"
          className="bg-accent1/10 hover:bg-accent1/20 border-accent1/50 text-white"
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
        <ContactFormFields submitTime={submitTime} onSuccess={() => setOpen(false)} />
      </DialogContent>
    </Dialog>
  );
};