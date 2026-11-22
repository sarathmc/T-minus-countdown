/** A single checkpoint on the way to a countdown's target date. */
export interface Milestone {
  /** Stable unique identifier (UUID). */
  id: string;
  /** Owning countdown id. */
  countdownId: string;
  /** Short, user-facing label, e.g. "Review your progress". */
  title: string;
  /** Optional longer description of what "done" means for this milestone. */
  description?: string;
  /** ISO-8601 timestamp (UTC) the milestone falls on. */
  date: string;
  /** Offset in whole days before the target date (0 = target day). Negative values are not used. */
  offsetDays: number;
  /** Whether the user has marked this milestone complete. */
  done: boolean;
  /** True for the built-in T-60/30/14/7/5/3/2/1/0 set; false for user-added milestones. */
  isDefault: boolean;
}

/** The default milestone offsets (in days before the target date) generated for every new countdown. */
export const DEFAULT_MILESTONE_OFFSETS_DAYS: readonly number[] = [60, 30, 14, 7, 5, 3, 2, 1, 0];

/** Human-readable default titles keyed by their day offset. */
export const DEFAULT_MILESTONE_TITLES: Readonly<Record<number, string>> = {
  60: 'Lock the plan',
  30: 'Complete the core work',
  14: 'Review your progress',
  7: 'Final preparation',
  5: 'Tie up loose ends',
  3: 'Resolve remaining tasks',
  2: 'Last-minute checks',
  1: 'Final check',
  0: 'Target day',
};
