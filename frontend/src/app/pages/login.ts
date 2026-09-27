import { Component, OnInit, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { ApiService, errorMessage } from '../core/api.service';
import { AuthService } from '../core/auth.service';
import { AuthResponse, Role } from '../core/models';

@Component({
  selector: 'app-login',
  template: `
    <div class="login">
      <div class="card">
        <h1>Leavewise</h1>
        <p class="sub">Leave Management System</p>

        <form class="form" (submit)="signIn($event)" novalidate>
          <div class="field">
            <label for="email">Email</label>
            <input id="email" type="email" autocomplete="username" [value]="email()" (input)="email.set(val($event))">
          </div>
          <div class="field">
            <label for="password">Password</label>
            <input id="password" type="password" autocomplete="current-password" [value]="password()" (input)="password.set(val($event))">
          </div>
          @if (error()) { <div class="alert error">{{ error() }}</div> }
          <button class="btn block" type="submit" [disabled]="busy()">{{ busy() === 'form' ? 'Logging in…' : 'Login' }}</button>
        </form>

        <div class="demo">
          <p>Demo accounts (one click):</p>
          <div class="actions">
            <button class="btn secondary sm" type="button" [disabled]="busy()" (click)="demo('EMPLOYEE')" [title]="demoNames().EMPLOYEE">Employee</button>
            <button class="btn secondary sm" type="button" [disabled]="busy()" (click)="demo('MANAGER')" [title]="demoNames().MANAGER">Manager</button>
            <button class="btn secondary sm" type="button" [disabled]="busy()" (click)="demo('HR')" [title]="demoNames().HR">HR</button>
          </div>
          @if (slow()) {
            <p class="hint mt">Starting the server. On the free hosting plan this can take up to a minute.</p>
          }
        </div>
      </div>
    </div>
  `,
})
export class LoginPage implements OnInit {
  private api = inject(ApiService);
  private auth = inject(AuthService);
  private router = inject(Router);

  protected email = signal('');
  protected password = signal('');
  protected error = signal('');
  protected busy = signal<string | null>(null);
  protected slow = signal(false);
  // Shown as a tooltip on each demo button. Replaced with the real names from the database once they load.
  protected demoNames = signal<Record<Role, string>>({ EMPLOYEE: 'Sample employee', MANAGER: 'Sample manager', HR: 'Sample HR' });

  async ngOnInit() {
    try {
      const accounts = await this.api.demoAccounts();
      this.demoNames.update(names => ({ ...names, ...Object.fromEntries(accounts.map(a => [a.role, a.name])) }));
    } catch { /* keep the placeholder labels */ }
  }

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
