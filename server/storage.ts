import { 
  users, type User, type InsertUser,
  checks, type Check, type InsertCheck,
  results, type Result, type InsertResult,
  logs, type Log, type InsertLog,
  settings, type Settings, type InsertSettings
} from "@shared/schema";

// Interface defining all storage operations
export interface IStorage {
  // User operations
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUser(id: number, user: Partial<User>): Promise<User | undefined>;
  
  // Check operations
  getCheck(id: number): Promise<Check | undefined>;
  getChecksByUserId(userId: number): Promise<Check[]>;
  createCheck(check: InsertCheck): Promise<Check>;
  updateCheck(id: number, check: Partial<Check>): Promise<Check | undefined>;
  deleteCheck(id: number): Promise<boolean>;
  
  // Result operations
  getResultsByCheckId(checkId: number): Promise<Result[]>;
  createResult(result: InsertResult): Promise<Result>;
  createResults(results: InsertResult[]): Promise<Result[]>;
  
  // Log operations
  getLogs(): Promise<Log[]>;
  getLogsByUserId(userId: number): Promise<Log[]>;
  getLogsByCheckId(checkId: number): Promise<Log[]>;
  createLog(log: InsertLog): Promise<Log>;
  
  // Settings operations
  getSettingsByUserId(userId: number): Promise<Settings | undefined>;
  createSettings(settings: InsertSettings): Promise<Settings>;
  updateSettings(id: number, settings: Partial<Settings>): Promise<Settings | undefined>;
}

// In-memory storage implementation
export class MemStorage implements IStorage {
  private users: Map<number, User>;
  private checks: Map<number, Check>;
  private results: Map<number, Result>;
  private logs: Map<number, Log>;
  private settings: Map<number, Settings>;
  
  private userIdCounter: number;
  private checkIdCounter: number;
  private resultIdCounter: number;
  private logIdCounter: number;
  private settingsIdCounter: number;

  constructor() {
    this.users = new Map();
    this.checks = new Map();
    this.results = new Map();
    this.logs = new Map();
    this.settings = new Map();
    
    this.userIdCounter = 1;
    this.checkIdCounter = 1;
    this.resultIdCounter = 1;
    this.logIdCounter = 1;
    this.settingsIdCounter = 1;
    
    // Add admin user by default
    this.createUser({
      username: 'admin',
      password: 'admin123', // In a real app, this would be hashed
      email: 'admin@example.com',
      fullName: 'Admin User',
      role: 'admin',
      status: 'active'
    });
  }

  // User operations
  async getUser(id: number): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.username.toLowerCase() === username.toLowerCase()
    );
  }

  async createUser(user: InsertUser): Promise<User> {
    const id = this.userIdCounter++;
    const timestamp = new Date();
    const newUser: User = { 
      ...user, 
      id, 
      createdAt: timestamp 
    };
    this.users.set(id, newUser);
    
    // Create default settings for the user
    this.createSettings({
      userId: id,
      batchSize: 500,
      timeout: 30,
      retries: 3,
      logAllOperations: true
    });
    
    return newUser;
  }

  async updateUser(id: number, userData: Partial<User>): Promise<User | undefined> {
    const user = this.users.get(id);
    if (!user) return undefined;
    
    const updatedUser = { ...user, ...userData };
    this.users.set(id, updatedUser);
    return updatedUser;
  }

  // Check operations
  async getCheck(id: number): Promise<Check | undefined> {
    return this.checks.get(id);
  }

  async getChecksByUserId(userId: number): Promise<Check[]> {
    return Array.from(this.checks.values())
      .filter(check => check.userId === userId)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  async createCheck(check: InsertCheck): Promise<Check> {
    const id = this.checkIdCounter++;
    const timestamp = new Date();
    const newCheck: Check = { 
      ...check, 
      id, 
      createdAt: timestamp, 
      foundNumbers: 0,
      completedAt: null
    };
    this.checks.set(id, newCheck);
    return newCheck;
  }

  async updateCheck(id: number, checkData: Partial<Check>): Promise<Check | undefined> {
    const check = this.checks.get(id);
    if (!check) return undefined;
    
    const updatedCheck = { ...check, ...checkData };
    this.checks.set(id, updatedCheck);
    return updatedCheck;
  }

  async deleteCheck(id: number): Promise<boolean> {
    // Delete associated results first
    const resultsToDelete = Array.from(this.results.values())
      .filter(result => result.checkId === id);
    
    for (const result of resultsToDelete) {
      this.results.delete(result.id);
    }
    
    return this.checks.delete(id);
  }

  // Result operations
  async getResultsByCheckId(checkId: number): Promise<Result[]> {
    return Array.from(this.results.values())
      .filter(result => result.checkId === checkId);
  }

  async createResult(result: InsertResult): Promise<Result> {
    const id = this.resultIdCounter++;
    const timestamp = new Date();
    const newResult: Result = { 
      ...result, 
      id, 
      createdAt: timestamp 
    };
    this.results.set(id, newResult);
    return newResult;
  }

  async createResults(resultsData: InsertResult[]): Promise<Result[]> {
    const createdResults: Result[] = [];
    
    for (const resultData of resultsData) {
      const newResult = await this.createResult(resultData);
      createdResults.push(newResult);
    }
    
    return createdResults;
  }

  // Log operations
  async getLogs(): Promise<Log[]> {
    return Array.from(this.logs.values())
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  async getLogsByUserId(userId: number): Promise<Log[]> {
    return Array.from(this.logs.values())
      .filter(log => log.userId === userId)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  async getLogsByCheckId(checkId: number): Promise<Log[]> {
    return Array.from(this.logs.values())
      .filter(log => log.checkId === checkId)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  async createLog(log: InsertLog): Promise<Log> {
    const id = this.logIdCounter++;
    const timestamp = new Date();
    const newLog: Log = { 
      ...log, 
      id, 
      createdAt: timestamp 
    };
    this.logs.set(id, newLog);
    return newLog;
  }

  // Settings operations
  async getSettingsByUserId(userId: number): Promise<Settings | undefined> {
    return Array.from(this.settings.values())
      .find(setting => setting.userId === userId);
  }

  async createSettings(settingsData: InsertSettings): Promise<Settings> {
    const id = this.settingsIdCounter++;
    const timestamp = new Date();
    const newSettings: Settings = { 
      ...settingsData, 
      id, 
      createdAt: timestamp, 
      updatedAt: timestamp 
    };
    this.settings.set(id, newSettings);
    return newSettings;
  }

  async updateSettings(id: number, settingsData: Partial<Settings>): Promise<Settings | undefined> {
    const existingSettings = this.settings.get(id);
    if (!existingSettings) return undefined;
    
    const timestamp = new Date();
    const updatedSettings = { 
      ...existingSettings, 
      ...settingsData,
      updatedAt: timestamp
    };
    this.settings.set(id, updatedSettings);
    return updatedSettings;
  }
}

// Export a singleton instance of the storage
export const storage = new MemStorage();
