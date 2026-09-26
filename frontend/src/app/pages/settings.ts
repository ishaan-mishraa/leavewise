import { Component, OnInit, inject, signal } from '@angular/core';
import { ApiService, errorMessage } from '../core/api.service';
import { fd, today, typeColor } from '../core/format';
import { Holiday, LeaveType } from '../core/models';
import { UiService } from '../core/ui.service';

@Component({
  selector: 'app-settings',
  template: `
    <div class="page-h">
      <div>
        <h1>Settings</h1>
        <p class="muted">Changes apply to everyone straight away.</p>
      </div>
      <button class="btn" type="button" [disabled]="saving() || loading()" (click)="save()">{{ saving() ? 'Saving…' : 'Save changes' }}</button>
    </div>

    @if (loading()) {
      <p class="loading">Loading settings…</p>
    } @else if (error()) {
      <p class="err loading">{{ error() }}</p>
    } @else {
      <div class="cols" style="margin-top:0">
        <div class="stack">
          <section class="card set">
            <h2>Leave allowance per year</h2>
            <div class="tbl">
              <table>
                <thead><tr><th>Type</th><th>Days</th><th>Half days</th></tr></thead>
                <tbody>
                  @for (t of types(); track t.code) {
                    <tr>
                      <td><span class="dot" [style.--c]="typeColor(t.code)"></span>{{ t.name }}</td>
                      <td><input type="number" min="0" max="60" [value]="t.annualQuota" [attr.aria-label]="t.name + ' days'"
                                 (input)="t.annualQuota = +val($event)"></td>
                      <td><input type="checkbox" [checked]="t.halfDayAllowed" [attr.aria-label]="t.name + ' half days'"
                                 (change)="t.halfDayAllowed = checked($event)"></td>
                    </tr>
                  }
                </tbody>
              </table>
            </div>
          </section>
          <section class="card set">
            <h2>Team clash warning</h2>
            <div class="inline">
              <label for="limit" style="font-weight:400">Warn when more than</label>
              <input id="limit" type="number" min="5" max="90" step="5" [value]="limit()" (input)="limit.set(+val($event))">
              <span>% of a team is away on the same day.</span>
            </div>
            <p class="small muted">Employees see the warning while applying. Managers see it on the request. It never blocks anyone.</p>
          </section>
        </div>

        <section class="card set">
          <h2>Holidays</h2>
          <ul class="rows" style="padding:0">
            @for (h of holidays(); track h.id) {
              <li [style.opacity]="h.date < todayStr ? .55 : 1">
                <div>{{ h.name }}<div class="muted small">{{ fd(h.date) }} {{ h.date.slice(0, 4) }}</div></div>
                <button type="button" class="linkbtn" (click)="remove(h)">Remove</button>
              </li>
            }
          </ul>
          <div class="field">
            <label for="hname">Add a holiday</label>
            <input id="hname" placeholder="Holiday name" maxlength="80" [value]="newName()" (input)="newName.set(val($event))">
          </div>
          <div class="inline">
            <input type="date" style="flex:1" aria-label="Holiday date" [value]="newDate()" (input)="newDate.set(val($event))">
            <button class="btn plain" type="button" (click)="add()">Add</button>
          </div>
          @if (holidayError()) { <p class="err">{{ holidayError() }}</p> }
        </section>
      </div>
    }
  `,
})
export class SettingsPage implements OnInit {
  private api = inject(ApiService);
  private ui = inject(UiService);

  protected fd = fd; protected typeColor = typeColor;
  protected todayStr = today();

  protected loading = signal(true);
  protected error = signal('');
  protected saving = signal(false);
  protected types = signal<LeaveType[]>([]);
  protected limit = signal(30);
  protected holidays = signal<Holiday[]>([]);
  protected newName = signal('');
  protected newDate = signal('');
  protected holidayError = signal('');

  protected val = (e: Event) => (e.target as HTMLInputElement).value;
  protected checked = (e: Event) => (e.target as HTMLInputElement).checked;

  async ngOnInit() {
    try {
      const [types, settings, holidays] = await Promise.all([this.api.leaveTypes(), this.api.settings(), this.api.holidays()]);
      this.types.set(types);
      this.limit.set(settings.clashLimitPct);
      this.holidays.set(holidays);
    } catch (e) {
      this.error.set(errorMessage(e));
    } finally {
      this.loading.set(false);
    }
  }

  protected async save() {
    this.saving.set(true);
    try {
      const [types] = await Promise.all([
        this.api.saveLeaveTypes(this.types().map(t => ({ code: t.code, annualQuota: t.annualQuota, halfDayAllowed: t.halfDayAllowed }))),
        this.api.saveSettings(this.limit()),
      ]);
      this.types.set(types);
      this.ui.showToast('Settings saved');
    } catch (e) {
      this.ui.showToast(errorMessage(e));
    } finally {
      this.saving.set(false);
    }
  }

  protected async add() {
    if (!this.newName().trim() || !this.newDate()) {
      this.holidayError.set('Enter a name and a date.');
      return;
    }
    try {
      const h = await this.api.addHoliday(this.newDate(), this.newName().trim());
      this.holidays.update(list => [...list, h].sort((a, b) => a.date.localeCompare(b.date)));
      this.newName.set('');
      this.holidayError.set('');
      this.ui.showToast(`Added ${h.name}`);
    } catch (e) {
      this.holidayError.set(errorMessage(e));
    }
  }

  protected async remove(h: Holiday) {
    try {
      await this.api.deleteHoliday(h.id);
      this.holidays.update(list => list.filter(x => x.id !== h.id));
      this.ui.showToast(`Removed ${h.name}`);
    } catch (e) {
      this.ui.showToast(errorMessage(e));
    }
  }
}
