"use client";

import { signIn } from "next-auth/react";
import { useSearchParams } from "next/navigation";
import { Users } from "lucide-react";
import { Suspense } from "react";

function BannedError() {
  const searchParams = useSearchParams();
  if (searchParams.get("error") !== "AccountBanned") return null;
  return (
    <div
      role="alert"
      className="w-full max-w-xs rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-body text-red-700"
    >
      Your account has been permanently suspended.
    </div>
  );
}

export default function LoginPage() {
  return (
    <div className="min-h-screen bg-surface flex flex-col">
      {/* Main content — centered */}
      <div className="flex-1 flex flex-col items-center justify-center px-8 py-12">
        {/* Logo */}
        <div className="mb-8 text-center">
          <span className="text-[2.5rem] font-bold text-primary tracking-tight">
            MotoYaar
          </span>
          <p className="text-body text-foreground-muted mt-2">
            Your garage, organized.
          </p>
        </div>

        {/* Banned account error */}
        <Suspense fallback={null}>
          <BannedError />
        </Suspense>

        {/* Google SSO button */}
        <div className="w-full max-w-xs space-y-4">
          <button
            type="button"
            onClick={() => signIn("google", { callbackUrl: "/" })}
            className="w-full flex items-center justify-center gap-3
                       bg-white border border-border rounded-btn px-6 py-3
                       text-body font-semibold text-foreground shadow-card
                       hover:shadow-md hover:border-gray-300 transition-all
                       focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
            aria-label="Continue with Google"
          >
            {/* Google logo SVG */}
            <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true">
              <path
                fill="#4285F4"
                d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.875 2.684-6.615z"
              />
              <path
                fill="#34A853"
                d="M9 18c2.43 0 4.467-.806 5.956-2.184l-2.908-2.258c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18z"
              />
              <path
                fill="#FBBC05"
                d="M3.964 10.707A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.707V4.961H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.039l3.007-2.332z"
              />
              <path
                fill="#EA4335"
                d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.961L3.964 7.293C4.672 5.163 6.656 3.58 9 3.58z"
              />
            </svg>
            Continue with Google
          </button>

          <p className="text-center text-caption text-foreground-muted">
            By continuing, you agree to our{" "}
            <a href="/privacy" className="text-primary hover:underline">
              Privacy Policy
            </a>
          </p>
        </div>

        {/* Community preview teaser */}
        <div className="mt-12 w-full max-w-xs">
          <div className="flex items-center gap-2 mb-3">
            <Users size={14} className="text-foreground-muted" aria-hidden="true" />
            <span className="text-caption text-foreground-muted font-medium">
              Join the community
            </span>
          </div>
          <div className="space-y-2 opacity-50 pointer-events-none select-none" aria-hidden="true">
            {[
              { title: "Manali via Rohtang — Solo Ride Report", likes: 47 },
              { title: "Best engine oil for RE Classic 350?", likes: 12 },
            ].map((post) => (
              <div
                key={post.title}
                className="bg-card rounded-lg border border-border p-3 blur-[1px]"
              >
                <p className="text-caption font-semibold text-foreground truncate">
                  {post.title}
                </p>
                <p className="text-[10px] text-foreground-muted mt-0.5">
                  👍 {post.likes}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
