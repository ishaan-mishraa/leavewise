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
    <div class="page-h">
      <div>
        <h1>{{ title() }}</h1>
        <p class="muted">{{ data()?.team ?? 'Your team' }} · who is away</p>
      </div>
      <div class="arrows">
        <button type="button" (click)="shift(-1)" aria-label="Previous month">‹</button>
        <button type="button" (click)="shift(1)" aria-label="Next month">›</button>
      </div>
    </div>

    @if (error()) {
      <p class="err loading">{{ error() }}</p>
    } @else {
      <div class="card cal-scroll">
        <div class="cal">
          @for (d of weekdays; track d) { <div class="dow">{{ d }}</div> }
          @for (c of cells(); track $index) {
            @if (c) {
              <div [class.we]="c.weekend" [class.busy]="c.overLimit" [class.today]="c.date === todayStr">
                <div class="n">
                  <span>{{ dayOf(c.date) }}</span>
                  @if (c.overLimit) { <b>{{ c.people.length }}/{{ data()?.teamSize }} away</b> }
                </div>
                @if (c.holiday) { <div class="hol">{{ c.holiday }}</div> }
                @for (p of c.people; track p.userId) {
                  <div class="chip" [class.pending]="p.status === 'WAITING'" [style.--c]="typeColor(p.typeCode)"
                       [title]="p.name + (p.status === 'WAITING' ? ' · not approved yet' : '')">{{ firstName(p.name) }}</div>
                }
              </div>
            } @else {
              <div class="blank"></div>
            }
          }
        </div>
      </div>
      <div class="key">
        @for (t of legend; track t.code) { <span><i [style.background]="typeColor(t.code)"></i>{{ t.name }}</span> }
        <span><i style="border:1px dashed var(--muted)"></i>Not approved yet</span>
        <span><i style="background:var(--sun)"></i>Over {{ data()?.limitPct ?? 30 }}% of the team away</span>
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
