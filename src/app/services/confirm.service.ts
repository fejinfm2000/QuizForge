import { Injectable, createComponent, EnvironmentInjector } from '@angular/core';
import { Router, NavigationStart } from '@angular/router';
import { ConfirmModalComponent } from '../components/confirm-modal/confirm-modal.component';
import { Subscription } from 'rxjs';
import { filter } from 'rxjs/operators';

@Injectable({ providedIn: 'root' })
export class ConfirmService {
  constructor(
    private environmentInjector: EnvironmentInjector,
    private router: Router
  ) {}

  async confirm(message: string): Promise<boolean> {
    return new Promise<boolean>(resolve => {
      const compRef = createComponent(ConfirmModalComponent, { environmentInjector: this.environmentInjector });
      compRef.instance.message = message;

      let navSub: Subscription | null = null;
      let dismissed = false;

      const dismiss = (val: boolean) => {
        if (dismissed) return;
        dismissed = true;
        navSub?.unsubscribe();
        resolve(val);
        // Destroy the Angular component AND remove the native DOM element from body
        const el = compRef.location.nativeElement;
        try { compRef.destroy(); } catch {}
        try { el.remove(); } catch {}
      };

      // Auto-dismiss as false (cancel) when user navigates away
      navSub = this.router.events
        .pipe(filter(e => e instanceof NavigationStart))
        .subscribe(() => dismiss(false));

      compRef.instance.closed.subscribe((val: boolean) => dismiss(val));

      document.body.appendChild(compRef.location.nativeElement);
    });
  }
}

