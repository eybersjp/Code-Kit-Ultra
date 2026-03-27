export class CodeKitError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly retryable = false
  ) {
    super(message);
    this.name = "CodeKitError";
  }
}

export class ConfigError extends CodeKitError {
  constructor(message: string) {
    super(message, "CONFIG_ERROR", false);
  }
}

export class TimeoutError extends CodeKitError {
  constructor(message: string) {
    super(message, "TIMEOUT", true);
  }
}

export class NetworkError extends CodeKitError {
  constructor(message: string) {
    super(message, "NETWORK_ERROR", true);
  }
}