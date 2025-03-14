import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { useAuth } from "@/contexts/AuthContext";

// This hook manages the Telegram account check process
export function useTelegramCheck() {
  const { toast } = useToast();
  const { user } = useAuth();
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [isCheckInProgress, setIsCheckInProgress] = useState(false);
  const [checkProgress, setCheckProgress] = useState(0);
  const [checkResults, setCheckResults] = useState<any>({
    totalNumbers: 0,
    processedNumbers: 0,
    foundCount: 0,
    notFoundCount: 0,
    results: [],
  });
  const [pendingCheckId, setPendingCheckId] = useState<number | null>(null);
  const [authCallback, setAuthCallback] = useState<((code: string) => Promise<void>) | null>(null);

  // Start a new check
  const startCheck = async (fileName: string, numbers: string[]) => {
    try {
      // First check if API credentials are set
      if (!user?.apiId || !user?.apiHash || !user?.phoneNumber) {
        toast({
          title: "Missing API credentials",
          description: "Please set up your Telegram API credentials in Settings first",
          variant: "destructive",
        });
        return null;
      }

      setIsCheckInProgress(true);
      setCheckProgress(0);
      
      // Make the API request to start the check
      try {
        const response = await apiRequest("POST", "/api/checks", {
          fileName,
          numbers,
        });
        
        const data = await response.json();
        
        // If the check requires auth, show the auth modal
        if (response.status === 401 || response.status === 403) {
          if (data.telegramAuth) {
            setPendingCheckId(data.checkId);
            
            // Set up the auth callback
            setAuthCallback(() => async (code: string) => {
              // Send the auth code
              const authResponse = await apiRequest("POST", "/api/telegram/auth", {
                code,
                checkId: data.checkId,
              });
              
              if (!authResponse.ok) {
                throw new Error("Authentication failed");
              }
              
              // Continue the check
              await continueCheck(data.checkId);
            });
            
            setIsAuthModalOpen(true);
            setIsCheckInProgress(false);
            return data.checkId;
          } else {
            throw new Error(data.message || "Unauthorized");
          }
        }
        
        setCheckResults({
          totalNumbers: data.totalNumbers,
          processedNumbers: data.totalNumbers, // Completed
          foundCount: data.foundNumbers,
          notFoundCount: data.totalNumbers - data.foundNumbers,
          results: [],
        });
        
        setIsCheckInProgress(false);
        setCheckProgress(100);
        return data.checkId;
      } catch (error: any) {
        console.error("Check error:", error);
        toast({
          title: "Check failed",
          description: error.message || "An error occurred while checking phone numbers",
          variant: "destructive",
        });
        setIsCheckInProgress(false);
        return null;
      }
    } catch (error) {
      console.error("Error starting check:", error);
      toast({
        title: "Error",
        description: "Failed to start the check process",
        variant: "destructive",
      });
      setIsCheckInProgress(false);
      return null;
    }
  };

  // Continue check after authentication
  const continueCheck = async (checkId: number) => {
    try {
      setIsCheckInProgress(true);
      
      const response = await apiRequest("POST", `/api/checks/${checkId}/continue`, {});
      
      if (!response.ok) {
        throw new Error("Failed to continue check");
      }
      
      const data = await response.json();
      
      setCheckResults({
        totalNumbers: data.totalNumbers,
        processedNumbers: data.totalNumbers, // Completed
        foundCount: data.foundNumbers,
        notFoundCount: data.totalNumbers - data.foundNumbers,
        results: [],
      });
      
      setIsCheckInProgress(false);
      setCheckProgress(100);
      return true;
    } catch (error) {
      console.error("Error continuing check:", error);
      toast({
        title: "Error",
        description: "Failed to continue the check process",
        variant: "destructive",
      });
      setIsCheckInProgress(false);
      return false;
    }
  };

  // Submit Telegram authentication code
  const submitAuthCode = async (code: string) => {
    if (authCallback) {
      await authCallback(code);
      setAuthCallback(null);
      setPendingCheckId(null);
    }
  };

  return {
    isAuthModalOpen,
    setIsAuthModalOpen,
    isCheckInProgress,
    checkProgress,
    checkResults,
    startCheck,
    submitAuthCode,
  };
}