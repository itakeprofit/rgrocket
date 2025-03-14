import { PhoneNumberCheckResult } from '@shared/types';

// Function to validate phone number format
export function validatePhoneNumber(phoneNumber: string): boolean {
  // Simple validation - check if the number has between 7 and 15 digits
  // In a real implementation, use a more sophisticated validation library
  const cleaned = phoneNumber.replace(/\D/g, '');
  return cleaned.length >= 7 && cleaned.length <= 15;
}

// Function to format phone number consistently
export function formatPhoneNumber(phoneNumber: string): string {
  // Remove all non-digit characters
  const cleaned = phoneNumber.replace(/\D/g, '');
  
  // Add + prefix if not present
  return cleaned.startsWith('+') ? cleaned : `+${cleaned}`;
}

// Function to parse a CSV or TXT file with phone numbers
export function parsePhoneNumbersFile(fileContent: string): string[] {
  // Split by newline, comma, or semicolon
  const lines = fileContent.split(/[\r\n,;]+/);
  
  // Filter out empty lines and validate/format each number
  return lines
    .map(line => line.trim())
    .filter(line => line.length > 0)
    .filter(validatePhoneNumber)
    .map(formatPhoneNumber);
}

// Function to convert check results to CSV format
export function resultsToCSV(results: PhoneNumberCheckResult[]): string {
  const headers = ['Phone Number', 'Status', 'Telegram ID', 'Username', 'Name', 'Error'];
  
  const rows = results.map(result => [
    result.phoneNumber,
    result.found ? 'Found' : 'Not Found',
    result.telegramId || '',
    result.username || '',
    result.name || '',
    result.error || ''
  ]);
  
  // Convert to CSV
  const csvContent = [
    headers.join(','),
    ...rows.map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
  ].join('\n');
  
  return csvContent;
}
