export const USER_AGENT = 'e-Drive/1.0 (EV route planner)';

export class HttpError extends Error {
  constructor(
    message: string,
    readonly status?: number,
  ) {
    super(message);
    this.name = 'HttpError';
  }
}

export interface FetchOpts extends RequestInit {
  timeoutMs?: number;
}

/** AbortController ile zaman aşımı olan fetch. */
export async function fetchWithTimeout(
  url: string,
  opts: FetchOpts = {},
): Promise<Response> {
  const { timeoutMs = 20000, ...rest } = opts;
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    return await fetch(url, {
      ...rest,
      signal: ctrl.signal,
      headers: { 'User-Agent': USER_AGENT, ...(rest.headers ?? {}) },
    });
  } finally {
    clearTimeout(timer);
  }
}

export async function fetchJson<T>(url: string, opts: FetchOpts = {}): Promise<T> {
  const res = await fetchWithTimeout(url, opts);
  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new HttpError(
      `${res.status} ${res.statusText}${body ? ` — ${body.slice(0, 160)}` : ''}`,
      res.status,
    );
  }
  return (await res.json()) as T;
}

/** Hatayı kullanıcıya gösterilebilir Türkçe metne çevirir. */
export function humanError(e: unknown): string {
  if (e instanceof HttpError) {
    if (e.status === 401 || e.status === 403)
      return 'Servis anahtarı reddedildi. Ayarlar > API anahtarlarını kontrol et.';
    if (e.status === 429)
      return 'Servis çok yoğun (istek limiti). Biraz bekleyip tekrar dene.';
    if (e.status && e.status >= 500)
      return 'Servis şu an cevap vermiyor. Birkaç saniye sonra tekrar dene.';
    return e.message;
  }
  if (e instanceof Error) {
    if (e.name === 'AbortError') return 'İstek zaman aşımına uğradı.';
    if (/network/i.test(e.message)) return 'İnternet bağlantısı yok gibi görünüyor.';
    return e.message;
  }
  return 'Bilinmeyen bir hata oluştu.';
}
