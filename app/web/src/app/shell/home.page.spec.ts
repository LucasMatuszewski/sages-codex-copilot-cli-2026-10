import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter, Router, withDisabledInitialNavigation } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { routes } from '../app.routes';
import { RegisterPage } from '../features/register/register-page';

describe('default register route', () => {
  let http: HttpTestingController;

  afterEach(() => http?.verify());

  it('redirects the root URL to the real register and renders its empty state', async () => {
    await TestBed.configureTestingModule({
      providers: [
        provideRouter(routes, withDisabledInitialNavigation()),
        provideHttpClient(),
        provideHttpClientTesting(),
      ],
    }).compileComponents();
    http = TestBed.inject(HttpTestingController);
    const harness = await RouterTestingHarness.create();
    await harness.navigateByUrl('/', RegisterPage);
    http.expectOne('/api/v1/vulnerabilities').flush({
      rows: [],
      counts: { vulnerabilityCount: 0, matchingEventCount: 0 },
    });
    harness.detectChanges();
    await harness.fixture.whenStable();

    const page = harness.routeNativeElement as HTMLElement;
    expect(TestBed.inject(Router).url).toBe('/register');
    expect(page.textContent).toContain('Rejestr podatności CRA');
    expect(page.textContent).toContain('Ewidencja podatności i wykryć oraz przygotowanie treści zgłoszeń.');
    expect(page.textContent).toContain('Rejestr jest pusty');
    expect(page.querySelectorAll('main,[role=main]').length).toBe(0);
    expect(page.querySelector('ion-content[role=presentation]')).not.toBeNull();
  });
});
