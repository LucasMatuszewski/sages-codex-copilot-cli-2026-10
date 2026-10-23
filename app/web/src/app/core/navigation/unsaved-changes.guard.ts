import { CanDeactivateFn } from '@angular/router';
import type { MaybeAsync } from '@angular/router';
import { defer, from, isObservable, Observable, of } from 'rxjs';
import { catchError, map, switchMap } from 'rxjs/operators';

export type UnsavedNavigationChoice = 'save' | 'discard' | 'cancel';

export interface UnsavedNavigationHost {
  hasUnsavedChanges(): boolean;
  chooseUnsavedNavigation(targetUrl: string): MaybeAsync<UnsavedNavigationChoice>;
  saveBeforeNavigation(): MaybeAsync<boolean>;
  discardUnsavedChanges(): void;
}

export const unsavedChangesGuard: CanDeactivateFn<UnsavedNavigationHost> = (component, _currentRoute, _currentState, nextState) => {
  if (!component.hasUnsavedChanges()) return true;

  return defer(() => toObservable(component.chooseUnsavedNavigation(nextState.url))).pipe(
    switchMap((choice) => {
      if (choice === 'cancel') return of(false);
      if (choice === 'discard') {
        component.discardUnsavedChanges();
        return of(true);
      }
      if (choice === 'save') {
        return toObservable(component.saveBeforeNavigation()).pipe(map((saved) => saved === true));
      }
      return of(false);
    }),
    catchError(() => of(false)),
  );
};

function toObservable<T>(value: MaybeAsync<T>): Observable<T> {
  return isObservable(value) ? value : from(Promise.resolve(value));
}
