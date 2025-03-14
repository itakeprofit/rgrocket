import { IStorage } from '../storage';
import { createTelethonClient } from './telethonClient';
import { Check, CheckChunk, CheckResult } from '@shared/schema';
import { PhoneNumberCheckResult } from '@shared/types';
import { v4 as uuidv4 } from 'uuid';

export class TelegramChecker {
  private storage: IStorage;
  private activeChecks: Map<number, boolean> = new Map();
  
  constructor(storage: IStorage) {
    this.storage = storage;
  }
  
  // Start a check for a list of phone numbers
  async startCheck(checkId: number, phoneNumbers: string[]): Promise<boolean> {
    try {
      // Get the check from storage
      const check = await this.storage.getCheckById(checkId);
      if (!check) {
        throw new Error(`Check with ID ${checkId} not found`);
      }
      
      // Check if this check is already running
      if (this.activeChecks.has(checkId)) {
        throw new Error(`Check with ID ${checkId} is already running`);
      }
      
      // Mark check as running
      this.activeChecks.set(checkId, true);
      
      // Update check status to processing
      await this.storage.updateCheck(checkId, { status: 'processing' });
      
      // Split phone numbers into chunks of 500
      const chunks: string[][] = [];
      for (let i = 0; i < phoneNumbers.length; i += 500) {
        chunks.push(phoneNumbers.slice(i, i + 500));
      }
      
      // Create chunks in database
      for (let i = 0; i < chunks.length; i++) {
        await this.storage.createCheckChunk({
          checkId,
          chunkNumber: i + 1,
          totalNumbers: chunks[i].length
        });
      }
      
      // Get API settings for rate limiting
      const apiSettings = await this.storage.getApiSettings();
      const maxConcurrentSessions = apiSettings?.maxConcurrentSessions || 5;
      
      // Process each chunk asynchronously but with concurrency limit
      const chunksList = await this.storage.getCheckChunksByCheckId(checkId);
      
      // Process chunks in groups based on concurrency limit
      for (let i = 0; i < chunksList.length; i += maxConcurrentSessions) {
        const chunksToProcess = chunksList.slice(i, i + maxConcurrentSessions);
        await Promise.all(chunksToProcess.map(chunk => this.processChunk(check, chunk, chunks[chunk.chunkNumber - 1])));
      }
      
      // Mark check as completed
      const completedAt = new Date();
      const duration = Math.floor((completedAt.getTime() - check.createdAt.getTime()) / 1000);
      
      await this.storage.updateCheck(checkId, { 
        status: 'completed',
        completedAt,
        duration
      });
      
      // Remove from active checks
      this.activeChecks.delete(checkId);
      
      return true;
    } catch (error) {
      console.error(`Error starting check ${checkId}:`, error);
      
      // Update check status to error
      await this.storage.updateCheck(checkId, { status: 'error' });
      
      // Remove from active checks
      this.activeChecks.delete(checkId);
      
      return false;
    }
  }
  
  // Process a chunk of phone numbers
  private async processChunk(check: Check, chunk: CheckChunk, phoneNumbers: string[]): Promise<void> {
    try {
      // Update chunk status to processing
      await this.storage.updateCheckChunk(chunk.id, { status: 'processing' });
      
      // Create a telethon client
      const sessionName = `check_${check.id}_chunk_${chunk.chunkNumber}_${uuidv4()}`;
      const client = await createTelethonClient(sessionName);
      
      if (!client) {
        throw new Error('Failed to create Telethon client');
      }
      
      // Process each phone number in the chunk
      for (let i = 0; i < phoneNumbers.length; i++) {
        const phoneNumber = phoneNumbers[i];
        
        try {
          const result = await client.checkPhoneNumber(phoneNumber);
          
          // Create check result
          const checkResult: PhoneNumberCheckResult = {
            phoneNumber,
            found: result.found,
            telegramId: result.account?.id,
            username: result.account?.username,
            name: result.account?.name,
            error: result.error
          };
          
          await this.storage.createCheckResult({
            checkId: check.id,
            ...checkResult
          });
          
          // Update chunk progress
          await this.storage.updateCheckChunk(chunk.id, { 
            processedNumbers: i + 1
          });
          
          // Update check counts
          if (result.found) {
            await this.storage.updateCheck(check.id, { 
              foundCount: check.foundCount + 1
            });
            check.foundCount += 1;
          } else if (result.error) {
            await this.storage.updateCheck(check.id, { 
              errorCount: check.errorCount + 1
            });
            check.errorCount += 1;
          } else {
            await this.storage.updateCheck(check.id, { 
              notFoundCount: check.notFoundCount + 1
            });
            check.notFoundCount += 1;
          }
          
          // Add a small delay to avoid rate limiting
          await new Promise(resolve => setTimeout(resolve, 100));
        } catch (error) {
          console.error(`Error processing phone number ${phoneNumber}:`, error);
          
          // Create error result
          await this.storage.createCheckResult({
            checkId: check.id,
            phoneNumber,
            found: false,
            error: error instanceof Error ? error.message : 'Unknown error'
          });
          
          // Update check error count
          await this.storage.updateCheck(check.id, { 
            errorCount: check.errorCount + 1
          });
          check.errorCount += 1;
        }
      }
      
      // Update chunk as completed
      await this.storage.updateCheckChunk(chunk.id, { 
        status: 'completed',
        completedAt: new Date()
      });
    } catch (error) {
      console.error(`Error processing chunk ${chunk.id}:`, error);
      
      // Update chunk status to error
      await this.storage.updateCheckChunk(chunk.id, { status: 'error' });
      
      // Rethrow to notify the parent process
      throw error;
    }
  }
  
  // Stop a running check
  async stopCheck(checkId: number): Promise<boolean> {
    try {
      if (!this.activeChecks.has(checkId)) {
        return false;
      }
      
      // Mark check as cancelled
      await this.storage.updateCheck(checkId, { status: 'cancelled' });
      
      // Get all incomplete chunks
      const chunks = await this.storage.getCheckChunksByCheckId(checkId);
      const incompleteChunks = chunks.filter(chunk => 
        chunk.status !== 'completed' && chunk.status !== 'error'
      );
      
      // Mark incomplete chunks as cancelled
      for (const chunk of incompleteChunks) {
        await this.storage.updateCheckChunk(chunk.id, { status: 'cancelled' });
      }
      
      // Remove from active checks
      this.activeChecks.delete(checkId);
      
      return true;
    } catch (error) {
      console.error(`Error stopping check ${checkId}:`, error);
      return false;
    }
  }
  
  // Get the status of a check
  async getCheckStatus(checkId: number): Promise<{
    status: string;
    progress: number;
    processedNumbers: number;
    totalNumbers: number;
  }> {
    try {
      const check = await this.storage.getCheckById(checkId);
      if (!check) {
        throw new Error(`Check with ID ${checkId} not found`);
      }
      
      const chunks = await this.storage.getCheckChunksByCheckId(checkId);
      const processedNumbers = chunks.reduce((sum, chunk) => sum + chunk.processedNumbers, 0);
      const progress = Math.round((processedNumbers / check.totalNumbers) * 100);
      
      return {
        status: check.status,
        progress,
        processedNumbers,
        totalNumbers: check.totalNumbers
      };
    } catch (error) {
      console.error(`Error getting check status ${checkId}:`, error);
      return {
        status: 'error',
        progress: 0,
        processedNumbers: 0,
        totalNumbers: 0
      };
    }
  }
}
