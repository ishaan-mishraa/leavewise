import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { ApiService, errorMessage } from '../core/api.service';
import { firstName, isoDate, parseDate, today, typeColor } from '../core/format';
import { Calendar, CalendarDay } from '../core/models';

const LEGEND = [
  { code: 'EL', name: 'Earned' }, { code: 'CL', name: 'Casual' }, { code: 'SL', name: 'Sick' }, { code: 'CO', name: 'Comp-off' },
];

@Component({
  selector: 'app-calendar',
  template: `
    <div class="page-head">
      <div>
        <h1>Team Calendar</h1>
        <p>{{ data()?.team ?? 'Your team' }} · who is on leave each day</p>
      </div>
      <div class="cal-head">
        <button type="button" (click)="shift(-1)" aria-label="Previous month">‹</button>
        <h2 style="min-width:150px;text-align:center">{{ title() }}</h2>
        <button type="button" (click)="shift(1)" aria-label="Next month">›</button>
      </div>
    </div>

    @if (error()) {
      <div class="alert error">{{ error() }}</div>
    } @else {
      <div class="card table-wrap">
        <div class="cal">
          @for (d of weekdays; track d) { <div class="dow">{{ d }}</div> }
          @for (c of cells(); track $index) {
            @if (c) {
              <div [class.we]="c.weekend" [class.busy]="c.overLimit" [class.today]="c.date === todayStr">
                <div class="d">
                  <span>{{ dayOf(c.date) }}</span>
                  @if (c.overLimit) { <em>{{ c.people.length }}/{{ data()?.teamSize }}</em> }
                </div>
                @if (c.holiday) { <div class="hol">{{ c.holiday }}</div> }
                @for (p of c.people; track p.userId) {
                  <div class="who" [class.pending]="p.status === 'WAITING'" [style.--c]="typeColor(p.typeCode)"
                       [title]="p.name + (p.status === 'WAITING' ? ' (pending)' : '')">{{ firstName(p.name) }}</div>
                }
              </div>
            } @else {
              <div class="blank"></div>
            }
          }
        </div>
      </div>
      <div class="legend">
        @for (t of legend; track t.code) { <span><i [style.background]="typeColor(t.code)"></i>{{ t.name }}</span> }
        <span><i style="background:var(--wait-bg);border:1px solid #FEDF89"></i>More than {{ data()?.limitPct ?? 30 }}% of team away</span>
        <span><em>Italic</em> = pending approval</span>
      </div>
    }
  `,
})
export class CalendarPage implements OnInit {
  private api = inject(ApiService);

  protected weekdays = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  protected legend = LEGEND;
  protected todayStr = today();
  protected typeColor = typeColor;
  protected firstName = firstName;

  protected month = signal(today().slice(0, 7));
  protected data = signal<Calendar | null>(null);
  protected error = signal('');

  protected title = computed(() =>
    parseDate(this.month() + '-01').toLocaleDateString('en-GB', { month: 'long', year: 'numeric' }));

  /** Pads the month with empty cells so it starts on a Monday and fills whole weeks. */
  protected cells = computed<(CalendarDay | null)[]>(() => {
    const d = this.data();
    if (!d) return [];
    const lead = (parseDate(d.days[0].date).getDay() + 6) % 7;
    const trail = (7 - ((lead + d.days.length) % 7)) % 7;
    return [...Array(lead).fill(null), ...d.days, ...Array(trail).fill(null)];
  });

  async ngOnInit() {
    await this.load();
  }

  protected dayOf = (date: string) => parseDate(date).getDate();

  protected async shift(n: number) {
    const [y, m] = this.month().split('-').map(Number);
    this.month.set(isoDate(new Date(y, m - 1 + n, 1)).slice(0, 7));
    await this.load();
  }

  private async load() {
    try {
      this.data.set(await this.api.calendar(this.month()));
      this.error.set('');
    } catch (e) {
      this.error.set(errorMessage(e));
    }
  }
}
