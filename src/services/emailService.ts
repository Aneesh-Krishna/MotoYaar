// TODO: Full implementation in Story 1.4 — Email (Resend)

export interface ExpiringDoc {
  id?: string;
  type: string;
  vehicleName: string;
  expiryDate: Date | string;
  daysUntilExpiry: number;
}

export const emailService = {
  async sendVehicleInviteEmail(
    _to: string,
    _vehicleName: string,
    _inviteUrl: string
  ): Promise<void> {},

  async sendBetaInviteEmail(_to: string, _inviteUrl?: string): Promise<void> {},

  async sendDocumentExpiryEmail(_to: string, _docs: ExpiringDoc[]): Promise<void> {},

  async sendDocumentExpiryReminder(_to: string, _docs: ExpiringDoc[]): Promise<void> {},
};
