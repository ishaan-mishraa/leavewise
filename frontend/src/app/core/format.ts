// Formatting helpers shared by the pages.
import { AwayPerson, LeaveStatus } from './models';

const TYPE_COLORS: Record<string, string> = { EL: 'var(--el)', CL: 'var(--cl)', SL: 'var(--sl)', CO: 'var(--co)' };

export const typeColor = (code: string) => TYPE_COLORS[code] ?? 'var(--muted)';
export const firstName = (name: string) => name.split(' ')[0];

/** "2026-10-14" → a Date at local midnight (avoids time zone shifts). */
export function parseDate(s: string): Date {
  const [y, m, d] = s.split('-').map(Number);
  return new Date(y, m - 1, d);
}

/** A Date → "2026-10-14". */
export function isoDate(d: Date): string {
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

export const today = () => isoDate(new Date());

/** "Wed 14 Oct" */
export function fd(s: string): string {
  return parseDate(s).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' });
}

/** "Wed 14 – Thu 15 Oct", or one date when from and to match. */
export function range(from: string, to: string): string {
  if (from === to) return fd(from);
  const a = parseDate(from), b = parseDate(to);
  const wd = (d: Date) => d.toLocaleDateString('en-GB', { weekday: 'short' });
  const mon = (d: Date) => d.toLocaleDateString('en-GB', { month: 'short' });
  return a.getMonth() === b.getMonth()
    ? `${wd(a)} ${a.getDate()} – ${wd(b)} ${b.getDate()} ${mon(b)}`
    : `${fd(from)} – ${fd(to)}`;
}

export const num = (n: number) => (Number.isInteger(n) ? String(n) : n.toFixed(1));

export function statusLabel(s: LeaveStatus): { cls: string; text: string } {
  switch (s) {
    case 'APPROVED': return { cls: 'ok', text: 'Approved' };
    case 'WAITING': return { cls: 'wait', text: 'Pending' };
    case 'DECLINED': return { cls: 'no', text: 'Declined' };
    default: return { cls: 'off', text: 'Cancelled' };
  }
}

/** "Rohan, Vikram and Sneha (not approved yet)" */
export function names(people: AwayPerson[]): string {
  const n = people.map(p => firstName(p.name) + (p.status === 'WAITING' ? ' (pending)' : ''));
  return n.length < 2 ? n.join('') : `${n.slice(0, -1).join(', ')} and ${n[n.length - 1]}`;
}

