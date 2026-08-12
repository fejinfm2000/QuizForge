import { Injectable, createComponent, EnvironmentInjector } from '@angular/core';
import { ConfirmModalComponent } from '../components/confirm-modal/confirm-modal.component';

@Injectable({ providedIn: 'root' })
export class ConfirmService {
  constructor(private environmentInjector: EnvironmentInjector) {}

  async confirm(message: string): Promise<boolean> {
    return new Promise<boolean>(resolve => {
      const compRef = createComponent(ConfirmModalComponent, { environmentInjector: this.environmentInjector });
      compRef.instance.message = message;
      compRef.instance.closed.subscribe((val: boolean) => {
        resolve(val);
        try { compRef.destroy(); } catch {}
      });
      document.body.appendChild(compRef.location.nativeElement);
    });
  }
}
