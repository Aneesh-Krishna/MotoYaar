import Link from "next/link";
import { XCircle } from "lucide-react";
import { ConflictError, NotFoundError } from "@/lib/errors";
import { Button } from "@/components/ui/button";

interface Props {
  error: unknown;
}

export function InviteErrorView({ error }: Props) {
  let message = "Invalid invite link.";
  if (error instanceof ConflictError) {
    message = error.message;
  } else if (error instanceof NotFoundError) {
    message = "Invalid invite link. This invite does not exist.";
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="max-w-sm w-full bg-white rounded-2xl p-8 text-center shadow-sm">
        <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <XCircle className="text-red-500" size={24} />
        </div>
        <h1 className="text-lg font-bold text-gray-900 mb-2">Invite issue</h1>
        <p className="text-sm text-gray-500 mb-6">{message}</p>
        <Button variant="outline" className="w-full" asChild>
          <Link href="/garage">Go to Garage</Link>
        </Button>
      </div>
    </div>
  );
}
