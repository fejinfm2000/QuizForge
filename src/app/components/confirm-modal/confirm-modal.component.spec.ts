import { ConfirmModalComponent } from './confirm-modal.component';

describe('ConfirmModalComponent', () => {
  it('should create component instance and emit on confirm/cancel', () => {
    const comp = new ConfirmModalComponent();
    let closedVal: boolean | undefined;
    comp.closed.subscribe(v => closedVal = v);
    comp.message = 'Are you sure?';
    comp.confirm();
    expect(closedVal).toBe(true);
    comp.cancel();
    expect(closedVal).toBe(false);
  });
});
