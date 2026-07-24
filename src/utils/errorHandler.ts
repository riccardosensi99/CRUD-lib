import type { NextFunction, Request, Response } from 'express';

export class AppError extends Error {
  readonly code: string;
  readonly statusCode: number;
  readonly details?: unknown;

  constructor(code: string, message: string, statusCode: number, details?: unknown) {
    super(message);
    this.name = 'AppError';
    this.code = code;
    this.statusCode = statusCode;
    this.details = details;
  }
}

export class EmailAlreadyExistsError extends AppError {
  constructor(message = 'Email already registered') {
    super('EMAIL_ALREADY_EXISTS', message, 409);
  }
}

export class InvalidCredentialsError extends AppError {
  constructor(message = 'Invalid credentials') {
    super('INVALID_CREDENTIALS', message, 401);
  }
}

export class UserNotFoundError extends AppError {
  constructor(message = 'User not found') {
    super('USER_NOT_FOUND', message, 404);
  }
}

export class TokenExpiredError extends AppError {
  constructor(message = 'Invalid or expired token') {
    super('TOKEN_EXPIRED', message, 401);
  }
}

export class ForbiddenError extends AppError {
  constructor(message = 'Forbidden') {
    super('FORBIDDEN', message, 403);
  }
}

export class NotConfiguredError extends AppError {
  constructor(message = 'This feature is not configured') {
    super('NOT_CONFIGURED', message, 501);
  }
}

export class ValidationError extends AppError {
  constructor(details: unknown, message = 'Validation failed') {
    super('VALIDATION_ERROR', message, 400, details);
  }
}

const KNOWN_SERVICE_ERRORS: Record<string, () => AppError> = {
  EMAIL_TAKEN: () => new EmailAlreadyExistsError(),
  INVALID_CREDENTIALS: () => new InvalidCredentialsError(),
  USER_NOT_FOUND: () => new UserNotFoundError(),
  INVALID_REFRESH_TOKEN: () => new TokenExpiredError('Invalid or expired refresh token'),
  REFRESH_TOKEN_REPLAYED: () => new TokenExpiredError('Invalid or expired refresh token'),
  INVALID_PASSWORD_RESET_TOKEN: () => new TokenExpiredError('Invalid or expired password reset token'),
  INVALID_EMAIL_VERIFICATION_TOKEN: () => new TokenExpiredError('Invalid or expired email verification token'),
  PASSWORD_RESET_UNSUPPORTED: () => new NotConfiguredError('Password reset is not configured'),
  EMAIL_VERIFICATION_UNSUPPORTED: () => new NotConfiguredError('Email verification is not configured'),
  OAUTH_UNSUPPORTED: () => new NotConfiguredError('OAuth sign-in is not configured'),
};

/**
 * Normalizes any thrown value (a service-layer Error, a ZodError, or an
 * already-typed AppError) into a single AppError shape carrying a stable
 * `code`, HTTP `statusCode`, and human-readable `message`.
 */
export function mapKnownError(err: unknown): AppError {
  if (err instanceof AppError) return err;

  if (err && typeof err === 'object' && 'issues' in err) {
    return new ValidationError((err as { issues: unknown }).issues);
  }

  const message = err instanceof Error ? err.message : undefined;
  const factory = message ? KNOWN_SERVICE_ERRORS[message] : undefined;
  if (factory) return factory();

  return new AppError('INTERNAL_ERROR', 'Internal server error', 500);
}

/** Writes a consistent `{ error: { code, message, details? } }` JSON response for an AppError. */
export function sendAppError(res: Response, err: unknown): void {
  const appError = mapKnownError(err);
  res.status(appError.statusCode).json({
    error: {
      code: appError.code,
      message: appError.message,
      ...(appError.details !== undefined ? { details: appError.details } : {}),
    },
  });
}

/** Express error-handling middleware. Mount last with `app.use(errorHandler)`. */
export function errorHandler(err: unknown, _req: Request, res: Response, _next: NextFunction): void {
  sendAppError(res, err);
}
