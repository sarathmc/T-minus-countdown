import { Injectable } from '@angular/core';
import { CountdownTimeParts } from '../../domain/models/countdown.model';

const MS_PER_SECOND = 1000;
const MS_PER_MINUTE = 60 * MS_PER_SECOND;
const MS_PER_HOUR = 60 * MS_PER_MINUTE;
const MS_PER_DAY = 24 * MS_PER_HOUR;

/**
 * Pure, dependency-free time-remaining calculator.
 *
 * All calculations operate on epoch milliseconds (`Date.getTime()`), never on manual
 * calendar-field arithmetic. This keeps results correct across timezones and daylight-saving
 * transitions: an ISO-8601 timestamp with an explicit offset always resolves to the same instant
 * in time regardless of which timezone the viewer or the target date were authored in.
 */
@Injectable({ providedIn: 'root' })
export class CountdownCalculatorService {
  /**
   * Returns the breakdown of time between `now` and `targetDate`.
   * If the target date has already passed, `isPast` is true and all parts are clamped to zero
   * rather than going negative, so callers never have to special-case negative digits.
   */
  getTimeParts(targetDate: string | Date, now: Date = new Date()): CountdownTimeParts {
    const totalMs = this.toDate(targetDate).getTime() - now.getTime();
    const isPast = totalMs <= 0;
    const remaining = Math.max(0, totalMs);

    const days = Math.floor(remaining / MS_PER_DAY);
    const hours = Math.floor((remaining % MS_PER_DAY) / MS_PER_HOUR);
    const minutes = Math.floor((remaining % MS_PER_HOUR) / MS_PER_MINUTE);
    const seconds = Math.floor((remaining % MS_PER_MINUTE) / MS_PER_SECOND);

    return { days, hours, minutes, seconds, totalMs, isPast };
  }

  /** True once the target instant is at or before `now`. */
  isPast(targetDate: string | Date, now: Date = new Date()): boolean {
    return this.toDate(targetDate).getTime() <= now.getTime();
  }

  /**
   * Formats a target date for display in a given IANA timezone, independent of the viewer's
   * local timezone. Falls back to the runtime default timezone if `timeZone` is omitted.
   */
  formatInTimeZone(targetDate: string | Date, timeZone?: string): string {
    return new Intl.DateTimeFormat(undefined, {
      dateStyle: 'medium',
      timeStyle: 'short',
      timeZone,
    }).format(this.toDate(targetDate));
  }

  private toDate(value: string | Date): Date {
    return value instanceof Date ? value : new Date(value);
  }
}
