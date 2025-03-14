export interface TelegramAccount {
  id: string;
  username?: string;
  name?: string;
}

export interface CheckStatus {
  id: number;
  progress: number;
  totalNumbers: number;
  processedNumbers: number;
  foundCount: number;
  notFoundCount: number;
  errorCount: number;
  status: string;
}

export interface PhoneNumberCheckResult {
  phoneNumber: string;
  found: boolean;
  telegramId?: string;
  username?: string;
  name?: string;
  error?: string;
}

export interface CheckSummary {
  id: number;
  name?: string;
  totalNumbers: number;
  foundCount: number;
  notFoundCount: number;
  errorCount: number;
  status: string;
  createdAt: string;
  duration?: number;
}

export interface CheckWithResults extends CheckSummary {
  results: PhoneNumberCheckResult[];
  chunks: CheckChunkSummary[];
  logs: string[];
}

export interface CheckChunkSummary {
  id: number;
  checkId: number;
  chunkNumber: number;
  totalNumbers: number;
  processedNumbers: number;
  status: string;
  createdAt: string;
  completedAt?: string;
}

export interface UserActivity {
  id: number;
  username?: string;
  action: string;
  details?: string;
  ipAddress?: string;
  createdAt: string;
}

export interface UserSummary {
  id: number;
  username: string;
  name?: string;
  email?: string;
  isAdmin: boolean;
  phone?: string;
  lastActive?: string;
  status: 'active' | 'inactive';
}

export interface UserStatsResponse {
  totalChecks: number;
  foundAccounts: number;
  notFoundAccounts: number;
  errors: number;
  recentChecks: CheckSummary[];
}

export interface TelegramApiSettings {
  apiId: string;
  apiHash: string;
  requestRateLimit: number;
  maxConcurrentSessions: number;
  autoRetry: boolean;
  maxRetryAttempts: number;
}
