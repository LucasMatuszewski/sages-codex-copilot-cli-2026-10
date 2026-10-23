import { FormArray, FormControl, FormGroup, Validators } from '@angular/forms';
import { applyServerFieldErrors, clearServerFieldErrors } from './server-field-errors';
import { FieldError } from '../../../../../shared/common';

const fieldError = (path: string, message = 'Wartość odrzucona.'): FieldError => ({
  path, code: 'INVALID_VALUE', message,
});

describe('server field errors', () => {
  function makeForm() {
    return new FormGroup({
      vulnerability: new FormGroup({
        identities: new FormArray([
          new FormGroup({ value: new FormControl(' CVE-2026-1234 ', { nonNullable: true, validators: [Validators.required] }) }),
        ]),
      }),
      localRequired: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
      safe: new FormControl('keep me', { nonNullable: true }),
    });
  }

  it('maps nested dot and indexed paths onto existing controls while preserving local errors', () => {
    const form = makeForm();
    const target = form.controls.vulnerability.controls.identities.at(0).controls.value;
    target.addValidators(Validators.minLength(30));
    target.updateValueAndValidity();

    const first = fieldError('$.vulnerability.identities[0].value');
    const second = fieldError('vulnerability.identities[0].value', 'Wprowadź poprawny identyfikator.');
    const result = applyServerFieldErrors(form, [first, second]);

    expect(result.applied).toEqual(['$.vulnerability.identities[0].value', 'vulnerability.identities[0].value']);
    expect(result.formErrors).toEqual([]);
    expect(target.errors).toMatchObject({ minlength: expect.anything(), server: [first, second] });
  });

  it('resolves an actual control whose legitimate name is constructor', () => {
    const form = makeForm();
    Object.defineProperty(form.controls, 'constructor', {
      value: new FormControl('legitimate'), enumerable: true, configurable: true, writable: true,
    });
    const error = fieldError('constructor');
    const result = applyServerFieldErrors(form, [error]);

    expect(result.applied).toEqual(['constructor']);
    expect(result.formErrors).toEqual([]);
    expect(form.get('constructor')?.errors).toHaveProperty('server');
  });

  it('returns root, unknown, non-control and prototype-looking paths as form errors safely', () => {
    const form = makeForm();
    const errors = [fieldError('$'), fieldError('missing'), fieldError('vulnerability.identities[8].value'), fieldError('constructor.prototype.polluted')];

    const result = applyServerFieldErrors(form, errors);

    expect(result.applied).toEqual([]);
    expect(result.formErrors).toEqual(errors);
    expect(Object.prototype).not.toHaveProperty('polluted');
    expect(Object.keys(form.controls)).not.toContain('missing');
  });

  it('a fresh response clears only previous server errors and keeps values and local validators', () => {
    const form = makeForm();
    const target = form.controls.vulnerability.controls.identities.at(0).controls.value;
    const local = form.controls.localRequired;
    applyServerFieldErrors(form, [fieldError('vulnerability.identities[0].value'), fieldError('localRequired')]);
    applyServerFieldErrors(form, [fieldError('safe')]);

    expect(target.value).toBe(' CVE-2026-1234 ');
    expect(target.errors).toBeNull();
    expect(local.errors).toHaveProperty('required');
    expect(local.errors).not.toHaveProperty('server');
    expect(form.controls.safe.value).toBe('keep me');
    expect(form.controls.safe.errors).toHaveProperty('server');
  });

  it('clears server errors recursively while retaining local errors and all entered values', () => {
    const form = makeForm();
    const target = form.controls.vulnerability.controls.identities.at(0).controls.value;
    target.addValidators(Validators.minLength(30));
    target.updateValueAndValidity();
    applyServerFieldErrors(form, [fieldError('vulnerability.identities[0].value')]);
    clearServerFieldErrors(form);

    expect(target.value).toBe(' CVE-2026-1234 ');
    expect(target.errors).toHaveProperty('minlength');
    expect(target.errors).not.toHaveProperty('server');
    expect(form.controls.localRequired.errors).toHaveProperty('required');
  });
});
