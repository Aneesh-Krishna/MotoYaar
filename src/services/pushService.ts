// TODO: Full implementation in Story 1.6 — Push Notifications

export const pushService = {
  async subscribe(
    _userId: string,
    _sub: { endpoint: string; p256dh: string; auth: string }
  ): Promise<void> {},

  async unsubscribe(_userId: string): Promise<void> {},

  async deleteAllForUser(_userId: string): Promise<void> {},

  async deleteSubscription(_subscriptionId: string): Promise<void> {},

  async hasSubscription(_userId: string): Promise<boolean> {
    return false;
  },

  async getSubscriptionsForUser(_userId: string): Promise<unknown[]> {
    return [];
  },

  async sendNotification(
    _userId: string,
    _payload: { title: string; body: string; url?: string }
  ): Promise<void> {},
};
