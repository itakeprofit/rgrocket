import { validateEmailResultSchema } from "@shared/schema";
import type { EmailValidationResult } from "@shared/schema";

// modify the interface with any CRUD methods
// you might need

export interface IStorage {
  saveValidationResult(result: EmailValidationResult): Promise<void>;
  getValidationResult(email: string): Promise<EmailValidationResult | undefined>;
  getValidationStats(): Promise<{
    totalProcessed: number;
    valid: number;
    invalid: number;
    invalidReasons: {
      syntax: number;
      spam: number;
      disposable: number;
      inactive: number;
      noMxRecords: number;
      smtpError: number;
    };
  }>;
  clearValidationResults(): Promise<void>;
}

export class MemStorage implements IStorage {
  private validationResults: Map<string, EmailValidationResult>;
  private stats: {
    totalProcessed: number;
    valid: number;
    invalid: number;
    invalidReasons: {
      syntax: number;
      spam: number;
      disposable: number;
      inactive: number;
      noMxRecords: number;
      smtpError: number;
    };
  };

  constructor() {
    this.validationResults = new Map();
    this.stats = {
      totalProcessed: 0,
      valid: 0,
      invalid: 0,
      invalidReasons: {
        syntax: 0,
        spam: 0,
        disposable: 0,
        inactive: 0,
        noMxRecords: 0,
        smtpError: 0,
      },
    };
  }

  async saveValidationResult(result: EmailValidationResult): Promise<void> {
    this.validationResults.set(result.email, result);
    
    // Update stats
    this.stats.totalProcessed++;
    
    if (result.isValid) {
      this.stats.valid++;
    } else {
      this.stats.invalid++;
      
      // Update reason counts
      if (result.reason?.includes("Syntax")) {
        this.stats.invalidReasons.syntax++;
      } else if (result.reason?.includes("Spam")) {
        this.stats.invalidReasons.spam++;
      } else if (result.reason?.includes("Disposable")) {
        this.stats.invalidReasons.disposable++;
      } else if (result.reason?.includes("Inactive")) {
        this.stats.invalidReasons.inactive++;
      } else if (result.reason?.includes("No MX records")) {
        this.stats.invalidReasons.noMxRecords++;
      } else if (result.reason?.includes("SMTP Verification Failed")) {
        this.stats.invalidReasons.smtpError++;
      }
    }
  }

  async getValidationResult(email: string): Promise<EmailValidationResult | undefined> {
    return this.validationResults.get(email);
  }

  async getValidationStats(): Promise<{
    totalProcessed: number;
    valid: number;
    invalid: number;
    invalidReasons: {
      syntax: number;
      spam: number;
      disposable: number;
      inactive: number;
      noMxRecords: number;
      smtpError: number;
    };
  }> {
    return { ...this.stats };
  }

  async clearValidationResults(): Promise<void> {
    this.validationResults.clear();
    
    this.stats = {
      totalProcessed: 0,
      valid: 0,
      invalid: 0,
      invalidReasons: {
        syntax: 0,
        spam: 0,
        disposable: 0,
        inactive: 0,
        noMxRecords: 0,
        smtpError: 0,
      },
    };
  }
}

export const storage = new MemStorage();
