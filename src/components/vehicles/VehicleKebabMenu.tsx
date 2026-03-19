"use client";

import { useState } from "react";
import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import { MoreVertical, Pencil, Trash2, Users } from "lucide-react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { ConfirmModal } from "@/components/ui/ConfirmModal";
import { deleteVehicle } from "@/services/api/vehicleApi";
import { ApiError } from "@/lib/api-client";

interface Props {
  vehicleId: string;
  isOwner: boolean;
}

export function VehicleKebabMenu({ vehicleId, isOwner }: Props) {
  const router = useRouter();
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      await deleteVehicle(vehicleId);
      toast.success("Vehicle deleted");
      router.push("/garage");
      router.refresh();
    } catch (error) {
      if (error instanceof ApiError) {
        toast.error(error.message);
      } else {
        toast.error("Failed to delete vehicle. Try again.");
      }
    } finally {
      setIsDeleting(false);
      setShowDeleteModal(false);
    }
  };

  return (
    <>
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
                onSelect={() => setShowDeleteModal(true)}
                className="flex items-center gap-2 px-4 py-2 text-red-600 hover:bg-gray-50 cursor-pointer outline-none"
              >
                <Trash2 size={14} />
                Delete Vehicle
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

      <ConfirmModal
        open={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        onConfirm={handleDelete}
        title="Delete Vehicle"
        description="Deleting this vehicle will also delete all its documents, expenses, and trips. This cannot be undone. Continue?"
        confirmLabel="Delete Vehicle"
        isDestructive
        isLoading={isDeleting}
      />
    </>
  );
}
