import pino from 'pino';

const level = process.env.LOG_LEVEL || 'info';

export const logger = pino({
  level,
  redact: {
    paths: ['token', 'password', 'secret', 'authorization', 'auth', 'sa_secret'],
    remove: true,
  },
});
