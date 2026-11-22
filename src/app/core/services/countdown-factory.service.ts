import { Injectable, inject } from '@angular/core';
import { Countdown, CreateCountdownInput } from '../../domain/models/countdown.model';
import { DEFAULT_COUNTDOWN_THEME } from '../../domain/models/countdown-theme.model';
import { MilestonePlannerService } from './milestone-planner.service';

function generateId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `countdown-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

/** Builds a new {@link Countdown} aggregate (entity + generated milestones) from user input. */
@Injectable({ providedIn: 'root' })
export class CountdownFactoryService {
  private readonly milestonePlanner = inject(MilestonePlannerService);

  create(input: CreateCountdownInput): Countdown {
    const title = input.title.trim();
    if (!title) {
      throw new Error('Title is required.');
    }

    const target = new Date(input.targetDate);
    if (Number.isNaN(target.getTime())) {
      throw new Error('Choose a valid target date and time.');
    }
    if (target.getTime() <= Date.now()) {
      throw new Error('Choose a future date and time.');
    }

    const id = generateId();
    const now = new Date().toISOString();

    return {
      id,
      title,
      description: input.description?.trim() || undefined,
      targetDate: target.toISOString(),
      timeZone: input.timeZone,
      category: input.category,
      status: 'active',
      milestones: this.milestonePlanner.generateDefaultMilestones(
        id,
        target.toISOString(),
        input.milestonePreset ?? 'standard'
      ),
      theme: { ...DEFAULT_COUNTDOWN_THEME },
      createdAt: now,
      updatedAt: now,
    };
  }

  /** Creates a copy of a countdown with a new id, reset milestone completion, and fresh timestamps. */
  duplicate(source: Countdown): Countdown {
    const id = generateId();
    const now = new Date().toISOString();
    return {
      ...source,
      id,
      title: `${source.title} (copy)`,
      status: 'active',
      milestones: source.milestones.map((m) => ({
        ...m,
        id: generateId(),
        countdownId: id,
        done: false,
      })),
      createdAt: now,
      updatedAt: now,
    };
  }
}
