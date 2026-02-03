/**
 * @nlci/shared - Result Type
 *
 * A Result type for handling success/failure without exceptions.
 */

/**
 * Represents a successful result.
 */
export interface Ok<T> {
  readonly ok: true;
  readonly value: T;
}

/**
 * Represents a failed result.
 */
export interface Err<E> {
  readonly ok: false;
  readonly error: E;
}

/**
 * A Result type that is either Ok or Err.
 */
export type Result<T, E = Error> = Ok<T> | Err<E>;

/**
 * Creates a successful result.
 */
export function ok<T>(value: T): Ok<T> {
  return { ok: true, value };
}

/**
 * Creates a failed result.
 */
export function err<E>(error: E): Err<E> {
  return { ok: false, error };
}

/**
 * Type guard for Ok.
 */
export function isOk<T, E>(result: Result<T, E>): result is Ok<T> {
  return result.ok === true;
}

/**
 * Type guard for Err.
 */
export function isErr<T, E>(result: Result<T, E>): result is Err<E> {
  return result.ok === false;
}

/**
 * Unwraps a Result, throwing if it's an Err.
 */
export function unwrap<T, E>(result: Result<T, E>): T {
  if (isOk(result)) {
    return result.value;
  }
  throw result.error;
}

/**
 * Unwraps a Result, returning a default value if it's an Err.
 */
export function unwrapOr<T, E>(result: Result<T, E>, defaultValue: T): T {
  return isOk(result) ? result.value : defaultValue;
}

/**
 * Maps a Result's value if it's Ok.
 */
export function map<T, U, E>(
  result: Result<T, E>,
  fn: (value: T) => U,
): Result<U, E> {
  return isOk(result) ? ok(fn(result.value)) : result;
}

/**
 * Maps a Result's error if it's Err.
 */
export function mapErr<T, E, F>(
  result: Result<T, E>,
  fn: (error: E) => F,
): Result<T, F> {
  return isErr(result) ? err(fn(result.error)) : result;
}

/**
 * Chains Result operations.
 */
export function flatMap<T, U, E>(
  result: Result<T, E>,
  fn: (value: T) => Result<U, E>,
): Result<U, E> {
  return isOk(result) ? fn(result.value) : result;
}

/**
 * Wraps an async function that might throw in a Result.
 */
export async function tryAsync<T>(
  fn: () => Promise<T>,
): Promise<Result<T, Error>> {
  try {
    return ok(await fn());
  } catch (error) {
    return err(error instanceof Error ? error : new Error(String(error)));
  }
}

/**
 * Wraps a sync function that might throw in a Result.
 */
export function trySync<T>(fn: () => T): Result<T, Error> {
  try {
    return ok(fn());
  } catch (error) {
    return err(error instanceof Error ? error : new Error(String(error)));
  }
}
