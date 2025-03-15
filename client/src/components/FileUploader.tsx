import { useRef, useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { Cloud, Upload } from "lucide-react";

interface FileUploaderProps {
  onFileSelected: (file: File) => void;
}

export default function FileUploader({ onFileSelected }: FileUploaderProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragActive, setIsDragActive] = useState(false);
  const { toast } = useToast();

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      validateAndProcessFile(e.target.files[0]);
    }
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragActive(true);
  };

  const handleDragLeave = () => {
    setIsDragActive(false);
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragActive(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      validateAndProcessFile(e.dataTransfer.files[0]);
    }
  };

  const handleBrowseClick = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  const validateAndProcessFile = (file: File) => {
    // Check if file is .txt or .csv
    if (file.type !== 'text/plain' && file.type !== 'text/csv' && !file.name.endsWith('.csv') && !file.name.endsWith('.txt')) {
      toast({
        title: "Invalid file format",
        description: "Please upload a .txt or .csv file with one email per line",
        variant: "destructive"
      });
      return;
    }
    
    // Check file size (rough estimate, assuming average email is 30 chars)
    // 500,000 emails * 30 chars = ~15MB
    if (file.size > 30 * 1024 * 1024) { // 30MB limit to be safe
      toast({
        title: "File too large",
        description: "Please upload a file smaller than 30MB",
        variant: "destructive"
      });
      return;
    }
    
    onFileSelected(file);
  };

  return (
    <div className="mb-6">
      <div 
        className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer hover:bg-slate-50 transition-colors ${
          isDragActive ? "border-primary bg-primary/5" : "border-slate-300"
        }`} 
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={handleBrowseClick}
      >
        <div className="flex flex-col items-center">
          {isDragActive ? (
            <Cloud className="h-12 w-12 text-primary mb-3" />
          ) : (
            <Upload className="h-12 w-12 text-slate-400 mb-3" />
          )}
          
          <h3 className="font-medium text-slate-700 mb-1">
            {isDragActive ? "Drop Email List Here" : "Drag & Drop Email List"}
          </h3>
          <p className="text-sm text-slate-500 mb-4">or</p>
          
          <label className="bg-primary hover:bg-primary/90 text-white py-2 px-4 rounded font-medium cursor-pointer transition-colors">
            Browse Files
            <input 
              type="file" 
              ref={fileInputRef}
              className="hidden" 
              accept=".txt,.csv"
              onChange={handleFileChange}
            />
          </label>
          
          <p className="text-xs text-slate-500 mt-4">
            Supports .txt or .csv files with one email per line (up to 500,000 emails)
          </p>
        </div>
      </div>
    </div>
  );
}
