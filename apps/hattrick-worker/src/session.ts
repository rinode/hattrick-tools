// Encrypted-cookie sessions via Web Crypto (AES-GCM). No server-side store:
// the user's CHPP token lives only in a cookie, encrypted with SESSION_SECRET,
// so it is opaque to the browser and survives no infrastructure. Runs on the
// Workers runtime (and Node 18+) unchanged.

function b64url(bytes: Uint8Array): string {
  let s = "";
  for (const b of bytes) s += String.fromCharCode(b);
  return btoa(s).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function fromB64url(s: string): Uint8Array {
  const b64 = s.replace(/-/g, "+").replace(/_/g, "/") + "===".slice((s.length + 3) % 4);
  const bin = atob(b64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

async function aesKey(secret: string): Promise<CryptoKey> {
  const hash = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(secret));
  return crypto.subtle.importKey("raw", hash, { name: "AES-GCM" }, false, ["encrypt", "decrypt"]);
}

/** Encrypts a JSON-serialisable value into an opaque cookie string. */
export async function seal(secret: string, value: unknown): Promise<string> {
  const key = await aesKey(secret);
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const data = new TextEncoder().encode(JSON.stringify(value));
  const ct = new Uint8Array(await crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, data));
  return `${b64url(iv)}.${b64url(ct)}`;
}

/** Decrypts a cookie string, or returns null if absent/tampered/expired-key. */
export async function unseal<T>(secret: string, cookie: string | undefined): Promise<T | null> {
  if (!cookie || !cookie.includes(".")) return null;
  try {
    const [ivs, cts] = cookie.split(".");
    const key = await aesKey(secret);
    const pt = await crypto.subtle.decrypt(
      { name: "AES-GCM", iv: fromB64url(ivs!) },
      key,
      fromB64url(cts!),
    );
    return JSON.parse(new TextDecoder().decode(pt)) as T;
  } catch {
    return null;
  }
}
