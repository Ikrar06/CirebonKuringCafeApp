/**
 * Type definitions for Deno runtime in Edge Functions
 * This provides TypeScript support for Deno globals
 */

declare global {
  namespace Deno {
    interface Env {
      get(key: string): string | undefined
    }
    
    const env: Env
  }
}

export {}