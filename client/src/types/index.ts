export interface ValidationStats {
  totalProcessed: number;
  valid: number;
  invalid: number;
  processingTime: string;
  invalidReasons: {
    syntax: number;
    spam: number;
    disposable: number;
    inactive: number;
    noMxRecords: number;
    smtpError: number;
  };
}

export interface EmailValidationResult {
  email: string;
  isValid: boolean;
  reason?: string;
  hasMxRecords?: boolean;
  smtpVerified?: boolean;
}

export interface ValidationProgressEvent {
  type: 'progress';
  processed: number;
  total: number;
  speed: number;
  remainingTime: number;
}

export interface ValidationCompleteEvent {
  type: 'complete';
  stats: ValidationStats;
  validEmails: string[];
  invalidEmails: { email: string; reason: string }[];
}
