import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ApiService, errorMessage } from '../core/api.service';
import { AuthService } from '../core/auth.service';
import { LEAF_PATH, avatarColor, days, fd, firstName, initials, num, range, statusLabel, today, typeColor } from '../core/format';
import { AwayPerson, Balance, Holiday, Leave } from '../core/models';
import { UiService } from '../core/ui.service';

@Component({
  selector: 'app-home',
  imports: [RouterLink],
  template: `
    <section class="band">
      <svg class="leaf" viewBox="0 0 32 32" aria-hidden="true"><path [attr.d]="leaf" fill="currentColor" /></svg>
      <div>
        <h1>Hi {{ first() }}</h1>
        <p>
          @if (waiting()) { {{ waiting() }} of your requests {{ waiting() === 1 ? 'is' : 'are' }} waiting for {{ manager() }}. }
          @if (nextHolidays()[0]; as h) { Next holiday is {{ h.name }} on {{ fd(h.date) }}. }
        </p>
      </div>
      <a class="btn sun" routerLink="/apply">Apply for leave</a>
    </section>

    @if (loading()) {
      <p class="loading">Loading your leave…</p>
    } @else if (error()) {
      <p class="err loading">{{ error() }}</p>
    } @else {
      <div class="tiles">
        @for (b of balances(); track b.code) {
          <div class="card tile">
            <svg class="ring" viewBox="0 0 50 50" [style.--c]="typeColor(b.code)" aria-hidden="true">
              <circle class="track" cx="25" cy="25" r="20" />
              <circle class="fill" cx="25" cy="25" r="20" [attr.stroke-dasharray]="ring(b)" />
            </svg>
            <div><b>{{ num(b.left) }}</b><span>{{ b.name }} left of {{ b.quota }}</span></div>
          </div>
        }
      </div>

      <div class="cols">
        <div class="stack">
          <section class="card">
            <div class="card-h"><h2>Upcoming leave</h2></div>
            <ul class="rows">
              @for (l of upcoming(); track l.id) {
                <li>
                  <div class="what">
                    <div style="font-weight:500">{{ range(l.from, l.to) }}</div>
                    <div class="muted small"><span class="dot" [style.--c]="typeColor(l.typeCode)"></span>{{ l.typeName }} · {{ days(l.days) }} · {{ l.reason }}</div>
                  </div>
                  <div class="side">
                    <span class="st" [class]="statusLabel(l.status).cls">{{ statusLabel(l.status).text }}</span>
                    @if (canCancel(l)) {
                      <button type="button" class="linkbtn" [class.danger]="armed() === l.id" (click)="cancel(l)">
                        {{ armed() === l.id ? 'Yes, cancel it' : 'Cancel' }}
                      </button>
                    }
                  </div>
                </li>
              } @empty {
                <li class="empty">Nothing planned yet.</li>
              }
            </ul>
          </section>

          <section class="card">
            <div class="card-h"><h2>Earlier</h2></div>
            <ul class="rows">
              @for (l of past(); track l.id) {
                <li>
                  <div class="what">
                    <div style="font-weight:500">{{ range(l.from, l.to) }}</div>
                    <div class="muted small"><span class="dot" [style.--c]="typeColor(l.typeCode)"></span>{{ l.typeName }} · {{ days(l.days) }} · {{ l.reason }}</div>
                    @if (l.managerComment) { <div class="small" style="margin-top:4px">{{ firstName(l.decidedBy ?? '') }}: “{{ l.managerComment }}”</div> }
                  </div>
                  <div class="side"><span class="st" [class]="statusLabel(l.status).cls">{{ statusLabel(l.status).text }}</span></div>
                </li>
              } @empty {
                <li class="empty">No past leave this year.</li>
              }
            </ul>
          </section>
        </div>

        <div class="stack">
          <section class="card">
            <div class="card-h"><h2>Teammates away soon</h2></div>
            <ul class="rows">
              @for (p of away(); track $index) {
                <li>
                  <div class="person">
                    <span class="av" [style.--c]="avatarColor(p.userId)">{{ initials(p.name) }}</span>
                    <div class="what">
                      <div>{{ p.name }}</div>
                      <div class="muted small">{{ range(p.from, p.to) }}@if (p.status === 'WAITING') { · not approved yet }</div>
                    </div>
                  </div>
                </li>
              } @empty {
                <li class="empty">Everyone is in.</li>
              }
            </ul>
          </section>
          <section class="card">
            <div class="card-h"><h2>Holidays</h2></div>
            <ul class="rows">
              @for (h of nextHolidays(); track h.id) {
                <li><div>{{ h.name }}</div><div class="side muted">{{ fd(h.date) }}</div></li>
              } @empty {
                <li class="empty">No more holidays this year.</li>
              }
            </ul>
          </section>
        </div>
      </div>
    }
  `,
})
export class HomePage implements OnInit {
  private api = inject(ApiService);
  private auth = inject(AuthService);
  private ui = inject(UiService);

  protected readonly leaf = LEAF_PATH;
  protected days = days; protected fd = fd; protected num = num; protected range = range;
  protected typeColor = typeColor; protected avatarColor = avatarColor; protected initials = initials;
  protected statusLabel = statusLabel; protected firstName = firstName;

  protected loading = signal(true);
  protected error = signal('');
  protected balances = signal<Balance[]>([]);
  protected leaves = signal<Leave[]>([]);
  protected away = signal<AwayPerson[]>([]);
  protected holidays = signal<Holiday[]>([]);
  protected armed = signal<number | null>(null);

  protected first = computed(() => firstName(this.auth.user()?.name ?? ''));
  protected manager = computed(() => this.auth.user()?.managerName ?? 'your manager');
  private isUpcoming = (l: Leave) => l.to >= today() && l.status !== 'CANCELLED';
  protected upcoming = computed(() =>
    this.leaves().filter(this.isUpcoming).sort((a, b) => a.from.localeCompare(b.from)));
  protected past = computed(() => this.leaves().filter(l => !this.isUpcoming(l)));
  protected waiting = computed(() => this.upcoming().filter(l => l.status === 'WAITING').length);
  protected nextHolidays = computed(() => this.holidays().filter(h => h.date >= today()).slice(0, 3));

  async ngOnInit() {
    await this.load();
  }

  private async load() {
    try {
      const [balances, leaves, away, holidays] = await Promise.all([
        this.api.balances(), this.api.myLeaves(), this.api.awaySoon(16), this.api.holidays(),
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

  protected ring(b: Balance) {
    const c = 2 * Math.PI * 20;
    const f = b.quota ? Math.max(0, Math.min(1, b.left / b.quota)) : 0;
    return `${f * c} ${c}`;
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
