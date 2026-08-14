import { ActivitiesComponent } from './activities.component';
import { ActivityService } from '../../services/activity.service';
import { ThemeService } from '../../services/theme.service';
import { BehaviorSubject } from 'rxjs';

class MockActivityService {
  activities$ = new BehaviorSubject([ 
    { 
      activityId: 'a1', 
      timestamp: new Date().toISOString(), 
      actionType: 'TEST', 
      actorEmail: 'test@example.com', 
      actorRole: 'admin', 
      description: 'Test activity' 
    } 
  ]);
  async refresh() {}
}

class MockThemeService {
  theme$ = new BehaviorSubject<'light' | 'dark'>('dark');
  getTheme() { return 'dark'; }
  setTheme() {}
  toggle() { return 'light'; }
}

describe('ActivitiesComponent', () => {
  it('should load entries from ActivityService', async () => {
    const activitySvc = new MockActivityService() as any as ActivityService;
    const themeSvc = new MockThemeService() as any as ThemeService;
    const comp = new ActivitiesComponent(activitySvc, themeSvc);
    await comp.ngOnInit();
    expect(comp.entries.length).toBeGreaterThan(0);
    expect(comp.pageItems.length).toBeGreaterThanOrEqual(0);
  });

  it('should filter activities by email', async () => {
    const activitySvc = new MockActivityService() as any as ActivityService;
    const themeSvc = new MockThemeService() as any as ThemeService;
    const comp = new ActivitiesComponent(activitySvc, themeSvc);
    await comp.ngOnInit();
    
    comp.qEmail = 'test@example.com';
    comp.apply();
    expect(comp.filtered.length).toBeGreaterThan(0);
  });

  it('should filter activities by action type', async () => {
    const activitySvc = new MockActivityService() as any as ActivityService;
    const themeSvc = new MockThemeService() as any as ThemeService;
    const comp = new ActivitiesComponent(activitySvc, themeSvc);
    await comp.ngOnInit();
    
    comp.qAction = 'TEST';
    comp.apply();
    expect(comp.filtered.length).toBeGreaterThan(0);
  });

  it('should clear filters', async () => {
    const activitySvc = new MockActivityService() as any as ActivityService;
    const themeSvc = new MockThemeService() as any as ThemeService;
    const comp = new ActivitiesComponent(activitySvc, themeSvc);
    await comp.ngOnInit();
    
    comp.qEmail = 'test@example.com';
    comp.qAction = 'TEST';
    comp.clear();
    expect(comp.qEmail).toBe('');
    expect(comp.qAction).toBe('');
  });
});
