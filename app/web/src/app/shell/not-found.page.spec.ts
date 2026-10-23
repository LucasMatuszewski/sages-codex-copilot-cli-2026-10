import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter, Router, withDisabledInitialNavigation } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { routes } from '../app.routes';
import { NotFoundPage } from './not-found.page';

describe('unknown routes', () => {
  let http: HttpTestingController;

  afterEach(() => http?.verify());

  it.each(['/missing', '/folder/Inbox', '/register/unknown'])('%s shows a not-found page instead of a redirect', async (url) => {
    await TestBed.configureTestingModule({
      providers: [
        provideRouter(routes, withDisabledInitialNavigation()),
        provideHttpClient(),
        provideHttpClientTesting(),
      ],
    }).compileComponents();
    http = TestBed.inject(HttpTestingController);
    const harness = await RouterTestingHarness.create();
    await harness.navigateByUrl(url, NotFoundPage);
    const page = harness.routeNativeElement as HTMLElement;
    expect(page.textContent).toContain('Nie znaleziono strony');
    expect(page.textContent).toContain('Sprawdź adres lub wróć na stronę startową.');
    expect(page.querySelector('a[routerlink="/"]')?.textContent?.trim()).toBe('Wróć na start');
    expect(page.querySelector('h1')?.textContent).toBe('Nie znaleziono strony');
    expect(page.querySelectorAll('main,[role=main]').length).toBe(0);
    expect(page.querySelector('ion-content[role=presentation]')).not.toBeNull();


    page.querySelector<HTMLAnchorElement>('a[routerlink="/"]')?.click();
    await harness.fixture.whenStable();
    http.expectOne('/api/v1/vulnerabilities').flush({
      rows: [],
      counts: { vulnerabilityCount: 0, matchingEventCount: 0 },
    });
    harness.detectChanges();
    await harness.fixture.whenStable();
    expect(TestBed.inject(Router).url).toBe('/register');
    expect(harness.routeNativeElement?.textContent).toContain('Rejestr jest pusty');
  });
});
