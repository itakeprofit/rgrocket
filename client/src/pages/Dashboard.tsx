import { useEffect, useState } from "react";
import { format } from "date-fns";
import { useQuery } from "@tanstack/react-query";
import { getAllChecks } from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";
import { Search, CheckCircle, TrendingUp } from "lucide-react";
import StatCard from "@/components/dashboard/StatCard";
import RecentActivity from "@/components/dashboard/RecentActivity";
import AdminStats from "@/components/dashboard/AdminStats";
import { Check, User } from "@shared/schema";

export default function Dashboard() {
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";
  const [currentDate, setCurrentDate] = useState(format(new Date(), "MMMM d, yyyy"));

  // Get all checks for the user
  const { data: checks = [], isLoading } = useQuery({
    queryKey: ['/api/checks'],
  });

  // For admin stats demonstration
  const [systemStatus, setSystemStatus] = useState({
    apiUsage: 78,
    cpuLoad: 42,
    memoryUsage: 65,
  });

  // Sample active users for admin view
  const [activeUsers, setActiveUsers] = useState<User[]>([]);

  useEffect(() => {
    // This would normally fetch active users from an API
    if (isAdmin) {
      const sampleUsers: User[] = [
        {
          id: 1,
          username: "alex.morgan",
          email: "alex@example.com",
          fullName: "Alex Morgan",
          role: "user",
          status: "active",
          password: "", // Not returned from API
          createdAt: new Date(),
        },
        {
          id: 2,
          username: "jane.doe",
          email: "jane@example.com",
          fullName: "Jane Doe",
          role: "user",
          status: "active",
          password: "", // Not returned from API
          createdAt: new Date(),
        },
        {
          id: 3,
          username: "robert.brown",
          email: "robert@example.com",
          fullName: "Robert Brown",
          role: "user",
          status: "active",
          password: "", // Not returned from API
          createdAt: new Date(),
        },
      ];
      setActiveUsers(sampleUsers);
    }
  }, [isAdmin]);

  // Calculate statistics
  const totalChecks = checks.length;
  const completedChecks = checks.filter((check: Check) => check.status === "completed");
  const totalFound = completedChecks.reduce((sum: number, check: Check) => sum + (check.foundNumbers || 0), 0);
  const totalProcessed = completedChecks.reduce((sum: number, check: Check) => sum + check.totalNumbers, 0);
  const successRate = totalProcessed > 0 ? (totalFound / totalProcessed) * 100 : 0;

  const recentChecks = [...checks].sort((a: Check, b: Check) => {
    const dateA = new Date(a.createdAt).getTime();
    const dateB = new Date(b.createdAt).getTime();
    return dateB - dateA;
  }).slice(0, 5);

  if (isLoading) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-medium">Dashboard</h1>
        <div>
          <span className="text-sm text-muted-foreground">{currentDate}</span>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <StatCard
          title="Total Checks"
          value={totalChecks.toLocaleString()}
          icon={Search}
          change={{ value: "+17.2%", positive: true }}
        />
        <StatCard
          title="Found Accounts"
          value={totalFound.toLocaleString()}
          icon={CheckCircle}
          change={{ value: "+8.4%", positive: true }}
        />
        <StatCard
          title="Success Rate"
          value={`${successRate.toFixed(1)}%`}
          icon={TrendingUp}
          change={{ value: "-2.3%", positive: false }}
        />
      </div>

      {/* Recent Activity */}
      <div className="mb-8">
        <RecentActivity checks={recentChecks} />
      </div>

      {/* Admin only section */}
      {isAdmin && (
        <AdminStats systemStatus={systemStatus} activeUsers={activeUsers} />
      )}
    </div>
  );
}
