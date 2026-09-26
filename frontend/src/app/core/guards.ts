import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from './auth.service';
import { Role } from './models';

/** Only signed-in users get past this. */
export const authGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  return auth.signedIn() || inject(Router).parseUrl('/login');
};

/** Only these roles get past. Everyone else goes to their own home page. */
export function roleGuard(...roles: Role[]): CanActivateFn {
  return () => {
    const auth = inject(AuthService);
    const role = auth.user()?.role;
    return (role && roles.includes(role)) || inject(Router).parseUrl(auth.homeFor(role));
  };
}
