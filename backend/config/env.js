import 'dotenv/config';
const isProduction = process.env.NODE_ENV === 'production';
if (isProduction && (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32)) throw new Error('JWT_SECRET must be at least 32 characters in production.');
if (isProduction && (!process.env.SESSION_SECRET || process.env.SESSION_SECRET.length < 32)) throw new Error('SESSION_SECRET must be at least 32 characters in production.');
export const env = { port: Number(process.env.PORT || 3000), appUrl: process.env.APP_URL || 'http://localhost:3000', jwtSecret: process.env.JWT_SECRET || 'development-only-change-me-please-123456', isProduction };
