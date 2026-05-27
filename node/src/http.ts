import { HttpConfig } from './types';

export type StockEyesErrorCode =
  | 'rate_limit'
  | 'auth'
  | 'not_found'
  | 'http'
  | 'network'
  | 'timeout';

/** Error thrown for every failed request, with a machine-readable `code`. */
export class StockEyesError extends Error {
  readonly code: StockEyesErrorCode;
  /** HTTP status, or 0 for network/timeout failures. */
  readonly status: number;

  constructor(message: string, code: StockEyesErrorCode, status = 0) {
    super(message);
    this.name = 'StockEyesError';
    this.code = code;
    this.status = status;
    // Restore the prototype chain (needed when extending built-ins under ES targets).
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

export function isStockEyesError(error: unknown): error is StockEyesError {
  return error instanceof StockEyesError;
}

function codeForStatus(status: number): StockEyesErrorCode {
  if (status === 401 || status === 403) return 'auth';
  if (status === 404) return 'not_found';
  if (status === 429) return 'rate_limit';
  return 'http';
}

export function buildUrl(
  baseURL: string,
  path: string,
  params?: Record<string, unknown>
): string {
  const url = `${baseURL}${path}`;
  if (!params) return url;

  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null) query.append(key, String(value));
  }
  const qs = query.toString();
  return qs ? `${url}?${qs}` : url;
}

async function request<T>(
  config: HttpConfig,
  path: string,
  init: RequestInit,
  params?: Record<string, unknown>
): Promise<T> {
  const url = buildUrl(config.baseURL, path, params);

  let response: Response;
  try {
    response = await fetch(url, {
      ...init,
      headers: {
        'x-rapidapi-key': config.apiKey,
        'x-rapidapi-host': config.host,
        'Content-Type': 'application/json',
      },
      signal: AbortSignal.timeout(config.timeoutMs),
    });
  } catch (err) {
    const isTimeout =
      err instanceof Error &&
      (err.name === 'TimeoutError' || err.name === 'AbortError');
    throw new StockEyesError(
      isTimeout
        ? `Request to ${path} timed out after ${config.timeoutMs}ms`
        : `Network error calling ${path}: ${(err as Error).message}`,
      isTimeout ? 'timeout' : 'network'
    );
  }

  if (!response.ok) {
    throw new StockEyesError(
      `HTTP ${response.status} ${response.statusText} calling ${path}`,
      codeForStatus(response.status),
      response.status
    );
  }

  const data = (await response.json()) as T & { error?: string | null };
  if (data && typeof data === 'object' && 'error' in data && data.error) {
    throw new StockEyesError(String(data.error), 'http', response.status);
  }
  return data;
}

export function httpGet<T>(
  config: HttpConfig,
  path: string,
  params?: Record<string, unknown>
): Promise<T> {
  return request<T>(config, path, { method: 'GET' }, params);
}

export function httpPost<T>(
  config: HttpConfig,
  path: string,
  body: Record<string, unknown>
): Promise<T> {
  return request<T>(config, path, { method: 'POST', body: JSON.stringify(body) });
}
