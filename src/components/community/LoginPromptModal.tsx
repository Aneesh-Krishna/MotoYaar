"use client";
import { signIn } from "next-auth/react";
import { Users } from "lucide-react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

interface LoginPromptModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  message?: string;
}

export function LoginPromptModal({
  open,
  onOpenChange,
  message = "Sign in with Google to join the conversation",
}: LoginPromptModalProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm text-center">
        <div className="py-4">
          <div className="w-12 h-12 bg-orange-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Users className="text-orange-500" size={24} />
          </div>
          <h2 className="text-lg font-bold text-gray-900 mb-2">Join the conversation</h2>
          <p className="text-sm text-gray-500 mb-6">{message}</p>
          <Button
            onClick={() => signIn("google", { callbackUrl: window.location.href })}
            className="w-full bg-white text-gray-700 border border-gray-300 hover:bg-gray-50"
          >
            <img src="/icons/google.svg" alt="" className="w-4 h-4 mr-2" />
            Continue with Google
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
