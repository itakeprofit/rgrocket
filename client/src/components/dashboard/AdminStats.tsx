import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { User } from "@shared/schema";
import { Separator } from "@/components/ui/separator";

interface SystemStatus {
  apiUsage: number;
  cpuLoad: number;
  memoryUsage: number;
}

interface AdminStatsProps {
  systemStatus: SystemStatus;
  activeUsers: User[];
}

export default function AdminStats({
  systemStatus,
  activeUsers,
}: AdminStatsProps) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <Card>
        <CardHeader className="pb-2">
          <CardTitle>System Status</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <div className="flex justify-between mb-1">
                <span className="text-sm font-medium">API Usage</span>
                <span className="text-sm text-muted-foreground">
                  {systemStatus.apiUsage}%
                </span>
              </div>
              <Progress value={systemStatus.apiUsage} className="h-2" />
            </div>
            
            <div>
              <div className="flex justify-between mb-1">
                <span className="text-sm font-medium">CPU Load</span>
                <span className="text-sm text-muted-foreground">
                  {systemStatus.cpuLoad}%
                </span>
              </div>
              <Progress value={systemStatus.cpuLoad} className="h-2" />
            </div>
            
            <div>
              <div className="flex justify-between mb-1">
                <span className="text-sm font-medium">Memory Usage</span>
                <span className="text-sm text-muted-foreground">
                  {systemStatus.memoryUsage}%
                </span>
              </div>
              <Progress value={systemStatus.memoryUsage} className="h-2" />
            </div>
          </div>
        </CardContent>
      </Card>
      
      <Card>
        <CardHeader className="pb-2">
          <CardTitle>Active Users</CardTitle>
        </CardHeader>
        <CardContent>
          {activeUsers.length === 0 ? (
            <p className="text-muted-foreground text-center py-4">
              No active users at the moment
            </p>
          ) : (
            <ul className="divide-y divide-border">
              {activeUsers.map((user) => {
                const initials = user.fullName
                  ? user.fullName
                      .split(" ")
                      .map((n) => n[0])
                      .join("")
                      .toUpperCase()
                      .slice(0, 2)
                  : user.username.slice(0, 2).toUpperCase();
                
                return (
                  <li key={user.id} className="py-3 flex justify-between">
                    <div className="flex items-center">
                      <Avatar className="h-8 w-8 bg-primary/20 text-primary">
                        <AvatarFallback>{initials}</AvatarFallback>
                      </Avatar>
                      <span className="ml-3 text-sm">
                        {user.fullName || user.username}
                      </span>
                    </div>
                    <span className="text-sm text-muted-foreground">
                      Online
                    </span>
                  </li>
                );
              })}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
