"use client";

import { format } from "date-fns";
import { FileText, Shield, Wind, CreditCard, File, MoreVertical, Cloud } from "lucide-react";
import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import { StatusBadge } from "@/components/ui/StatusBadge";
import type { Document, DocumentType } from "@/types";

interface DocumentRowProps {
  document: Document;
  storagePreference: "parse_only" | "full_storage";
  onEdit: (id: string) => void;
  onDelete: (id: string) => void;
  onView?: (docId: string) => void;
}

const TYPE_ICONS: Record<DocumentType, React.ElementType> = {
  RC: FileText,
  Insurance: Shield,
  PUC: Wind,
  DL: CreditCard,
  Other: File,
};

const TYPE_LABELS: Record<DocumentType, string> = {
  RC: "Registration Certificate",
  Insurance: "Insurance",
  PUC: "Pollution Certificate",
  DL: "Driving Licence",
  Other: "Other Document",
};

export function DocumentRow({
  document,
  storagePreference,
  onEdit,
  onDelete,
  onView,
}: DocumentRowProps) {
  const Icon = TYPE_ICONS[document.type] ?? File;
  const typeLabel = document.label ?? TYPE_LABELS[document.type];
  const canView = !!document.storageUrl && storagePreference === "full_storage";

  const formattedExpiry = document.expiryDate
    ? format(new Date(document.expiryDate), "d MMM yyyy")
    : "No expiry date";

  return (
    <div className="flex items-center gap-3 px-4 py-3">
      {/* Type icon */}
      <div className="shrink-0 w-10 h-10 rounded-xl bg-gray-100 flex items-center justify-center">
        <Icon size={20} className="text-gray-500" aria-hidden="true" />
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-sm font-semibold text-gray-900 truncate">{typeLabel}</span>
          <StatusBadge status={document.status} />
        </div>
        <p className="text-xs text-gray-500 mt-0.5">{formattedExpiry}</p>
        <div className="mt-1">
          {document.storageUrl ? (
            <span className="inline-flex items-center gap-1 text-xs text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded">
              <Cloud size={10} />
              Stored
            </span>
          ) : (
            <span className="text-xs text-gray-400">Parsed only</span>
          )}
        </div>
      </div>

      {/* Kebab menu */}
      <DropdownMenu.Root>
        <DropdownMenu.Trigger asChild>
          <button
            aria-label="Document actions"
            className="shrink-0 p-1.5 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors"
          >
            <MoreVertical size={18} aria-hidden="true" />
          </button>
        </DropdownMenu.Trigger>

        <DropdownMenu.Portal>
          <DropdownMenu.Content
            align="end"
            sideOffset={4}
            className="z-50 min-w-[140px] rounded-xl border border-gray-100 bg-white shadow-lg py-1 text-sm"
          >
            {canView && onView && (
              <DropdownMenu.Item
                onSelect={() => onView(document.id)}
                className="flex items-center px-4 py-2.5 text-gray-700 hover:bg-gray-50 cursor-pointer outline-none"
              >
                View Document
              </DropdownMenu.Item>
            )}
            {canView && (
              <DropdownMenu.Item
                onSelect={() => {/* Story 4.4/4.5: replace document file */}}
                className="flex items-center px-4 py-2.5 text-gray-700 hover:bg-gray-50 cursor-pointer outline-none"
              >
                Replace
              </DropdownMenu.Item>
            )}
            <DropdownMenu.Item
              onSelect={() => onEdit(document.id)}
              className="flex items-center px-4 py-2.5 text-gray-700 hover:bg-gray-50 cursor-pointer outline-none"
            >
              Edit
            </DropdownMenu.Item>
            <DropdownMenu.Item
              onSelect={() => onDelete(document.id)}
              className="flex items-center px-4 py-2.5 text-red-600 hover:bg-red-50 cursor-pointer outline-none"
            >
              Delete
            </DropdownMenu.Item>
          </DropdownMenu.Content>
        </DropdownMenu.Portal>
      </DropdownMenu.Root>
    </div>
  );
}
