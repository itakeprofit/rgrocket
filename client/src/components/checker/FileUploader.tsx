import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Upload, File } from "lucide-react";

interface FileUploaderProps {
  onFileLoad: (fileName: string, numbers: string[]) => void;
}

export default function FileUploader({ onFileLoad }: FileUploaderProps) {
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [numbers, setNumbers] = useState<string[]>([]);
  const [previewNumbers, setPreviewNumbers] = useState<string[]>([]);
  const [fileSize, setFileSize] = useState<string>("");
  const [batchCount, setBatchCount] = useState<number>(0);

  const handleFileSelect = async (file: File) => {
    // Validate file type
    if (!file.name.endsWith(".csv") && !file.name.endsWith(".txt")) {
      toast({
        title: "Invalid file format",
        description: "Please upload a CSV or TXT file",
        variant: "destructive",
      });
      return;
    }

    // Validate file size (10MB max)
    if (file.size > 10 * 1024 * 1024) {
      toast({
        title: "File too large",
        description: "Maximum file size is 10MB",
        variant: "destructive",
      });
      return;
    }

    setFile(file);
    setFileSize(formatFileSize(file.size));

    // Read file content
    const text = await file.text();
    let phoneNumbers: string[] = [];

    // Parse numbers from CSV or TXT
    if (file.name.endsWith(".csv")) {
      // Assuming each line has a phone number (possibly with other data)
      phoneNumbers = text
        .split("\n")
        .map((line) => {
          // Extract first column if comma-separated
          const parts = line.split(",");
          return parts[0].trim();
        })
        .filter((num) => num.length > 0);
    } else {
      // For TXT, assume one number per line
      phoneNumbers = text
        .split("\n")
        .map((line) => line.trim())
        .filter((num) => num.length > 0);
    }

    // Basic validation - only keep items that look like phone numbers
    const validNumbers = phoneNumbers.filter((num) => {
      // Simple regex to check for something that looks like a phone number
      // Allows for various formats including international notation
      return /^[+]?[\d\s()-]{8,20}$/.test(num);
    });

    if (validNumbers.length === 0) {
      toast({
        title: "No valid phone numbers found",
        description: "Please check your file format and try again",
        variant: "destructive",
      });
      return;
    }

    setNumbers(validNumbers);
    setPreviewNumbers(validNumbers.slice(0, 10));
    setBatchCount(Math.ceil(validNumbers.length / 500));

    toast({
      title: "File loaded successfully",
      description: `Found ${validNumbers.length} valid phone numbers`,
    });
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);

    if (e.dataTransfer.files.length) {
      handleFileSelect(e.dataTransfer.files[0]);
    }
  };

  const handleBrowseClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      handleFileSelect(e.target.files[0]);
    }
  };

  const handleReset = () => {
    setFile(null);
    setNumbers([]);
    setPreviewNumbers([]);
    setFileSize("");
    setBatchCount(0);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleStartCheck = () => {
    if (file && numbers.length > 0) {
      onFileLoad(file.name, numbers);
    }
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return bytes + " B";
    else if (bytes < 1048576) return (bytes / 1024).toFixed(1) + " KB";
    else return (bytes / 1048576).toFixed(1) + " MB";
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Upload Phone Numbers</CardTitle>
        <CardDescription>
          The list will be automatically divided into chunks of 500 numbers to
          avoid API limits.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form className="space-y-6">
          <div>
            <label className="block text-sm font-medium mb-2">
              Upload File (CSV or TXT)
            </label>
            <div
              className={`border-2 border-dashed rounded-lg p-6 text-center hover:border-primary transition duration-300 ${
                isDragging ? "border-primary bg-primary/5" : "border-input bg-muted/50"
              }`}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
            >
              <input
                type="file"
                className="hidden"
                ref={fileInputRef}
                onChange={handleFileInputChange}
                accept=".csv,.txt"
              />
              <div className="flex flex-col items-center">
                <Upload className="h-10 w-10 text-muted-foreground mb-2" />
                <p className="text-foreground mb-1">
                  Drag and drop your file here
                </p>
                <p className="text-muted-foreground text-sm mb-3">or</p>
                <Button type="button" onClick={handleBrowseClick}>
                  Browse Files
                </Button>
                <p className="text-muted-foreground text-xs mt-3">
                  Max file size: 10MB. Supported formats: CSV, TXT
                </p>
              </div>
            </div>
          </div>

          {file && (
            <div>
              <label className="block text-sm font-medium mb-2">
                File Preview (first 10 numbers)
              </label>
              <div className="bg-muted rounded-md p-4 font-mono text-sm">
                <div className="mb-2 flex justify-between">
                  <span className="font-medium">{file.name}</span>
                  <span className="text-muted-foreground">{fileSize}</span>
                </div>
                <ul className="space-y-1 divide-y divide-border">
                  {previewNumbers.map((number, index) => (
                    <li key={index} className="py-1">
                      {number}
                    </li>
                  ))}
                </ul>
                <p className="mt-2 text-muted-foreground text-xs">
                  Detected <span>{numbers.length.toLocaleString()}</span> phone
                  numbers
                </p>
              </div>
            </div>
          )}

          {batchCount > 0 && (
            <div>
              <label className="block text-sm font-medium mb-2">
                Processing Information
              </label>
              <div className="bg-muted rounded-md p-4">
                <p>
                  Numbers will be processed in{" "}
                  <span className="font-medium">{batchCount}</span> batches of
                  500 numbers each.
                </p>
                <p className="text-muted-foreground text-sm mt-2">
                  Estimated completion time: ~{batchCount * 2} minutes
                </p>
              </div>
            </div>
          )}

          <div className="flex justify-end">
            <Button
              type="button"
              variant="outline"
              onClick={handleReset}
              disabled={!file}
              className="mr-3"
            >
              Reset
            </Button>
            <Button
              type="button"
              onClick={handleStartCheck}
              disabled={!file || numbers.length === 0}
            >
              Start Checking
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
