import type { ErrorRequestHandler } from 'express';
import { ZodError } from 'zod';
import { AppError } from '../utils/errors.js';

export const errorHandler: ErrorRequestHandler = (
  error: unknown,
  _req,
  res,
  _next,
) => {
  if (error instanceof ZodError) {
    const fields = Object.fromEntries(
      error.issues.map((issue) => [issue.path.join('.'), issue.message]),
    );
    res.status(400).json({
      error: {
        code: 'VALIDATION',
        message: 'Please check the details below.',
        fields,
      },
    });
  } else if (error instanceof AppError) {
    res
      .status(error.status)
      .json({ error: { code: error.code, message: error.message } });
  } else if (error instanceof SyntaxError && 'body' in error) {
    res.status(400).json({
      error: {
        code: 'INVALID_JSON',
        message: 'The request contains invalid JSON.',
      },
    });
  } else if (
    error &&
    typeof error === 'object' &&
    'type' in error &&
    error.type === 'entity.too.large'
  ) {
    res.status(413).json({
      error: { code: 'TOO_LARGE', message: 'The request is too large.' },
    });
  } else {
    // Never log requests, tokens, Google responses or contact records.
    console.error('Unexpected request failure');
    res.status(500).json({
      error: {
        code: 'INTERNAL',
        message: 'Something went wrong. Please try again.',
      },
    });
  }
};
