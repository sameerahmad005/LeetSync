import { Difficulty, SyncRunStatus } from "@/lib/types/common";

export interface SyncOptions {
  isDryRun?: boolean;
  limit?: number;
  triggerType?: "MANUAL" | "SCHEDULED";
  ignoreAutoSyncFlag?: boolean;
}

export interface SyncDryRunResultItem {
  submissionId: string;
  problemSlug: string;
  title: string;
  difficulty: Difficulty;
  language: string;
  status: "NEW" | "ALREADY_SYNCED" | "UNSUPPORTED";
  targetPath: string;
}

export interface SyncResult {
  syncRunId: string;
  status: SyncRunStatus;
  isDryRun: boolean;
  detectedCount: number;
  syncedCount: number;
  skippedCount: number;
  failedCount: number;
  errorMessage?: string;
  previewItems?: SyncDryRunResultItem[];
}
