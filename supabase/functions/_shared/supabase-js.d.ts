/**
 * Type declarations for Supabase JS ESM import
 */

declare module 'https://esm.sh/@supabase/supabase-js@2.38.0' {
  export interface SupabaseClientOptions<
    SchemaName extends string = 'public',
    Schema extends GenericSchema = GenericSchema
  > {
    auth?: {
      autoRefreshToken?: boolean;
      persistSession?: boolean;
      detectSessionInUrl?: boolean;
      flowType?: 'implicit' | 'pkce';
    };
    realtime?: {
      params?: { [key: string]: string };
    };
    global?: {
      fetch?: (input: RequestInfo, init?: RequestInit) => Promise<Response>;
      headers?: { [key: string]: string };
    };
    db?: {
      schema?: SchemaName;
    };
  }

  export interface GenericSchema {
    [key: string]: {
      Row: { [key: string]: any };
      Insert: { [key: string]: any };
      Update: { [key: string]: any };
    };
  }

  export interface SupabaseClient<
    Database = any,
    SchemaName extends string = 'public',
    Schema extends GenericSchema = GenericSchema
  > {
    auth: {
      getUser: (jwt?: string) => Promise<{
        data: { user: any | null };
        error: any | null;
      }>;
      setSession: (session: {
        access_token: string;
        refresh_token: string;
      }) => Promise<{
        data: { session: any | null };
        error: any | null;
      }>;
    };
    from: <TableName extends keyof Schema>(
      table: TableName
    ) => {
      select: (columns?: string) => any;
      insert: (values: any) => any;
      update: (values: any) => any;
      delete: () => any;
      upsert: (values: any) => any;
      eq: (column: string, value: any) => any;
      single: () => any;
    };
    rpc: (functionName: string, args?: Record<string, any>) => Promise<{
      data: any;
      error: any | null;
    }>;
  }

  export function createClient<
    Database = any,
    SchemaName extends string = 'public',
    Schema extends GenericSchema = Database extends {
      [K in SchemaName]: { Tables: infer T }
    }
      ? T
      : GenericSchema
  >(
    supabaseUrl: string,
    supabaseKey: string,
    options?: SupabaseClientOptions<SchemaName, Schema>
  ): SupabaseClient<Database, SchemaName, Schema>;
}