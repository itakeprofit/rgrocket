// server/index.ts
import express2 from "express";

// server/routes.ts
import { createServer } from "http";

// server/storage.ts
var MemStorage = class {
  validationResults;
  stats;
  constructor() {
    this.validationResults = /* @__PURE__ */ new Map();
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
        smtpError: 0
      }
    };
  }
  async saveValidationResult(result) {
    this.validationResults.set(result.email, result);
    this.stats.totalProcessed++;
    if (result.isValid) {
      this.stats.valid++;
    } else {
      this.stats.invalid++;
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
  async getValidationResult(email) {
    return this.validationResults.get(email);
  }
  async getValidationStats() {
    return { ...this.stats };
  }
  async clearValidationResults() {
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
        smtpError: 0
      }
    };
  }
};
var storage = new MemStorage();

// server/routes.ts
import multer from "multer";

// server/services/emailValidator.ts
import * as dns from "dns/promises";
import * as net from "net";
import * as os from "os";
var disposableDomains = [
  "tempmail.com",
  "temp-mail.org",
  "tempmail.net",
  "temp-mail.net",
  "mailinator.com",
  "guerrillamail.com",
  "10minutemail.com",
  "yopmail.com",
  "throwawaymail.com",
  "dispostable.com",
  "sharklasers.com",
  "trashmail.com",
  "mailnesia.com",
  "mailcatch.com",
  "maildrop.cc",
  "getnada.com",
  "tempinbox.com",
  "spamgourmet.com",
  "mytemp.email",
  "incognitomail.com",
  "mfsa.ru",
  "discardmail.com",
  "armyspy.com",
  "cuvox.de",
  "dayrep.com",
  "einrot.com",
  "fleckens.hu",
  "gustr.com",
  "teleworm.us",
  "superrito.com",
  "trbvm.com",
  "emailisvalid.com"
];
var spamTrapDomains = [
  "spam-trap.com",
  "spamcop.net",
  "spamex.com",
  "known-trap.com",
  "spam-detector.net",
  "honeypot.org",
  "spamtrap.io",
  "spamgourmet.org"
];
var inactivePatterns = [
  /unused\d+/i,
  // e.g. unused2015@domain.com
  /noreply@/i,
  /donotreply@/i,
  /no-reply@/i,
  /inactive@/i,
  /old-account/i
];
function isValidEmailSyntax(email) {
  const emailRegex = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;
  return emailRegex.test(email) && email.includes(".");
}
function isDisposableEmail(email) {
  const domain = email.split("@")[1]?.toLowerCase();
  return domain ? disposableDomains.includes(domain) : false;
}
function isSpamTrap(email) {
  const domain = email.split("@")[1]?.toLowerCase();
  return domain ? spamTrapDomains.includes(domain) : false;
}
function isInactiveEmail(email) {
  return inactivePatterns.some((pattern) => pattern.test(email));
}
async function checkMxRecords(email) {
  try {
    const domain = email.split("@")[1];
    if (!domain) return false;
    const mxRecords = await dns.resolveMx(domain);
    return mxRecords.length > 0;
  } catch (error) {
    return false;
  }
}
async function verifyEmailWithSmtp(email) {
  try {
    const domain = email.split("@")[1];
    if (!domain) {
      return { exists: false, reason: "Invalid email format" };
    }
    const mxRecords = await dns.resolveMx(domain);
    if (!mxRecords || mxRecords.length === 0) {
      return { exists: false, reason: "No mail servers found for domain" };
    }
    mxRecords.sort((a, b) => a.priority - b.priority);
    const mailServer = mxRecords[0].exchange;
    return new Promise((resolve) => {
      const timeout = 1e4;
      const socket = net.createConnection(25, mailServer);
      let step = 0;
      let error = null;
      let responseBuffer = "";
      const timeoutId = setTimeout(() => {
        if (socket.writable) socket.write("QUIT\r\n");
        socket.end();
        resolve({ exists: false, reason: "Connection timeout" });
      }, timeout);
      socket.on("error", (err) => {
        clearTimeout(timeoutId);
        error = err;
        socket.end();
        resolve({ exists: false, reason: `Connection error: ${err.message}` });
      });
      socket.on("data", (data) => {
        clearTimeout(timeoutId);
        responseBuffer += data.toString();
        if (responseBuffer.endsWith("\r\n")) {
          const response = responseBuffer.trim();
          responseBuffer = "";
          if (/^[45]\d\d/.test(response)) {
            if (socket.writable) socket.write("QUIT\r\n");
            socket.end();
            if (step === 3 && response.startsWith("550")) {
              resolve({ exists: false, reason: "User doesn't exist" });
            } else {
              resolve({ exists: false, reason: `Server error: ${response}` });
            }
            return;
          }
          switch (step) {
            case 0:
              socket.write(`HELO ${os.hostname()}\r
`);
              step++;
              break;
            case 1:
              socket.write(`MAIL FROM:<verify@example.com>\r
`);
              step++;
              break;
            case 2:
              socket.write(`RCPT TO:<${email}>\r
`);
              step++;
              break;
            case 3:
              if (socket.writable) socket.write("QUIT\r\n");
              socket.end();
              resolve({ exists: true });
              break;
          }
          setTimeout(() => {
            if (socket.writable) socket.write("QUIT\r\n");
            socket.end();
            resolve({ exists: false, reason: "Connection timeout during conversation" });
          }, timeout);
        }
      });
      socket.on("close", () => {
        clearTimeout(timeoutId);
        if (!error && step < 3) {
          resolve({ exists: false, reason: "Connection closed prematurely" });
        }
      });
    });
  } catch (error) {
    return { exists: false, reason: `Verification error: ${error.message}` };
  }
}
async function validateEmails(emails) {
  const results = [];
  for (const email of emails) {
    if (!isValidEmailSyntax(email)) {
      results.push({
        email,
        isValid: false,
        reason: "Syntax Error: Invalid email format",
        hasMxRecords: false
      });
      continue;
    }
    if (isDisposableEmail(email)) {
      results.push({
        email,
        isValid: false,
        reason: "Disposable Domain: Temporary email address",
        hasMxRecords: true
        // Disposable domains typically have MX records
      });
      continue;
    }
    if (isSpamTrap(email)) {
      results.push({
        email,
        isValid: false,
        reason: "Spam Trap: Known spam trap address",
        hasMxRecords: true
        // Spam traps typically have MX records
      });
      continue;
    }
    if (isInactiveEmail(email)) {
      results.push({
        email,
        isValid: false,
        reason: "Inactive Account: Email appears to be inactive",
        hasMxRecords: true
        // Inactive emails typically have MX records
      });
      continue;
    }
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
    const smtpVerification = await verifyEmailWithSmtp(email);
    if (!smtpVerification.exists) {
      results.push({
        email,
        isValid: false,
        reason: `SMTP Verification Failed: ${smtpVerification.reason || "Unknown reason"}`,
        hasMxRecords: true,
        smtpVerified: false
      });
      continue;
    }
    results.push({
      email,
      isValid: true,
      hasMxRecords: true,
      smtpVerified: true
    });
  }
  return results;
}

// server/routes.ts
import { z } from "zod";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { dirname } from "path";
import pLimit from "p-limit";
import { createReadStream } from "fs";
import readline from "readline";
var __filename = fileURLToPath(import.meta.url);
var __dirname = dirname(__filename);
var upload = multer({
  storage: multer.diskStorage({
    destination: (req, file, cb) => {
      const uploadsDir = path.join(__dirname, "../uploads");
      if (!fs.existsSync(uploadsDir)) {
        fs.mkdirSync(uploadsDir, { recursive: true });
      }
      cb(null, uploadsDir);
    },
    filename: (req, file, cb) => {
      const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
      cb(null, uniqueSuffix + "-" + file.originalname);
    }
  }),
  limits: {
    fileSize: 30 * 1024 * 1024
    // 30MB
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype === "text/plain" || file.mimetype === "text/csv" || file.originalname.endsWith(".txt") || file.originalname.endsWith(".csv")) {
      cb(null, true);
    } else {
      cb(new Error("Only .txt and .csv files are allowed"));
    }
  }
});
var validationTasks = /* @__PURE__ */ new Map();
function generateTaskId() {
  return Date.now().toString(36) + Math.random().toString(36).substr(2, 5);
}
function createValidationTask() {
  const taskId = generateTaskId();
  const task = {
    id: taskId,
    processed: 0,
    total: 0,
    startTime: Date.now(),
    isValidating: true,
    results: {
      valid: [],
      invalid: [],
      stats: {
        totalProcessed: 0,
        valid: 0,
        invalid: 0,
        processingTime: "",
        invalidReasons: {
          syntax: 0,
          spam: 0,
          disposable: 0,
          inactive: 0,
          noMxRecords: 0,
          smtpError: 0
        }
      }
    },
    clients: /* @__PURE__ */ new Set(),
    batchSize: 500,
    // Размер пакета для обработки
    memoryOptimized: false
    // Отключаем оптимизацию памяти для хранения всех адресов
  };
  validationTasks.set(taskId, task);
  return task;
}
setInterval(() => {
  const currentTime = Date.now();
  const oneDayInMillis = 24 * 60 * 60 * 1e3;
  for (const [id, task] of validationTasks.entries()) {
    if (!task.isValidating && currentTime - task.startTime > oneDayInMillis) {
      validationTasks.delete(id);
    }
  }
}, 60 * 60 * 1e3);
async function registerRoutes(app2) {
  app2.post("/api/validate-emails", upload.single("file"), async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ message: "No file uploaded" });
      }
      const task = createValidationTask();
      const filePath = req.file.path;
      const limit = pLimit(50);
      const countLines = () => {
        return new Promise((resolve) => {
          let lineCount = 0;
          const readStream = createReadStream(filePath, { encoding: "utf8" });
          const rl = readline.createInterface({
            input: readStream,
            crlfDelay: Infinity
          });
          rl.on("line", () => {
            lineCount++;
          });
          rl.on("close", () => {
            resolve(lineCount);
          });
        });
      };
      countLines().then((total) => {
        task.total = total;
        const processFile = async () => {
          const readStream = createReadStream(filePath, { encoding: "utf8" });
          const rl = readline.createInterface({
            input: readStream,
            crlfDelay: Infinity
          });
          const promises = [];
          const updateInterval = Math.max(1, Math.floor(total / 200));
          let lastUpdateTime = Date.now();
          let batchCount = 0;
          for await (const line of rl) {
            const email = line.trim();
            if (!email) continue;
            batchCount++;
            promises.push(
              limit(async () => {
                try {
                  const results = await validateEmails([email]);
                  const result = results[0];
                  task.processed++;
                  task.results.stats.totalProcessed++;
                  if (result.isValid) {
                    task.results.stats.valid++;
                    task.results.valid.push(email);
                  } else {
                    task.results.stats.invalid++;
                    if (result.reason?.includes("Syntax")) {
                      task.results.stats.invalidReasons.syntax++;
                    } else if (result.reason?.includes("Spam")) {
                      task.results.stats.invalidReasons.spam++;
                    } else if (result.reason?.includes("Disposable")) {
                      task.results.stats.invalidReasons.disposable++;
                    } else if (result.reason?.includes("Inactive")) {
                      task.results.stats.invalidReasons.inactive++;
                    } else if (result.reason?.includes("MX records")) {
                      task.results.stats.invalidReasons.noMxRecords++;
                    } else if (result.reason?.includes("SMTP Verification Failed")) {
                      task.results.stats.invalidReasons.smtpError++;
                    }
                    if (task.results.invalid.length < 1e3) {
                      task.results.invalid.push({
                        email,
                        reason: result.reason || "Unknown error"
                      });
                    }
                  }
                  storage.saveValidationResult({
                    email,
                    isValid: result.isValid,
                    reason: result.reason,
                    hasMxRecords: result.hasMxRecords,
                    smtpVerified: result.smtpVerified
                  });
                  const currentTime = Date.now();
                  if (batchCount >= task.batchSize || task.processed % updateInterval === 0 || currentTime - lastUpdateTime > 1e3) {
                    batchCount = 0;
                    lastUpdateTime = currentTime;
                    const elapsedSeconds2 = (currentTime - task.startTime) / 1e3;
                    const speed = Math.round(task.processed / (elapsedSeconds2 || 1));
                    const remainingCount = task.total - task.processed;
                    const remainingTime = speed > 0 ? remainingCount / speed : 0;
                    task.clients.forEach((client) => {
                      try {
                        client.write(`data: ${JSON.stringify({
                          type: "progress",
                          taskId: task.id,
                          processed: task.processed,
                          total: task.total,
                          speed,
                          remainingTime
                        })}

`);
                      } catch (err) {
                        console.error("Error sending to client:", err);
                        task.clients.delete(client);
                      }
                    });
                  }
                } catch (err) {
                  console.error(`Error processing email ${email}:`, err);
                }
              })
            );
            if (promises.length >= 500) {
              await Promise.all(promises);
              promises.length = 0;
            }
          }
          await Promise.all(promises);
          const elapsedSeconds = (Date.now() - task.startTime) / 1e3;
          let processingTime;
          if (elapsedSeconds > 60) {
            const minutes = Math.floor(elapsedSeconds / 60);
            const seconds = Math.floor(elapsedSeconds % 60);
            processingTime = `${minutes}:${seconds.toString().padStart(2, "0")}`;
          } else {
            processingTime = `${Math.round(elapsedSeconds)} sec`;
          }
          task.isValidating = false;
          task.results.stats.processingTime = processingTime;
          validationTasks.set(task.id, task);
          task.clients.forEach((client) => {
            try {
              client.write(`data: ${JSON.stringify({
                type: "complete",
                taskId: task.id,
                stats: task.results.stats,
                validEmails: task.results.valid,
                invalidCount: task.results.invalid.length,
                invalidEmails: task.results.invalid.slice(0, 100)
              })}

`);
              client.end();
            } catch (err) {
              console.error("Error sending completion to client:", err);
            }
          });
          task.clients.clear();
          fs.unlink(filePath, (err) => {
            if (err) console.error("Error deleting file:", err);
          });
          console.log(`Validation task ${task.id} completed. Processed ${task.processed} emails.`);
        };
        processFile().catch((err) => {
          console.error("Error in file processing:", err);
          task.isValidating = false;
          task.clients.forEach((client) => {
            try {
              client.write(`data: ${JSON.stringify({
                type: "error",
                taskId: task.id,
                message: "Error processing file"
              })}

`);
              client.end();
            } catch (error) {
              console.error("Error sending error to client:", error);
            }
          });
        });
      });
      res.status(200).json({
        message: "Validation started",
        taskId: task.id
      });
    } catch (error) {
      console.error("Error in /validate-emails:", error);
      res.status(500).json({ message: "Server error during validation" });
    }
  });
  app2.get("/api/validation-progress/:taskId", (req, res) => {
    const taskId = req.params.taskId;
    const task = validationTasks.get(taskId);
    if (!task) {
      return res.status(404).json({ message: "Task not found" });
    }
    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");
    task.clients.add(res);
    const elapsedSeconds = (Date.now() - task.startTime) / 1e3;
    const speed = Math.round(task.processed / (elapsedSeconds || 1));
    const remainingCount = task.total - task.processed;
    const remainingTime = speed > 0 ? remainingCount / speed : 0;
    res.write(`data: ${JSON.stringify({
      type: "progress",
      taskId: task.id,
      processed: task.processed,
      total: task.total,
      speed,
      remainingTime
    })}

`);
    if (!task.isValidating && task.total > 0) {
      res.write(`data: ${JSON.stringify({
        type: "complete",
        taskId: task.id,
        stats: task.results.stats,
        validEmails: task.results.valid,
        invalidCount: task.results.invalid.length,
        invalidEmails: task.results.invalid.slice(0, 100)
      })}

`);
      res.end();
    }
    req.on("close", () => {
      task.clients.delete(res);
    });
  });
  app2.get("/api/validation-status/:taskId", (req, res) => {
    const taskId = req.params.taskId;
    const task = validationTasks.get(taskId);
    if (!task) {
      return res.status(404).json({ message: "Task not found" });
    }
    const status = {
      id: task.id,
      isValidating: task.isValidating,
      processed: task.processed,
      total: task.total,
      progress: task.total > 0 ? Math.round(task.processed / task.total * 100) : 0,
      startTime: task.startTime,
      stats: task.results.stats,
      validEmails: task.results.valid,
      // Добавим все валидные адреса
      invalidEmails: task.results.invalid.slice(0, 100)
      // Ограничиваем только невалидные
    };
    res.json(status);
  });
  app2.get("/api/validation-tasks", (req, res) => {
    const tasks = [];
    for (const [id, task] of validationTasks.entries()) {
      tasks.push({
        id,
        isValidating: task.isValidating,
        processed: task.processed,
        total: task.total,
        progress: task.total > 0 ? Math.round(task.processed / task.total * 100) : 0,
        startTime: task.startTime,
        elapsedTime: Date.now() - task.startTime
      });
    }
    res.json({ tasks });
  });
  app2.post("/api/validate-email", async (req, res) => {
    try {
      const emailSchema = z.object({
        email: z.string().email()
      });
      const result = emailSchema.safeParse(req.body);
      if (!result.success) {
        return res.status(400).json({
          message: "Invalid request format",
          errors: result.error.errors
        });
      }
      const { email } = result.data;
      const validationResult = await validateEmails([email]);
      res.status(200).json(validationResult[0]);
    } catch (error) {
      console.error("Error in /validate-email:", error);
      res.status(500).json({ message: "Server error during validation" });
    }
  });
  const httpServer = createServer(app2);
  return httpServer;
}

// server/vite.ts
import express from "express";
import fs2 from "fs";
import path3, { dirname as dirname3 } from "path";
import { fileURLToPath as fileURLToPath3 } from "url";
import { createServer as createViteServer, createLogger } from "vite";

// vite.config.ts
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import themePlugin from "@replit/vite-plugin-shadcn-theme-json";
import path2, { dirname as dirname2 } from "path";
import runtimeErrorOverlay from "@replit/vite-plugin-runtime-error-modal";
import { fileURLToPath as fileURLToPath2 } from "url";
var __filename2 = fileURLToPath2(import.meta.url);
var __dirname2 = dirname2(__filename2);
var vite_config_default = defineConfig({
  plugins: [
    react(),
    runtimeErrorOverlay(),
    themePlugin(),
    ...process.env.NODE_ENV !== "production" && process.env.REPL_ID !== void 0 ? [
      await import("@replit/vite-plugin-cartographer").then(
        (m) => m.cartographer()
      )
    ] : []
  ],
  resolve: {
    alias: {
      "@": path2.resolve(__dirname2, "client", "src"),
      "@shared": path2.resolve(__dirname2, "shared")
    }
  },
  root: path2.resolve(__dirname2, "client"),
  build: {
    outDir: path2.resolve(__dirname2, "dist/public"),
    emptyOutDir: true
  }
});

// server/vite.ts
import { nanoid } from "nanoid";
var __filename3 = fileURLToPath3(import.meta.url);
var __dirname3 = dirname3(__filename3);
var viteLogger = createLogger();
function log(message, source = "express") {
  const formattedTime = (/* @__PURE__ */ new Date()).toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    hour12: true
  });
  console.log(`${formattedTime} [${source}] ${message}`);
}
async function setupVite(app2, server) {
  const serverOptions = {
    middlewareMode: true,
    hmr: { server },
    allowedHosts: true
  };
  const vite = await createViteServer({
    ...vite_config_default,
    configFile: false,
    customLogger: {
      ...viteLogger,
      error: (msg, options) => {
        viteLogger.error(msg, options);
        process.exit(1);
      }
    },
    server: serverOptions,
    appType: "custom"
  });
  app2.use(vite.middlewares);
  app2.use("*", async (req, res, next) => {
    const url = req.originalUrl;
    try {
      const clientTemplate = path3.resolve(
        __dirname3,
        "..",
        "client",
        "index.html"
      );
      let template = await fs2.promises.readFile(clientTemplate, "utf-8");
      template = template.replace(
        `src="/src/main.tsx"`,
        `src="/src/main.tsx?v=${nanoid()}"`
      );
      const page = await vite.transformIndexHtml(url, template);
      res.status(200).set({ "Content-Type": "text/html" }).end(page);
    } catch (e) {
      vite.ssrFixStacktrace(e);
      next(e);
    }
  });
}
function serveStatic(app2) {
  const distPath = path3.resolve(__dirname3, "public");
  if (!fs2.existsSync(distPath)) {
    throw new Error(
      `Could not find the build directory: ${distPath}, make sure to build the client first`
    );
  }
  app2.use(express.static(distPath));
  app2.use("*", (_req, res) => {
    res.sendFile(path3.resolve(distPath, "index.html"));
  });
}

// server/index.ts
var app = express2();
app.use(express2.json({ limit: "150mb" }));
app.use(express2.urlencoded({ extended: true, limit: "150mb" }));
app.use((req, res, next) => {
  const start = Date.now();
  const path4 = req.path;
  let capturedJsonResponse = void 0;
  const originalResJson = res.json;
  res.json = function(bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };
  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path4.startsWith("/api")) {
      let logLine = `${req.method} ${path4} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }
      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "\u2026";
      }
      log(logLine);
    }
  });
  next();
});
(async () => {
  const server = await registerRoutes(app);
  app.use((err, _req, res, _next) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";
    res.status(status).json({ message });
    throw err;
  });
  if (app.get("env") === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }
  const port = 5e3;
  server.listen({
    port,
    host: "0.0.0.0",
    reusePort: true
  }, () => {
    log(`serving on port ${port}`);
  });
})();
