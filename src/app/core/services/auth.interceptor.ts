import { HttpContextToken, HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, from, switchMap, throwError } from 'rxjs';
import { AuthService } from './auth.service';
import { CLOUD_CONFIG } from './cloud-config';

const AUTH_RETRY = new HttpContextToken<boolean>(() => false);

export const authInterceptor: HttpInterceptorFn = (request, next) => {
  const auth = inject(AuthService);
  const config = inject(CLOUD_CONFIG);
  const isApiRequest = !!config.apiUrl && request.url.startsWith(config.apiUrl);
  const token = isApiRequest ? auth.session()?.accessToken : undefined;
  const authenticatedRequest = token ? request.clone({ setHeaders: { Authorization: `Bearer ${token}` } }) : request;
  return next(authenticatedRequest).pipe(catchError((error: unknown) => {
    if (!isApiRequest || !token || !auth.session()?.accessToken || authenticatedRequest.context.get(AUTH_RETRY) ||
        !(error instanceof HttpErrorResponse && error.status === 401)) return throwError(() => error);
    return from(auth.refreshSession()).pipe(
      switchMap(() => next(request.clone({ context: request.context.set(AUTH_RETRY, true),
        setHeaders: auth.session()?.accessToken ? { Authorization: `Bearer ${auth.session()?.accessToken}` } : {} }))),
      catchError((refreshError: unknown) => throwError(() => refreshError))
    );
  }));
};