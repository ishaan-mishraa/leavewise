import { Component, OnInit, computed, inject } from '@angular/core';
import { Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { ApiService } from '../core/api.service';
import { AuthService } from '../core/auth.service';
import { avatarColor, initials } from '../core/format';
import { UiService } from '../core/ui.service';

const NAV = {
  EMPLOYEE: [{ path: '/home', label: 'Home' }, { path: '/apply', label: 'Apply for leave' }, { path: '/calendar', label: 'Team calendar' }],
  MANAGER: [{ path: '/approvals', label: 'Approvals' }, { path: '/calendar', label: 'Team calendar' }],
  HR: [{ path: '/settings', label: 'Settings' }, { path: '/calendar', label: 'Team calendar' }],
};

/** The header, navigation and footer around every signed-in page. */
@Component({
  selector: 'app-shell',
  imports: [RouterOutlet, RouterLink, RouterLinkActive],
  template: `
    <header class="top">
      <div class="wrap">
        <div class="left">
          <a class="logo" [routerLink]="home()"><img src="favicon.svg" alt="">Leavewise</a>
          <nav class="main" aria-label="Main">
            @for (item of nav(); track item.path) {
              <a [routerLink]="item.path" routerLinkActive="active">
                {{ item.label }}
                @if (item.path === '/approvals' && ui.waitingCount()) {
                  <span class="count">{{ ui.waitingCount() }}</span>
                }
              </a>
            }
          </nav>
        </div>
        <div class="me">
          <span class="av" [style.--c]="color()">{{ userInitials() }}</span>
          <div class="who">
            <b>{{ auth.user()?.name }}</b>
            <span>{{ auth.user()?.jobTitle }}</span>
          </div>
          <button class="btn plain" type="button" (click)="signOut()">Sign out</button>
        </div>
      </div>
    </header>
    <div class="wrap">
      <main class="page"><router-outlet /></main>
      <footer class="foot">Leavewise · {{ auth.user()?.team ?? 'All teams' }}</footer>
    </div>
  `,
})
export class Shell implements OnInit {
  protected auth = inject(AuthService);
  protected ui = inject(UiService);
  private api = inject(ApiService);
  private router = inject(Router);

  protected nav = computed(() => NAV[this.auth.user()?.role ?? 'EMPLOYEE']);
  protected home = computed(() => this.auth.homeFor(this.auth.user()?.role));
  protected userInitials = computed(() => initials(this.auth.user()?.name ?? ''));
  protected color = computed(() => avatarColor(this.auth.user()?.id ?? 0));

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
