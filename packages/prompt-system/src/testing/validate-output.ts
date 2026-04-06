import Ajv from 'ajv';
import type { ErrorObject } from 'ajv';

/**
 * A lazily-initialised AJV instance. Re-using a single instance across calls
 * avoids the overhead of re-compiling JSON-schema validators repeatedly.
 */
let ajvInstance: Ajv | null = null;

function getAjv(): Ajv {
  if (ajvInstance === null) {
    ajvInstance = new Ajv({
      allErrors: true,
      strict: false,
      coerceTypes: false,
    });
  }
  return ajvInstance;
}

/**
 * Validates an arbitrary `output` value against a JSON Schema object using AJV.
 *
 * @param output  The value to validate (model output, API response, etc.).
 * @param schema  A plain JSON Schema object (Draft-07 or compatible).
 * @returns       An object with a `valid` boolean and a `errors` string array.
 *                The `errors` array is empty when `valid` is `true`.
 */
export function validateOutputSchema(
  output: unknown,
  schema: object,
): { valid: boolean; errors: string[] } {
  const ajv = getAjv();

  // Compile (or retrieve cached) validator for this schema
  let validate: ReturnType<Ajv['compile']>;
  try {
    validate = ajv.compile(schema);
  } catch (err) {
    const message =
      err instanceof Error ? err.message : String(err);
    return {
      valid: false,
      errors: [`validateOutputSchema: failed to compile schema – ${message}`],
    };
  }

  const isValid = validate(output) as boolean;

  if (isValid) {
    return { valid: true, errors: [] };
  }

  const errors: string[] = (validate.errors as ErrorObject[]).map((e) => {
    const field = e.instancePath || '(root)';
    return `${field}: ${e.message ?? 'unknown error'}`;
  });

  return { valid: false, errors };
}
