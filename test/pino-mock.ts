// Mock pino logger for testing
const mockLog = {
  debug: () => {},
  info: () => {},
  warn: () => {},
  error: () => {},
  fatal: () => {},
  trace: () => {},
  child: () => mockLog,
};

export default function pino() {
  return mockLog;
}
