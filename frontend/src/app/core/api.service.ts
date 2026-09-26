import { HttpClient, HttpErrorResponse, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../environments/environment';
import {
  Approval, AuthResponse, Balance, Calendar, AwayPerson, Holiday, Leave, LeaveType, NewLeave, Preview, Role, User,
} from './models';

/** One method per backend endpoint. Each returns a Promise so pages can use async/await. */
@Injectable({ providedIn: 'root' })
export class ApiService {
  private http = inject(HttpClient);
  private base = `${environment.apiUrl}/api`;

  private get<T>(path: string, params?: Record<string, string | number | boolean>) {
    return firstValueFrom(this.http.get<T>(this.base + path, { params: new HttpParams({ fromObject: params ?? {} }) }));
  }
  private post<T>(path: string, body: unknown = {}) {
    return firstValueFrom(this.http.post<T>(this.base + path, body));
  }
  private put<T>(path: string, body: unknown) {
    return firstValueFrom(this.http.put<T>(this.base + path, body));
  }

  // auth
  login(email: string, password: string) { return this.post<AuthResponse>('/auth/login', { email, password }); }
  demoLogin(role: Role) { return this.post<AuthResponse>('/auth/demo', { role }); }
  me() { return this.get<User>('/auth/me'); }

  // everyone
  leaveTypes() { return this.get<LeaveType[]>('/leave-types'); }
  holidays() { return this.get<Holiday[]>('/holidays'); }
  awaySoon(days = 16) { return this.get<AwayPerson[]>('/team/away', { days }); }
  calendar(month: string) { return this.get<Calendar>('/team/calendar', { month }); }

  // employee
  balances() { return this.get<Balance[]>('/me/balances'); }
  myLeaves() { return this.get<Leave[]>('/me/leaves'); }
  preview(type: string, from: string, to: string, halfDay: boolean) {
    return this.get<Preview>('/leaves/preview', { type, from, to, halfDay });
  }
  apply(leave: NewLeave) { return this.post<Leave>('/leaves', leave); }
  cancel(id: number) { return this.post<Leave>(`/leaves/${id}/cancel`); }

  // manager
  approvals() { return this.get<Approval[]>('/approvals'); }
  recentDecisions() { return this.get<Leave[]>('/approvals/recent'); }
  approve(id: number) { return this.post<Leave>(`/approvals/${id}/approve`, {}); }
  decline(id: number, comment: string) { return this.post<Leave>(`/approvals/${id}/decline`, { comment }); }

  // HR
  saveLeaveTypes(types: { code: string; annualQuota: number; halfDayAllowed: boolean }[]) {
    return this.put<LeaveType[]>('/admin/leave-types', types);
  }
  settings() { return this.get<{ clashLimitPct: number }>('/admin/settings'); }
  saveSettings(clashLimitPct: number) { return this.put<{ clashLimitPct: number }>('/admin/settings', { clashLimitPct }); }
  addHoliday(date: string, name: string) { return this.post<Holiday>('/admin/holidays', { date, name }); }
  deleteHoliday(id: number) { return firstValueFrom(this.http.delete<void>(`${this.base}/admin/holidays/${id}`)); }
}

/** Turns any failed request into a sentence we can show. */
export function errorMessage(e: unknown): string {
  if (e instanceof HttpErrorResponse) {
    if (e.status === 0) return "Can't reach the server. Check your connection and try again.";
    if (e.error?.message) return e.error.message;
  }
  return 'Something went wrong. Please try again.';
}
