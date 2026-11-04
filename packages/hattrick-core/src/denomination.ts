/**
 * Formats an enum value for a human or a language model as "name (n)",
 * matching the Go MCP's `plain()` serialization (e.g. "excellent (8)",
 * "Technical (1)"). Returns just the number when there is no name.
 */
export function denominate(name: string, value: number): string {
  return name ? `${name} (${value})` : String(value);
}
