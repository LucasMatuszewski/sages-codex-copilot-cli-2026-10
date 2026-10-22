import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { AppComponent } from './app.component';
import { routes } from './app.routes';

describe('app shell', () => {
  it('shows the Sygnity brand and only the genuine Start navigation link', async () => {
    await TestBed.configureTestingModule({
      imports: [AppComponent],
      providers: [provideRouter(routes)],
    }).compileComponents();

    const fixture = TestBed.createComponent(AppComponent);
    fixture.detectChanges();
    await fixture.whenStable();

    const root = fixture.nativeElement as HTMLElement;
    expect(root.querySelector('img[alt="Sygnity"]')?.getAttribute('src')).toBe('assets/brand/logo.svg');
    expect(root.textContent).toContain('Rejestr podatności CRA');
    expect(root.textContent).toContain('Wewnętrzny PoC');
    const nav = root.querySelector('nav[aria-label="Nawigacja główna"]');
    expect(nav?.querySelectorAll('a').length).toBe(1);
    expect(nav?.querySelector('a')?.textContent?.trim()).toBe('Start');
    expect(root.textContent).not.toContain('Inbox');
    expect(root.querySelector('a.skip-link')?.getAttribute('href')).toBe('#page-main');
    const pageMain = root.querySelector('main#page-main');
    expect(pageMain?.getAttribute('tabindex')).toBe('-1');
    expect(root.querySelectorAll('#page-main').length).toBe(1);

    const menu = root.querySelector('ion-menu') as (HTMLElement & { menuId?: string }) | null;
    const menuButton = root.querySelector('ion-menu-button') as (HTMLElement & { menu?: string }) | null;
    expect(menu?.menuId).toBe('main-menu');
    expect(menuButton?.menu).toBe(menu?.menuId);

    const router = TestBed.inject(Router);
    await router.navigateByUrl('/');
    fixture.detectChanges();
    await fixture.whenStable();
    const startLink = root.querySelector('nav a');
    expect(startLink?.getAttribute('aria-current')).toBe('page');

    await router.navigateByUrl('/register');
    fixture.detectChanges();
    await fixture.whenStable();
    expect(startLink?.hasAttribute('aria-current')).toBe(false);
    expect(root.querySelectorAll('#page-main').length).toBe(1);
  });
});
