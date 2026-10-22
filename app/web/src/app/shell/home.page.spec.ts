import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { routes } from '../app.routes';
import { HomePage } from './home.page';

describe('home route', () => {
  it('renders the truthful Polish PoC introduction at the root URL', async () => {
    await TestBed.configureTestingModule({ providers: [provideRouter(routes)] }).compileComponents();
    const harness = await RouterTestingHarness.create();
    await harness.navigateByUrl('/', HomePage);
    const page = harness.routeNativeElement as HTMLElement;
    expect(page.textContent).toContain('Rejestr podatności CRA');
    expect(page.textContent).toContain('Ewidencja podatności i wykryć oraz przygotowanie treści zgłoszeń.');
    expect(page.textContent).toContain('Wersja PoC — ekran startowy');
    expect(page.querySelectorAll('main,[role=main]').length).toBe(0);
    expect(page.querySelector('ion-content[role=presentation]')).not.toBeNull();

  });
});
