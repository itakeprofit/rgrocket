import { pgTable, text, serial, integer, boolean, timestamp, pgEnum } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Role enum for user types
export const roleEnum = pgEnum('role', ['user', 'admin']);

// User status enum
export const userStatusEnum = pgEnum('status', ['active', 'inactive', 'suspended']);

// Check status enum
export const checkStatusEnum = pgEnum('check_status', ['pending', 'in_progress', 'completed', 'failed']);

// Users table
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  email: text("email").notNull().unique(),
  fullName: text("full_name"),
  role: roleEnum("role").default('user').notNull(),
  apiId: text("api_id"),
  apiHash: text("api_hash"),
  phoneNumber: text("phone_number"),
  status: userStatusEnum("status").default('active').notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Checks table
export const checks = pgTable("checks", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id),
  fileName: text("file_name"),
  totalNumbers: integer("total_numbers").notNull(),
  foundNumbers: integer("found_numbers").default(0),
  status: checkStatusEnum("status").default('pending').notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  completedAt: timestamp("completed_at"),
});

// Results table
export const results = pgTable("results", {
  id: serial("id").primaryKey(),
  checkId: integer("check_id").notNull().references(() => checks.id),
  phoneNumber: text("phone_number").notNull(),
  found: boolean("found").default(false).notNull(),
  telegramId: text("telegram_id"),
  username: text("username"),
  name: text("name"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Logs table
export const logs = pgTable("logs", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id),
  checkId: integer("check_id").references(() => checks.id),
  action: text("action").notNull(),
  details: text("details"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Settings table
export const settings = pgTable("settings", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id),
  batchSize: integer("batch_size").default(500).notNull(),
  timeout: integer("timeout").default(30).notNull(),
  retries: integer("retries").default(3).notNull(),
  logAllOperations: boolean("log_all_operations").default(true).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Insert schemas
export const insertUserSchema = createInsertSchema(users).omit({ 
  id: true, 
  createdAt: true 
});

export const insertCheckSchema = createInsertSchema(checks).omit({ 
  id: true, 
  foundNumbers: true, 
  createdAt: true, 
  completedAt: true 
});

export const insertResultSchema = createInsertSchema(results).omit({ 
  id: true, 
  createdAt: true 
});

export const insertLogSchema = createInsertSchema(logs).omit({ 
  id: true, 
  createdAt: true 
});

export const insertSettingsSchema = createInsertSchema(settings).omit({ 
  id: true, 
  createdAt: true, 
  updatedAt: true 
});

// Login schema
export const loginSchema = z.object({
  username: z.string().min(1),
  password: z.string().min(1),
  rememberMe: z.boolean().optional().default(false),
});

// Types
export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;

export type InsertCheck = z.infer<typeof insertCheckSchema>;
export type Check = typeof checks.$inferSelect;

export type InsertResult = z.infer<typeof insertResultSchema>;
export type Result = typeof results.$inferSelect;

export type InsertLog = z.infer<typeof insertLogSchema>;
export type Log = typeof logs.$inferSelect;

export type InsertSettings = z.infer<typeof insertSettingsSchema>;
export type Settings = typeof settings.$inferSelect;

export type Login = z.infer<typeof loginSchema>;
