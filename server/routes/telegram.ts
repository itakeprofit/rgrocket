import { Router, Request, Response } from 'express';
import { storage } from '../storage';
import { isAuthenticated } from '../auth';
import path from 'path';
import fs from 'fs';
import { spawn } from 'child_process';

const router = Router();

// Check if Telegram auth code is needed
router.get('/auth/status', isAuthenticated, async (req: Request, res: Response) => {
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
router.post('/auth', isAuthenticated, async (req: Request, res: Response) => {
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
    const scriptPath = path.join(__dirname, '..', 'pythonScripts', 'telegram_auth.py');
    
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

export default router;