import { apiRequest } from "@/lib/api-client";
import type { Expense } from "@/types";
import type { CreateExpenseInput, UpdateExpenseInput } from "@/lib/validations/expense";

export async function createVehicleExpense(
  vehicleId: string,
  data: CreateExpenseInput
): Promise<Expense> {
  return apiRequest<Expense>(`/vehicles/${vehicleId}/expenses`, {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export async function createExpense(data: CreateExpenseInput): Promise<Expense> {
  return apiRequest<Expense>("/expenses", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export async function listVehicleExpenses(vehicleId: string): Promise<Expense[]> {
  return apiRequest<Expense[]>(`/vehicles/${vehicleId}/expenses`);
}

export async function updateExpense(id: string, data: UpdateExpenseInput): Promise<Expense> {
  return apiRequest<Expense>(`/expenses/${id}`, {
    method: "PATCH",
    body: JSON.stringify(data),
  });
}

export async function deleteExpense(id: string): Promise<void> {
  return apiRequest<void>(`/expenses/${id}`, { method: "DELETE" });
}

export async function getReceiptUrl(expenseId: string): Promise<{ signedUrl: string }> {
  return apiRequest<{ signedUrl: string }>(`/expenses/${expenseId}/receipt-url`);
}

export async function requestReceiptUploadUrl(
  filename: string,
  contentType: string
): Promise<{ uploadUrl: string; tempKey: string }> {
  return apiRequest<{ uploadUrl: string; tempKey: string }>("/uploads/receipt", {
    method: "POST",
    body: JSON.stringify({ filename, contentType }),
  });
}
