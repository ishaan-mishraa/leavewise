import { Injectable, signal } from '@angular/core';

/** Small bits of shared UI state: the toast message and the approvals badge. */
@Injectable({ providedIn: 'root' })
export class UiService {
  readonly toast = signal('');
  readonly waitingCount = signal(0);
  private timer?: ReturnType<typeof setTimeout>;

  showToast(message: string) {
    this.toast.set(message);
    clearTimeout(this.timer);
    this.timer = setTimeout(() => this.toast.set(''), 2800);
  }
}
