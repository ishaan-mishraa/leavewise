import { Component, OnInit, inject, signal } from '@angular/core';
import { ApiService, errorMessage } from '../core/api.service';
import { firstName, names, num, range, statusLabel } from '../core/format';
import { Approval, Leave } from '../core/models';
import { UiService } from '../core/ui.service';

@Component({
  selector: 'app-approvals',
  template: `
    <div class="page-head">
      <div>
        <h1>Leave Approvals</h1>
        <p>Requests from your team waiting for a decision</p>
      </div>
    </div>

    @if (loading()) {
      <p class="loading">Loading…</p>
    } @else if (error()) {
      <div class="alert error">{{ error() }}</div>
    } @else {
      <div class="card">
        <div class="card-title"><h2>Pending Requests ({{ items().length }})</h2></div>
        <div class="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Employee</th><th>Type</th><th>Dates</th><th class="num">Days</th><th>Reason</th>
                <th class="num">Balance After</th><th>Team Away</th><th>Actions</th>
              </tr>
            </thead>
            <tbody>
              @for (a of items(); track a.leave.id) {
                <tr>
                  <td>{{ a.leave.userName }}<div class="note-line">{{ a.jobTitle }}</div></td>
                  <td>{{ a.leave.typeName }}</td>
                  <td style="white-space:nowrap">{{ range(a.leave.from, a.leave.to) }}</td>
                  <td class="num">{{ num(a.leave.days) }}</td>
                  <td>{{ a.leave.reason }}</td>
                  <td class="num">{{ num(a.leftAfter) }}</td>
                  <td>
                    @if (a.clash; as c) {
                      <span class="tag" [class]="c.overLimit ? 'wait' : 'ok'" [title]="c.people.length ? names(c.people) : 'Nobody else'">
                        {{ c.overLimit ? 'Clash' : 'OK' }} · {{ c.total }}/{{ c.teamSize }}
                      </span>
                    }
                  </td>
                  <td>
                    <div class="actions" style="flex-wrap:nowrap">
                      <button class="btn sm" type="button" [disabled]="busy()" (click)="approve(a)">Approve</button>
                      <button class="btn secondary sm" type="button" (click)="startDecline(a)">Decline</button>
                    </div>
                  </td>
                </tr>
                @if (declining() === a.leave.id) {
                  <tr>
                    <td colspan="8" style="background:var(--thead)">
                      <div class="form">
                        <div class="field">
                          <label [for]="'why-' + a.leave.id">Reason for declining (visible to {{ firstName(a.leave.userName) }})</label>
                          <textarea [id]="'why-' + a.leave.id" rows="2" maxlength="250" [value]="comment()" (input)="comment.set(val($event))"></textarea>
                        </div>
                        @if (formError()) { <p class="error">{{ formError() }}</p> }
                        <div class="actions">
                          <button class="btn danger sm" type="button" [disabled]="busy()" (click)="decline(a)">Confirm Decline</button>
                          <button class="btn secondary sm" type="button" (click)="declining.set(null)">Cancel</button>
                        </div>
                      </div>
                    </td>
                  </tr>
                }
              } @empty {
                <tr><td colspan="8" class="empty">No pending requests.</td></tr>
              }
            </tbody>
          </table>
        </div>
      </div>

      <div class="card mt">
        <div class="card-title"><h2>Recently Decided</h2></div>
        <div class="table-wrap">
          <table>
            <thead><tr><th>Employee</th><th>Type</th><th>Dates</th><th>Status</th><th>Comment</th></tr></thead>
            <tbody>
              @for (l of recent(); track l.id) {
                <tr>
                  <td>{{ l.userName }}</td>
                  <td>{{ l.typeName }}</td>
                  <td>{{ range(l.from, l.to) }}</td>
                  <td><span class="tag" [class]="statusLabel(l.status).cls">{{ statusLabel(l.status).text }}</span></td>
                  <td class="muted">{{ l.managerComment ?? '-' }}</td>
                </tr>
              } @empty {
                <tr><td colspan="5" class="empty">No decisions yet.</td></tr>
              }
            </tbody>
          </table>
        </div>
      </div>
    }
  `,
})
export class ApprovalsPage implements OnInit {
  private api = inject(ApiService);
  private ui = inject(UiService);

  protected num = num; protected range = range; protected names = names;
  protected firstName = firstName; protected statusLabel = statusLabel;

  protected loading = signal(true);
  protected error = signal('');
  protected items = signal<Approval[]>([]);
  protected recent = signal<Leave[]>([]);
  protected declining = signal<number | null>(null);
  protected comment = signal('');
  protected formError = signal('');
  protected busy = signal(false);

  protected val = (e: Event) => (e.target as HTMLTextAreaElement).value;

  async ngOnInit() {
    await this.load();
  }

  private async load() {
    try {
      const [items, recent] = await Promise.all([this.api.approvals(), this.api.recentDecisions()]);
      this.items.set(items);
      this.recent.set(recent);
      this.ui.waitingCount.set(items.length);
      this.error.set('');
    } catch (e) {
      this.error.set(errorMessage(e));
    } finally {
      this.loading.set(false);
    }
  }

  protected async approve(a: Approval) {
    await this.act(() => this.api.approve(a.leave.id), `Approved ${firstName(a.leave.userName)}'s leave`);
  }

  protected startDecline(a: Approval) {
    this.declining.set(a.leave.id);
    this.comment.set('');
    this.formError.set('');
  }

  protected async decline(a: Approval) {
    if (this.comment().trim().length < 3) {
      this.formError.set(`Please give ${firstName(a.leave.userName)} a reason.`);
      return;
    }
    await this.act(() => this.api.decline(a.leave.id, this.comment().trim()), `Declined ${firstName(a.leave.userName)}'s leave`);
  }

  private async act(request: () => Promise<unknown>, done: string) {
    this.busy.set(true);
    try {
      await request();
      this.declining.set(null);
      this.ui.showToast(done);
      await this.load();
    } catch (e) {
      this.ui.showToast(errorMessage(e));
    } finally {
      this.busy.set(false);
    }
  }
}
