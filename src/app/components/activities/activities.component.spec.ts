import { ActivitiesComponent } from './activities.component';
import { ActivityService } from '../../services/activity.service';

class MockActivityService {
  activities$ = { subscribe: (fn: any) => { fn([ { activityId:'a1', timestamp: new Date().toISOString(), actionType:'TEST', actorEmail:'x', actorRole:'admin', description:'d' } ]) } };
  async refresh() {}
}

describe('ActivitiesComponent', () => {
  it('should load entries from ActivityService', async () => {
    const svc = new MockActivityService() as any as ActivityService;
    const comp = new ActivitiesComponent(svc);
    await comp.ngOnInit();
    expect(comp.entries.length).toBeGreaterThan(0);
    expect(comp.pageItems.length).toBeGreaterThanOrEqual(0);
  });
});
