/**
 * Deno runtime type definitions for Edge Functions
 */

declare namespace Deno {
  interface Env {
    get(key: string): string | undefined;
  }
  const env: Env;
}

declare const Deno: typeof Deno;