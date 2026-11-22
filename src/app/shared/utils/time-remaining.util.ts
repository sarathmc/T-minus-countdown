import { CountdownTimeParts } from '../../domain/models/countdown.model';

/** Formats a {@link CountdownTimeParts} breakdown as a compact human-readable string. */
export function formatTimeParts(parts: CountdownTimeParts): string {
  if (parts.isPast) {
    return 'Deadline reached';
  }
  if (parts.days > 0) {
    return `${parts.days}d ${parts.hours}h ${parts.minutes}m`;
  }
  if (parts.hours > 0) {
    return `${parts.hours}h ${parts.minutes}m ${parts.seconds}s`;
  }
  return `${parts.minutes}m ${parts.seconds}s`;
}

/** Screen-reader-friendly sentence for the same breakdown, read less frequently than the visual digits. */
export function formatTimePartsForScreenReader(parts: CountdownTimeParts): string {
  if (parts.isPast) {
    return 'Deadline has been reached.';
  }
  return `${parts.days} days, ${parts.hours} hours, ${parts.minutes} minutes remaining.`;
}
