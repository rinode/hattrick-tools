/** An error returned by the CHPP API (a non-empty `<Error>` envelope) or a
 * client-side decode failure. */
export class ChppError extends Error {
  readonly code?: string;
  readonly guid?: string;
  constructor(message: string, code?: string, guid?: string) {
    super(message);
    this.name = "ChppError";
    this.code = code;
    this.guid = guid;
  }
}
