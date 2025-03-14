import { Request, Response, NextFunction } from 'express';
import { storage } from './storage';

// Middleware to log API requests to activity log
export async function logActivity(req: Request, res: Response, next: NextFunction) {
  // Skip logging for certain endpoints
  const skipPaths = ['/api/auth/status', '/api/checks/status'];
  if (skipPaths.some(path => req.path.startsWith(path))) {
    return next();
  }
  
  const startTime = Date.now();
  
  // Store the original end method
  const originalEnd = res.end;
  
  // Override the end method
  res.end = function(chunk?: any, encoding?: any, callback?: any) {
    const duration = Date.now() - startTime;
    
    try {
      const userId = req.session?.user?.id;
      const ipAddress = req.ip || req.headers['x-forwarded-for'] || 'unknown';
      const action = `${req.method} ${req.path}`;
      const statusCode = res.statusCode;
      const details = `Status: ${statusCode}, Duration: ${duration}ms`;
      
      // Log activity asynchronously
      storage.createActivityLog({
        userId,
        action,
        details,
        ipAddress: typeof ipAddress === 'string' ? ipAddress : ipAddress[0]
      }).catch(error => {
        console.error('Error logging activity:', error);
      });
    } catch (error) {
      console.error('Error in activity logging middleware:', error);
    }
    
    // Call the original end method
    return originalEnd.call(this, chunk, encoding, callback);
  };
  
  next();
}

// Middleware to update user's last active timestamp
export async function updateLastActive(req: Request, res: Response, next: NextFunction) {
  try {
    if (req.session?.user?.id) {
      // Don't await, let it run asynchronously
      storage.updateUser(req.session.user.id, { lastActive: new Date() }).catch(error => {
        console.error('Error updating last active:', error);
      });
    }
  } catch (error) {
    // Just log the error, don't interrupt the request
    console.error('Error in updateLastActive middleware:', error);
  }
  
  next();
}

// Error handling middleware
export function errorHandler(err: Error, req: Request, res: Response, next: NextFunction) {
  console.error('Error:', err);
  
  // Get status code if available, default to 500
  const statusCode = res.statusCode !== 200 ? res.statusCode : 500;
  
  res.status(statusCode).json({
    message: err.message,
    stack: process.env.NODE_ENV === 'production' ? '🥞' : err.stack,
  });
}
