import { createClient } from "@supabase/supabase-js";
import { env } from "./env";

export const UPLOADED_PLAN_BUCKET = "uploaded-plans";

export const supabase = createClient(
  env.SUPABASE_URL,
  env.SUPABASE_SERVICE_ROLE_KEY
);
