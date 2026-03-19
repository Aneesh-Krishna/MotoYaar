"use client";

import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import { MoreVertical, Pencil, Trash2, Users } from "lucide-react";
import { useRouter } from "next/navigation";

interface Props {
  vehicleId: string;
  isOwner: boolean;
}

export function VehicleKebabMenu({ vehicleId, isOwner }: Props) {
  const router = useRouter();

  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger asChild>
        <button
          aria-label="Vehicle options"
          className="p-1.5 rounded-full bg-black/30 text-white hover:bg-black/50 transition-colors"
        >
          <MoreVertical size={20} />
        </button>
      </DropdownMenu.Trigger>

      <DropdownMenu.Portal>
        <DropdownMenu.Content
          align="end"
          sideOffset={4}
          className="z-50 min-w-[160px] bg-white rounded-lg shadow-lg border border-gray-100 py-1 text-sm"
        >
          <DropdownMenu.Item
            onSelect={() => router.push(`/garage/${vehicleId}/edit`)}
            className="flex items-center gap-2 px-4 py-2 text-gray-700 hover:bg-gray-50 cursor-pointer outline-none"
          >
            <Pencil size={14} />
            Edit
          </DropdownMenu.Item>

          {isOwner && (
            <DropdownMenu.Item
              onSelect={() => {
                // TODO: Implement in Story 3.6
              }}
              className="flex items-center gap-2 px-4 py-2 text-red-600 hover:bg-gray-50 cursor-pointer outline-none"
            >
              <Trash2 size={14} />
              Delete
            </DropdownMenu.Item>
          )}

          {isOwner && (
            <DropdownMenu.Item
              onSelect={() => {
                // TODO: Implement in Epic 10 — Sharing
              }}
              className="flex items-center gap-2 px-4 py-2 text-gray-700 hover:bg-gray-50 cursor-pointer outline-none"
            >
              <Users size={14} />
              Manage Viewers
            </DropdownMenu.Item>
          )}
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
}
