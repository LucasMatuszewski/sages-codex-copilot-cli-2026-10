import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter, Router, withDisabledInitialNavigation } from '@angular/router';
import { AppComponent } from './app.component';
import { routes } from './app.routes';

describe('app shell', () => {
  let http: HttpTestingController;

  afterEach(() => http?.verify());

  it('shows the Sygnity brand and only the genuine Rejestr navigation link', async () => {
    await TestBed.configureTestingModule({
      imports: [AppComponent],
      providers: [
        provideRouter(routes, withDisabledInitialNavigation()),
        provideHttpClient(),
        provideHttpClientTesting(),
      ],
    }).compileComponents();
    http = TestBed.inject(HttpTestingController);

    const fixture = TestBed.createComponent(AppComponent);
    fixture.detectChanges();
    await fixture.whenStable();

    const root = fixture.nativeElement as HTMLElement;
    expect(root.querySelector('img[alt="Sygnity"]')?.getAttribute('src')).toBe('assets/brand/logo.svg');
    expect(root.textContent).toContain('Rejestr podatności CRA');
    expect(root.textContent).toContain('Wewnętrzny PoC');
    const nav = root.querySelector('nav[aria-label="Nawigacja główna"]');
    expect(nav?.querySelectorAll('a').length).toBe(1);
    expect(nav?.querySelector('a')?.textContent?.trim()).toBe('Rejestr');
    expect(nav?.querySelector('a')?.getAttribute('href')).toBe('/register');
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
    http.expectOne('/api/v1/vulnerabilities').flush({
      rows: [],
      counts: { vulnerabilityCount: 0, matchingEventCount: 0 },
    });
    fixture.detectChanges();
    await fixture.whenStable();
    const registerLink = root.querySelector('nav a');
    expect(router.url).toBe('/register');
    expect(root.textContent).toContain('Rejestr jest pusty');
    expect(registerLink?.getAttribute('aria-current')).toBe('page');

    await router.navigateByUrl('/register/unknown');
    fixture.detectChanges();
    await fixture.whenStable();
    expect(registerLink?.hasAttribute('aria-current')).toBe(false);
    expect(root.textContent).toContain('Nie znaleziono strony');
    expect(root.querySelectorAll('#page-main').length).toBe(1);
    http.expectNone('/api/v1/vulnerabilities');
  });

  it('keeps Rejestr active for a searched register URL and inactive for an unknown child route', async () => {
    await TestBed.configureTestingModule({
      imports: [AppComponent],
      providers: [
        provideRouter(routes, withDisabledInitialNavigation()),
        provideHttpClient(),
        provideHttpClientTesting(),
      ],
    }).compileComponents();
    http = TestBed.inject(HttpTestingController);

    const fixture = TestBed.createComponent(AppComponent);
    fixture.detectChanges();
    const router = TestBed.inject(Router);
    await router.navigateByUrl('/register?q=Atlas');
    http.expectOne('/api/v1/vulnerabilities?q=Atlas').flush({
      rows: [],
      counts: { vulnerabilityCount: 0, matchingEventCount: 0 },
    });
    fixture.detectChanges();
    await fixture.whenStable();

    const root = fixture.nativeElement as HTMLElement;
    const registerLink = root.querySelector('nav a');
    expect(router.url).toBe('/register?q=Atlas');
    expect(registerLink?.getAttribute('aria-current')).toBe('page');

    await router.navigateByUrl('/register/unknown');
    fixture.detectChanges();
    await fixture.whenStable();
    expect(registerLink?.hasAttribute('aria-current')).toBe(false);
    http.expectNone('/api/v1/vulnerabilities');
  });
});
