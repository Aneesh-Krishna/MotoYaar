"use client";

import { useState } from "react";
import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import { MoreVertical, Pencil, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { ConfirmModal } from "@/components/ui/ConfirmModal";
import { deleteTrip } from "@/services/api/tripApi";

interface Props {
  tripId: string;
}

export function TripKebabMenu({ tripId }: Props) {
  const router = useRouter();
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      await deleteTrip(tripId);
      toast.success("Trip deleted");
      router.push("/trips");
    } catch {
      toast.error("Failed to delete trip. Try again.");
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
            aria-label="Trip options"
            className="p-1.5 rounded-full text-gray-500 hover:bg-gray-100 transition-colors"
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
              onSelect={() => router.push(`/trips/${tripId}/edit`)}
              className="flex items-center gap-2 px-4 py-2 text-gray-700 hover:bg-gray-50 cursor-pointer outline-none"
            >
              <Pencil size={14} />
              Edit
            </DropdownMenu.Item>

            <DropdownMenu.Item
              onSelect={() => setShowDeleteModal(true)}
              className="flex items-center gap-2 px-4 py-2 text-red-600 hover:bg-gray-50 cursor-pointer outline-none"
            >
              <Trash2 size={14} />
              Delete Trip
            </DropdownMenu.Item>
          </DropdownMenu.Content>
        </DropdownMenu.Portal>
      </DropdownMenu.Root>

      <ConfirmModal
        open={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        onConfirm={handleDelete}
        title="Delete this trip?"
        description="Deleting this trip will also delete its associated expense entries. This cannot be undone. Continue?"
        confirmLabel="Delete Trip"
        isDestructive={true}
        isLoading={isDeleting}
      />
    </>
  );
}
