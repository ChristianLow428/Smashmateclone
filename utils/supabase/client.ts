import {
  createClient as createSupabaseClient,
  SupabaseClient,
} from "@supabase/supabase-js";

let cachedClient: SupabaseClient | null = null;

export const createClient = () => {
  // Return cached client if already created
  if (cachedClient) {
    return cachedClient;
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    console.error("Missing Supabase environment variables:", {
      url: !!supabaseUrl,
      key: !!supabaseAnonKey,
    });
    throw new Error("Missing Supabase environment variables");
  }

  console.log("Creating Supabase client in utils/supabase/client.ts");
  cachedClient = createSupabaseClient(supabaseUrl, supabaseAnonKey);
  return cachedClient;
};
