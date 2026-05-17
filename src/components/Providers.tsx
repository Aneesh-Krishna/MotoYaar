"use client";

import { SessionProvider } from "next-auth/react";
import { Toaster } from "sonner";
import NextTopLoader from "nextjs-toploader";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      <NextTopLoader
        color="#F97316"
        shadow="0 0 10px #F97316, 0 0 5px #F97316"
        height={3}
        showSpinner={false}
      />
      {children}
      <Toaster position="top-center" richColors />
    </SessionProvider>
  );
}
