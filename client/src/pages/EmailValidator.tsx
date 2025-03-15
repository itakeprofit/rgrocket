import { useState, useEffect } from "react";
import FileUploader from "@/components/FileUploader";
import ValidationProgress from "@/components/ValidationProgress";
import ValidationResults from "@/components/ValidationResults";
import { ValidationStats } from "@/types";
import { useToast } from "@/hooks/use-toast";

export default function EmailValidator() {
  const [view, setView] = useState<"upload" | "progress" | "results">("upload");
  const [file, setFile] = useState<File | null>(null);
  const [validationStats, setValidationStats] = useState<ValidationStats | null>(null);
  const [validEmails, setValidEmails] = useState<string[]>([]);
  const [invalidEmails, setInvalidEmails] = useState<Array<{ email: string; reason: string }>>([]);
  const [taskId, setTaskId] = useState<string | null>(null);
  const [progress, setProgress] = useState({
    current: 0,
    total: 0,
    percentage: 0,
    speed: 0,
    remainingTime: 0,
  });
  const { toast } = useToast();

  // Проверяем, есть ли сохранённый task ID в localStorage
  useEffect(() => {
    const savedTaskId = localStorage.getItem('emailValidationTaskId');
    if (savedTaskId) {
      // Если taskId найден, проверяем статус задачи
      checkTaskStatus(savedTaskId);
    }
  }, []);

  const handleFileSelected = (file: File) => {
    setFile(file);
    setView("progress");
    startValidation(file);
  };

  const handleCancelValidation = () => {
    setView("upload");
    setProgress({
      current: 0,
      total: 0,
      percentage: 0,
      speed: 0,
      remainingTime: 0,
    });

    // Удаляем задачу из localStorage при отмене
    if (taskId) {
      localStorage.removeItem('emailValidationTaskId');
      setTaskId(null);
    }
  };

  const handleStartNewValidation = () => {
    setView("upload");
    setFile(null);
    setValidationStats(null);
    setValidEmails([]);
    setInvalidEmails([]);
    setProgress({
      current: 0,
      total: 0,
      percentage: 0,
      speed: 0,
      remainingTime: 0,
    });

    // Очищаем ID задачи при начале новой валидации
    localStorage.removeItem('emailValidationTaskId');
    setTaskId(null);
  };

  // Функция для проверки статуса задачи
  const checkTaskStatus = async (taskId: string) => {
    try {
      const response = await fetch(`/api/validation-status/${taskId}`);

      if (!response.ok) {
        if (response.status === 404) {
          // Задача не найдена, возможно истекла
          localStorage.removeItem('emailValidationTaskId');
          setTaskId(null);
          return;
        }
        throw new Error("Error checking task status");
      }

      const taskStatus = await response.json();

      // Сохраняем ID задачи
      setTaskId(taskStatus.id);

      // Если задача еще выполняется, показываем прогресс
      if (taskStatus.isValidating) {
        setView("progress");
        setProgress({
          current: taskStatus.processed,
          total: taskStatus.total,
          percentage: taskStatus.progress,
          speed: 0, // Эту информацию получим через SSE
          remainingTime: 0, // Эту информацию получим через SSE
        });

        // Подключаемся к SSE для обновлений
        connectToEventSource(taskStatus.id);
      }
      // Если задача завершена, показываем результаты
      else if (taskStatus.total > 0) {
        setValidationStats(taskStatus.stats);

        // Получаем результаты по отдельному запросу
        //Removed redundant fetch call.  Data should be in taskStatus already.

        setView("results");
        setValidEmails(taskStatus.validEmails || []);
        setInvalidEmails(taskStatus.invalidEmails || []);
      }
    } catch (error) {
      console.error("Error checking task status:", error);
      localStorage.removeItem('emailValidationTaskId');
      setTaskId(null);
    }
  };

  // Подключение к SSE для получения обновлений
  const connectToEventSource = (taskId: string) => {
    const eventSource = new EventSource(`/api/validation-progress/${taskId}`);

    eventSource.onmessage = (event) => {
      const data = JSON.parse(event.data);

      if (data.type === "progress") {
        setProgress({
          current: data.processed,
          total: data.total,
          percentage: Math.round((data.processed / data.total) * 100),
          speed: data.speed,
          remainingTime: data.remainingTime,
        });
      } else if (data.type === "complete") {
        eventSource.close();
        setValidationStats(data.stats);
        if (data.validEmails && Array.isArray(data.validEmails)) {
          console.log(`SSE: Получено ${data.validEmails.length} валидных адресов`);
          setValidEmails(data.validEmails);
        }

        if (data.invalidEmails && Array.isArray(data.invalidEmails)) {
          setInvalidEmails(data.invalidEmails);
        }
        setView("results");

        // Завершенную задачу удаляем из localStorage
        localStorage.removeItem('emailValidationTaskId');
        setTaskId(null);
      }
    };

    eventSource.onerror = () => {
      console.error("EventSource connection error");
      eventSource.close();

      // Если соединение разорвано, пробуем обновить статус через 5 секунд
      setTimeout(() => {
        if (document.visibilityState !== 'hidden') {
          checkTaskStatus(taskId);
        }
      }, 5000);
    };

    return eventSource;
  };

  const startValidation = async (file: File) => {
    try {
      const formData = new FormData();
      formData.append("file", file);

      const response = await fetch("/api/validate-emails", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        throw new Error("Server error during validation");
      }

      // Получаем ID задачи
      const { taskId } = await response.json();

      // Сохраняем ID задачи
      setTaskId(taskId);
      localStorage.setItem('emailValidationTaskId', taskId);

      // Подключаемся к SSE для обновлений процесса
      connectToEventSource(taskId);

    } catch (error) {
      console.error("Error during validation:", error);
      toast({
        title: "Error",
        description: "Failed to start validation process. Please try again.",
        variant: "destructive"
      });
      setView("upload");
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-slate-100">
      <div className="w-full max-w-3xl bg-white rounded-lg shadow-md overflow-hidden">
        {/* Header */}
        <div className="bg-primary text-white p-4">
          <h1 className="text-xl font-bold text-center">Email Validator</h1>
          <p className="text-center text-sm opacity-90">Validate, clean, and optimize your email lists</p>
        </div>

        {/* Main Content */}
        <div className="p-6">
          {view === "upload" && <FileUploader onFileSelected={handleFileSelected} />}

          {view === "progress" && (
            <ValidationProgress
              progress={progress}
              onCancel={handleCancelValidation}
            />
          )}

          {view === "results" && validationStats && (
            <ValidationResults
              stats={validationStats}
              validEmails={validEmails}
              invalidEmails={invalidEmails}
              onStartNewValidation={handleStartNewValidation}
            />
          )}
        </div>
      </div>

      {/* Footer */}
      <div className="mt-4 text-sm text-slate-500 text-center">
        <p>Email Validator Tool — RFC Compliant</p>
      </div>
    </div>
  );
}