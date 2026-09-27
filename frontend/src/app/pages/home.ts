import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ApiService, errorMessage } from '../core/api.service';
import { AuthService } from '../core/auth.service';
import { fd, firstName, num, range, statusLabel, today } from '../core/format';
import { AwayPerson, Balance, Holiday, Leave } from '../core/models';
import { UiService } from '../core/ui.service';

@Component({
  selector: 'app-home',
  imports: [RouterLink],
  template: `
    <div class="page-head">
      <div>
        <h1>Welcome, {{ first() }}</h1>
        <p>Your leave balance for {{ year }}</p>
      </div>
      <a class="btn" routerLink="/apply">+ Apply Leave</a>
    </div>

    @if (loading()) {
      <p class="loading">Loading…</p>
    } @else if (error()) {
      <div class="alert error">{{ error() }}</div>
    } @else {
      <div class="grid grid-4">
        @for (b of balances(); track b.code) {
          <div class="card stat">
            <div class="label">{{ b.name }} Leave</div>
            <div class="value">{{ num(b.left) }}<small>/ {{ b.quota }} days left</small></div>
          </div>
        }
      </div>

      <div class="card mt">
        <div class="card-title"><h2>My Leave Requests</h2></div>
        <div class="table-wrap">
          <table>
            <thead>
              <tr><th>Dates</th><th>Type</th><th class="num">Days</th><th>Reason</th><th>Status</th><th></th></tr>
            </thead>
            <tbody>
              @for (l of leaves(); track l.id) {
                <tr>
                  <td>{{ range(l.from, l.to) }}</td>
                  <td>{{ l.typeName }}</td>
                  <td class="num">{{ num(l.days) }}</td>
                  <td>
                    {{ l.reason }}
                    @if (l.managerComment) { <div class="note-line">{{ firstName(l.decidedBy ?? 'Manager') }}: {{ l.managerComment }}</div> }
                  </td>
                  <td><span class="tag" [class]="statusLabel(l.status).cls">{{ statusLabel(l.status).text }}</span></td>
                  <td>
                    @if (canCancel(l)) {
                      <button class="link" type="button" (click)="cancel(l)">{{ armed() === l.id ? 'Confirm cancel' : 'Cancel' }}</button>
                    }
                  </td>
                </tr>
              } @empty {
                <tr><td colspan="6" class="empty">No leave requests yet.</td></tr>
              }
            </tbody>
          </table>
        </div>
      </div>

      <div class="grid grid-2 mt">
        <div class="card">
          <div class="card-title"><h2>Team Members on Leave</h2><span class="muted small">next 2 weeks</span></div>
          <div class="table-wrap">
            <table>
              <thead><tr><th>Name</th><th>Dates</th><th>Status</th></tr></thead>
              <tbody>
                @for (p of away(); track $index) {
                  <tr>
                    <td>{{ p.name }}</td>
                    <td>{{ range(p.from, p.to) }}</td>
                    <td><span class="tag" [class]="statusLabel(p.status).cls">{{ statusLabel(p.status).text }}</span></td>
                  </tr>
                } @empty {
                  <tr><td colspan="3" class="empty">Everyone is in.</td></tr>
                }
              </tbody>
            </table>
          </div>
        </div>
        <div class="card">
          <div class="card-title"><h2>Upcoming Holidays</h2></div>
          <div class="table-wrap">
            <table>
              <thead><tr><th>Holiday</th><th>Date</th></tr></thead>
              <tbody>
                @for (h of nextHolidays(); track h.id) {
                  <tr><td>{{ h.name }}</td><td>{{ fd(h.date) }}</td></tr>
                } @empty {
                  <tr><td colspan="2" class="empty">No more holidays this year.</td></tr>
                }
              </tbody>
            </table>
          </div>
        </div>
      </div>
    }
  `,
})
export class HomePage implements OnInit {
  private api = inject(ApiService);
  private auth = inject(AuthService);
  private ui = inject(UiService);

  protected fd = fd; protected num = num; protected range = range;
  protected statusLabel = statusLabel; protected firstName = firstName;
  protected year = new Date().getFullYear();

  protected loading = signal(true);
  protected error = signal('');
  protected balances = signal<Balance[]>([]);
  protected leaves = signal<Leave[]>([]);
  protected away = signal<AwayPerson[]>([]);
  protected holidays = signal<Holiday[]>([]);
  protected armed = signal<number | null>(null);

  protected first = computed(() => firstName(this.auth.user()?.name ?? ''));
  protected nextHolidays = computed(() => this.holidays().filter(h => h.date >= today()).slice(0, 5));

  async ngOnInit() {
    await this.load();
  }

  private async load() {
    try {
      const [balances, leaves, away, holidays] = await Promise.all([
        this.api.balances(), this.api.myLeaves(), this.api.awaySoon(14), this.api.holidays(),
      ]);
      this.balances.set(balances);
      this.leaves.set(leaves);
      this.away.set(away);
      this.holidays.set(holidays);
      this.error.set('');
    } catch (e) {
      this.error.set(errorMessage(e));
    } finally {
      this.loading.set(false);
    }
  }

  protected canCancel(l: Leave) {
    return l.status === 'WAITING' || (l.status === 'APPROVED' && l.from > today());
  }

  /** First click asks for confirmation, second click cancels. */
  protected async cancel(l: Leave) {
    if (this.armed() !== l.id) {
      this.armed.set(l.id);
      return;
    }
    try {
      await this.api.cancel(l.id);
      this.armed.set(null);
      this.ui.showToast('Leave cancelled. The days are back in your balance.');
      await this.load();
    } catch (e) {
      this.ui.showToast(errorMessage(e));
    }
  }
}
