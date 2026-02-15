import { Request, Response, NextFunction } from 'express';

// Async handler to wrap async route handlers and catch errors
export const asyncHandler = (fn: Function) => {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};
