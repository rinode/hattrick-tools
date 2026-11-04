/** A tiny TTL cache so repeated tool calls don't re-hit the CHPP servers. */
export class TtlCache {
  private readonly store = new Map<string, { value: unknown; expires: number }>();
  constructor(private readonly ttlMs: number) {}

  async get<T>(key: string, load: () => Promise<T>): Promise<T> {
    const now = Date.now();
    const hit = this.store.get(key);
    if (hit && hit.expires > now) return hit.value as T;
    const value = await load();
    this.store.set(key, { value, expires: now + this.ttlMs });
    return value;
  }

  clear(): void {
    this.store.clear();
  }
}
