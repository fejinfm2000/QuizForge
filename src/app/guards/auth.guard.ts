import { inject } from '@angular/core';
import { CanActivateFn, Router, ActivatedRouteSnapshot } from '@angular/router';
import { AuthService } from '../services/auth.service';

export const authGuard: CanActivateFn = (route: ActivatedRouteSnapshot) => {
  const auth = inject(AuthService);
  const router = inject(Router);

  if (!auth.isLoggedIn) {
    router.navigate(['/login']);
    return false;
  }

  const roles = route.data?.['roles'] as string[] | undefined;
  if (roles && roles.length > 0) {
    const userRole = auth.currentUser?.role;
    if (!userRole || roles.indexOf(userRole) === -1) {
      // unauthorized
      router.navigate(['/dashboard']);
      return false;
    }
  }

  return true;
};
