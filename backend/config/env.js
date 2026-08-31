import 'dotenv/config';

const isProduction = process.env.NODE_ENV === 'production';

if (isProduction && (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32)) {
  throw new Error('JWT_SECRET must be at least 32 characters in production.');
}
if (isProduction && (!process.env.SESSION_SECRET || process.env.SESSION_SECRET.length < 32)) {
  throw new Error('SESSION_SECRET must be at least 32 characters in production.');
}

export const env = {
  port: Number(process.env.PORT || 3000),
  appUrl: process.env.APP_URL || 'http://localhost:3000',
  jwtSecret: process.env.JWT_SECRET || 'development-only-change-me-please-123456',
  isProduction,
  storageDriver: process.env.STORAGE_DRIVER || 'local',
  supabaseUrl: process.env.SUPABASE_URL || '',
  supabaseStorageKey: process.env.SUPABASE_STORAGE_KEY || '',
  supabaseStorageBucket: process.env.SUPABASE_STORAGE_BUCKET || 'certiverify',
};

if (env.storageDriver === 'supabase' && (!env.supabaseUrl || !env.supabaseStorageKey)) {
  throw new Error('SUPABASE_URL and SUPABASE_STORAGE_KEY are required when STORAGE_DRIVER=supabase.');
}
