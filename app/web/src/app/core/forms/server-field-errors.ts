import { AbstractControl, FormArray, FormGroup } from '@angular/forms';
import type { FieldError } from '../../../../../shared/common';

const SERVER_ERRORS_KEY = 'server';

export type ServerFieldErrorResult = { readonly applied: readonly string[]; readonly formErrors: readonly FieldError[] };

export function applyServerFieldErrors(root: AbstractControl, errors: readonly FieldError[]): ServerFieldErrorResult {
  clearServerFieldErrors(root);
  const applied: string[] = [];
  const formErrors: FieldError[] = [];
  const byControl = new Map<AbstractControl, FieldError[]>();

  for (const error of errors) {
    const control = resolveControlPath(root, error.path);
    if (!control) {
      formErrors.push(error);
      continue;
    }
    applied.push(error.path);
    const controlErrors = byControl.get(control) ?? [];
    controlErrors.push(error);
    byControl.set(control, controlErrors);
  }

  for (const [control, controlErrors] of byControl) {
    control.setErrors({ ...(control.errors ?? {}), [SERVER_ERRORS_KEY]: controlErrors });
  }

  return { applied, formErrors };
}

export function clearServerFieldErrors(root: AbstractControl): void {
  const currentErrors = root.errors;
  if (currentErrors && Object.hasOwn(currentErrors, SERVER_ERRORS_KEY)) {
    const { [SERVER_ERRORS_KEY]: _serverErrors, ...remainingErrors } = currentErrors;
    root.setErrors(Object.keys(remainingErrors).length > 0 ? remainingErrors : null);
  }

  if (root instanceof FormGroup) {
    for (const control of Object.values(root.controls)) clearServerFieldErrors(control);
  } else if (root instanceof FormArray) {
    for (const control of root.controls) clearServerFieldErrors(control);
  }
}

function resolveControlPath(root: AbstractControl, path: string): AbstractControl | null {
  if (path === '$') return null;
  const normalizedPath = path.startsWith('$.') ? path.slice(2) : path;
  const tokens = tokenizePath(normalizedPath);
  if (!tokens || tokens.length === 0) return null;

  let current: AbstractControl = root;
  for (const token of tokens) {
    if (current instanceof FormGroup) {
      if (typeof token !== 'string' || !Object.hasOwn(current.controls, token)) return null;
      const child = current.controls[token];
      if (!(child instanceof AbstractControl)) return null;
      current = child;
    } else if (current instanceof FormArray) {
      if (typeof token !== 'number' || !Number.isSafeInteger(token) || token < 0 || token >= current.length) return null;
      const child = current.at(token);
      if (!(child instanceof AbstractControl)) return null;
      current = child;
    } else {
      return null;
    }
  }

  return current;
}

function tokenizePath(path: string): Array<string | number> | null {
  const tokens: Array<string | number> = [];
  const pattern = /(?:^|\.)([^.[\]]+)|\[(\d+)\]/g;
  let match: RegExpExecArray | null;
  let consumed = '';
  while ((match = pattern.exec(path)) !== null) {
    consumed += match[0];
    const name = match[1];
    const index = match[2];
    if (name !== undefined) tokens.push(name);
    else if (index !== undefined) tokens.push(Number(index));
  }
  return consumed === path ? tokens : null;
}
