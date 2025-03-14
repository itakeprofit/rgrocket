import { Result } from "@shared/schema";
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
import { Button } from "@/components/ui/button";
import { Download } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import { useState } from "react";

interface ResultsTableProps {
  results: Result[];
}

export default function ResultsTable({ results }: ResultsTableProps) {
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;
  const totalPages = Math.ceil(results.length / itemsPerPage);
  
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = Math.min(startIndex + itemsPerPage, results.length);
  const currentResults = results.slice(startIndex, endIndex);

  const exportResults = () => {
    // Create CSV content
    const csvContent = [
      // Header row
      ["Phone Number", "Status", "Telegram ID", "Username", "Name"].join(","),
      // Data rows
      ...results.map(result => [
        result.phoneNumber,
        result.found ? "Found" : "Not Found",
        result.telegramId || "",
        result.username || "",
        result.name || ""
      ].join(","))
    ].join("\n");
    
    // Create a blob and download link
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `telegram_check_results_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle>Results</CardTitle>
        <Button onClick={exportResults} size="sm">
          <Download className="mr-2 h-4 w-4" />
          Export
        </Button>
      </CardHeader>
      <CardContent className="p-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Phone Number</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Telegram ID</TableHead>
              <TableHead>Username</TableHead>
              <TableHead>Name</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {currentResults.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-6 text-muted-foreground">
                  No results found
                </TableCell>
              </TableRow>
            ) : (
              currentResults.map((result) => (
                <TableRow key={result.id}>
                  <TableCell className="font-mono">
                    {result.phoneNumber}
                  </TableCell>
                  <TableCell>
                    {result.found ? (
                      <Badge variant="outline" className="bg-green-100 text-green-700 hover:bg-green-100">
                        Found
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="bg-red-100 text-red-700 hover:bg-red-100">
                        Not Found
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    {result.telegramId || "-"}
                  </TableCell>
                  <TableCell>
                    {result.username ? `@${result.username}` : "-"}
                  </TableCell>
                  <TableCell>
                    {result.name || "-"}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
        
        {totalPages > 1 && (
          <div className="px-6 py-4 flex items-center justify-between border-t border-border">
            <div className="text-sm text-muted-foreground">
              Showing {startIndex + 1} to {endIndex} of {results.length} results
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
                  // For simplicity, show only 5 page links
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
