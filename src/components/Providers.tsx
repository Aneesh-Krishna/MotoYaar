"use client";

import { SessionProvider } from "next-auth/react";
import { Toaster } from "sonner";
import { GoogleMapsLoader } from "@/lib/googleMapsLoader";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      <GoogleMapsLoader>
        {children}
        <Toaster position="top-center" richColors />
      </GoogleMapsLoader>
    </SessionProvider>
  );
}
