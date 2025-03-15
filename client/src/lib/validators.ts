import { z } from "zod";

export const emailSchema = z.string().email("Invalid email format");

// Used for client-side validation of individual emails
export function validateEmailSyntax(email: string): boolean {
  // Use the Zod schema to validate the email syntax
  const result = emailSchema.safeParse(email);
  return result.success;
}

// Email blacklist check
export function isDisposableEmail(email: string): boolean {
  // Get the domain part of the email
  const domain = email.split('@')[1]?.toLowerCase();
  
  if (!domain) return false;
  
  // Common disposable email domains
  const disposableDomains = [
    'tempmail.com', 'temp-mail.org', 'tempmail.net', 'temp-mail.net',
    'mailinator.com', 'guerrillamail.com', '10minutemail.com', 'yopmail.com',
    'throwawaymail.com', 'dispostable.com', 'sharklasers.com', 'trashmail.com',
    'mailnesia.com', 'mailcatch.com', 'maildrop.cc', 'getnada.com',
    'tempinbox.com', 'spamgourmet.com', 'mytemp.email', 'incognitomail.com',
    'mfsa.ru', 'discardmail.com', 'armyspy.com', 'cuvox.de',
    'dayrep.com', 'einrot.com', 'fleckens.hu', 'gustr.com',
    'teleworm.us', 'superrito.com', 'trbvm.com', 'emailisvalid.com'
  ];
  
  return disposableDomains.includes(domain);
}
