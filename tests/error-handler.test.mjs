import assert from 'node:assert/strict';
import test from 'node:test';
import { z } from 'zod';

test('formatZodIssues flattens Zod issues into field/message pairs', async () => {
  const { formatZodIssues } = await import('../dist/utils/errorHandler.js');
  const schema = z.object({ email: z.string().email(), password: z.string().min(8) });

  const result = schema.safeParse({ email: 'not-an-email', password: '123' });
  assert.equal(result.success, false);

  const details = formatZodIssues(result.error.issues);
  assert.deepEqual(details, [
    { field: 'email', message: 'Invalid email' },
    { field: 'password', message: 'String must contain at least 8 character(s)' },
  ]);
});

test('mapKnownError turns a ZodError into a VALIDATION_ERROR AppError with formatted details', async () => {
  const { mapKnownError } = await import('../dist/utils/errorHandler.js');
  const schema = z.object({ email: z.string().email() });

  const result = schema.safeParse({ email: 'nope' });
  const appError = mapKnownError(result.error);

  assert.equal(appError.code, 'VALIDATION_ERROR');
  assert.equal(appError.statusCode, 400);
  assert.deepEqual(appError.details, [{ field: 'email', message: 'Invalid email' }]);
});

test('mapKnownError maps known service error messages to typed errors', async () => {
  const { mapKnownError } = await import('../dist/utils/errorHandler.js');

  const emailTaken = mapKnownError(new Error('EMAIL_TAKEN'));
  assert.equal(emailTaken.code, 'EMAIL_ALREADY_EXISTS');
  assert.equal(emailTaken.statusCode, 409);

  const unknown = mapKnownError(new Error('SOMETHING_UNEXPECTED'));
  assert.equal(unknown.code, 'INTERNAL_ERROR');
  assert.equal(unknown.statusCode, 500);
});
