import { Component, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { ApiService, errorMessage } from '../core/api.service';
import { AuthService } from '../core/auth.service';
import { LEAF_PATH } from '../core/format';
import { AuthResponse, Role } from '../core/models';

// Which squares of the little calendar on the left get a colour.
const ART: Record<number, string> = { 9: 'a', 10: 'a', 16: 'b', 17: 'b', 18: 'b', 19: 'b', 23: 'c', 25: 'd', 26: 'd' };

@Component({
  selector: 'app-login',
  template: `
    <div class="login">
      <div class="card login-card">
        <div class="login-art">
          <svg class="leaf" viewBox="0 0 32 32" aria-hidden="true"><path [attr.d]="leaf" fill="currentColor" /></svg>
          <span class="logo"><img src="favicon.svg" alt="">Leavewise</span>
          <div class="mini-cal" aria-hidden="true">
            @for (c of art; track $index) { <span [class]="c"></span> }
          </div>
          <div>
            <h2>Plan time off without leaving your team short.</h2>
            <p>Apply in under a minute, see who else is away, and get a decision from your manager the same day.</p>
          </div>
        </div>

        <form class="login-form" (submit)="signIn($event)" novalidate>
          <div>
            <h1 style="font-size:24px">Sign in</h1>
            <p class="muted small" style="margin-top:4px">Use your work email.</p>
          </div>
          <div class="field">
            <label for="email">Work email</label>
            <input id="email" type="email" autocomplete="username" [value]="email()" (input)="email.set(val($event))">
          </div>
          <div class="field">
            <label for="password">Password</label>
            <input id="password" type="password" autocomplete="current-password" [value]="password()" (input)="password.set(val($event))">
          </div>
          @if (error()) { <p class="err" role="alert">{{ error() }}</p> }
          <button class="btn" type="submit" [disabled]="busy()">{{ busy() === 'form' ? 'Signing in…' : 'Sign in' }}</button>

          <div class="divider">or try a sample account</div>
          <div class="demo">
            <button type="button" (click)="demo('EMPLOYEE')" [disabled]="busy()"><b>Employee</b><span>Ananya Iyer</span></button>
            <button type="button" (click)="demo('MANAGER')" [disabled]="busy()"><b>Manager</b><span>Rahul Verma</span></button>
            <button type="button" (click)="demo('HR')" [disabled]="busy()"><b>HR</b><span>Kavita Sen</span></button>
          </div>
          @if (slow()) {
            <p class="note calm small">Waking up the server. On the free plan this can take up to a minute the first time.</p>
          }
        </form>
      </div>
    </div>
  `,
})
export class LoginPage {
  private api = inject(ApiService);
  private auth = inject(AuthService);
  private router = inject(Router);

  protected leaf = LEAF_PATH;
  protected art = Array.from({ length: 35 }, (_, i) => (i % 7 >= 5 ? 'we' : ART[i] ?? ''));
  protected email = signal('');
  protected password = signal('');
  protected error = signal('');
  protected busy = signal<string | null>(null);
  protected slow = signal(false);

  protected val = (e: Event) => (e.target as HTMLInputElement).value;

  signIn(e: Event) {
    e.preventDefault();
    if (!this.email().trim() || !this.password()) {
      this.error.set('Enter your email and password.');
      return;
    }
    this.busy.set('form');
    this.run(() => this.api.login(this.email(), this.password()));
  }

  demo(role: Role) {
    this.busy.set(role);
    this.run(() => this.api.demoLogin(role));
  }

  private async run(request: () => Promise<AuthResponse>) {
    this.error.set('');
    const timer = setTimeout(() => this.slow.set(true), 4000);
    try {
      const res = await request();
      this.auth.signIn(res);
      await this.router.navigateByUrl(this.auth.homeFor(res.user.role));
    } catch (e) {
      this.error.set(errorMessage(e));
    } finally {
      clearTimeout(timer);
      this.slow.set(false);
      this.busy.set(null);
    }
  }
}
