/**
 * Custom validation error for consistent error handling.
 */
export class ValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ValidationError";
  }
}

/**
 * Collection of reusable validators.
 * Each validator throws ValidationError on failure.
 *
 * Usage:
 *   validators.required(reason, 'reason');
 *   validators.minLength(reason, 10, 'reason');
 *   validators.inEnum(mode, ['safe', 'balanced', 'god'], 'mode');
 */
export const validators = {
  /**
   * Validate that a value is defined and not empty.
   */
  required(
    value: any,
    fieldName: string,
    allowEmpty = false
  ): void {
    if (value === null || value === undefined) {
      throw new ValidationError(`${fieldName} is required`);
    }
    if (!allowEmpty && typeof value === "string" && value.trim() === "") {
      throw new ValidationError(`${fieldName} cannot be empty`);
    }
  },

  /**
   * Validate that a string has minimum length.
   */
  minLength(
    value: string,
    min: number,
    fieldName: string
  ): void {
    if (typeof value !== "string") {
      throw new ValidationError(`${fieldName} must be a string`);
    }
    if (value.length < min) {
      throw new ValidationError(
        `${fieldName} must be at least ${min} characters (got ${value.length})`
      );
    }
  },

  /**
   * Validate that a string has maximum length.
   */
  maxLength(
    value: string,
    max: number,
    fieldName: string
  ): void {
    if (typeof value !== "string") {
      throw new ValidationError(`${fieldName} must be a string`);
    }
    if (value.length > max) {
      throw new ValidationError(
        `${fieldName} must be at most ${max} characters (got ${value.length})`
      );
    }
  },

  /**
   * Validate that a value is one of allowed values.
   */
  inEnum(
    value: string,
    allowed: string[],
    fieldName: string
  ): void {
    if (!allowed.includes(value)) {
      throw new ValidationError(
        `${fieldName} must be one of: ${allowed.join(", ")} (got "${value}")`
      );
    }
  },

  /**
   * Validate that a value is a UUID.
   */
  isUUID(
    value: string,
    fieldName: string
  ): void {
    const uuidRegex =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(value)) {
      throw new ValidationError(`${fieldName} must be a valid UUID`);
    }
  },

  /**
   * Validate that a value is a valid email.
   */
  isEmail(
    value: string,
    fieldName: string
  ): void {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(value)) {
      throw new ValidationError(`${fieldName} must be a valid email address`);
    }
  },

  /**
   * Validate that a value is an integer within a range.
   */
  isIntInRange(
    value: number,
    min: number,
    max: number,
    fieldName: string
  ): void {
    if (!Number.isInteger(value)) {
      throw new ValidationError(`${fieldName} must be an integer`);
    }
    if (value < min || value > max) {
      throw new ValidationError(
        `${fieldName} must be between ${min} and ${max} (got ${value})`
      );
    }
  },

  /**
   * Validate that a value is a number within a range.
   */
  isNumberInRange(
    value: number,
    min: number,
    max: number,
    fieldName: string
  ): void {
    if (typeof value !== "number" || isNaN(value)) {
      throw new ValidationError(`${fieldName} must be a number`);
    }
    if (value < min || value > max) {
      throw new ValidationError(
        `${fieldName} must be between ${min} and ${max} (got ${value})`
      );
    }
  },

  /**
   * Validate that a value matches a regex pattern.
   */
  matches(
    value: string,
    pattern: RegExp,
    fieldName: string,
    patternDescription?: string
  ): void {
    if (!pattern.test(value)) {
      const description = patternDescription || pattern.source;
      throw new ValidationError(
        `${fieldName} must match pattern: ${description}`
      );
    }
  },

  /**
   * Validate that an object has all required fields.
   */
  hasAllFields(
    obj: Record<string, any>,
    requiredFields: string[],
    objectName: string
  ): void {
    const missing = requiredFields.filter((field) => !(field in obj));
    if (missing.length > 0) {
      throw new ValidationError(
        `${objectName} is missing required fields: ${missing.join(", ")}`
      );
    }
  },

  /**
   * Validate that an array has at least minimum length.
   */
  minArrayLength(
    array: any[],
    min: number,
    fieldName: string
  ): void {
    if (!Array.isArray(array)) {
      throw new ValidationError(`${fieldName} must be an array`);
    }
    if (array.length < min) {
      throw new ValidationError(
        `${fieldName} must have at least ${min} items (got ${array.length})`
      );
    }
  },

  /**
   * Validate that an array has at most maximum length.
   */
  maxArrayLength(
    array: any[],
    max: number,
    fieldName: string
  ): void {
    if (!Array.isArray(array)) {
      throw new ValidationError(`${fieldName} must be an array`);
    }
    if (array.length > max) {
      throw new ValidationError(
        `${fieldName} must have at most ${max} items (got ${array.length})`
      );
    }
  },
};

/**
 * Batch validate multiple fields.
 *
 * Usage:
 *   validateFields({
 *     reason: (v) => validators.required(v, 'reason'),
 *     mode: (v) => validators.inEnum(v, ['safe', 'balanced'], 'mode'),
 *   }, req.body);
 */
export function validateFields(
  validationRules: Record<string, (value: any) => void>,
  data: Record<string, any>
): void {
  for (const [fieldName, validator] of Object.entries(validationRules)) {
    try {
      validator(data[fieldName]);
    } catch (err: any) {
      throw new ValidationError(`Field "${fieldName}": ${err.message}`);
    }
  }
}
