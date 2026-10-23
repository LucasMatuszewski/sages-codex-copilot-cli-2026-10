import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { MaybeAsync } from '@angular/router';
import { of } from 'rxjs';
import { unsavedChangesGuard, UnsavedNavigationChoice } from './unsaved-changes.guard';

@Component({ standalone: true, template: '<input aria-label="Retained value" [value]="value">' })
class DirtyPage {
  dirty = false;
  value = 'draft remains';
  choice: MaybeAsync<UnsavedNavigationChoice> = 'cancel';
  saveResult: MaybeAsync<boolean> | (() => Promise<boolean>) = true;
  saveThrows = false;
  rejectSave = false;
  prompted = 0;
  saved = 0;
  discarded = 0;

  hasUnsavedChanges() { return this.dirty; }
  chooseUnsavedNavigation(targetUrl: string) { this.prompted++; expect(targetUrl).toBe('/destination'); return this.choice; }
  saveBeforeNavigation() {
    this.saved++;
    if (this.saveThrows) throw new Error('private stack detail');
    if (this.rejectSave) return Promise.reject(new Error('private rejection detail'));
    return typeof this.saveResult === 'function' ? this.saveResult() : this.saveResult;
  }
  discardUnsavedChanges() { this.discarded++; this.dirty = false; }
}

@Component({ standalone: true, template: '<p>Destination</p>' })
class DestinationPage {}

describe('unsavedChangesGuard', () => {
  async function setup() {
    TestBed.configureTestingModule({
      providers: [provideRouter([
        { path: 'edit', component: DirtyPage, canDeactivate: [unsavedChangesGuard] },
        { path: 'destination', component: DestinationPage },
      ])],
    });
    const harness = await RouterTestingHarness.create('/edit');
    const router = TestBed.inject(Router);
    return { harness, router, page: harness.routeDebugElement!.componentInstance as DirtyPage };
  }

  it('lets a clean route leave without prompting', async () => {
    const { harness, router, page } = await setup();
    expect(await router.navigateByUrl('/destination')).toBe(true);
    expect(router.url).toBe('/destination');
    expect(page.prompted).toBe(0);
    harness.fixture.destroy();
  });

  it('blocks cancel and retains the input value', async () => {
    const { harness, router, page } = await setup();
    page.dirty = true;
    page.choice = 'cancel';
    expect(await router.navigateByUrl('/destination')).toBe(false);
    expect(router.url).toBe('/edit');
    expect((harness.routeNativeElement?.querySelector('input') as HTMLInputElement)?.value).toBe('draft remains');
    expect(page.discarded).toBe(0);
    harness.fixture.destroy();
  });

  it('discards exactly once before leaving', async () => {
    const { harness, router, page } = await setup();
    page.dirty = true;
    page.choice = 'discard';
    expect(await router.navigateByUrl('/destination')).toBe(true);
    expect(page.discarded).toBe(1);
    harness.fixture.destroy();
  });

  it('waits for an asynchronous successful save before leaving', async () => {
    const { harness, router, page } = await setup();
    page.dirty = true;
    page.choice = 'save';
    let resolveSave!: (saved: boolean) => void;
    page.saveResult = () => new Promise<boolean>((resolve) => { resolveSave = resolve; });
    const navigation = router.navigateByUrl('/destination');
    await vi.waitFor(() => expect(page.saved).toBe(1));
    expect(router.url).toBe('/edit');
    resolveSave(true);
    expect(await navigation).toBe(true);
    expect(page.saved).toBe(1);
    harness.fixture.destroy();
  });

  it('blocks a false save and a thrown save without discarding', async () => {
    const { harness, router, page } = await setup();
    page.dirty = true;
    page.choice = 'save';
    page.saveResult = false;
    expect(await router.navigateByUrl('/destination')).toBe(false);
    expect(router.url).toBe('/edit');
    page.saveThrows = true;
    expect(await router.navigateByUrl('/destination')).toBe(false);
    expect(router.url).toBe('/edit');
    expect(page.discarded).toBe(0);
    harness.fixture.destroy();
  });

  it('blocks a rejected asynchronous save and retains the draft route', async () => {
    const { harness, router, page } = await setup();
    page.dirty = true;
    page.choice = 'save';
    page.rejectSave = true;
    expect(await router.navigateByUrl('/destination')).toBe(false);
    expect(router.url).toBe('/edit');
    expect(page.discarded).toBe(0);
    harness.fixture.destroy();
  });

  it('accepts Observable prompt and save results', async () => {
    const { harness, router, page } = await setup();
    page.dirty = true;
    page.choice = of('save');
    page.saveResult = of(true);
    expect(await router.navigateByUrl('/destination')).toBe(true);
    expect(page.prompted).toBe(1);
    expect(page.saved).toBe(1);
    harness.fixture.destroy();
  });
});
