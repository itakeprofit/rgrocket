import type { Express, Request, Response } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { z } from "zod";
import { spawn } from "child_process";
import path from "path";
import { fileURLToPath } from "url";
import fs from "fs";
import { 
  loginSchema, 
  insertUserSchema, 
  insertCheckSchema,
  insertLogSchema,
  insertSettingsSchema 
} from "@shared/schema";

// Get current directory
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Session storage
type UserSession = {
  id: number;
  username: string;
  role: string;
};

// In-memory session store
const sessions = new Map<string, UserSession>();

export async function registerRoutes(app: Express): Promise<Server> {
  // Authentication middleware
  const authenticate = (req: Request, res: Response, next: () => void) => {
    const sessionId = req.headers.authorization?.split(' ')[1];
    
    if (!sessionId || !sessions.has(sessionId)) {
      return res.status(401).json({ message: "Unauthorized" });
    }
    
    const userSession = sessions.get(sessionId);
    req.user = userSession;
    next();
  };
  
  // Check admin role middleware
  const checkAdmin = (req: Request, res: Response, next: () => void) => {
    if (req.user?.role !== 'admin') {
      return res.status(403).json({ message: "Access forbidden" });
    }
    next();
  };
  
  // AUTHENTICATION ROUTES
  
  // Login
  app.post('/api/auth/login', async (req: Request, res: Response) => {
    try {
      const credentials = loginSchema.parse(req.body);
      const user = await storage.getUserByUsername(credentials.username);
      
      // Simple password check (in a real app, should use proper hashing)
      if (!user || user.password !== credentials.password) {
        return res.status(401).json({ message: "Invalid credentials" });
      }
      
      // Generate session token
      const sessionId = Math.random().toString(36).substring(2, 15);
      const userSession: UserSession = {
        id: user.id,
        username: user.username,
        role: user.role
      };
      
      sessions.set(sessionId, userSession);
      
      await storage.createLog({
        userId: user.id,
        action: "Login",
        details: `User ${user.username} logged in${credentials.rememberMe ? ' (with remember me)' : ''}`
      });
      
      return res.status(200).json({
        token: sessionId,
        rememberMe: credentials.rememberMe,
        user: {
          id: user.id,
          username: user.username,
          email: user.email,
          fullName: user.fullName,
          role: user.role,
          apiId: user.apiId,
          apiHash: user.apiHash,
          phoneNumber: user.phoneNumber
        }
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: error.errors });
      }
      return res.status(500).json({ message: "Internal server error" });
    }
  });
  
  // Logout
  app.post('/api/auth/logout', authenticate, async (req: Request, res: Response) => {
    const sessionId = req.headers.authorization?.split(' ')[1];
    
    if (sessionId) {
      sessions.delete(sessionId);
    }
    
    await storage.createLog({
      userId: req.user?.id,
      action: "Logout",
      details: `User ${req.user?.username} logged out`
    });
    
    return res.status(200).json({ message: "Logged out successfully" });
  });
  
  // Get current user
  app.get('/api/auth/me', authenticate, async (req: Request, res: Response) => {
    const user = await storage.getUser(req.user?.id as number);
    
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }
    
    return res.status(200).json({
      id: user.id,
      username: user.username,
      email: user.email,
      fullName: user.fullName,
      role: user.role,
      apiId: user.apiId,
      apiHash: user.apiHash,
      phoneNumber: user.phoneNumber
    });
  });
  
  // USER ROUTES
  
  // Get all users (admin only)
  app.get('/api/users', authenticate, checkAdmin, async (req: Request, res: Response) => {
    try {
      // In a real app, we'd get from DB here
      // This is a workaround for in-memory storage
      const allUsers = [];
      for (let i = 1; i <= 100; i++) {
        const user = await storage.getUser(i);
        if (user) {
          allUsers.push({
            id: user.id,
            username: user.username,
            email: user.email,
            fullName: user.fullName,
            role: user.role,
            status: user.status,
            createdAt: user.createdAt
          });
        }
      }
      
      return res.status(200).json(allUsers);
    } catch (error) {
      return res.status(500).json({ message: "Internal server error" });
    }
  });
  
  // Create user
  app.post('/api/users', async (req: Request, res: Response) => {
    try {
      const userData = insertUserSchema.parse(req.body);
      
      // Check if username or email already exists
      const existingUser = await storage.getUserByUsername(userData.username);
      if (existingUser) {
        return res.status(409).json({ message: "Username already exists" });
      }
      
      const newUser = await storage.createUser(userData);
      
      await storage.createLog({
        userId: newUser.id,
        action: "Register",
        details: `New user ${newUser.username} registered`
      });
      
      return res.status(201).json({
        id: newUser.id,
        username: newUser.username,
        email: newUser.email,
        fullName: newUser.fullName,
        role: newUser.role
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: error.errors });
      }
      return res.status(500).json({ message: "Internal server error" });
    }
  });
  
  // Update user
  app.put('/api/users/:id', authenticate, async (req: Request, res: Response) => {
    try {
      const userId = parseInt(req.params.id);
      
      // Only allow users to update their own data unless admin
      if (req.user?.id !== userId && req.user?.role !== 'admin') {
        return res.status(403).json({ message: "Access forbidden" });
      }
      
      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      
      const updatedUser = await storage.updateUser(userId, req.body);
      
      await storage.createLog({
        userId: req.user?.id,
        action: "Update User",
        details: `User ${user.username} updated`
      });
      
      return res.status(200).json({
        id: updatedUser?.id,
        username: updatedUser?.username,
        email: updatedUser?.email,
        fullName: updatedUser?.fullName,
        role: updatedUser?.role,
        apiId: updatedUser?.apiId,
        apiHash: updatedUser?.apiHash,
        phoneNumber: updatedUser?.phoneNumber
      });
    } catch (error) {
      return res.status(500).json({ message: "Internal server error" });
    }
  });
  
  // SETTINGS ROUTES
  
  // Get user settings
  app.get('/api/settings', authenticate, async (req: Request, res: Response) => {
    try {
      const userId = req.user?.id as number;
      let settings = await storage.getSettingsByUserId(userId);
      
      if (!settings) {
        // Create default settings if none exist
        settings = await storage.createSettings({
          userId,
          batchSize: 500,
          timeout: 30,
          retries: 3,
          logAllOperations: true
        });
      }
      
      return res.status(200).json(settings);
    } catch (error) {
      return res.status(500).json({ message: "Internal server error" });
    }
  });
  
  // Update user settings
  app.put('/api/settings', authenticate, async (req: Request, res: Response) => {
    try {
      const userId = req.user?.id as number;
      const settingsData = insertSettingsSchema.partial().parse(req.body);
      
      // Ensure batch size doesn't exceed 500
      if (settingsData.batchSize && settingsData.batchSize > 500) {
        settingsData.batchSize = 500;
      }
      
      let settings = await storage.getSettingsByUserId(userId);
      
      if (!settings) {
        // Create new settings if none exist
        settings = await storage.createSettings({
          userId,
          ...settingsData
        });
      } else {
        // Update existing settings
        settings = await storage.updateSettings(settings.id, settingsData) as Settings;
      }
      
      await storage.createLog({
        userId,
        action: "Update Settings",
        details: `User ${req.user?.username} updated settings`
      });
      
      return res.status(200).json(settings);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: error.errors });
      }
      return res.status(500).json({ message: "Internal server error" });
    }
  });
  
  // CHECK ROUTES
  
  // Continue check after authentication
  app.post('/api/checks/:id/continue', authenticate, async (req: Request, res: Response) => {
    try {
      const checkId = parseInt(req.params.id);
      const check = await storage.getCheck(checkId);
      
      if (!check) {
        return res.status(404).json({ message: "Check not found" });
      }
      
      // Only allow users to continue their own checks unless admin
      if (check.userId !== req.user?.id && req.user?.role !== 'admin') {
        return res.status(403).json({ message: "Access forbidden" });
      }
      
      // Get user Telegram API settings
      const user = await storage.getUser(req.user?.id as number);
      if (!user || !user.apiId || !user.apiHash || !user.phoneNumber) {
        return res.status(400).json({ message: "Missing API settings" });
      }
      
      // TODO: In a real implementation, continue with the check process
      // This would use the existing check data and pick up where it left off
      
      // For now, we'll just update the check status
      await storage.updateCheck(checkId, {
        status: 'completed',
        completedAt: new Date()
      });
      
      await storage.createLog({
        userId: req.user?.id,
        checkId,
        action: "Continue Check",
        details: "Check continued after authentication"
      });
      
      return res.status(200).json({
        message: "Check continued successfully",
        checkId,
        totalNumbers: check.totalNumbers,
        foundNumbers: check.foundNumbers
      });
    } catch (error) {
      console.error("Error continuing check:", error);
      return res.status(500).json({ message: "Error continuing check" });
    }
  });
  
  // Upload file and create check
  app.post('/api/checks', authenticate, async (req: Request, res: Response) => {
    try {
      const userId = req.user?.id as number;
      const { fileName, numbers } = req.body;
      
      if (!Array.isArray(numbers) || numbers.length === 0) {
        return res.status(400).json({ message: "Invalid phone numbers" });
      }
      
      // Create new check
      const check = await storage.createCheck({
        userId,
        fileName,
        totalNumbers: numbers.length,
        status: 'pending'
      });
      
      await storage.createLog({
        userId,
        checkId: check.id,
        action: "Create Check",
        details: `User ${req.user?.username} created check with ${numbers.length} phone numbers`
      });
      
      // Get user Telegram API settings
      const user = await storage.getUser(userId);
      if (!user || !user.apiId || !user.apiHash || !user.phoneNumber) {
        await storage.updateCheck(check.id, {
          status: 'failed'
        });
        
        return res.status(400).json({ 
          message: "Missing Telegram API settings. Please update your API settings.",
          checkId: check.id
        });
      }
      
      // Check if we need Telegram authentication
      const sessionName = `user_${userId}`;
      const sessionFile = path.join(process.cwd(), `${sessionName}.session`);
      const needsAuth = !fs.existsSync(sessionFile);
      
      if (needsAuth) {
        // Return early with telegramAuth flag
        return res.status(200).json({
          message: "Telegram authentication required",
          checkId: check.id,
          telegramAuth: true
        });
      }
      
      // Get user settings for batch size
      const settings = await storage.getSettingsByUserId(userId);
      const batchSize = settings?.batchSize || 500;
      
      // Update check status to in_progress
      await storage.updateCheck(check.id, {
        status: 'in_progress'
      });
      
      // Split numbers into batches
      const batches = [];
      for (let i = 0; i < numbers.length; i += batchSize) {
        batches.push(numbers.slice(i, i + batchSize));
      }
      
      // Process batches sequentially
      let foundCount = 0;
      
      for (let i = 0; i < batches.length; i++) {
        const batch = batches[i];
        
        try {
          // Call Python script to check numbers
          const results = await checkTelegramAccounts(
            batch,
            user.apiId,
            user.apiHash,
            user.phoneNumber,
            settings?.timeout || 30
          );
          
          // Store results
          const resultsToInsert = results.map(result => ({
            checkId: check.id,
            phoneNumber: result.phoneNumber,
            found: result.found,
            telegramId: result.telegramId || null,
            username: result.username || null,
            name: result.name || null
          }));
          
          await storage.createResults(resultsToInsert);
          
          // Update found count
          foundCount += results.filter(r => r.found).length;
          
          // Update check progress
          await storage.updateCheck(check.id, {
            foundNumbers: foundCount
          });
          
          await storage.createLog({
            userId,
            checkId: check.id,
            action: "Process Batch",
            details: `Processed batch ${i + 1}/${batches.length} with ${results.filter(r => r.found).length} found accounts`
          });
        } catch (error) {
          console.error("Error processing batch:", error);
          
          await storage.createLog({
            userId,
            checkId: check.id,
            action: "Process Batch Error",
            details: `Error processing batch ${i + 1}/${batches.length}: ${error}`
          });
        }
      }
      
      // Update check status to completed
      await storage.updateCheck(check.id, {
        status: 'completed',
        foundNumbers: foundCount,
        completedAt: new Date()
      });
      
      await storage.createLog({
        userId,
        checkId: check.id,
        action: "Complete Check",
        details: `Check completed with ${foundCount} found accounts out of ${numbers.length} total`
      });
      
      return res.status(200).json({ 
        message: "Check completed successfully", 
        checkId: check.id,
        totalNumbers: numbers.length,
        foundNumbers: foundCount
      });
    } catch (error) {
      console.error("Error during check:", error);
      return res.status(500).json({ message: "Error processing phone numbers" });
    }
  });
  
  // Get all checks for user
  app.get('/api/checks', authenticate, async (req: Request, res: Response) => {
    try {
      const userId = req.user?.id as number;
      const checks = await storage.getChecksByUserId(userId);
      
      return res.status(200).json(checks);
    } catch (error) {
      return res.status(500).json({ message: "Internal server error" });
    }
  });
  
  // Get specific check
  app.get('/api/checks/:id', authenticate, async (req: Request, res: Response) => {
    try {
      const checkId = parseInt(req.params.id);
      const check = await storage.getCheck(checkId);
      
      if (!check) {
        return res.status(404).json({ message: "Check not found" });
      }
      
      // Only allow users to view their own checks unless admin
      if (check.userId !== req.user?.id && req.user?.role !== 'admin') {
        return res.status(403).json({ message: "Access forbidden" });
      }
      
      return res.status(200).json(check);
    } catch (error) {
      return res.status(500).json({ message: "Internal server error" });
    }
  });
  
  // Delete check
  app.delete('/api/checks/:id', authenticate, async (req: Request, res: Response) => {
    try {
      const checkId = parseInt(req.params.id);
      const check = await storage.getCheck(checkId);
      
      if (!check) {
        return res.status(404).json({ message: "Check not found" });
      }
      
      // Only allow users to delete their own checks unless admin
      if (check.userId !== req.user?.id && req.user?.role !== 'admin') {
        return res.status(403).json({ message: "Access forbidden" });
      }
      
      await storage.deleteCheck(checkId);
      
      await storage.createLog({
        userId: req.user?.id,
        action: "Delete Check",
        details: `Check #${checkId} deleted`
      });
      
      return res.status(200).json({ message: "Check deleted successfully" });
    } catch (error) {
      return res.status(500).json({ message: "Internal server error" });
    }
  });
  
  // RESULTS ROUTES
  
  // Get results for a specific check
  app.get('/api/checks/:id/results', authenticate, async (req: Request, res: Response) => {
    try {
      const checkId = parseInt(req.params.id);
      const check = await storage.getCheck(checkId);
      
      if (!check) {
        return res.status(404).json({ message: "Check not found" });
      }
      
      // Only allow users to view their own results unless admin
      if (check.userId !== req.user?.id && req.user?.role !== 'admin') {
        return res.status(403).json({ message: "Access forbidden" });
      }
      
      const results = await storage.getResultsByCheckId(checkId);
      
      return res.status(200).json(results);
    } catch (error) {
      return res.status(500).json({ message: "Internal server error" });
    }
  });
  
  // LOGS ROUTES
  
  // Get all logs (admin only)
  app.get('/api/logs', authenticate, checkAdmin, async (req: Request, res: Response) => {
    try {
      const logs = await storage.getLogs();
      return res.status(200).json(logs);
    } catch (error) {
      return res.status(500).json({ message: "Internal server error" });
    }
  });
  
  // Get logs for current user
  app.get('/api/my-logs', authenticate, async (req: Request, res: Response) => {
    try {
      const userId = req.user?.id as number;
      const logs = await storage.getLogsByUserId(userId);
      return res.status(200).json(logs);
    } catch (error) {
      return res.status(500).json({ message: "Internal server error" });
    }
  });
  
  // TELEGRAM AUTH ROUTES
  
  // Check Telegram auth status
  app.get('/api/telegram/auth/status', authenticate, async (req: Request, res: Response) => {
    try {
      const userId = req.user?.id as number;
      const user = await storage.getUser(userId);
      
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      
      if (!user.apiId || !user.apiHash || !user.phoneNumber) {
        return res.status(400).json({ message: "Missing Telegram API settings" });
      }
      
      // Check if the session file exists
      const sessionName = `user_${userId}`;
      const sessionFile = path.join(process.cwd(), `${sessionName}.session`);
      
      const sessionExists = fs.existsSync(sessionFile);
      
      return res.status(200).json({
        authenticated: sessionExists,
        phone: user.phoneNumber
      });
    } catch (error) {
      console.error("Error checking Telegram auth status:", error);
      return res.status(500).json({ message: "Internal server error" });
    }
  });
  
  // Submit Telegram auth code
  app.post('/api/telegram/auth', authenticate, async (req: Request, res: Response) => {
    try {
      const userId = req.user?.id as number;
      const { code } = req.body;
      
      if (!code) {
        return res.status(400).json({ message: "Auth code is required" });
      }
      
      const user = await storage.getUser(userId);
      
      if (!user || !user.apiId || !user.apiHash || !user.phoneNumber) {
        return res.status(400).json({ message: "Missing Telegram API settings" });
      }
      
      // Call Python script to authenticate
      const sessionName = `user_${userId}`;
      
      try {
        await authenticateTelegram(
          user.apiId,
          user.apiHash,
          user.phoneNumber,
          code,
          sessionName
        );
        
        await storage.createLog({
          userId,
          action: "Telegram Authentication",
          details: "User authenticated with Telegram"
        });
        
        return res.status(200).json({ success: true });
      } catch (error: any) {
        console.error("Telegram auth error:", error);
        
        await storage.createLog({
          userId,
          action: "Telegram Authentication Error",
          details: `Auth error: ${error.message}`
        });
        
        return res.status(400).json({ message: error.message });
      }
    } catch (error) {
      console.error("Error in Telegram auth:", error);
      return res.status(500).json({ message: "Internal server error" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}

// Function to authenticate with Telegram
async function authenticateTelegram(
  apiId: string,
  apiHash: string,
  phoneNumber: string,
  code: string,
  sessionName: string
): Promise<boolean> {
  return new Promise((resolve, reject) => {
    // Path to Python script
    const scriptPath = path.join(__dirname, 'pythonScripts', 'telegram_auth.py');
    
    // Create a Python process
    const pythonProcess = spawn('python3', [
      scriptPath,
      '--api-id', apiId,
      '--api-hash', apiHash,
      '--phone', phoneNumber,
      '--code', code,
      '--session', sessionName
    ]);
    
    let outputData = '';
    let errorData = '';
    
    pythonProcess.stdout.on('data', (data) => {
      outputData += data.toString();
    });
    
    pythonProcess.stderr.on('data', (data) => {
      errorData += data.toString();
    });
    
    pythonProcess.on('close', (code) => {
      if (code !== 0) {
        console.error('Python authentication process exited with code', code);
        console.error('Error:', errorData);
        return reject(new Error(`Authentication failed: ${errorData}`));
      }
      
      try {
        const result = JSON.parse(outputData);
        if (result.success) {
          resolve(true);
        } else {
          reject(new Error(result.error || "Authentication failed"));
        }
      } catch (error) {
        reject(new Error(`Failed to parse Python script output`));
      }
    });
  });
}

// Function to check Telegram accounts using Python script
async function checkTelegramAccounts(
  phoneNumbers: string[],
  apiId: string,
  apiHash: string,
  phoneNumber: string,
  timeout: number = 30
): Promise<any[]> {
  return new Promise((resolve, reject) => {
    // Create a file to store the numbers
    const tempFile = path.join(__dirname, `temp_${Date.now()}.json`);
    fs.writeFileSync(tempFile, JSON.stringify(phoneNumbers));
    
    // Path to Python script
    const scriptPath = path.join(__dirname, 'pythonScripts', 'telegram_checker.py');
    
    // Create a Python process
    const pythonProcess = spawn('python3', [
      scriptPath,
      '--api-id', apiId,
      '--api-hash', apiHash,
      '--phone', phoneNumber,
      '--input-file', tempFile,
      '--timeout', timeout.toString()
    ]);
    
    let outputData = '';
    let errorData = '';
    
    pythonProcess.stdout.on('data', (data) => {
      outputData += data.toString();
    });
    
    pythonProcess.stderr.on('data', (data) => {
      errorData += data.toString();
    });
    
    pythonProcess.on('close', (code) => {
      // Clean up the temp file
      try {
        fs.unlinkSync(tempFile);
      } catch (err) {
        console.error('Error deleting temp file:', err);
      }
      
      if (code !== 0) {
        console.error('Python process exited with code', code);
        console.error('Error:', errorData);
        return reject(new Error(`Python script exited with code ${code}: ${errorData}`));
      }
      
      try {
        const results = JSON.parse(outputData);
        resolve(results);
      } catch (error) {
        reject(new Error(`Failed to parse Python script output: ${error}`));
      }
    });
  });
}
