import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

// Telegram auth code schema
const authCodeSchema = z.object({
  code: z.string().min(1, "Auth code is required").max(10),
});

type AuthCodeValues = z.infer<typeof authCodeSchema>;

interface TelegramAuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (code: string) => Promise<void>;
}

export default function TelegramAuthModal({
  isOpen,
  onClose,
  onSubmit,
}: TelegramAuthModalProps) {
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<AuthCodeValues>({
    resolver: zodResolver(authCodeSchema),
    defaultValues: {
      code: "",
    },
  });

  const handleSubmit = async (values: AuthCodeValues) => {
    try {
      setIsSubmitting(true);
      await onSubmit(values.code);
      form.reset();
      toast({
        title: "Telegram authentication successful",
        description: "Your account is now connected",
      });
      onClose();
    } catch (error) {
      console.error("Error authenticating Telegram:", error);
      toast({
        title: "Authentication failed",
        description: "Please check your code and try again",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Telegram Authentication</DialogTitle>
          <DialogDescription>
            Enter the authentication code sent to your Telegram account.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)}>
            <FormField
              control={form.control}
              name="code"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Authentication Code</FormLabel>
                  <FormControl>
                    <Input placeholder="Enter code..." {...field} autoFocus />
                  </FormControl>
                  <FormDescription>
                    The code was sent to the Telegram account associated with your
                    phone number.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter className="mt-6">
              <Button
                type="button"
                variant="outline"
                onClick={onClose}
                disabled={isSubmitting}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? "Verifying..." : "Verify Code"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}