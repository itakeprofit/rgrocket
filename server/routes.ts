import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import multer from "multer";
import { validateEmails, processEmails } from "./services/emailValidator";
import { z } from "zod";
import { validateEmailResultSchema } from "@shared/schema";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { dirname } from "path";

// For ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Set up multer for file uploads
const upload = multer({
  storage: multer.diskStorage({
    destination: (req, file, cb) => {
      const uploadsDir = path.join(__dirname, "../uploads");

      // Create directory if it doesn't exist
      if (!fs.existsSync(uploadsDir)) {
        fs.mkdirSync(uploadsDir, { recursive: true });
      }

      cb(null, uploadsDir);
    },
    filename: (req, file, cb) => {
      const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
      cb(null, uniqueSuffix + '-' + file.originalname);
    }
  }),
  limits: {
    fileSize: 30 * 1024 * 1024, // 30MB
  },
  fileFilter: (req, file, cb) => {
    // Accept only .txt and .csv
    if (file.mimetype === "text/plain" || file.mimetype === "text/csv" || 
        file.originalname.endsWith('.txt') || file.originalname.endsWith('.csv')) {
      cb(null, true);
    } else {
      cb(new Error("Only .txt and .csv files are allowed"));
    }
  }
});

// Импортируем p-limit для ограничения параллельных операций
import pLimit from 'p-limit';
import { createReadStream } from 'fs';
import readline from 'readline';

// Global variables for tracking validation progress
// Тип данных для задачи валидации
interface ValidationTask {
  id: string;
  processed: number;
  total: number;
  startTime: number;
  isValidating: boolean;
  results: {
    valid: string[];
    invalid: { email: string; reason: string }[];
    stats: {
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
      }
    }
  };
  clients: Set<any>;
  // Добавляем флаги для управления памятью
  batchSize: number;
  memoryOptimized: boolean;
}

// Хранилище задач валидации
const validationTasks = new Map<string, ValidationTask>();

// Функция для создания уникального ID
function generateTaskId(): string {
  return Date.now().toString(36) + Math.random().toString(36).substr(2, 5);
}

// Функция для создания новой задачи валидации
function createValidationTask(): ValidationTask {
  const taskId = generateTaskId();
  const task: ValidationTask = {
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
        processingTime: '',
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
    clients: new Set(),
    batchSize: 500, // Размер пакета для обработки
    memoryOptimized: false // Отключаем оптимизацию памяти для хранения всех адресов
  };

  validationTasks.set(taskId, task);
  return task;
}

// Очистка старых задач (задачи старше 24 часов)
setInterval(() => {
  const currentTime = Date.now();
  const oneDayInMillis = 24 * 60 * 60 * 1000;

  for (const [id, task] of validationTasks.entries()) {
    if (!task.isValidating && (currentTime - task.startTime) > oneDayInMillis) {
      validationTasks.delete(id);
    }
  }
}, 60 * 60 * 1000); // Проверка раз в час

export async function registerRoutes(app: Express): Promise<Server> {
  // API routes
  app.post('/api/validate-emails', upload.single('file'), async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ message: "No file uploaded" });
      }

      // Create a new validation task
      const task = createValidationTask();

      // Оптимизированный процесс валидации - используем потоковую обработку файла
      // и контроль количества параллельных задач
      const filePath = req.file.path;
      const limit = pLimit(50); // Ограничиваем количество параллельных операций

      // Подсчитываем общее количество адресов в файле
      const countLines = () => {
        return new Promise<number>((resolve) => {
          let lineCount = 0;
          const readStream = createReadStream(filePath, { encoding: 'utf8' });
          const rl = readline.createInterface({
            input: readStream,
            crlfDelay: Infinity
          });

          rl.on('line', () => {
            lineCount++;
          });

          rl.on('close', () => {
            resolve(lineCount);
          });
        });
      };

      // Запускаем подсчет строк и устанавливаем общее количество
      countLines().then(total => {
        task.total = total;

        // Начинаем процесс обработки
        const processFile = async () => {
          const readStream = createReadStream(filePath, { encoding: 'utf8' });
          const rl = readline.createInterface({
            input: readStream,
            crlfDelay: Infinity
          });

          const promises = [];
          const updateInterval = Math.max(1, Math.floor(total / 200)); // Обновление UI примерно 200 раз за весь процесс
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

                  // Обновляем статистику
                  task.processed++;
                  task.results.stats.totalProcessed++;

                  if (result.isValid) {
                    task.results.stats.valid++;

                    // Сохраняем все валидные адреса, отключаем оптимизацию памяти
                    task.results.valid.push(email);
                  } else {
                    task.results.stats.invalid++;

                    // Обновляем счетчики причин
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

                    // Сохраняем только первые 1000 невалидных адресов для отображения
                    if (task.results.invalid.length < 1000) {
                      task.results.invalid.push({
                        email,
                        reason: result.reason || "Unknown error"
                      });
                    }
                  }

                  // Сохраняем результат в хранилище
                  storage.saveValidationResult({
                    email,
                    isValid: result.isValid,
                    reason: result.reason,
                    hasMxRecords: result.hasMxRecords,
                    smtpVerified: result.smtpVerified
                  });

                  // Обновляем прогресс с подходящим интервалом, чтобы не перегружать клиента
                  const currentTime = Date.now();
                  if (batchCount >= task.batchSize || 
                      task.processed % updateInterval === 0 || 
                      currentTime - lastUpdateTime > 1000) {

                    batchCount = 0;
                    lastUpdateTime = currentTime;

                    // Рассчитываем скорость и оставшееся время
                    const elapsedSeconds = (currentTime - task.startTime) / 1000;
                    const speed = Math.round(task.processed / (elapsedSeconds || 1));
                    const remainingCount = task.total - task.processed;
                    const remainingTime = speed > 0 ? remainingCount / speed : 0;

                    // Отправляем обновление всем подключенным клиентам
                    task.clients.forEach(client => {
                      try {
                        client.write(`data: ${JSON.stringify({
                          type: "progress",
                          taskId: task.id,
                          processed: task.processed,
                          total: task.total,
                          speed,
                          remainingTime
                        })}\n\n`);
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

            // Периодически ждем выполнения части промисов, чтобы контролировать использование памяти
            if (promises.length >= 500) {
              await Promise.all(promises);
              promises.length = 0;
            }
          }

          // Ждем выполнения оставшихся промисов
          await Promise.all(promises);

          // Завершение процесса
          const elapsedSeconds = (Date.now() - task.startTime) / 1000;
          let processingTime;

          if (elapsedSeconds > 60) {
            const minutes = Math.floor(elapsedSeconds / 60);
            const seconds = Math.floor(elapsedSeconds % 60);
            processingTime = `${minutes}:${seconds.toString().padStart(2, '0')}`;
          } else {
            processingTime = `${Math.round(elapsedSeconds)} sec`;
          }

          // Обновляем статус валидации
          task.isValidating = false;
          task.results.stats.processingTime = processingTime;

          // Сохраняем результат
          validationTasks.set(task.id, task);

          // Уведомляем всех клиентов о завершении
          task.clients.forEach(client => {
            try {
              client.write(`data: ${JSON.stringify({
                type: "complete",
                taskId: task.id,
                stats: task.results.stats,
                validEmails: task.results.valid,
                invalidCount: task.results.invalid.length,
                invalidEmails: task.results.invalid.slice(0, 100)
              })}\n\n`);

              // Закрываем соединение
              client.end();
            } catch (err) {
              console.error("Error sending completion to client:", err);
            }
          });

          // Очищаем набор клиентов
          task.clients.clear();

          // Удаляем загруженный файл
          fs.unlink(filePath, (err) => {
            if (err) console.error("Error deleting file:", err);
          });

          console.log(`Validation task ${task.id} completed. Processed ${task.processed} emails.`);
        };

        // Запускаем процесс обработки
        processFile().catch(err => {
          console.error("Error in file processing:", err);
          task.isValidating = false;

          // Уведомляем клиентов об ошибке
          task.clients.forEach(client => {
            try {
              client.write(`data: ${JSON.stringify({
                type: "error",
                taskId: task.id,
                message: "Error processing file"
              })}\n\n`);

              client.end();
            } catch (error) {
              console.error("Error sending error to client:", error);
            }
          });
        });
      });

      // Возвращаем ID задачи клиенту
      res.status(200).json({ 
        message: "Validation started", 
        taskId: task.id 
      });
    } catch (error) {
      console.error("Error in /validate-emails:", error);
      res.status(500).json({ message: "Server error during validation" });
    }
  });

  // SSE endpoint for progress updates с task ID
  app.get('/api/validation-progress/:taskId', (req, res) => {
    const taskId = req.params.taskId;
    const task = validationTasks.get(taskId);

    if (!task) {
      return res.status(404).json({ message: "Task not found" });
    }

    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    // Add client to set of connected clients
    task.clients.add(res);

    // Send initial progress data
    const elapsedSeconds = (Date.now() - task.startTime) / 1000;
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
    })}\n\n`);

    // If validation is already complete, send completion event
    if (!task.isValidating && task.total > 0) {
      res.write(`data: ${JSON.stringify({
        type: "complete",
        taskId: task.id,
        stats: task.results.stats,
        validEmails: task.results.valid,
        invalidCount: task.results.invalid.length,
        invalidEmails: task.results.invalid.slice(0, 100)
      })}\n\n`);

      res.end();
    }

    // Handle client disconnect
    req.on('close', () => {
      task.clients.delete(res);
    });
  });

  // Получение статуса задачи
  app.get('/api/validation-status/:taskId', (req, res) => {
    const taskId = req.params.taskId;
    const task = validationTasks.get(taskId);

    if (!task) {
      return res.status(404).json({ message: "Task not found" });
    }

    // Формирование ответа со статусом задачи без ограничения на адреса
    const status = {
      id: task.id,
      isValidating: task.isValidating,
      processed: task.processed,
      total: task.total,
      progress: task.total > 0 ? Math.round((task.processed / task.total) * 100) : 0,
      startTime: task.startTime,
      stats: task.results.stats,
      validEmails: task.results.valid, // Добавим все валидные адреса
      invalidEmails: task.results.invalid.slice(0, 100) // Ограничиваем только невалидные
    };

    res.json(status);
  });

  // Получение всех активных задач
  app.get('/api/validation-tasks', (req, res) => {
    const tasks = [];

    for (const [id, task] of validationTasks.entries()) {
      tasks.push({
        id,
        isValidating: task.isValidating,
        processed: task.processed,
        total: task.total,
        progress: task.total > 0 ? Math.round((task.processed / task.total) * 100) : 0,
        startTime: task.startTime,
        elapsedTime: Date.now() - task.startTime
      });
    }

    res.json({ tasks });
  });

  // Endpoint to get single email validation result
  app.post('/api/validate-email', async (req, res) => {
    try {
      // Validate input
      const emailSchema = z.object({
        email: z.string().email(),
      });

      const result = emailSchema.safeParse(req.body);

      if (!result.success) {
        return res.status(400).json({ 
          message: "Invalid request format",
          errors: result.error.errors
        });
      }

      const { email } = result.data;

      // Validate the email
      const validationResult = await validateEmails([email]);

      // Return the result
      res.status(200).json(validationResult[0]);
    } catch (error) {
      console.error("Error in /validate-email:", error);
      res.status(500).json({ message: "Server error during validation" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}