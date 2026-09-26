import { Component, OnInit, computed, effect, inject, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { ApiService, errorMessage } from '../core/api.service';
import { AuthService } from '../core/auth.service';
import { avatarColor, days, fd, initials, isoDate, names, num, range, today, typeColor } from '../core/format';
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
    <div class="page-h">
      <div>
        <h1>Apply for leave</h1>
        <p class="muted">Your request goes to {{ manager() }}.</p>
      </div>
    </div>

    <div class="form-grid">
      <form class="card form" (submit)="submit($event)" novalidate>
        <fieldset class="field">
          <legend>Type</legend>
          <div class="types">
            @for (t of types(); track t.code) {
              <div [style.--c]="typeColor(t.code)">
                <input type="radio" name="type" [id]="'t-' + t.code" [checked]="type() === t.code" (change)="type.set(t.code)">
                <label [for]="'t-' + t.code">
                  <span><span class="dot"></span>{{ t.name }}</span>
                  <span class="left-count">{{ num(leftFor(t.code)) }} left</span>
                </label>
              </div>
            }
          </div>
        </fieldset>

        <div class="two">
          <div class="field">
            <label for="from">From</label>
            <input id="from" type="date" [min]="minDate" [value]="from()" (input)="setFrom(val($event))">
          </div>
          <div class="field">
            <label for="to">To</label>
            <input id="to" type="date" [min]="from() || minDate" [value]="to()" (input)="to.set(val($event))">
          </div>
        </div>

        @if (halfAllowed()) {
          <label class="check"><input type="checkbox" [checked]="halfDay()" (change)="halfDay.set(checked($event))"> Half day only</label>
        }

        <div class="field">
          <label for="reason">Reason</label>
          <textarea id="reason" rows="3" maxlength="250" placeholder="For example: attending a friend's wedding"
                    [value]="reason()" (input)="reason.set(val($event))"></textarea>
        </div>

        @if (error()) { <p class="err" role="alert">{{ error() }}</p> }
        <div class="actions">
          <button class="btn" type="submit" [disabled]="saving()">{{ saving() ? 'Sending…' : 'Send request' }}</button>
          <a class="btn plain" routerLink="/home">Cancel</a>
        </div>
      </form>

      <aside class="card side-card" aria-live="polite">
        <h2>Summary</h2>
        @if (preview(); as p) {
          <div class="big" [style.color]="typeColor(type())">{{ num(p.days) }}<small>{{ p.days === 1 ? 'working day' : 'working days' }}</small></div>
          <p class="small muted">
            {{ range(from(), to()) }}
            @if (p.holidaysSkipped.length) { · {{ p.holidaysSkipped.join(', ') }} {{ p.holidaysSkipped.length === 1 ? 'is a holiday' : 'are holidays' }} }
            · weekends not counted
          </p>
          @if (p.leftAfter < 0) {
            <p class="err">You only have {{ num(p.left) }} {{ typeName() }} days left.</p>
          } @else {
            <p>You'll have <b>{{ days(p.leftAfter) }}</b> of {{ typeName() }} leave left.</p>
          }
          @if (p.clash; as c) {
            @if (c.people.length) {
              <div class="note" [class.calm]="!c.overLimit">
                <div class="who-off">
                  @for (x of c.people; track x.userId) {
                    <span class="av" [style.--c]="avatarColor(x.userId)" [title]="x.name">{{ initials(x.name) }}</span>
                  }
                </div>
                @if (c.overLimit) { <b>Heads up.</b> }
                {{ names(c.people) }} {{ c.people.length === 1 ? 'is' : 'are' }} also off on {{ fd(c.date) }}.
                With you, that's {{ c.total }} of {{ c.teamSize }} people@if (c.overLimit) {, above the team's {{ c.limitPct }}% limit. You can still apply.} @else {.}
              </div>
            } @else {
              <div class="note calm">Nobody else on your team is off on these dates.</div>
            }
          }
        } @else {
          <p class="muted">{{ previewMessage() }}</p>
        }
      </aside>
    </div>
  `,
})
export class ApplyPage implements OnInit {
  private api = inject(ApiService);
  private auth = inject(AuthService);
  private ui = inject(UiService);
  private router = inject(Router);

  protected days = days; protected fd = fd; protected num = num; protected range = range; protected names = names;
  protected typeColor = typeColor; protected avatarColor = avatarColor; protected initials = initials;
  protected minDate = today();

  protected types = signal<LeaveType[]>([]);
  protected balances = signal<Balance[]>([]);
  protected type = signal('EL');
  protected from = signal(nextWorkday());
  protected to = signal(nextWorkday());
  protected halfDay = signal(false);
  protected reason = signal('');
  protected preview = signal<Preview | null>(null);
  protected previewMessage = signal('Working out your days…');
  protected error = signal('');
  protected saving = signal(false);

  protected manager = computed(() => this.auth.user()?.managerName ?? 'your manager');
  protected typeName = computed(() => (this.types().find(t => t.code === this.type())?.name ?? '').toLowerCase());
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
      this.error.set('Add a short reason for your manager.');
      return;
    }
    this.error.set('');
    this.saving.set(true);
    try {
      await this.api.apply({
        typeCode: this.type(), from: this.from(), to: this.to(),
        halfDay: this.halfAllowed() && this.halfDay(), reason: this.reason().trim(),
      });
      this.ui.showToast(`Sent to ${this.manager()}`);
      await this.router.navigate(['/home']);
    } catch (err) {
      this.error.set(errorMessage(err));
    } finally {
      this.saving.set(false);
    }
  }
}
