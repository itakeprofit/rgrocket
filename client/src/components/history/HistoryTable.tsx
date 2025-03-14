import { Check } from "@shared/schema";
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
import { Button } from "@/components/ui/button";
import { format } from "date-fns";
import { Input } from "@/components/ui/input";
import { Search, Filter } from "lucide-react";
import { useState } from "react";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";

interface HistoryTableProps {
  checks: Check[];
  onDelete: (id: number) => Promise<void>;
}

export default function HistoryTable({ checks, onDelete }: HistoryTableProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [isDeleting, setIsDeleting] = useState<number | null>(null);
  const { toast } = useToast();
  const [_, setLocation] = useLocation();
  
  const itemsPerPage = 10;
  
  // Filter checks based on search query
  const filteredChecks = checks.filter(check => 
    check.fileName?.toLowerCase().includes(searchQuery.toLowerCase()) || 
    check.id.toString().includes(searchQuery)
  );
  
  const totalPages = Math.ceil(filteredChecks.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const displayedChecks = filteredChecks.slice(startIndex, startIndex + itemsPerPage);

  const handleDelete = async (id: number) => {
    if (confirm("Are you sure you want to delete this check? This action cannot be undone.")) {
      setIsDeleting(id);
      try {
        await onDelete(id);
        toast({
          title: "Check deleted",
          description: "The check has been deleted successfully."
        });
      } catch (error) {
        console.error("Error deleting check:", error);
        toast({
          title: "Error",
          description: "Failed to delete the check. Please try again.",
          variant: "destructive"
        });
      } finally {
        setIsDeleting(null);
      }
    }
  };

  const handleView = (id: number) => {
    setLocation(`/check-accounts?check=${id}`);
  };

  const handleDownload = (check: Check) => {
    toast({
      title: "Download initiated",
      description: "Your results will be downloaded shortly."
    });
    
    // This would typically fetch the results and then export them
    // For now, navigate to the check details which will show the results
    handleView(check.id);
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex justify-between items-center">
          <CardTitle>Check History</CardTitle>
          <div className="flex space-x-2 items-center">
            <div className="relative">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search..."
                className="pl-8 h-9"
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setCurrentPage(1); // Reset to first page on search
                }}
              />
            </div>
            <Button variant="outline" size="sm" className="h-9">
              <Filter className="h-4 w-4 mr-2" />
              Filter
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>ID</TableHead>
              <TableHead>Date</TableHead>
              <TableHead>File Name</TableHead>
              <TableHead>Total Numbers</TableHead>
              <TableHead>Found</TableHead>
              <TableHead>Success Rate</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {displayedChecks.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center py-6 text-muted-foreground">
                  {searchQuery ? "No checks found matching your search" : "No checks in history yet"}
                </TableCell>
              </TableRow>
            ) : (
              displayedChecks.map((check) => {
                const successRate = check.foundNumbers && check.totalNumbers
                  ? ((check.foundNumbers / check.totalNumbers) * 100).toFixed(1) + "%"
                  : "--";
                
                return (
                  <TableRow key={check.id}>
                    <TableCell>#{check.id}</TableCell>
                    <TableCell>
                      {check.createdAt
                        ? format(new Date(check.createdAt), "MMM d, yyyy HH:mm")
                        : "--"}
                    </TableCell>
                    <TableCell>{check.fileName || "--"}</TableCell>
                    <TableCell>{check.totalNumbers.toLocaleString()}</TableCell>
                    <TableCell>
                      {check.status === "completed"
                        ? check.foundNumbers?.toLocaleString()
                        : "--"}
                    </TableCell>
                    <TableCell>{successRate}</TableCell>
                    <TableCell>
                      <StatusBadge status={check.status} />
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="link"
                        size="sm"
                        onClick={() => handleView(check.id)}
                        className="text-primary"
                      >
                        View
                      </Button>
                      <Button
                        variant="link"
                        size="sm"
                        onClick={() => handleDownload(check)}
                        className="text-primary"
                        disabled={check.status !== "completed"}
                      >
                        Download
                      </Button>
                      <Button
                        variant="link"
                        size="sm"
                        onClick={() => handleDelete(check.id)}
                        className="text-destructive"
                        disabled={isDeleting === check.id}
                      >
                        {isDeleting === check.id ? "Deleting..." : "Delete"}
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>

        {totalPages > 1 && (
          <div className="px-6 py-4 flex items-center justify-between border-t border-border">
            <div className="text-sm text-muted-foreground">
              Showing {startIndex + 1} to {Math.min(startIndex + itemsPerPage, filteredChecks.length)} of {filteredChecks.length} entries
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

const StatusBadge = ({ status }: { status: string }) => {
  switch (status) {
    case "completed":
      return (
        <Badge variant="outline" className="bg-green-100 text-green-700 hover:bg-green-100">
          Completed
        </Badge>
      );
    case "in_progress":
      return (
        <Badge variant="outline" className="bg-blue-100 text-blue-700 hover:bg-blue-100">
          In Progress
        </Badge>
      );
    case "failed":
      return (
        <Badge variant="outline" className="bg-red-100 text-red-700 hover:bg-red-100">
          Failed
        </Badge>
      );
    default:
      return (
        <Badge variant="outline" className="bg-orange-100 text-orange-700 hover:bg-orange-100">
          Pending
        </Badge>
      );
  }
};
