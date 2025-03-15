import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Check, ClipboardCopy, Download } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { ValidationStats } from "@/types";

interface ValidationResultsProps {
  stats: ValidationStats;
  validEmails: string[];
  invalidEmails: Array<{ email: string; reason: string }>;
  onStartNewValidation: () => void;
}

export default function ValidationResults({ 
  stats, 
  validEmails, 
  invalidEmails, 
  onStartNewValidation 
}: ValidationResultsProps) {
  const [activeTab, setActiveTab] = useState("valid");
  const [invalidFilter, setInvalidFilter] = useState("all");
  const [isCopied, setIsCopied] = useState(false);
  const { toast } = useToast();

  const filteredInvalidEmails = invalidFilter === "all" 
    ? invalidEmails 
    : invalidEmails.filter(item => {
        if (invalidFilter === "syntax") return item.reason.includes("Syntax");
        if (invalidFilter === "spam") return item.reason.includes("Spam");
        if (invalidFilter === "disposable") return item.reason.includes("Disposable");
        if (invalidFilter === "inactive") return item.reason.includes("Inactive");
        if (invalidFilter === "nomx") return item.reason.includes("MX records");
        if (invalidFilter === "smtp") return item.reason.includes("SMTP Verification Failed");
        return true;
      });

  // Поиск по всем адресам без ограничения количества
  const [searchQuery, setSearchQuery] = useState("");
  
  // Фильтрация по поисковому запросу без ограничения количества отображаемых адресов
  const filteredValidEmails = searchQuery 
    ? validEmails.filter(email => email.toLowerCase().includes(searchQuery.toLowerCase()))
    : validEmails;
    
  // Отображаем все адреса без ограничений
  const displayedValidEmails = filteredValidEmails;
  
  // Проверяем и логируем количество адресов для отладки
  useEffect(() => {
    console.log(`Отображение ${displayedValidEmails.length} из ${validEmails.length} валидных адресов`);
  }, [displayedValidEmails.length, validEmails.length]);

  const handleCopyValidEmails = () => {
    // Копируем ВСЕ валидные адреса, а не только отображаемые
    navigator.clipboard.writeText(validEmails.join('\n'))
      .then(() => {
        setIsCopied(true);
        setTimeout(() => setIsCopied(false), 2000);

        toast({
          title: "Copied to clipboard",
          description: `Скопировано ${stats.valid.toLocaleString()} валидных адресов.`,
        });
      })
      .catch(err => {
        toast({
          title: "Failed to copy",
          description: "Could not copy emails to clipboard.",
          variant: "destructive",
        });
        console.error(err);
      });
  };

  const handleDownloadReport = () => {
    // Create report content
    const reportDate = new Date().toLocaleString();
    const reportContent = `Email Validation Report - ${reportDate}
---------------------------------------
Total Processed: ${stats.totalProcessed}
Valid Emails: ${stats.valid}
Invalid Emails: ${stats.invalid}
Processing Time: ${stats.processingTime}

Invalid Email Breakdown:
- Syntax Errors: ${stats.invalidReasons.syntax}
- Spam Traps: ${stats.invalidReasons.spam}
- Disposable Domains: ${stats.invalidReasons.disposable}
- Inactive Accounts: ${stats.invalidReasons.inactive}
- No MX Records: ${stats.invalidReasons.noMxRecords || 0}
- SMTP Errors: ${stats.invalidReasons.smtpError || 0}

Valid Emails:
${validEmails.join('\n')}

Invalid Emails:
${invalidEmails.map(item => `${item.email} - ${item.reason}`).join('\n')}
`;

    // Create download link
    const blob = new Blob([reportContent], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `email-validation-report-${new Date().toISOString().slice(0, 10)}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div>
      <h3 className="font-medium text-slate-700 mb-3">Validation Results</h3>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-3 mb-6">
        {/* Total Processed */}
        <div className="bg-slate-100 p-3 rounded">
          <h4 className="text-xs text-slate-500 mb-1">Total Processed</h4>
          <p className="font-medium">{stats.totalProcessed.toLocaleString()}</p>
        </div>

        {/* Valid Emails */}
        <div className="bg-success/10 p-3 rounded">
          <h4 className="text-xs text-success/80 mb-1">Valid Emails</h4>
          <p className="font-medium text-success">{stats.valid.toLocaleString()}</p>
        </div>

        {/* Invalid Emails */}
        <div className="bg-destructive/10 p-3 rounded">
          <h4 className="text-xs text-destructive/80 mb-1">Invalid Emails</h4>
          <p className="font-medium text-destructive">{stats.invalid.toLocaleString()}</p>
        </div>

        {/* Processing Time */}
        <div className="bg-slate-100 p-3 rounded">
          <h4 className="text-xs text-slate-500 mb-1">Processing Time</h4>
          <p className="font-medium">{stats.processingTime}</p>
        </div>
      </div>

      {/* Invalid Reasons */}
      <div className="bg-slate-50 p-4 rounded mb-6">
        <h4 className="font-medium text-slate-700 mb-2">Invalid Email Breakdown</h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div>
            <div className="flex justify-between mb-1">
              <span className="text-sm text-slate-600">Syntax Errors</span>
              <span className="text-sm font-medium">{stats.invalidReasons.syntax.toLocaleString()}</span>
            </div>
            <div className="flex justify-between mb-1">
              <span className="text-sm text-slate-600">Spam Traps</span>
              <span className="text-sm font-medium">{stats.invalidReasons.spam.toLocaleString()}</span>
            </div>
          </div>
          <div>
            <div className="flex justify-between mb-1">
              <span className="text-sm text-slate-600">Disposable Domains</span>
              <span className="text-sm font-medium">{stats.invalidReasons.disposable.toLocaleString()}</span>
            </div>
            <div className="flex justify-between mb-1">
              <span className="text-sm text-slate-600">Inactive Accounts</span>
              <span className="text-sm font-medium">{stats.invalidReasons.inactive.toLocaleString()}</span>
            </div>
            <div className="flex justify-between mb-1">
              <span className="text-sm text-slate-600">No MX Records</span>
              <span className="text-sm font-medium">{stats.invalidReasons.noMxRecords?.toLocaleString() || 0}</span>
            </div>
            <div className="flex justify-between mb-1">
              <span className="text-sm text-slate-600">SMTP Errors</span>
              <span className="text-sm font-medium">{stats.invalidReasons.smtpError?.toLocaleString() || 0}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs for Valid/Invalid Lists */}
      <Tabs defaultValue="valid" className="mb-6">
        <TabsList className="mb-4 border-b border-slate-200 w-full bg-transparent p-0 h-auto">
          <TabsTrigger 
            value="valid" 
            className="py-2 px-4 font-medium data-[state=active]:border-b-2 data-[state=active]:border-primary data-[state=active]:text-primary data-[state=inactive]:border-b-2 data-[state=inactive]:border-transparent data-[state=inactive]:text-slate-500 rounded-none h-auto"
            onClick={() => setActiveTab("valid")}
          >
            Valid Emails
          </TabsTrigger>
          <TabsTrigger 
            value="invalid" 
            className="py-2 px-4 font-medium data-[state=active]:border-b-2 data-[state=active]:border-primary data-[state=active]:text-primary data-[state=inactive]:border-b-2 data-[state=inactive]:border-transparent data-[state=inactive]:text-slate-500 rounded-none h-auto"
            onClick={() => setActiveTab("invalid")}
          >
            Invalid Emails
          </TabsTrigger>
        </TabsList>

        <TabsContent value="valid" className="p-0 mt-0">
          <div className="mb-3">
            <div className="flex justify-between items-center mb-2">
              <h4 className="font-medium text-slate-700">Valid Emails (<span>{stats.valid.toLocaleString()}</span>)</h4>
              <Button
                size="sm"
                className="bg-primary text-white text-sm py-1.5 px-3 rounded flex items-center"
                onClick={handleCopyValidEmails}
              >
                {isCopied ? (
                  <>
                    <Check className="h-4 w-4 mr-1" />
                    Copied!
                  </>
                ) : (
                  <>
                    <ClipboardCopy className="h-4 w-4 mr-1" />
                    Copy All
                  </>
                )}
              </Button>
            </div>
            <div className="mb-2">
              <input
                type="text"
                placeholder="Поиск по email..."
                className="w-full p-2 border border-slate-200 rounded text-sm"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <div className="bg-slate-50 border border-slate-200 rounded h-48 overflow-y-auto p-3 text-sm">
              {validEmails.length === 0 ? (
                <p className="text-slate-500 italic">No valid emails found...</p>
              ) : (
                <>
                  {displayedValidEmails.map((email, index) => (
                    <div key={index} className="mb-1 text-slate-700">
                      {email}
                    </div>
                  ))}
                </>
              )}
              {filteredValidEmails.length === 0 && searchQuery && (
                <p className="text-slate-500 italic">Нет результатов для "{searchQuery}"</p>
              )}
              <div className="mt-2 text-xs text-slate-500">
                Показано {displayedValidEmails.length} адресов
                {searchQuery && ` (найдено ${filteredValidEmails.length})`}
                {validEmails.length < stats.valid && 
                  <span className="text-destructive ml-1">(Ошибка: отображено не все адреса, получено {validEmails.length} из {stats.valid})</span>
                }
              </div>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="invalid" className="p-0 mt-0">
          <div className="mb-3">
            <div className="flex justify-between items-center mb-2">
              <h4 className="font-medium text-slate-700">Invalid Emails (<span>{stats.invalid.toLocaleString()}</span>)</h4>
              <div>
                <Select
                  value={invalidFilter}
                  onValueChange={setInvalidFilter}
                >
                  <SelectTrigger className="text-sm border border-slate-300 rounded h-8 min-w-[140px]">
                    <SelectValue placeholder="Filter by issue" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Issues</SelectItem>
                    <SelectItem value="syntax">Syntax Errors</SelectItem>
                    <SelectItem value="spam">Spam Traps</SelectItem>
                    <SelectItem value="disposable">Disposable Domains</SelectItem>
                    <SelectItem value="inactive">Inactive Accounts</SelectItem>
                    <SelectItem value="nomx">No MX Records</SelectItem>
                    <SelectItem value="smtp">SMTP Errors</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="bg-slate-50 border border-slate-200 rounded h-48 overflow-y-auto p-3 text-sm">
              {filteredInvalidEmails.length === 0 ? (
                <p className="text-slate-500 italic">No invalid emails found with this filter...</p>
              ) : (
                filteredInvalidEmails.map((item, index) => (
                  <div key={index} className="mb-1 flex justify-between">
                    <span className="text-slate-700">{item.email}</span>
                    <span className="text-destructive text-xs bg-destructive/10 px-2 py-0.5 rounded">{item.reason}</span>
                  </div>
                ))
              )}
              {filteredInvalidEmails.length > 0 && stats.invalid > filteredInvalidEmails.length && (
                <div className="mt-2 text-slate-500 italic">
                  And {(
                    invalidFilter === "all" 
                      ? stats.invalid - filteredInvalidEmails.length 
                      : invalidEmails.filter(item => {
                          if (invalidFilter === "syntax") return item.reason.includes("Syntax");
                          if (invalidFilter === "spam") return item.reason.includes("Spam");
                          if (invalidFilter === "disposable") return item.reason.includes("Disposable");
                          if (invalidFilter === "inactive") return item.reason.includes("Inactive");
                          if (invalidFilter === "nomx") return item.reason.includes("MX records");
                          if (invalidFilter === "smtp") return item.reason.includes("SMTP Verification Failed");
                          return true;
                        }).length - filteredInvalidEmails.length
                  ).toLocaleString()} more emails...
                </div>
              )}
            </div>
          </div>
        </TabsContent>
      </Tabs>

      {/* Actions */}
      <div className="flex justify-between mt-6">
        <Button
          variant="outline"
          className="bg-slate-200 hover:bg-slate-300 text-slate-800 border-none"
          onClick={onStartNewValidation}
        >
          Start New Validation
        </Button>
        <Button
          className="bg-primary hover:bg-primary/90 text-white"
          onClick={handleDownloadReport}
        >
          <Download className="h-4 w-4 mr-2" />
          Download Report
        </Button>
      </div>
    </div>
  );
}