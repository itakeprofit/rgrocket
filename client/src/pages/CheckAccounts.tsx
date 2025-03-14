import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";
import { Result } from "@shared/schema";
import { createCheck, getCheck, getCheckResults } from "@/lib/api";
import { useTelegramCheck } from "@/hooks/useTelegramCheck";
import FileUploader from "@/components/checker/FileUploader";
import CheckProgress from "@/components/checker/CheckProgress";
import ResultsTable from "@/components/checker/ResultsTable";
import TelegramAuthModal from "@/components/checker/TelegramAuthModal";

export default function CheckAccounts() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [location, setLocation] = useLocation();
  
  // Check if viewing a specific check from history
  const checkId = new URLSearchParams(location.split("?")[1]).get("check");
  
  // State for tracking the check process
  const [checkState, setCheckState] = useState<"upload" | "progress" | "results">("upload");
  const [currentCheckId, setCurrentCheckId] = useState<number | null>(checkId ? parseInt(checkId) : null);
  const [phoneNumbers, setPhoneNumbers] = useState<string[]>([]);
  const [fileName, setFileName] = useState<string>("");
  const [isPaused, setIsPaused] = useState(false);
  
  // Telegram authentication state
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [pendingCheckData, setPendingCheckData] = useState<any>(null);
  
  // Progress stats
  const [progressStats, setProgressStats] = useState({
    totalBatches: 0,
    processedBatches: 0,
    totalNumbers: 0,
    processedNumbers: 0,
    numbersInBatch: 500,
    foundNumbers: 0,
    startTime: new Date(),
    estimatedEndTime: new Date(),
  });
  
  // Calculate progress percentages
  const overallProgress = progressStats.totalBatches > 0 
    ? (progressStats.processedBatches / progressStats.totalBatches) * 100 
    : 0;
    
  const batchProgress = progressStats.numbersInBatch > 0
    ? ((progressStats.processedNumbers % progressStats.numbersInBatch) / progressStats.numbersInBatch) * 100
    : 0;
  
  // Fetch check data if viewing from history
  const { data: checkData } = useQuery({
    queryKey: ['/api/checks', currentCheckId],
    enabled: !!currentCheckId && checkState !== "progress",
  });
  
  // Fetch results if available
  const { data: results = [] } = useQuery<Result[]>({
    queryKey: ['/api/checks', currentCheckId, 'results'],
    enabled: !!currentCheckId && (checkData?.status === "completed" || checkState === "results"),
  });
  
  // Start check mutation
  const startCheck = useMutation({
    mutationFn: (data: { fileName: string, numbers: string[] }) => {
      return createCheck(data);
    },
    onSuccess: (data) => {
      setCurrentCheckId(data.checkId);
      
      // Check if Telegram authentication is required
      if (data.telegramAuth) {
        setPendingCheckData(data);
        setIsAuthModalOpen(true);
        toast({
          title: "Telegram Authentication Required",
          description: "Please enter the code sent to your Telegram account",
        });
        return;
      }
      
      toast({
        title: "Check started",
        description: `Processing ${phoneNumbers.length} phone numbers`,
      });
      
      // Set up simulation for progress updates
      simulateProgressUpdates(phoneNumbers.length);
      
      queryClient.invalidateQueries({ queryKey: ['/api/checks'] });
    },
    onError: (error: any) => {
      console.error("Error starting check:", error);
      
      // Check if the error is due to missing API settings
      if (error.response?.status === 400 && error.response?.data?.message?.includes("API settings")) {
        toast({
          title: "Missing API Settings",
          description: "Please set up your Telegram API settings in the Settings page",
          variant: "destructive",
        });
      } else {
        toast({
          title: "Error",
          description: "Failed to start the check. Please try again.",
          variant: "destructive",
        });
      }
      
      setCheckState("upload");
    },
  });
  
  // Handle file loaded from uploader
  const handleFileLoad = (name: string, numbers: string[]) => {
    setFileName(name);
    setPhoneNumbers(numbers);
    
    // Calculate batches and update stats
    const batchSize = 500;
    const totalBatches = Math.ceil(numbers.length / batchSize);
    
    setProgressStats({
      ...progressStats,
      totalBatches,
      totalNumbers: numbers.length,
      numbersInBatch: batchSize,
      startTime: new Date(),
      estimatedEndTime: new Date(Date.now() + (totalBatches * 2 * 60 * 1000)), // 2 min per batch
    });
    
    // Start the check
    startCheck.mutate({ fileName: name, numbers });
    setCheckState("progress");
  };
  
  // Simulate progress updates (this would be replaced by real-time updates in production)
  const simulateProgressUpdates = (totalNumbers: number) => {
    const batchSize = 500;
    const totalBatches = Math.ceil(totalNumbers / batchSize);
    const processTimePerNumber = 250; // ms per number
    
    let processedNumbers = 0;
    let foundNumbers = 0;
    let processedBatches = 0;
    
    const intervalId = setInterval(() => {
      if (isPaused) return;
      
      // Increment numbers processed
      processedNumbers += 5;
      
      // Randomly increment found numbers (60-80% success rate)
      const successRate = 0.6 + Math.random() * 0.2;
      foundNumbers = Math.floor(processedNumbers * successRate);
      
      // Update batch count
      processedBatches = Math.floor(processedNumbers / batchSize);
      
      // Update progress stats
      setProgressStats(prev => ({
        ...prev,
        processedNumbers,
        processedBatches,
        foundNumbers,
      }));
      
      // Check if complete
      if (processedNumbers >= totalNumbers) {
        clearInterval(intervalId);
        setCheckState("results");
        
        // Simulate results fetch
        queryClient.invalidateQueries({ queryKey: ['/api/checks', currentCheckId, 'results'] });
      }
    }, 500);
    
    // Cleanup
    return () => clearInterval(intervalId);
  };
  
  // Handle pause/resume
  const handlePause = () => {
    setIsPaused(prev => !prev);
  };
  
  // Handle cancel
  const handleCancel = () => {
    if (confirm("Are you sure you want to cancel this check?")) {
      setCheckState("upload");
      setCurrentCheckId(null);
      
      toast({
        title: "Check cancelled",
        description: "The check has been cancelled",
      });
    }
  };
  
  // Initialize view based on check from URL
  useEffect(() => {
    if (checkId && checkData) {
      if (checkData.status === "completed") {
        setCheckState("results");
      } else if (checkData.status === "in_progress") {
        setCheckState("progress");
        
        // Set up progress stats
        setProgressStats({
          totalBatches: Math.ceil(checkData.totalNumbers / 500),
          processedBatches: Math.floor((checkData.foundNumbers || 0) / 500),
          totalNumbers: checkData.totalNumbers,
          processedNumbers: checkData.foundNumbers || 0,
          numbersInBatch: 500,
          foundNumbers: checkData.foundNumbers || 0,
          startTime: new Date(checkData.createdAt),
          estimatedEndTime: new Date(Date.now() + 600000), // +10 min from now as estimate
        });
      }
    }
  }, [checkId, checkData]);

  // Handle authentication code submission
  const handleAuthCodeSubmit = async (code: string) => {
    try {
      // Submit the authentication code to the server
      const response = await fetch('/api/telegram/auth', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({ code })
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Authentication failed');
      }
      
      // Close the modal
      setIsAuthModalOpen(false);
      
      // If we have a pending check, continue it
      if (pendingCheckData) {
        toast({
          title: "Authentication successful",
          description: "Telegram authentication successful. Continuing with check...",
        });
        
        // Continue with the check process
        const checkId = pendingCheckData.checkId;
        
        try {
          const continueResponse = await fetch(`/api/checks/${checkId}/continue`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
          });
          
          if (!continueResponse.ok) {
            throw new Error('Failed to continue check');
          }
          
          // Process the check response
          const data = await continueResponse.json();
          
          toast({
            title: "Check completed",
            description: `Found ${data.foundNumbers} accounts out of ${data.totalNumbers}`,
          });
          
          queryClient.invalidateQueries({ queryKey: ['/api/checks'] });
          queryClient.invalidateQueries({ queryKey: ['/api/checks', checkId, 'results'] });
          setCheckState("results");
        } catch (error) {
          console.error("Error continuing check:", error);
          toast({
            title: "Error",
            description: "Failed to continue the check after authentication",
            variant: "destructive",
          });
        }
      }
    } catch (error) {
      console.error("Authentication error:", error);
      toast({
        title: "Authentication failed",
        description: "Failed to authenticate with Telegram. Please try again.",
        variant: "destructive",
      });
    }
  };
  
  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-medium">Check Telegram Accounts</h1>
      </div>

      {/* File Uploader */}
      {checkState === "upload" && (
        <FileUploader onFileLoad={handleFileLoad} />
      )}

      {/* Check Progress */}
      {checkState === "progress" && (
        <CheckProgress
          overallProgress={overallProgress}
          batchProgress={batchProgress}
          stats={progressStats}
          onCancel={handleCancel}
          onPause={handlePause}
          isPaused={isPaused}
        />
      )}

      {/* Results */}
      {checkState === "results" && results && (
        <ResultsTable results={results} />
      )}
      
      {/* Telegram Auth Modal */}
      <TelegramAuthModal 
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
        onSubmit={handleAuthCodeSubmit}
      />
    </div>
  );
}
