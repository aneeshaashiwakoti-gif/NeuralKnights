import { ServiceError } from '../errors';

/**
 * Central HTTP helper for the future REST adapter. It owns Bearer-token attachment and
 * unauthorised-response handling. It does NOT know any endpoint paths: those are unverified
 * (see INTEGRATION.md). Tokens are never logged and never placed in URLs.
 */

export type TokenProvider = () => string | null;
export type UnauthorisedHandler = () => void;

export interface HttpClientOptions {
  baseUrl: string;
  getToken: TokenProvider;
  onUnauthorised: UnauthorisedHandler;
}

export function createHttpClient(opts: HttpClientOptions) {
  return {
    async request<T>(path: string, init: RequestInit = {}): Promise<T> {
      if (!opts.baseUrl) {
        throw new ServiceError('NETWORK_ERROR', 'The backend base URL is not configured (VITE_API_BASE_URL).');
      }
      const headers = new Headers(init.headers);
      headers.set('Accept', 'application/json');
      const token = opts.getToken();
      if (token) headers.set('Authorization', `Bearer ${token}`);

      let response: Response;
      try {
        response = await fetch(`${opts.baseUrl}${path}`, { ...init, headers });
      } catch {
        throw new ServiceError('NETWORK_ERROR', 'The server could not be reached. No changes were recorded.');
      }
      if (response.status === 401) {
        opts.onUnauthorised();
        throw new ServiceError('UNAUTHORISED', 'Your session is no longer valid. Please sign in again.');
      }
      if (response.status === 403) {
        throw new ServiceError('PERMISSION_DENIED', 'Your role does not permit this action.');
      }
      if (!response.ok) {
        throw new ServiceError('UNKNOWN', `The server returned an error (HTTP ${response.status}).`);
      }
      return (await response.json()) as T;
    },
  };
}
