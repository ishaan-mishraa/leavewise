import { Component, OnInit, inject, signal } from '@angular/core';
import { ApiService, errorMessage } from '../core/api.service';
import { fd, today } from '../core/format';
import { Holiday, LeaveType } from '../core/models';
import { UiService } from '../core/ui.service';

@Component({
  selector: 'app-settings',
  template: `
    <div class="page-head">
      <div>
        <h1>Leave Settings</h1>
        <p>Leave policy for all employees</p>
      </div>
    </div>

    @if (loading()) {
      <p class="loading">Loading…</p>
    } @else if (error()) {
      <div class="alert error">{{ error() }}</div>
    } @else {
      <div class="grid grid-2">
        <div>
          <div class="card">
            <div class="card-title"><h2>Leave Types</h2></div>
            <div class="table-wrap">
              <table>
                <thead><tr><th>Type</th><th>Days per Year</th><th>Half Day Allowed</th></tr></thead>
                <tbody>
                  @for (t of types(); track t.code) {
                    <tr>
                      <td>{{ t.name }} <span class="muted">({{ t.code }})</span></td>
                      <td><input type="number" min="0" max="60" style="width:90px" [value]="t.annualQuota"
                                 [attr.aria-label]="t.name + ' days per year'" (input)="t.annualQuota = +val($event)"></td>
                      <td><input type="checkbox" style="width:auto" [checked]="t.halfDayAllowed"
                                 [attr.aria-label]="t.name + ' half day allowed'" (change)="t.halfDayAllowed = checked($event)"></td>
                    </tr>
                  }
                </tbody>
              </table>
            </div>
          </div>

          <div class="card mt">
            <div class="card-title"><h2>Team Clash Rule</h2></div>
            <div class="card-body form">
              <div class="field">
                <label for="limit">Warn when more than this % of a team is on leave the same day</label>
                <input id="limit" type="number" min="5" max="90" step="5" style="width:120px" [value]="limit()" (input)="limit.set(+val($event))">
                <span class="hint">It shows a warning to the employee and the manager. It does not block the request.</span>
              </div>
            </div>
          </div>

          <div class="actions mt">
            <button class="btn" type="button" [disabled]="saving()" (click)="save()">{{ saving() ? 'Saving…' : 'Save Settings' }}</button>
          </div>
        </div>

        <div class="card">
          <div class="card-title"><h2>Company Holidays</h2></div>
          <div class="table-wrap">
            <table>
              <thead><tr><th>Date</th><th>Holiday</th><th></th></tr></thead>
              <tbody>
                @for (h of holidays(); track h.id) {
                  <tr [class.muted]="h.date < todayStr">
                    <td style="white-space:nowrap">{{ fd(h.date) }} {{ h.date.slice(0, 4) }}</td>
                    <td>{{ h.name }}</td>
                    <td class="num"><button class="link" type="button" (click)="remove(h)">Remove</button></td>
                  </tr>
                } @empty {
                  <tr><td colspan="3" class="empty">No holidays added.</td></tr>
                }
              </tbody>
            </table>
          </div>
          <div class="card-body form" style="border-top:1px solid var(--line)">
            <div class="row-2">
              <div class="field">
                <label for="hdate">Date</label>
                <input id="hdate" type="date" [value]="newDate()" (input)="newDate.set(val($event))">
              </div>
              <div class="field">
                <label for="hname">Holiday Name</label>
                <input id="hname" maxlength="80" placeholder="e.g. Holi" [value]="newName()" (input)="newName.set(val($event))">
              </div>
            </div>
            @if (holidayError()) { <p class="error">{{ holidayError() }}</p> }
            <div><button class="btn secondary" type="button" (click)="add()">Add Holiday</button></div>
          </div>
        </div>
      </div>
    }
  `,
})
export class SettingsPage implements OnInit {
  private api = inject(ApiService);
  private ui = inject(UiService);

  protected fd = fd;
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
      this.holidayError.set('Enter a date and a name.');
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
