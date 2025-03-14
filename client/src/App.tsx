import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { AuthProvider } from "@/contexts/AuthContext";
import AuthWrapper from "@/components/auth/AuthWrapper";
import Dashboard from "@/pages/Dashboard";
import CheckAccounts from "@/pages/CheckAccounts";
import History from "@/pages/History";
import Settings from "@/pages/Settings";
import AdminUsers from "@/pages/AdminUsers";
import AdminLogs from "@/pages/AdminLogs";
import NotFound from "@/pages/not-found";

function Router() {
  return (
    <Switch>
      <Route path="/" component={Dashboard} />
      <Route path="/dashboard" component={Dashboard} />
      <Route path="/check-accounts" component={CheckAccounts} />
      <Route path="/history" component={History} />
      <Route path="/settings" component={Settings} />
      <Route path="/admin/users" component={AdminUsers} />
      <Route path="/admin/logs" component={AdminLogs} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <AuthWrapper>
          <Router />
        </AuthWrapper>
      </AuthProvider>
      <Toaster />
    </QueryClientProvider>
  );
}

export default App;
