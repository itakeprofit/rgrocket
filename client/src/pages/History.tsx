import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getAllChecks, deleteCheck } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import HistoryTable from "@/components/history/HistoryTable";

export default function History() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  // Fetch all checks for the user
  const { data: checks = [], isLoading } = useQuery({
    queryKey: ['/api/checks'],
  });
  
  // Delete check mutation
  const deleteCheckMutation = useMutation({
    mutationFn: (id: number) => {
      return deleteCheck(id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/checks'] });
    },
    onError: (error) => {
      console.error("Error deleting check:", error);
      toast({
        title: "Error",
        description: "Failed to delete the check. Please try again.",
        variant: "destructive",
      });
    },
  });
  
  const handleDelete = async (id: number) => {
    await deleteCheckMutation.mutateAsync(id);
  };

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
        <h1 className="text-2xl font-medium">Check History</h1>
      </div>

      <HistoryTable 
        checks={checks} 
        onDelete={handleDelete}
      />
    </div>
  );
}
