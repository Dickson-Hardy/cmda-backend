export const JOB_QUEUE = 'cmda.jobs.v1';
export const DEAD_LETTER_EXCHANGE = 'cmda.jobs.dlx';
export const DEAD_LETTER_QUEUE = 'cmda.jobs.dead.v1';
export const REALTIME_EXCHANGE = 'cmda.realtime.v1';

export type JobType = 'chat-outbox' | 'notification-outbox' | 'bulk-email' | 'email';

export interface QueueJob {
  type: JobType;
  resourceId?: string;
  payload?: Record<string, unknown>;
  createdAt: string;
}

export interface RealtimeEvent {
  userId: string;
  event: string;
  legacyEvent?: string;
  payload: unknown;
}
