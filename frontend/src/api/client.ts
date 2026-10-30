const BASE_URL = 'http://localhost:3001/api/v1';

export class ApiError extends Error {
  statusCode?: number;

  constructor(message: string, statusCode?: number) {
    super(message);
    this.name = 'ApiError';
    this.statusCode = statusCode;
  }
}

export async function apiClient<T>(path: string, options?: RequestInit): Promise<T> {
  const method = options?.method?.toUpperCase();
  const needsContentType = method === 'POST' || method === 'PATCH';

  const mergedOptions: RequestInit = {
    ...options,
    headers: {
      ...(needsContentType ? { 'Content-Type': 'application/json' } : {}),
      ...options?.headers,
    },
  };

  let response: Response;

  try {
    response = await fetch(`${BASE_URL}${path}`, mergedOptions);
  } catch {
    throw new ApiError('Server is unreachable.');
  }

  if (!response.ok) {
    let message = 'An unexpected error occurred.';
    try {
      const body = await response.json();
      if (typeof body?.message === 'string' && body.message.length > 0) {
        message = body.message;
      }
    } catch {
      // ignore JSON parse failure; use default message
    }
    throw new ApiError(message, response.status);
  }

  return response.json() as Promise<T>;
}
