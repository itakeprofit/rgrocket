import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";

interface ValidationProgressProps {
  progress: {
    current: number;
    total: number;
    percentage: number;
    speed: number;
    remainingTime: number;
  };
  onCancel: () => void;
}

export default function ValidationProgress({ progress, onCancel }: ValidationProgressProps) {
  const [startTime] = useState(Date.now());
  const [processingSpeed, setProcessingSpeed] = useState("0 emails/sec");
  const [estimatedTime, setEstimatedTime] = useState("Calculating...");

  useEffect(() => {
    // Update processing speed
    if (progress.speed > 0) {
      setProcessingSpeed(`${progress.speed.toLocaleString()} emails/sec`);
    }

    // Update estimated time
    if (progress.remainingTime > 0) {
      if (progress.remainingTime > 60) {
        const minutes = Math.floor(progress.remainingTime / 60);
        const seconds = Math.floor(progress.remainingTime % 60);
        setEstimatedTime(`${minutes}m ${seconds}s remaining`);
      } else {
        setEstimatedTime(`${Math.ceil(progress.remainingTime)}s remaining`);
      }
    }

    // If no updates received yet, make client-side calculation
    if (progress.speed === 0 && progress.current > 0) {
      const elapsedSeconds = (Date.now() - startTime) / 1000;
      const calculatedSpeed = Math.round(progress.current / elapsedSeconds);
      
      if (calculatedSpeed > 0) {
        setProcessingSpeed(`${calculatedSpeed.toLocaleString()} emails/sec`);
        
        const remainingEmails = progress.total - progress.current;
        const remainingSeconds = remainingEmails / calculatedSpeed;
        
        if (remainingSeconds > 60) {
          const minutes = Math.floor(remainingSeconds / 60);
          const seconds = Math.floor(remainingSeconds % 60);
          setEstimatedTime(`${minutes}m ${seconds}s remaining`);
        } else {
          setEstimatedTime(`${Math.ceil(remainingSeconds)}s remaining`);
        }
      }
    }
  }, [progress, startTime]);

  return (
    <div className="mb-6">
      <h3 className="font-medium text-slate-700 mb-3">Validation Progress</h3>
      
      <div className="flex items-center mb-2">
        <div className="w-full mr-4">
          <Progress value={progress.percentage} className="h-5" />
        </div>
        <span className="text-sm font-medium whitespace-nowrap">{progress.current.toLocaleString()} / {progress.total.toLocaleString()}</span>
      </div>
      
      <div className="grid grid-cols-2 gap-4 mt-4">
        {/* Processing Speed */}
        <div className="bg-slate-100 p-3 rounded">
          <h4 className="text-xs text-slate-500 mb-1">Processing Speed</h4>
          <p className="font-medium">{processingSpeed}</p>
        </div>
        
        {/* Estimated Time */}
        <div className="bg-slate-100 p-3 rounded">
          <h4 className="text-xs text-slate-500 mb-1">Estimated Time</h4>
          <p className="font-medium">{estimatedTime}</p>
        </div>
      </div>
      
      <Button 
        variant="ghost" 
        className="mt-4 text-sm text-slate-600 hover:text-destructive"
        onClick={onCancel}
      >
        Cancel Validation
      </Button>
    </div>
  );
}
