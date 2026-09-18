export const config = {
  port: Number(process.env.PORT) || 2567,
  nodeEnv: process.env.NODE_ENV || 'development',
  jwtSecret:
    process.env.JWT_SECRET || (process.env.NODE_ENV === 'production' ? '' : 'dev-secret-change-me'),
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '7d',
  databaseUrl: process.env.DATABASE_URL || '',
  corsOrigin: process.env.CORS_ORIGIN || (process.env.NODE_ENV === 'production' ? '' : '*'),
} as const;

if (!config.jwtSecret) {
  throw new Error('JWT_SECRET environment variable is required in production.');
}

if (process.env.NODE_ENV === 'production' && !config.corsOrigin) {
  throw new Error('CORS_ORIGIN environment variable is required in production.');
}
