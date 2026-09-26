// Formatting helpers shared by the pages.
import { AwayPerson, LeaveStatus } from './models';

const TYPE_COLORS: Record<string, string> = { EL: 'var(--el)', CL: 'var(--cl)', SL: 'var(--sl)', CO: 'var(--co)' };
const AVATAR_COLORS = ['var(--el)', 'var(--cl)', 'var(--sl)', 'var(--co)'];

export const typeColor = (code: string) => TYPE_COLORS[code] ?? 'var(--muted)';
export const avatarColor = (id: number) => AVATAR_COLORS[id % AVATAR_COLORS.length];
export const initials = (name: string) => name.split(' ').map(p => p[0]).join('').slice(0, 2);
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
export const days = (n: number) => `${num(n)} ${n === 1 ? 'day' : 'days'}`;

export function statusLabel(s: LeaveStatus): { cls: string; text: string } {
  switch (s) {
    case 'APPROVED': return { cls: 'ok', text: 'Approved' };
    case 'WAITING': return { cls: 'wait', text: 'Waiting' };
    case 'DECLINED': return { cls: 'no', text: 'Declined' };
    default: return { cls: 'off', text: 'Cancelled' };
  }
}

/** "Rohan, Vikram and Sneha (not approved yet)" */
export function names(people: AwayPerson[]): string {
  const n = people.map(p => firstName(p.name) + (p.status === 'WAITING' ? ' (not approved yet)' : ''));
  return n.length < 2 ? n.join('') : `${n.slice(0, -1).join(', ')} and ${n[n.length - 1]}`;
}

/** The leaf from the logo, drawn in a 32×32 box. */
export const LEAF_PATH =
  'M26 5C14 5 6 11.5 6 20.5c0 2.3.6 4.3 1.6 6 .9-4.8 4.6-10 11.4-13.5-5.2 3.8-8.3 8.2-9.6 13.3 1.6 1 3.5 1.7 5.6 1.7C24 28 27 18 26 5Z';
