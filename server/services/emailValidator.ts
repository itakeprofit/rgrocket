import fs from "fs";
import readline from "readline";
import { EmailValidationResult } from "@shared/schema";
import * as dns from 'dns/promises';
import * as net from 'net';
import * as os from 'os';

// Lists of known domains to check against
const disposableDomains = [
  "tempmail.com", "temp-mail.org", "tempmail.net", "temp-mail.net",
  "mailinator.com", "guerrillamail.com", "10minutemail.com", "yopmail.com",
  "throwawaymail.com", "dispostable.com", "sharklasers.com", "trashmail.com",
  "mailnesia.com", "mailcatch.com", "maildrop.cc", "getnada.com",
  "tempinbox.com", "spamgourmet.com", "mytemp.email", "incognitomail.com",
  "mfsa.ru", "discardmail.com", "armyspy.com", "cuvox.de",
  "dayrep.com", "einrot.com", "fleckens.hu", "gustr.com",
  "teleworm.us", "superrito.com", "trbvm.com", "emailisvalid.com"
];

const spamTrapDomains = [
  "spam-trap.com", "spamcop.net", "spamex.com", "known-trap.com",
  "spam-detector.net", "honeypot.org", "spamtrap.io", "spamgourmet.org"
];

const inactivePatterns = [
  /unused\d+/i, // e.g. unused2015@domain.com
  /noreply@/i,
  /donotreply@/i,
  /no-reply@/i,
  /inactive@/i,
  /old-account/i
];

/**
 * Validates email syntax according to RFC 5322
 */
function isValidEmailSyntax(email: string): boolean {
  // RFC 5322 compatible regex for email validation
  const emailRegex = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;
  return emailRegex.test(email) && email.includes('.');
}

/**
 * Checks if the email is from a disposable domain
 */
function isDisposableEmail(email: string): boolean {
  const domain = email.split('@')[1]?.toLowerCase();
  return domain ? disposableDomains.includes(domain) : false;
}

/**
 * Checks if the email is a potential spam trap
 */
function isSpamTrap(email: string): boolean {
  const domain = email.split('@')[1]?.toLowerCase();
  return domain ? spamTrapDomains.includes(domain) : false;
}

/**
 * Checks if the email appears to be inactive
 */
function isInactiveEmail(email: string): boolean {
  return inactivePatterns.some(pattern => pattern.test(email));
}

/**
 * Checks if the email is a corporate email
 */
function isCorporateEmail(email: string): boolean {
  const domain = email.split('@')[1]?.toLowerCase();
  // This is a simplified check for corporate domains
  // In a real app, you would use a more sophisticated approach or a database of domains
  return domain ? !domain.endsWith('.com') && !domain.endsWith('.net') && !domain.endsWith('.org') : false;
}

/**
 * Checks if the domain has valid MX records for email delivery
 */
async function checkMxRecords(email: string): Promise<boolean> {
  try {
    const domain = email.split('@')[1];
    if (!domain) return false;
    
    // Attempt to resolve MX records for the domain
    const mxRecords = await dns.resolveMx(domain);
    return mxRecords.length > 0;
  } catch (error) {
    // If there's an error (no MX records or domain doesn't exist), return false
    return false;
  }
}

/**
 * Checks if the email address exists by connecting to the SMTP server
 * and attempting the RCPT TO command
 */
async function verifyEmailWithSmtp(email: string): Promise<{exists: boolean, reason?: string}> {
  try {
    const domain = email.split('@')[1];
    if (!domain) {
      return { exists: false, reason: "Invalid email format" };
    }
    
    // Get MX records for the domain
    const mxRecords = await dns.resolveMx(domain);
    if (!mxRecords || mxRecords.length === 0) {
      return { exists: false, reason: "No mail servers found for domain" };
    }
    
    // Sort MX records by priority (lowest first)
    mxRecords.sort((a, b) => a.priority - b.priority);
    
    // Try SMTP verification with the first mail server
    const mailServer = mxRecords[0].exchange;
    
    return new Promise((resolve) => {
      // Set a reasonable timeout
      const timeout = 10000; // 10 seconds
      const socket = net.createConnection(25, mailServer);
      
      // We'll track conversation state
      let step = 0;
      let error: any = null;
      let responseBuffer = '';
      
      // Set up timeout handler
      const timeoutId = setTimeout(() => {
        if (socket.writable) socket.write("QUIT\r\n");
        socket.end();
        resolve({ exists: false, reason: "Connection timeout" });
      }, timeout);
      
      // Handle errors
      socket.on('error', (err) => {
        clearTimeout(timeoutId);
        error = err;
        socket.end();
        resolve({ exists: false, reason: `Connection error: ${err.message}` });
      });
      
      // Handle data
      socket.on('data', (data) => {
        clearTimeout(timeoutId); // Reset timeout on activity
        
        responseBuffer += data.toString();
        
        // Check if we have a complete response line
        if (responseBuffer.endsWith('\r\n')) {
          const response = responseBuffer.trim();
          responseBuffer = ''; // Clear the buffer for next response
          
          // If response is an error (starts with 4xx or 5xx)
          if (/^[45]\d\d/.test(response)) {
            if (socket.writable) socket.write("QUIT\r\n");
            socket.end();
            
            if (step === 3 && response.startsWith('550')) {
              // 550 typically means user doesn't exist
              resolve({ exists: false, reason: "User doesn't exist" });
            } else {
              resolve({ exists: false, reason: `Server error: ${response}` });
            }
            return;
          }
          
          // Process based on conversation step
          switch (step) {
            case 0: // Connected, send HELO
              socket.write(`HELO ${os.hostname()}\r\n`);
              step++;
              break;
              
            case 1: // After HELO, send MAIL FROM
              socket.write(`MAIL FROM:<verify@example.com>\r\n`);
              step++;
              break;
              
            case 2: // After MAIL FROM, send RCPT TO
              socket.write(`RCPT TO:<${email}>\r\n`);
              step++;
              break;
              
            case 3: // RCPT TO was accepted, user exists
              if (socket.writable) socket.write("QUIT\r\n");
              socket.end();
              resolve({ exists: true });
              break;
          }
          
          // Reset timeout for next step
          setTimeout(() => {
            if (socket.writable) socket.write("QUIT\r\n");
            socket.end();
            resolve({ exists: false, reason: "Connection timeout during conversation" });
          }, timeout);
        }
      });
      
      // Handle connection close
      socket.on('close', () => {
        clearTimeout(timeoutId);
        if (!error && step < 3) {
          resolve({ exists: false, reason: "Connection closed prematurely" });
        }
      });
    });
  } catch (error: any) {
    return { exists: false, reason: `Verification error: ${error.message}` };
  }
}

/**
 * Validates a batch of emails
 */
export async function validateEmails(emails: string[]): Promise<EmailValidationResult[]> {
  const results = [];
  
  for (const email of emails) {
    // Check email syntax
    if (!isValidEmailSyntax(email)) {
      results.push({
        email,
        isValid: false,
        reason: "Syntax Error: Invalid email format",
        hasMxRecords: false
      });
      continue;
    }
    
    // Check for disposable email
    if (isDisposableEmail(email)) {
      results.push({
        email,
        isValid: false,
        reason: "Disposable Domain: Temporary email address",
        hasMxRecords: true // Disposable domains typically have MX records
      });
      continue;
    }
    
    // Check for spam trap
    if (isSpamTrap(email)) {
      results.push({
        email,
        isValid: false,
        reason: "Spam Trap: Known spam trap address",
        hasMxRecords: true // Spam traps typically have MX records
      });
      continue;
    }
    
    // Check for inactive email
    if (isInactiveEmail(email)) {
      results.push({
        email,
        isValid: false,
        reason: "Inactive Account: Email appears to be inactive",
        hasMxRecords: true // Inactive emails typically have MX records
      });
      continue;
    }
    
    // Check DNS MX records
    const hasMxRecords = await checkMxRecords(email);
    
    if (!hasMxRecords) {
      results.push({
        email,
        isValid: false,
        reason: "Invalid Domain: No MX records found",
        hasMxRecords: false
      });
      continue;
    }
    
    // Verify email exists with SMTP verification
    const smtpVerification = await verifyEmailWithSmtp(email);
    if (!smtpVerification.exists) {
      results.push({
        email,
        isValid: false,
        reason: `SMTP Verification Failed: ${smtpVerification.reason || 'Unknown reason'}`,
        hasMxRecords: true,
        smtpVerified: false
      });
      continue;
    }
    
    // If passed all checks, mark as valid
    results.push({
      email,
      isValid: true,
      hasMxRecords: true,
      smtpVerified: true
    });
  }
  
  return results;
}

/**
 * Process emails from a file using streams for memory efficiency
 */
export async function processEmails(
  filePath: string,
  onProgress: (email: string, result: EmailValidationResult) => void,
  onTotal: (total: number) => void,
  onComplete: () => void
): Promise<void> {
  // First count total emails in file
  let totalEmails = 0;
  const preReadStream = fs.createReadStream(filePath);
  const preLineReader = readline.createInterface({
    input: preReadStream,
    crlfDelay: Infinity
  });
  
  for await (const _ of preLineReader) {
    totalEmails++;
  }
  
  onTotal(totalEmails);
  
  // Now process each email
  const fileStream = fs.createReadStream(filePath);
  const lineReader = readline.createInterface({
    input: fileStream,
    crlfDelay: Infinity
  });
  
  for await (const line of lineReader) {
    const email = line.trim();
    
    if (email) {
      // Validate the email
      const [result] = await validateEmails([email]);
      
      // Report progress
      onProgress(email, result);
    }
  }
  
  // Signal completion
  onComplete();
}
