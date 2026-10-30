import { Request, Response, NextFunction } from 'express';
import { AppError } from '../types/index';

/**
 * Global Express error-handling middleware.
 *
 * Mapping strategy:
 *   AppError  → statusCode from the error, message from the error
 *   SyntaxError → 400, fixed "not valid JSON" message
 *   Any other  → 500, generic message
 *
 * Stack traces, SQL text, and file paths are never included in the response body.
 */
export function errorHandler(
  err: unknown,
  req: Request,
  res: Response,
  // next is required as the 4th parameter so Express recognises this as an error handler
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  next: NextFunction
): void {
  // Log the full error server-side for debugging — never forwarded to the client
  console.error('[errorHandler]', err);

  if (err instanceof AppError) {
    res.status(err.statusCode).json({ message: err.message });
    return;
  }

  if (err instanceof SyntaxError) {
    res.status(400).json({ message: 'Request body is not valid JSON.' });
    return;
  }

  res.status(500).json({ message: 'An unexpected error occurred.' });
}
