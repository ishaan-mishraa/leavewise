import { Injectable, computed, signal } from '@angular/core';
import { AuthResponse, Role, User } from './models';

const TOKEN_KEY = 'leavewise.token';
const USER_KEY = 'leavewise.user';

/** Keeps the signed-in user and their token, and remembers them across page reloads. */
@Injectable({ providedIn: 'root' })
export class AuthService {
  readonly user = signal<User | null>(read<User>(USER_KEY));
  readonly token = signal<string | null>(read<string>(TOKEN_KEY));
  readonly signedIn = computed(() => !!this.token() && !!this.user());

  signIn(res: AuthResponse) {
    this.token.set(res.token);
    this.user.set(res.user);
    write(TOKEN_KEY, res.token);
    write(USER_KEY, res.user);
  }

  /** Replaces the saved user with fresh details from the server, e.g. after a name change. */
  updateUser(user: User) {
    this.user.set(user);
    write(USER_KEY, user);
  }

  signOut() {
    this.token.set(null);
    this.user.set(null);
    try {
      localStorage.removeItem(TOKEN_KEY);
      localStorage.removeItem(USER_KEY);
    } catch { /* storage blocked */ }
  }

  /** The first page each role sees after signing in. */
  homeFor(role: Role | undefined): string {
    return role === 'MANAGER' ? '/approvals' : role === 'HR' ? '/settings' : '/home';
  }
}

function read<T>(key: string): T | null {
  try {
    const v = localStorage.getItem(key);
    return v ? (JSON.parse(v) as T) : null;
  } catch {
    return null;
  }
}

function write(key: string, value: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch { /* storage blocked */ }
}
