import { Milestone } from './milestone.model';
import { CountdownTheme } from './countdown-theme.model';

export type CountdownStatus = 'active' | 'paused' | 'archived';

export type CountdownCategory =
  | 'personal'
  | 'work'
  | 'study'
  | 'travel'
  | 'health'
  | 'finance'
  | 'other';

/** A deadline the user is counting down to, with its generated/custom milestones. */
export interface Countdown {
  /** Stable unique identifier (UUID). */
  id: string;
  /** Required, up to 64 characters in the UI layer. */
  title: string;
  /** Optional short description of the goal. */
  description?: string;
  /** ISO-8601 timestamp (UTC) of the deadline instant. */
  targetDate: string;
  /** IANA timezone name the target date was authored in, e.g. "Europe/Berlin". */
  timeZone: string;
  category: CountdownCategory;
  status: CountdownStatus;
  milestones: Milestone[];
  /** Optional for backwards compatibility; legacy records use the default theme. */
  theme?: CountdownTheme;
  createdAt: string;
  updatedAt: string;
}

/** The fields a user supplies when creating a countdown; the rest is derived. */
export interface CreateCountdownInput {
  title: string;
  description?: string;
  targetDate: string;
  timeZone: string;
  category: CountdownCategory;
  milestonePreset?: MilestonePresetId;
}

export type MilestonePresetId = 'standard' | 'compact' | 'light';

/** Breakdown of the remaining (or elapsed, if past) time until a target instant. */
export interface CountdownTimeParts {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
  /** Total milliseconds remaining; negative once the target date is in the past. */
  totalMs: number;
  /** True once `totalMs <= 0`. */
  isPast: boolean;
}
