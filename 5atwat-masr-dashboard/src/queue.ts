import crypto from "crypto";
import type { AccountCredentials, PlatformAdapter, PublishRequest, PublishResult } from "./types";

// ============================================================
// طابور نشر بسيط في الذاكرة — في الإنتاج يفضّل استبداله بـ
// BullMQ / Redis عشان يبقى persistent ومتوزع بين أكتر من instance
// ============================================================

interface QueueJob {
  id: string;
  creds: AccountCredentials;
  request: PublishRequest;
  adapter: PlatformAdapter;
  attempts: number;
  scheduledAt?: number; // للجدولة المستقبلية
}

const MAX_ATTEMPTS = 3;
const RETRY_DELAY_MS = 5000;

export class PublishQueue {
  private jobs: QueueJob[] = [];
  private processing = false;
  private results = new Map<string, PublishResult>();

  enqueue(
    adapter: PlatformAdapter,
    creds: AccountCredentials,
    request: PublishRequest,
    scheduledAt?: number
  ): string {
    const id = crypto.randomUUID();
    this.jobs.push({ id, creds, request, adapter, attempts: 0, scheduledAt });
    if (!this.processing) this.process();
    return id;
  }

  getResult(jobId: string): PublishResult | undefined {
    return this.results.get(jobId);
  }

  private async process() {
    this.processing = true;
    while (this.jobs.length > 0) {
      const job = this.jobs[0];

      if (job.scheduledAt && job.scheduledAt > Date.now()) {
        // مش وقته لسه — نستنى ونعيد المحاولة
        await new Promise((r) => setTimeout(r, 1000));
        continue;
      }

      this.jobs.shift();
      job.attempts += 1;

      try {
        const result = await job.adapter.publish(job.creds, job.request);
        if (!result.success && job.attempts < MAX_ATTEMPTS) {
          await new Promise((r) => setTimeout(r, RETRY_DELAY_MS));
          this.jobs.push(job); // نرجّعه في الآخر يتحاول تاني
          continue;
        }
        this.results.set(job.id, result);
      } catch (e) {
        if (job.attempts < MAX_ATTEMPTS) {
          this.jobs.push(job);
        } else {
          this.results.set(job.id, {
            success: false,
            platform: job.adapter.platform,
            error: String(e),
          });
        }
      }
    }
    this.processing = false;
  }
}
