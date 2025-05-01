import dotenv from "dotenv";

dotenv.config();

export const env = {
  OPENAI_API_KEY: process.env.OPENAI_API_KEY!,
  DATABASE_URL: process.env.DATABASE_URL!,
  GOOGLE_SEARCH_API_KEY: process.env.GOOGLE_SEARCH_API_KEY!,
  GOOGLE_CUSTOM_SEARCH_ENGINE_NAME:
    process.env.GOOGLE_CUSTOM_SEARCH_ENGINE_NAME!,
  MISTRAL_API_KEY: process.env.MISTRAL_API_KEY!,
  BRAVE_API_KEY: process.env.BRAVE_API_KEY!,
  REPLICATE_API_TOKEN: process.env.REPLICATE_API_TOKEN!,
  CONVERT_API_SECRET_KEY: process.env.CONVERT_API_SECRET_KEY!,
  SUPABASE_URL: process.env.SUPABASE_URL!,
  SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY!,
} as const;

if (Object.values(env).some((value) => !value)) {
  console.error(
    `Missing environment variables: ${Object.keys(env)
      .filter((key) => !env[key as keyof typeof env])
      .join(", ")}`
  );
}
