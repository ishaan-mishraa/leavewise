// Shapes of the JSON returned by the Spring Boot API.

export type Role = 'EMPLOYEE' | 'MANAGER' | 'HR';
export type LeaveStatus = 'WAITING' | 'APPROVED' | 'DECLINED' | 'CANCELLED';

export interface User {
  id: number;
  name: string;
  email: string;
  role: Role;
  jobTitle: string | null;
  team: string | null;
  managerName: string | null;
}

export interface AuthResponse {
  token: string;
  user: User;
}

export interface LeaveType {
  code: string;
  name: string;
  annualQuota: number;
  halfDayAllowed: boolean;
}

export interface Balance {
  code: string;
  name: string;
  quota: number;
  used: number;
  left: number;
}

export interface Leave {
  id: number;
  userId: number;
  userName: string;
  typeCode: string;
  typeName: string;
  from: string;
  to: string;
  halfDay: boolean;
  days: number;
  reason: string;
  status: LeaveStatus;
  managerComment: string | null;
  decidedBy: string | null;
  createdAt: string;
  decidedAt: string | null;
}

export interface AwayPerson {
  userId: number;
  name: string;
  typeCode: string;
  status: LeaveStatus;
  from: string;
  to: string;
}

export interface Clash {
  date: string;
  people: AwayPerson[];
  total: number;
  teamSize: number;
  limitPct: number;
  overLimit: boolean;
}

export interface Preview {
  days: number;
  holidaysSkipped: string[];
  left: number;
  leftAfter: number;
  clash: Clash | null;
}

export interface Approval {
  leave: Leave;
  jobTitle: string | null;
  leftAfter: number;
  clash: Clash | null;
}

export interface CalendarDay {
  date: string;
  weekend: boolean;
  holiday: string | null;
  people: AwayPerson[];
  overLimit: boolean;
}

export interface Calendar {
  month: string;
  team: string;
  teamSize: number;
  limitPct: number;
  days: CalendarDay[];
}

export interface Holiday {
  id: number;
  date: string;
  name: string;
}

export interface NewLeave {
  typeCode: string;
  from: string;
  to: string;
  halfDay: boolean;
  reason: string;
}
