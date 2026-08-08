export function getApiBase(): string {
  const base = import.meta.env.WXT_API_BASE_URL as string | undefined;
  if (!base) {
    throw new Error('WXT_API_BASE_URL is not configured');
  }
  return base.replace(/\/$/, '');
}

export class ApiError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
  }
}

export async function apiFetch<T>(
  path: string,
  init?: RequestInit & { token?: string | null },
): Promise<T> {
  const { token, headers: initHeaders, ...rest } = init ?? {};
  const base = getApiBase();
  const url = path.startsWith('http')
    ? path
    : `${base}${path.startsWith('/') ? path : `/${path}`}`;

  const headers = new Headers(initHeaders);
  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }
  if (rest.body && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }

  const response = await fetch(url, { ...rest, headers });

  if (!response.ok) {
    let message = response.statusText;
    try {
      const body = (await response.json()) as { error?: string };
      if (body.error) message = body.error;
    } catch {
      // keep statusText
    }
    throw new ApiError(message, response.status);
  }

  return response.json() as Promise<T>;
}
