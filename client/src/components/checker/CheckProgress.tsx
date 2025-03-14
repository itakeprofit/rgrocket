import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { format } from "date-fns";

interface CheckProgressProps {
  overallProgress: number;
  batchProgress: number;
  stats: {
    totalBatches: number;
    processedBatches: number;
    totalNumbers: number;
    processedNumbers: number;
    numbersInBatch: number;
    foundNumbers: number;
    startTime: Date;
    estimatedEndTime: Date;
  };
  onCancel: () => void;
  onPause: () => void;
  isPaused: boolean;
}

export default function CheckProgress({
  overallProgress,
  batchProgress,
  stats,
  onCancel,
  onPause,
  isPaused,
}: CheckProgressProps) {
  const successRate = stats.processedNumbers > 0
    ? ((stats.foundNumbers / stats.processedNumbers) * 100).toFixed(1)
    : "0.0";

  return (
    <Card>
      <CardHeader>
        <CardTitle>Check Progress</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div>
          <div className="flex justify-between mb-1">
            <span className="text-sm font-medium">Overall Progress</span>
            <span className="text-sm text-muted-foreground">
              {stats.processedBatches}/{stats.totalBatches} batches
            </span>
          </div>
          <Progress value={overallProgress} className="h-2" />
        </div>

        <div>
          <div className="flex justify-between mb-1">
            <span className="text-sm font-medium">Current Batch</span>
            <span className="text-sm text-muted-foreground">
              {stats.processedNumbers % stats.numbersInBatch}/
              {stats.numbersInBatch} numbers
            </span>
          </div>
          <Progress value={batchProgress} className="h-2" />
        </div>

        <div className="flex justify-between text-sm">
          <div>
            <span className="font-medium">Started:</span>{" "}
            <span className="text-muted-foreground">
              {format(stats.startTime, "MMM d, yyyy HH:mm")}
            </span>
          </div>
          <div>
            <span className="font-medium">Estimated completion:</span>{" "}
            <span className="text-muted-foreground">
              {format(stats.estimatedEndTime, "MMM d, yyyy HH:mm")}
            </span>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-4">
          <div className="bg-muted rounded-md p-3 text-center">
            <h3 className="text-xl font-medium text-primary">
              {stats.processedNumbers.toLocaleString()}
            </h3>
            <p className="text-muted-foreground text-sm">Processed</p>
          </div>
          <div className="bg-muted rounded-md p-3 text-center">
            <h3 className="text-xl font-medium text-green-600">
              {stats.foundNumbers.toLocaleString()}
            </h3>
            <p className="text-muted-foreground text-sm">Found</p>
          </div>
          <div className="bg-muted rounded-md p-3 text-center">
            <h3 className="text-xl font-medium">{successRate}%</h3>
            <p className="text-muted-foreground text-sm">Success Rate</p>
          </div>
        </div>

        <div className="flex justify-end">
          <Button
            variant="outline"
            onClick={onPause}
            className="mr-3"
          >
            {isPaused ? "Resume" : "Pause"}
          </Button>
          <Button variant="destructive" onClick={onCancel}>
            Cancel
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
