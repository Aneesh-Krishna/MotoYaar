"use client";

import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { cn } from "@/lib/utils";

interface BottomSheetProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  className?: string;
}

/**
 * Mobile-first bottom sheet built on shadcn Sheet with side="bottom".
 * - Slides up from bottom with backdrop
 * - Drag handle at top center
 * - Focus-trapped, role="dialog", aria-modal="true" (via Radix Dialog)
 * - Covers up to 90vh on mobile
 */
export function BottomSheet({ open, onClose, title, children, className }: BottomSheetProps) {
  return (
    <Sheet open={open} onOpenChange={(isOpen) => { if (!isOpen) onClose(); }}>
      <SheetContent
        side="bottom"
        className={cn(
          "max-h-[90vh] overflow-y-auto rounded-t-2xl p-0",
          className
        )}
        aria-modal="true"
      >
        {/* Drag handle */}
        <div className="flex justify-center pt-3 pb-1">
          <div className="h-1 w-10 rounded-full bg-gray-300" aria-hidden="true" />
        </div>

        {title && (
          <SheetHeader className="px-4 pb-2">
            <SheetTitle className="text-base font-semibold text-center">{title}</SheetTitle>
          </SheetHeader>
        )}

        {children}
      </SheetContent>
    </Sheet>
  );
}
