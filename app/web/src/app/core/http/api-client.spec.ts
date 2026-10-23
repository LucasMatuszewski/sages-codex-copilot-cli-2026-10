import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { Component } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { z } from 'zod';
import { ApiErrorSchema, type FieldError } from '../../../../../shared/common';
import { ApiClient, ApiRequest } from './api-client';
import { ApiClientError } from '../errors/api-error';
import { applyServerFieldErrors } from '../forms/server-field-errors';

const transformedSchema = z.object({ revision: z.number().transform((value) => `r${value}`) });
const validRequest: ApiRequest = { method: 'GET', path: '/api/v1/vulnerabilities?query=CVE-2026-1234' };

@Component({
  standalone: true,
  imports: [ReactiveFormsModule],
  template: `
    <form [formGroup]="form" (ngSubmit)="save()">
      <label for="name">Nazwa</label><input id="name" formControlName="name">
      @if (form.controls.name.errors && form.controls.name.errors['server']; as serverErrors) { <p role="alert">{{ serverErrors[0].message }}</p> }
      @if (error(); as currentError) {
        @if (currentError.fieldErrors.length === 0) { <p role="alert">{{ currentError.message }}</p> }
        @if (currentError.recovery === 'reload-current') { <button type="button" (click)="reload()">Wczytaj aktualny rekord</button> }
        @if (currentError.retryable) { <button type="button" (click)="save()">Spróbuj ponownie</button> }
      }
      @for (formError of formErrors(); track $index) { <p role="alert" data-form-error>{{ formError.message }}</p> }
      <button type="submit">Zapisz</button>
      @if (saved()) { <p role="status">Zapisano</p> }
    </form>
  `,
})
class SaveFixture {
  readonly form = new FormGroup({ name: new FormControl('', { nonNullable: true, validators: [Validators.required] }) });
  error = signal<ApiClientError | null>(null);
  formErrors = signal<readonly FieldError[]>([]);
  saved = signal(false);
  reloads = 0;
  private readonly client = TestBed.inject(ApiClient);

  save() {
    this.saved.set(false);
    this.error.set(null);
    this.client.request(z.object({ id: z.string().uuid() }), {
      method: 'POST', path: '/api/v1/vulnerabilities', body: { name: this.form.controls.name.value },
    }).subscribe({
      next: () => { this.saved.set(true); },
      error: (error: ApiClientError) => {
        this.error.set(error);
        this.formErrors.set(applyServerFieldErrors(this.form, error.fieldErrors).formErrors);
      },
    });
  }

  reload() { this.reloads++; }
}

describe('ApiClient', () => {
  let client: ApiClient;
  let controller: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });
    client = TestBed.inject(ApiClient);
    controller = TestBed.inject(HttpTestingController);
  });

  afterEach(() => controller.verify());

  function saveFixture() {
    const fixture = TestBed.createComponent(SaveFixture);
    fixture.detectChanges();
    const root = fixture.nativeElement as HTMLElement;
    const input = root.querySelector('input') as HTMLInputElement;
    input.value = '  exact typed value  ';
    input.dispatchEvent(new Event('input', { bubbles: true }));
    fixture.detectChanges();
    expect(fixture.componentInstance.form.controls.name.value).toBe('  exact typed value  ');
    return { fixture, root, input };
  }

  function submit(fixture: ComponentFixture<SaveFixture>) {
    fixture.nativeElement.querySelector('form')?.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
    fixture.detectChanges();
  }

  it('preserves method and body, then emits the schema parsed value once', () => {
    const next = vi.fn();
    const error = vi.fn();
    client.request(transformedSchema, { method: 'PATCH', path: '/api/v1/vulnerabilities/one', body: { revision: 2 } }).subscribe({ next, error });
    const request = controller.expectOne('/api/v1/vulnerabilities/one');
    expect(request.request.method).toBe('PATCH');
    expect(request.request.body).toEqual({ revision: 2 });
    expect(next).not.toHaveBeenCalled();
    request.flush({ revision: 4 });
    expect(next).toHaveBeenCalledOnce();
    expect(next).toHaveBeenCalledWith({ revision: 'r4' });
    expect(error).not.toHaveBeenCalled();
  });

  it('turns an invalid successful body into an unexpected error with its real status', () => {
    const next = vi.fn();
    const failure = vi.fn();
    client.request(z.object({ id: z.string() }), validRequest).subscribe({ next, error: failure });
    controller.expectOne(validRequest.path).flush({ id: 42 }, { status: 200, statusText: 'OK' });
    expect(next).not.toHaveBeenCalled();
    expect(failure).toHaveBeenCalledOnce();
    expect(failure.mock.calls[0]?.[0]).toMatchObject({ kind: 'unexpected', status: 200 });
  });

  it('maps a direct 400 API body and preserves status', () => {
    const failure = vi.fn();
    client.request(z.unknown(), validRequest).subscribe({ error: failure });
    controller.expectOne(validRequest.path).flush({
      code: 'VALIDATION_FAILED', message: 'Popraw wskazane pola.',
      fieldErrors: [{ path: '$', code: 'INVALID_INPUT', message: 'Dane są niepoprawne.' }], retryable: false,
    }, { status: 400, statusText: 'Bad Request' });
    expect(failure.mock.calls[0]?.[0]).toMatchObject({ kind: 'api', status: 400, code: 'VALIDATION_FAILED' });
  });

  it('preserves correctly encoded special characters in a relative API query', () => {
    const params = new URLSearchParams({ q: 'foo\\bar#tag&scope' });
    const path = `/api/v1/vulnerabilities?${params.toString()}` as const;
    const next = vi.fn();
    client.request(z.object({ items: z.array(z.string()) }), { method: 'GET', path }).subscribe({ next });
    const request = controller.expectOne(path);
    expect(request.request.urlWithParams).toBe(path);
    request.flush({ items: ['kept'] });
    expect(next).toHaveBeenCalledWith({ items: ['kept'] });
  });

  it('rejects absolute, protocol-relative, backslash and escaping paths before HTTP dispatch', () => {
    for (const path of ['https://example.test/api/v1/x', '//example.test/api/v1/x', '/api/v1\\x', '/api/v1/../../admin']) {
      expect(() => client.request(z.unknown(), { method: 'GET', path: path as `/api/v1/${string}` })).toThrow();
    }
    controller.expectNone(() => true);
  });

  it('maps malformed error bodies with the transport status', () => {
    const failure = vi.fn();
    client.request(z.unknown(), validRequest).subscribe({ error: failure });
    const positive = ApiErrorSchema.parse({ code: 'TEMPORARY_FAILURE', message: 'Try later.', fieldErrors: [], retryable: true });
    const malformed = { ...positive, message: '<html>private diagnostic</html>', fieldErrors: null };
    controller.expectOne(validRequest.path).flush(malformed, { status: 502, statusText: 'Bad Gateway' });
    expect(failure.mock.calls[0]?.[0]).toMatchObject({ kind: 'unexpected', status: 502 });
    expect((failure.mock.calls[0]?.[0] as Error).message).not.toContain('private diagnostic');
  });

  it('retains the request and makes no automatic retry for retryable or network errors', () => {
    const reference = { opaque: 'still held by caller' };
    const failure = vi.fn();
    client.request(z.unknown(), { ...validRequest, body: reference }).subscribe({ error: failure });
    const request = controller.expectOne(validRequest.path);
    expect(request.request.body).toBe(reference);
    request.flush({ code: 'TEMPORARY_FAILURE', message: 'Spróbuj później.', fieldErrors: [], retryable: true }, { status: 503, statusText: 'Unavailable' });
    expect(failure.mock.calls[0]?.[0]).toMatchObject({ status: 503, retryable: true });
    controller.expectNone(validRequest.path);

    client.request(z.unknown(), validRequest).subscribe({ error: failure });
    controller.expectOne(validRequest.path).error(new ProgressEvent('error'));
    expect(failure.mock.calls[1]?.[0]).toMatchObject({ kind: 'network', status: 0, retryable: true });
    controller.expectNone(validRequest.path);
  });

  it('renders mapped field and form errors while retaining the exact typed value', () => {
    const { fixture, root, input } = saveFixture();
    expect(fixture.componentInstance.form.controls.name.errors).toBeNull();
    submit(fixture);
    const first = controller.expectOne('/api/v1/vulnerabilities');
    expect(first.request.body).toEqual({ name: '  exact typed value  ' });
    first.flush({ code: 'VALIDATION_FAILED', message: 'Popraw wskazane dane.', fieldErrors: [
      { path: 'name', code: 'DUPLICATE', message: 'Nazwa jest już używana.' },
      { path: '$', code: 'INVALID_INPUT', message: 'Formularz zawiera niepoprawne dane.' },
    ], retryable: false }, { status: 400, statusText: 'Bad Request' });
    fixture.detectChanges();
    expect(root.textContent).toContain('Nazwa jest już używana.');
    expect(root.textContent).toContain('Formularz zawiera niepoprawne dane.');
    expect(root.textContent).not.toContain('Zapisano');
    expect(input.value).toBe('  exact typed value  ');
    expect(fixture.componentInstance.form.controls.name.errors?.['server']).toHaveLength(1);
    fixture.destroy();
  });

  it('retains input and exposes explicit stale-revision reload without resubmitting', () => {
    const { fixture, root, input } = saveFixture();
    submit(fixture);
    controller.expectOne('/api/v1/vulnerabilities').flush({
      code: 'STALE_REVISION', message: 'Rekord został zmieniony.', fieldErrors: [], retryable: false,
      currentRevision: 9, existingResourceId: '123e4567-e89b-42d3-a456-426614174000',
    }, { status: 409, statusText: 'Conflict' });
    fixture.detectChanges();
    expect(root.textContent).toContain('Wczytaj aktualny rekord');
    expect(fixture.componentInstance.reloads).toBe(0);
    expect(fixture.componentInstance.error()).toMatchObject({ status: 409, currentRevision: 9, existingResourceId: '123e4567-e89b-42d3-a456-426614174000' });
    expect(input.value).toBe('  exact typed value  ');
    controller.expectNone('/api/v1/vulnerabilities');
    fixture.destroy();
  });

  it('retains input and exposes a retry affordance for 503 without retrying automatically', () => {
    const { fixture, root, input } = saveFixture();
    submit(fixture);
    controller.expectOne('/api/v1/vulnerabilities').flush({
      code: 'TEMPORARY_FAILURE', message: 'Usługa jest chwilowo niedostępna.', fieldErrors: [], retryable: true,
    }, { status: 503, statusText: 'Unavailable' });
    fixture.detectChanges();
    expect(root.textContent).toContain('Spróbuj ponownie');
    expect(input.value).toBe('  exact typed value  ');
    controller.expectNone('/api/v1/vulnerabilities');
    fixture.destroy();
  });
});
