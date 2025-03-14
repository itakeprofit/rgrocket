import { compare, hash } from 'bcrypt';
import { storage } from './storage';
import { InsertUser, User, loginUserSchema } from '@shared/schema';
import { Request, Response, NextFunction } from 'express';

// Function to register a new user
export async function registerUser(userData: InsertUser): Promise<User | null> {
  try {
    // Check if username already exists
    const existingUser = await storage.getUserByUsername(userData.username);
    if (existingUser) {
      return null;
    }
    
    // Hash the password
    const hashedPassword = await hash(userData.password, 10);
    
    // Create the user with hashed password
    const user = await storage.createUser({
      ...userData,
      password: hashedPassword
    });
    
    // Return the user without the password
    const { password, ...userWithoutPassword } = user;
    return userWithoutPassword as User;
  } catch (error) {
    console.error('Error registering user:', error);
    return null;
  }
}

// Function to login a user
export async function loginUser(username: string, password: string): Promise<User | null> {
  try {
    // Validate login data
    const validationResult = loginUserSchema.safeParse({ username, password });
    if (!validationResult.success) {
      return null;
    }
    
    // Get user from storage
    const user = await storage.getUserByUsername(username);
    if (!user) {
      return null;
    }
    
    // Compare passwords
    const passwordMatches = await compare(password, user.password);
    if (!passwordMatches) {
      return null;
    }
    
    // Update last active timestamp
    await storage.updateUser(user.id, { lastActive: new Date() });
    
    // Return user without password
    const { password: _, ...userWithoutPassword } = user;
    return userWithoutPassword as User;
  } catch (error) {
    console.error('Error logging in user:', error);
    return null;
  }
}

// Middleware to check if user is authenticated
export function isAuthenticated(req: Request, res: Response, next: NextFunction) {
  if (req.session && req.session.user) {
    return next();
  }
  
  res.status(401).json({ message: 'Unauthorized' });
}

// Middleware to check if user is admin
export function isAdmin(req: Request, res: Response, next: NextFunction) {
  if (req.session && req.session.user && req.session.user.isAdmin) {
    return next();
  }
  
  res.status(403).json({ message: 'Forbidden' });
}
