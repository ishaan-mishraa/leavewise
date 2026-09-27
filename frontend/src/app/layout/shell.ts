import { Component, OnInit, computed, inject } from '@angular/core';
import { Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { ApiService } from '../core/api.service';
import { AuthService } from '../core/auth.service';
import { UiService } from '../core/ui.service';

const NAV = {
  EMPLOYEE: [{ path: '/home', label: 'Dashboard' }, { path: '/apply', label: 'Apply Leave' }, { path: '/calendar', label: 'Team Calendar' }],
  MANAGER: [{ path: '/approvals', label: 'Approvals' }, { path: '/calendar', label: 'Team Calendar' }],
  HR: [{ path: '/settings', label: 'Settings' }, { path: '/calendar', label: 'Team Calendar' }],
};
const ROLE_LABEL = { EMPLOYEE: 'Employee', MANAGER: 'Manager', HR: 'HR' };

/** Top bar with navigation, around every signed-in page. */
@Component({
  selector: 'app-shell',
  imports: [RouterOutlet, RouterLink, RouterLinkActive],
  template: `
    <header class="topbar">
      <div class="inner">
        <a class="brand" [routerLink]="home()">Leavewise<span>Leave Management</span></a>
        <nav aria-label="Main">
          @for (item of nav(); track item.path) {
            <a [routerLink]="item.path" routerLinkActive="active">
              {{ item.label }}@if (item.path === '/approvals' && ui.waitingCount()) {&nbsp;({{ ui.waitingCount() }})}
            </a>
          }
        </nav>
        <div class="user">
          <span><b>{{ auth.user()?.name }}</b><span class="role">&nbsp;· {{ role() }}</span></span>
          <button class="btn-out" type="button" (click)="signOut()">Logout</button>
        </div>
      </div>
    </header>
    <main class="container"><router-outlet /></main>
  `,
})
export class Shell implements OnInit {
  protected auth = inject(AuthService);
  protected ui = inject(UiService);
  private api = inject(ApiService);
  private router = inject(Router);

  protected nav = computed(() => NAV[this.auth.user()?.role ?? 'EMPLOYEE']);
  protected home = computed(() => this.auth.homeFor(this.auth.user()?.role));
  protected role = computed(() => ROLE_LABEL[this.auth.user()?.role ?? 'EMPLOYEE']);

  async ngOnInit() {
    // The saved user can be out of date (e.g. a name changed in the database), so refresh it.
    try {
      this.auth.updateUser(await this.api.me());
    } catch { /* an expired token is handled by the interceptor */ }

    if (this.auth.user()?.role === 'MANAGER') {
      try {
        this.ui.waitingCount.set((await this.api.approvals()).length);
      } catch { /* the approvals page shows its own error */ }
    }
  }

  signOut() {
    this.auth.signOut();
    this.router.navigate(['/login']);
  }
}
