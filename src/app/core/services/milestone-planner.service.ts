import { Injectable } from '@angular/core';
import {
  DEFAULT_MILESTONE_OFFSETS_DAYS,
  DEFAULT_MILESTONE_TITLES,
  Milestone,
} from '../../domain/models/milestone.model';
import { MilestonePresetId } from '../../domain/models/countdown.model';

const MS_PER_DAY = 24 * 60 * 60 * 1000;

/** Day offsets (before the target date) used by each milestone preset. */
const MILESTONE_PRESETS: Readonly<Record<MilestonePresetId, readonly number[]>> = {
  standard: DEFAULT_MILESTONE_OFFSETS_DAYS,
  compact: [14, 7, 3, 1, 0],
  light: [7, 3, 1, 0],
};

let uidCounter = 0;
function generateId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  uidCounter += 1;
  return `milestone-${Date.now()}-${uidCounter}`;
}

/**
 * Generates and manages the milestone checklist for a countdown.
 *
 * Milestones are always derived from the target date, not from "today", so generation is
 * correct for both short-term (a few days away) and long-term (months away) deadlines: an
 * offset that would fall before "now" is still included, since the milestone's purpose is to
 * mark a point on the plan, not to predict whether the user will reach it in time.
 */
@Injectable({ providedIn: 'root' })
export class MilestonePlannerService {
  /** Builds the default or preset milestone set for a brand-new countdown. */
  generateDefaultMilestones(
    countdownId: string,
    targetDate: string,
    preset: MilestonePresetId = 'standard'
  ): Milestone[] {
    const offsets = MILESTONE_PRESETS[preset] ?? MILESTONE_PRESETS.standard;
    const target = new Date(targetDate);

    return offsets.map((offsetDays) => {
      const date = new Date(target.getTime() - offsetDays * MS_PER_DAY);
      return {
        id: generateId(),
        countdownId,
        title: DEFAULT_MILESTONE_TITLES[offsetDays] ?? `T-${offsetDays} days`,
        date: date.toISOString(),
        offsetDays,
        done: false,
        isDefault: true,
      } satisfies Milestone;
    });
  }

  /**
   * Adds a custom milestone, rejecting it if a milestone already exists on the same calendar
   * date (UTC) for this countdown — this is the duplicate-prevention rule required by the brief.
   */
  addCustomMilestone(
    existing: Milestone[],
    countdownId: string,
    targetDate: string,
    input: { title: string; date: string; description?: string }
  ): Milestone[] {
    const title = input.title.trim();
    if (!title) {
      throw new Error('Milestone title is required.');
    }

    const date = new Date(input.date);
    if (Number.isNaN(date.getTime())) {
      throw new Error('Milestone date is invalid.');
    }

    const sameDay = (a: Date, b: Date) =>
      a.getUTCFullYear() === b.getUTCFullYear() &&
      a.getUTCMonth() === b.getUTCMonth() &&
      a.getUTCDate() === b.getUTCDate();

    if (existing.some((m) => sameDay(new Date(m.date), date))) {
      throw new Error('A milestone already exists on that date.');
    }

    const offsetDays = Math.round(
      (new Date(targetDate).getTime() - date.getTime()) / MS_PER_DAY
    );

    const milestone: Milestone = {
      id: generateId(),
      countdownId,
      title,
      description: input.description?.trim() || undefined,
      date: date.toISOString(),
      offsetDays,
      done: false,
      isDefault: false,
    };

    return [...existing, milestone];
  }

  /** Returns a new list with the given milestone removed. */
  removeMilestone(existing: Milestone[], milestoneId: string): Milestone[] {
    return existing.filter((m) => m.id !== milestoneId);
  }

  /** Returns a new list with the given milestone's `done` flag toggled/set. */
  setMilestoneDone(existing: Milestone[], milestoneId: string, done: boolean): Milestone[] {
    return existing.map((m) => (m.id === milestoneId ? { ...m, done } : m));
  }

  /** Updates a milestone's editable fields (title, description, date), re-deriving its offset. */
  updateMilestone(
    existing: Milestone[],
    targetDate: string,
    milestoneId: string,
    changes: Partial<Pick<Milestone, 'title' | 'description' | 'date'>>
  ): Milestone[] {
    return existing.map((m) => {
      if (m.id !== milestoneId) {
        return m;
      }
      const next = { ...m, ...changes };
      if (changes.date) {
        next.offsetDays = Math.round(
          (new Date(targetDate).getTime() - new Date(changes.date).getTime()) / MS_PER_DAY
        );
      }
      return next;
    });
  }

  /** Returns milestones sorted chronologically (earliest first). */
  sortByDate(milestones: Milestone[]): Milestone[] {
    return [...milestones].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  }

  /** Percentage (0-100, rounded) of milestones marked done. Returns 0 for an empty list. */
  completionPercentage(milestones: Milestone[]): number {
    if (milestones.length === 0) {
      return 0;
    }
    const done = milestones.filter((m) => m.done).length;
    return Math.round((done / milestones.length) * 100);
  }
}
