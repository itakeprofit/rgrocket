import { useQuery } from "@tanstack/react-query";
import { getAllUsers } from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";
import { useLocation } from "wouter";
import UsersTable from "@/components/admin/UsersTable";
import { AlertTriangle } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

export default function AdminUsers() {
  const { user } = useAuth();
  const [_, setLocation] = useLocation();
  const isAdmin = user?.role === "admin";

  // Redirect non-admin users
  if (!isAdmin) {
    return (
      <Card className="mt-8">
        <CardContent className="pt-6">
          <div className="flex flex-col items-center justify-center p-6 text-center">
            <AlertTriangle className="h-12 w-12 text-destructive mb-4" />
            <h2 className="text-xl font-bold mb-2">Access Denied</h2>
            <p className="text-muted-foreground mb-4">
              You don't have permission to access this page.
            </p>
            <button
              onClick={() => setLocation("/")}
              className="text-primary hover:underline"
            >
              Go back to Dashboard
            </button>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Fetch all users (admin only)
  const { data: users = [], isLoading } = useQuery({
    queryKey: ['/api/users'],
  });

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
        <h1 className="text-2xl font-medium">Users Management</h1>
      </div>

      <UsersTable users={users} />
    </div>
  );
}
