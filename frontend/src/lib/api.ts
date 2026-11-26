import type { ApiError } from '@diaspora/shared';

export class RequestError extends Error {
  constructor(
    message: string,
    public status: number,
    public code: string,
    public fields?: Record<string, string>,
  ) {
    super(message);
  }
}
export async function api<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  let response: Response;
  try {
    response = await fetch(path, {
      ...options,
      credentials: 'same-origin',
      cache: 'no-store',
      signal: AbortSignal.timeout(45000),
      headers: {
        ...(options.body ? { 'Content-Type': 'application/json' } : {}),
        ...options.headers,
      },
    });
  } catch {
    throw new RequestError(
      options.method === 'POST'
        ? 'We couldn’t confirm the request. Please ask reception to check the register before trying again.'
        : 'We couldn’t reach the welcome desk. Check your connection and try again.',
      0,
      'CONNECTION',
    );
  }
  if (response.status === 204) return undefined as T;
  const result: unknown = await response.json().catch(() => null);
  if (!response.ok) {
    const error = result as ApiError | null;
    throw new RequestError(
      error?.error?.message ??
        'The welcome desk is temporarily unavailable. Please try again shortly.',
      response.status,
      error?.error?.code ?? 'UNAVAILABLE',
      error?.error?.fields,
    );
  }
  return result as T;
}
