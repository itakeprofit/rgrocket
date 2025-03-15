import { pgTable, text, serial, integer, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
});

export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;

// Email validation schemas
export const validateEmailResultSchema = z.object({
  email: z.string(),
  isValid: z.boolean(),
  reason: z.string().optional(),
  hasMxRecords: z.boolean().optional(),
  smtpVerified: z.boolean().optional(),
});

export type EmailValidationResult = z.infer<typeof validateEmailResultSchema>;
