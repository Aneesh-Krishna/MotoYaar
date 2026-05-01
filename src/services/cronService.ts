// TODO: Full implementation in Story 4.x — Cron Jobs

export interface CronResult {
  processed: number;
  notified: number;
  deleted: number;
}

export const cronService = {
  async runDocumentExpiryCheck(): Promise<CronResult> {
    return { processed: 0, notified: 0, deleted: 0 };
  },
};
