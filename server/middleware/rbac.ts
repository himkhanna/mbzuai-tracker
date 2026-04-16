import { Request, Response, NextFunction } from 'express';

/**
 * Role-based access control middleware factory.
 * Usage: router.get('/path', authenticate, requireRole('ADMIN', 'VENDOR_MANAGEMENT'), handler)
 */
export function requireRole(...roles: string[]) {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ error: 'Authentication required' });
      return;
    }

    if (!roles.includes(req.user.role)) {
      res.status(403).json({
        error: 'Forbidden',
        message: `This action requires one of the following roles: ${roles.join(', ')}`,
      });
      return;
    }

    next();
  };
}
