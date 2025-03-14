import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { LucideIcon } from "lucide-react";

interface StatCardProps {
  title: string;
  value: string | number;
  icon: LucideIcon;
  change?: {
    value: string;
    positive: boolean;
  };
  className?: string;
}

export default function StatCard({
  title,
  value,
  icon: Icon,
  change,
  className,
}: StatCardProps) {
  return (
    <Card className={cn("", className)}>
      <CardContent className="p-6">
        <div className="flex justify-between">
          <div>
            <p className="text-muted-foreground text-sm">{title}</p>
            <h3 className="text-3xl font-medium text-foreground mt-1">
              {value}
            </h3>
          </div>
          <div className="h-12 w-12 rounded-full bg-primary/20 flex items-center justify-center">
            <Icon className="h-6 w-6 text-primary" />
          </div>
        </div>
        
        {change && (
          <div className="mt-4">
            <span
              className={cn(
                "text-sm font-medium",
                change.positive ? "text-green-500" : "text-red-500"
              )}
            >
              {change.value}
            </span>
            <span className="text-muted-foreground text-sm ml-1">
              since last month
            </span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
