import { Component, OnInit, inject, signal } from '@angular/core';
import { ApiService, errorMessage } from '../core/api.service';
import { avatarColor, days, fd, firstName, initials, names, range, statusLabel, typeColor } from '../core/format';
import { Approval, Leave } from '../core/models';
import { UiService } from '../core/ui.service';

@Component({
  selector: 'app-approvals',
  template: `
    <div class="page-h">
      <div>
        <h1>Approvals</h1>
        @if (!loading()) {
          <p class="muted">
            @if (items().length) { {{ items().length }} {{ items().length === 1 ? 'request is' : 'requests are' }} waiting for you. }
            @else { You are all caught up. }
          </p>
        }
      </div>
    </div>

    @if (loading()) {
      <p class="loading">Loading requests…</p>
    } @else if (error()) {
      <p class="err loading">{{ error() }}</p>
    } @else {
      <div class="stack">
        @for (a of items(); track a.leave.id) {
          <article class="card req">
            <div class="req-top">
              <div class="person">
                <span class="av" [style.--c]="avatarColor(a.leave.userId)">{{ initials(a.leave.userName) }}</span>
                <div>
                  <div style="font-weight:600">{{ a.leave.userName }}</div>
                  <div class="muted small"><span class="dot" [style.--c]="typeColor(a.leave.typeCode)"></span>{{ a.leave.typeName }} · {{ days(a.leave.days) }}</div>
                </div>
              </div>
              <div style="font-weight:500">{{ range(a.leave.from, a.leave.to) }}</div>
            </div>
            <div class="req-meta">
              <span>“{{ a.leave.reason }}”</span>
              <span class="muted">{{ days(a.leftAfter) }} left after this</span>
            </div>
            @if (a.clash?.people?.length) {
              <div class="note" [class.calm]="!a.clash!.overLimit">
                {{ names(a.clash!.people) }} {{ a.clash!.people.length === 1 ? 'is' : 'are' }} also off on {{ fd(a.clash!.date) }}:
                {{ a.clash!.total }} of {{ a.clash!.teamSize }} people@if (a.clash!.overLimit) {, above the {{ a.clash!.limitPct }}% limit}.
              </div>
            } @else {
              <div class="note calm">Nobody else is off on these dates.</div>
            }

            @if (declining() === a.leave.id) {
              <div class="field">
                <label [for]="'why-' + a.leave.id">Why are you declining?</label>
                <textarea [id]="'why-' + a.leave.id" rows="2" maxlength="250" [placeholder]="firstName(a.leave.userName) + ' will see this'"
                          [value]="comment()" (input)="comment.set(val($event))"></textarea>
                @if (formError()) { <p class="err">{{ formError() }}</p> }
              </div>
              <div class="actions">
                <button class="btn danger" type="button" [disabled]="busy()" (click)="decline(a)">Decline request</button>
                <button class="btn plain" type="button" (click)="declining.set(null)">Back</button>
              </div>
            } @else {
              <div class="actions">
                <button class="btn" type="button" [disabled]="busy()" (click)="approve(a)">Approve</button>
                <button class="btn plain" type="button" (click)="startDecline(a)">Decline</button>
              </div>
            }
          </article>
        }
      </div>

      @if (recent().length) {
        <section class="card" style="margin-top:18px">
          <div class="card-h"><h2>Recently decided</h2></div>
          <ul class="rows">
            @for (l of recent(); track l.id) {
              <li>
                <div class="person">
                  <span class="av" [style.--c]="avatarColor(l.userId)">{{ initials(l.userName) }}</span>
                  <div>{{ l.userName }}<div class="muted small">{{ range(l.from, l.to) }}</div></div>
                </div>
                <span class="st" [class]="statusLabel(l.status).cls">{{ statusLabel(l.status).text }}</span>
              </li>
            }
          </ul>
        </section>
      }
    }
  `,
})
export class ApprovalsPage implements OnInit {
  private api = inject(ApiService);
  private ui = inject(UiService);

  protected days = days; protected fd = fd; protected range = range; protected names = names;
  protected typeColor = typeColor; protected avatarColor = avatarColor; protected initials = initials;
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
      this.formError.set(`Add a reason so ${firstName(a.leave.userName)} can pick other dates.`);
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
