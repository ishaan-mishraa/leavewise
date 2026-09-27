import { Component, OnInit, computed, effect, inject, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { ApiService, errorMessage } from '../core/api.service';
import { AuthService } from '../core/auth.service';
import { fd, isoDate, names, num, range, today } from '../core/format';
import { Balance, LeaveType, Preview } from '../core/models';
import { UiService } from '../core/ui.service';

/** The next weekday after today, as a sensible default start date. */
function nextWorkday(): string {
  const d = new Date();
  do { d.setDate(d.getDate() + 1); } while (d.getDay() === 0 || d.getDay() === 6);
  return isoDate(d);
}

@Component({
  selector: 'app-apply',
  imports: [RouterLink],
  template: `
    <div class="page-head">
      <div>
        <h1>Apply Leave</h1>
        <p>Your request will be sent to {{ manager() }} for approval.</p>
      </div>
    </div>

    <div class="grid side">
      <div class="card">
        <div class="card-title"><h2>Leave Details</h2></div>
        <form class="card-body form" (submit)="submit($event)" novalidate>
          <div class="field">
            <label for="type">Leave Type</label>
            <select id="type" [value]="type()" (change)="type.set(val($event))">
              @for (t of types(); track t.code) {
                <option [value]="t.code" [selected]="t.code === type()">{{ t.name }} Leave ({{ num(leftFor(t.code)) }} days left)</option>
              }
            </select>
          </div>
          <div class="row-2">
            <div class="field">
              <label for="from">From Date</label>
              <input id="from" type="date" [min]="minDate" [value]="from()" (input)="setFrom(val($event))">
            </div>
            <div class="field">
              <label for="to">To Date</label>
              <input id="to" type="date" [min]="from() || minDate" [value]="to()" (input)="to.set(val($event))">
            </div>
          </div>
          @if (halfAllowed()) {
            <label class="check"><input type="checkbox" [checked]="halfDay()" (change)="halfDay.set(checked($event))"> Half day</label>
          }
          <div class="field">
            <label for="reason">Reason</label>
            <textarea id="reason" rows="3" maxlength="250" placeholder="e.g. Family function"
                      [value]="reason()" (input)="reason.set(val($event))"></textarea>
          </div>
          @if (error()) { <div class="alert error">{{ error() }}</div> }
          <div class="actions">
            <button class="btn" type="submit" [disabled]="saving()">{{ saving() ? 'Submitting…' : 'Submit Request' }}</button>
            <a class="btn secondary" routerLink="/home">Cancel</a>
          </div>
        </form>
      </div>

      <div class="card">
        <div class="card-title"><h2>Summary</h2></div>
        <div class="card-body" aria-live="polite">
          @if (preview(); as p) {
            <div class="kv">
              <div><span>Dates</span><b>{{ range(from(), to()) }}</b></div>
              <div><span>Working days</span><b>{{ num(p.days) }}</b></div>
              <div><span>Holidays skipped</span><b>{{ p.holidaysSkipped.length ? p.holidaysSkipped.join(', ') : 'None' }}</b></div>
              <div><span>Balance after</span><b [style.color]="p.leftAfter < 0 ? 'var(--no)' : null">{{ num(p.leftAfter) }} days</b></div>
            </div>
            @if (p.leftAfter < 0) {
              <div class="alert error mt">Not enough balance. You have {{ num(p.left) }} days left.</div>
            }
            @if (p.clash; as c) {
              @if (c.overLimit) {
                <div class="alert warn mt">
                  <b>Team clash</b>
                  {{ names(c.people) }} {{ c.people.length === 1 ? 'is' : 'are' }} also on leave on {{ fd(c.date) }}.
                  That makes {{ c.total }} of {{ c.teamSize }} people away, above the {{ c.limitPct }}% limit. You can still apply.
                </div>
              } @else if (c.people.length) {
                <div class="alert info mt">{{ names(c.people) }} {{ c.people.length === 1 ? 'is' : 'are' }} also on leave on {{ fd(c.date) }} ({{ c.total }} of {{ c.teamSize }} away).</div>
              } @else {
                <div class="alert info mt">No one else in your team is on leave on these dates.</div>
              }
            }
          } @else {
            <p class="muted">{{ previewMessage() }}</p>
          }
        </div>
      </div>
    </div>
  `,
})
export class ApplyPage implements OnInit {
  private api = inject(ApiService);
  private auth = inject(AuthService);
  private ui = inject(UiService);
  private router = inject(Router);

  protected fd = fd; protected num = num; protected range = range; protected names = names;
  protected minDate = today();

  protected types = signal<LeaveType[]>([]);
  protected balances = signal<Balance[]>([]);
  protected type = signal('EL');
  protected from = signal(nextWorkday());
  protected to = signal(nextWorkday());
  protected halfDay = signal(false);
  protected reason = signal('');
  protected preview = signal<Preview | null>(null);
  protected previewMessage = signal('Calculating…');
  protected error = signal('');
  protected saving = signal(false);

  protected manager = computed(() => this.auth.user()?.managerName ?? 'your manager');
  protected halfAllowed = computed(() =>
    !!this.from() && this.from() === this.to() && !!this.types().find(t => t.code === this.type())?.halfDayAllowed);

  private timer?: ReturnType<typeof setTimeout>;
  private requestNo = 0;

  constructor() {
    // Refresh the summary shortly after the type or dates change.
    effect(() => {
      const type = this.type(), from = this.from(), to = this.to();
      const half = this.halfAllowed() && this.halfDay();
      clearTimeout(this.timer);
      this.timer = setTimeout(() => this.loadPreview(type, from, to, half), 250);
    });
  }

  async ngOnInit() {
    try {
      const [types, balances] = await Promise.all([this.api.leaveTypes(), this.api.balances()]);
      this.types.set(types);
      this.balances.set(balances);
    } catch (e) {
      this.error.set(errorMessage(e));
    }
  }

  protected val = (e: Event) => (e.target as HTMLInputElement).value;
  protected checked = (e: Event) => (e.target as HTMLInputElement).checked;
  protected leftFor = (code: string) => this.balances().find(b => b.code === code)?.left ?? 0;

  protected setFrom(value: string) {
    this.from.set(value);
    if (!this.to() || this.to() < value) this.to.set(value);
  }

  private async loadPreview(type: string, from: string, to: string, half: boolean) {
    const n = ++this.requestNo;
    if (!from || !to || to < from) {
      this.preview.set(null);
      this.previewMessage.set('Pick an end date on or after the start date.');
      return;
    }
    try {
      const p = await this.api.preview(type, from, to, half);
      if (n === this.requestNo) this.preview.set(p);
    } catch (e) {
      if (n === this.requestNo) {
        this.preview.set(null);
        this.previewMessage.set(errorMessage(e));
      }
    }
  }

  async submit(e: Event) {
    e.preventDefault();
    if (this.reason().trim().length < 3) {
      this.error.set('Please enter a reason.');
      return;
    }
    this.error.set('');
    this.saving.set(true);
    try {
      await this.api.apply({
        typeCode: this.type(), from: this.from(), to: this.to(),
        halfDay: this.halfAllowed() && this.halfDay(), reason: this.reason().trim(),
      });
      this.ui.showToast(`Leave request sent to ${this.manager()}`);
      await this.router.navigate(['/home']);
    } catch (err) {
      this.error.set(errorMessage(err));
    } finally {
      this.saving.set(false);
    }
  }
}
