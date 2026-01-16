import dotenv from 'dotenv';

// Load environment variables from .env (if present). Doing this in a shared module
// ensures every file (index.js, middleware, etc.) uses the same loaded values.
dotenv.config();

export const PORT = process.env.PORT || 3000;
export const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-change-me';
