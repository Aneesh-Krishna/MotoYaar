"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import AddExpenseSheet from "@/components/group-expenses/AddExpenseSheet";
import type { GroupExpenseSessionMember } from "@/services/groupExpenseService";

interface Props {
  sessionId: string;
  members: GroupExpenseSessionMember[];
  currentUserId: string;
}

export default function GroupExpenseFab({ sessionId, members, currentUserId }: Props) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="fixed bottom-20 right-4 w-14 h-14 bg-orange-500 text-white rounded-full shadow-lg flex items-center justify-center hover:bg-orange-600 active:scale-95 transition-all z-40"
        aria-label="Add expense"
      >
        <Plus size={24} />
      </button>

      <AddExpenseSheet
        open={open}
        onClose={() => setOpen(false)}
        sessionId={sessionId}
        members={members}
        currentUserId={currentUserId}
      />
    </>
  );
}
