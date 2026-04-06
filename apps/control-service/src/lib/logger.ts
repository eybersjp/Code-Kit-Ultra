import pino from 'pino';

const level = process.env.LOG_LEVEL || 'info';

export const logger = pino({
  level,
  transport: {
    target: 'pino-pretty',
    options: {
      colorize: true,
      singleLine: false,
    },
  },
  redact: {
    paths: ['token', 'password', 'secret', 'authorization', 'auth', 'sa_secret'],
    remove: true,
  },
});
