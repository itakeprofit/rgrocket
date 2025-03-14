import { useState } from "react";
import { Log } from "@shared/schema";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { format } from "date-fns";
import { Search, Download, Filter } from "lucide-react";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";

interface SystemLogsProps {
  logs: Log[];
}

export default function SystemLogs({ logs }: SystemLogsProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [actionFilter, setActionFilter] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  // Extract unique actions for filter
  const uniqueActions = Array.from(new Set(logs.map(log => log.action)));

  // Filter logs
  const filteredLogs = logs.filter(log => {
    const matchesSearch = 
      log.action.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (log.details && log.details.toLowerCase().includes(searchQuery.toLowerCase()));
    
    const matchesAction = actionFilter ? log.action === actionFilter : true;
    
    return matchesSearch && matchesAction;
  });

  // Pagination
  const totalPages = Math.ceil(filteredLogs.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const displayedLogs = filteredLogs.slice(startIndex, startIndex + itemsPerPage);

  const exportLogs = () => {
    // Create CSV content
    const csvContent = [
      // Header row
      ["ID", "User ID", "Check ID", "Action", "Details", "Created At"].join(","),
      // Data rows
      ...filteredLogs.map(log => [
        log.id,
        log.userId || "",
        log.checkId || "",
        log.action,
        log.details ? `"${log.details.replace(/"/g, '""')}"` : "",
        format(new Date(log.createdAt), "yyyy-MM-dd HH:mm:ss")
      ].join(","))
    ].join("\n");
    
    // Create a blob and download link
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `system_logs_${format(new Date(), "yyyy-MM-dd")}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const clearFilters = () => {
    setSearchQuery("");
    setActionFilter(null);
    setCurrentPage(1);
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex justify-between items-center">
          <CardTitle>System Logs</CardTitle>
          <div className="flex space-x-2 items-center">
            <div className="relative">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search logs..."
                className="pl-8 h-9"
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setCurrentPage(1);
                }}
              />
            </div>
            <Select
              value={actionFilter || "all"}
              onValueChange={(value) => {
                setActionFilter(value === "all" ? null : value);
                setCurrentPage(1);
              }}
            >
              <SelectTrigger className="w-[180px] h-9">
                <SelectValue placeholder="Filter by action" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All actions</SelectItem>
                {uniqueActions.map(action => (
                  <SelectItem key={action} value={action}>{action}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button variant="outline" size="sm" className="h-9" onClick={clearFilters}>
              <Filter className="h-4 w-4 mr-2" />
              Clear
            </Button>
            <Button size="sm" className="h-9" onClick={exportLogs}>
              <Download className="h-4 w-4 mr-2" />
              Export
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Time</TableHead>
              <TableHead>User ID</TableHead>
              <TableHead>Check ID</TableHead>
              <TableHead>Action</TableHead>
              <TableHead>Details</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {displayedLogs.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-6 text-muted-foreground">
                  {searchQuery || actionFilter ? "No logs match the current filters" : "No logs found"}
                </TableCell>
              </TableRow>
            ) : (
              displayedLogs.map((log) => (
                <TableRow key={log.id}>
                  <TableCell className="whitespace-nowrap">
                    {format(new Date(log.createdAt), "MMM d, yyyy HH:mm:ss")}
                  </TableCell>
                  <TableCell>{log.userId || "—"}</TableCell>
                  <TableCell>{log.checkId || "—"}</TableCell>
                  <TableCell>
                    <LogActionBadge action={log.action} />
                  </TableCell>
                  <TableCell className="max-w-md truncate">
                    {log.details || "—"}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>

        {totalPages > 1 && (
          <div className="px-6 py-4 flex items-center justify-between border-t border-border">
            <div className="text-sm text-muted-foreground">
              Showing {startIndex + 1} to {Math.min(startIndex + itemsPerPage, filteredLogs.length)} of {filteredLogs.length} logs
            </div>
            <Pagination>
              <PaginationContent>
                <PaginationItem>
                  <PaginationPrevious 
                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                  />
                </PaginationItem>
                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                  // Display up to 5 page numbers
                  let pageNum;
                  if (totalPages <= 5) {
                    pageNum = i + 1;
                  } else if (currentPage <= 3) {
                    pageNum = i + 1;
                  } else if (currentPage >= totalPages - 2) {
                    pageNum = totalPages - 4 + i;
                  } else {
                    pageNum = currentPage - 2 + i;
                  }
                  
                  return (
                    <PaginationItem key={i}>
                      <PaginationLink
                        onClick={() => setCurrentPage(pageNum)}
                        isActive={currentPage === pageNum}
                      >
                        {pageNum}
                      </PaginationLink>
                    </PaginationItem>
                  );
                })}
                <PaginationItem>
                  <PaginationNext 
                    onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                    disabled={currentPage === totalPages}
                  />
                </PaginationItem>
              </PaginationContent>
            </Pagination>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

const LogActionBadge = ({ action }: { action: string }) => {
  let className = "bg-gray-100 text-gray-700 hover:bg-gray-100";
  
  if (action.includes("Login") || action.includes("Register")) {
    className = "bg-blue-100 text-blue-700 hover:bg-blue-100";
  } else if (action.includes("Create") || action.includes("Start")) {
    className = "bg-green-100 text-green-700 hover:bg-green-100";
  } else if (action.includes("Update")) {
    className = "bg-orange-100 text-orange-700 hover:bg-orange-100";
  } else if (action.includes("Delete") || action.includes("Error") || action.includes("Failed")) {
    className = "bg-red-100 text-red-700 hover:bg-red-100";
  } else if (action.includes("Complete")) {
    className = "bg-purple-100 text-purple-700 hover:bg-purple-100";
  }
  
  return (
    <Badge variant="outline" className={className}>
      {action}
    </Badge>
  );
};
