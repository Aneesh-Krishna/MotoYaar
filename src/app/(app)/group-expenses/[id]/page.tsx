import { getSession } from "@/lib/session";
import { groupExpenseService } from "@/services/groupExpenseService";
import { redirect, notFound } from "next/navigation";
import { ForbiddenError, NotFoundError } from "@/lib/errors";
import SessionHeader from "@/components/group-expenses/SessionHeader";
import ExpenseItemRow from "@/components/group-expenses/ExpenseItemRow";
import GroupExpenseFab from "@/components/group-expenses/GroupExpenseFab";
import BalancesPanel from "@/components/group-expenses/BalancesPanel";
import GroupExpenseTabBar from "@/components/group-expenses/GroupExpenseTabBar";

interface Props {
  params: { id: string };
  searchParams: { tab?: string };
}

export default async function GroupExpenseSessionPage({ params, searchParams }: Props) {
  const session = await getSession();
  if (!session) redirect("/login");

  try {
    const [expenseSession, items, balances] = await Promise.all([
      groupExpenseService.getById(params.id, session.user.id),
      groupExpenseService.listItems(params.id, session.user.id),
      groupExpenseService.computeBalances(params.id, session.user.id),
    ]);

    const tab = searchParams.tab === "balances" ? "balances" : "expenses";

    return (
      <div className="px-4 py-6 max-w-lg mx-auto pb-24">
        <SessionHeader session={expenseSession} currentUserId={session.user.id} />

        <GroupExpenseTabBar sessionId={params.id} activeTab={tab} />

        <div className="mt-4">
          {tab === "expenses" ? (
            <>
              <h2 className="text-sm font-semibold text-gray-500 uppercase mb-3">
                Expenses ({items.length})
              </h2>
              {items.length === 0 ? (
                <p className="text-sm text-gray-400 text-center py-8">
                  No expenses yet. Tap + to add one.
                </p>
              ) : (
                <div className="space-y-3">
                  {items.map((item) => (
                    <ExpenseItemRow
                      key={item.id}
                      item={item}
                      sessionId={params.id}
                      currentUserId={session.user.id}
                      sessionCreatorId={expenseSession.createdBy}
                      currency={expenseSession.currency}
                    />
                  ))}
                </div>
              )}
            </>
          ) : (
            <BalancesPanel
              data={balances}
              sessionId={params.id}
              currentUserId={session.user.id}
              sessionCreatorId={expenseSession.createdBy}
              currency={expenseSession.currency}
              canArchive={expenseSession.createdBy === session.user.id && expenseSession.status === "active"}
            />
          )}
        </div>

        {expenseSession.status === "active" && tab === "expenses" && (
          <GroupExpenseFab
            sessionId={params.id}
            members={expenseSession.members}
            currentUserId={session.user.id}
          />
        )}
      </div>
    );
  } catch (error) {
    if (error instanceof ForbiddenError) redirect("/trips");
    if (error instanceof NotFoundError) notFound();
    throw error;
  }
}
