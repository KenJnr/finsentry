// app/upload/page.tsx

"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Sidebar } from "@/components/dashboard/Sidebar";
import { FileUpload } from "@/components/upload/FileUpload";
import { UploadProgress } from "@/components/upload/UploadProgress";
import { UploadHistory } from "@/components/upload/UploadHistory";
import { supabase } from "@/lib/supabase";
import {
  Upload as UploadIcon,
  CheckCircle,
  AlertCircle,
  FileText,
  Download,
  Copy,
  Eye,
} from "lucide-react";

export default function UploadPage() {
  const router = useRouter();
  const [isMobile, setIsMobile] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [uploadStatus, setUploadStatus] = useState<
    "idle" | "uploading" | "processing" | "complete" | "error"
  >("idle");
  const [progress, setProgress] = useState(0);
  const [uploadedFile, setUploadedFile] = useState<{
    name: string;
    size: number;
    transactions?: number;
  } | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [csvData, setCsvData] = useState<string | null>(null);
  const [showCSV, setShowCSV] = useState(false);
  const [uploadHistory, setUploadHistory] = useState<
    Array<{
      id: string;
      name: string;
      date: string;
      status: "success" | "failed" | "processing";
      transactions: number;
    }>
  >([]);
  const [showAllHistory, setShowAllHistory] = useState(false);
  const [isLoadingHistory, setIsLoadingHistory] = useState(true);

  // Check if mobile and get sidebar state
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 1024);
    };
    checkMobile();
    window.addEventListener("resize", checkMobile);

    const saved = localStorage.getItem("sidebar-collapsed");
    if (saved !== null) {
      setIsCollapsed(JSON.parse(saved));
    }

    const handleStorageChange = (event: StorageEvent) => {
      if (event.key === "sidebar-collapsed") {
        setIsCollapsed(JSON.parse(event.newValue || "false"));
      }
    };
    window.addEventListener("storage", handleStorageChange);

    loadUploadHistory();

    return () => {
      window.removeEventListener("resize", checkMobile);
      window.removeEventListener("storage", handleStorageChange);
    };
  }, []);

  const loadUploadHistory = async () => {
    try {
      setIsLoadingHistory(true);
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session) return;

      const { data, error } = await supabase
        .from("uploads")
        .select("*")
        .eq("user_id", session.user.id)
        .order("uploaded_at", { ascending: false })
        .limit(10);

      if (error) throw error;

      if (data && data.length > 0) {
        setUploadHistory(
          data.map((item: any) => ({
            id: item.id,
            name: item.file_name,
            date: new Date(item.uploaded_at).toISOString().split("T")[0],
            status: item.status || "success",
            transactions: item.transaction_count || 0,
            file_url: item.file_url,
          })),
        );
      } else {
        setUploadHistory([]);
      }
    } catch (error) {
      console.error("Error loading upload history:", error);
    } finally {
      setIsLoadingHistory(false);
    }
  };

  const handleDeleteUpload = async (id: string) => {
    await loadUploadHistory();
  };

  const handleDeleteAllUploads = async () => {
    await loadUploadHistory();
  };

  const handleUploadStart = async (file: File) => {
    setUploadStatus("uploading");
    setUploadedFile({ name: file.name, size: file.size });
    setProgress(0);
    setCsvData(null);
    setUploadError(null);

    const interval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 90) {
          clearInterval(interval);
          return 90;
        }
        return prev + 5;
      });
    }, 200);
  };

  const handleUploadComplete = async (result: any) => {
    // Update status to processing (categorizing)
    setUploadStatus("processing");
    setProgress(95);
    
    // Simulate processing delay
    setTimeout(() => {
      setProgress(100);
      setUploadStatus("complete");
      setUploadedFile((prev) =>
        prev ? { ...prev, transactions: result.count } : null,
      );

      // Save CSV data
      if (result.csv) {
        setCsvData(result.csv);
      }

      // Add to history - refresh from database
      loadUploadHistory();
    }, 1500);
  };

  const handleUploadError = (error: string) => {
    setUploadStatus("error");
    setUploadError(error);
    setProgress(0);
  };

  const handleReset = () => {
    setUploadStatus("idle");
    setProgress(0);
    setUploadedFile(null);
    setUploadError(null);
    setCsvData(null);
    setShowCSV(false);
  };

  const handleViewAllHistory = () => {
    setShowAllHistory(true);
  };

  const handleCopyCSV = () => {
    if (csvData) {
      navigator.clipboard
        .writeText(csvData)
        .then(() => alert("CSV copied to clipboard!"))
        .catch(() => alert("Failed to copy CSV"));
    }
  };

  const handleDownloadCSV = () => {
    if (csvData && uploadedFile) {
      const blob = new Blob([csvData], { type: "text/csv" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${uploadedFile.name.replace(/\.[^.]+$/, "")}_transactions.csv`;
      a.click();
      URL.revokeObjectURL(url);
    }
  };

  // Calculate padding based on sidebar state
  const getMainPadding = () => {
    if (isMobile) return "pl-0 pt-16";
    if (isCollapsed) return "pl-[72px]";
    return "pl-[240px]";
  };

  // Check if upload is in progress
  const isUploading =
    uploadStatus === "uploading" || uploadStatus === "processing";
  const isComplete = uploadStatus === "complete";
  const isIdle = uploadStatus === "idle";
  const isError = uploadStatus === "error";

  return (
    <div className="min-h-screen bg-gray-50">
      <Sidebar isMobile={isMobile} />

      <main
        className={`
        transition-all duration-300 min-h-screen
        ${getMainPadding()}
      `}
      >
        <div className="max-w-7xl mx-auto px-3 sm:px-4 lg:px-6 py-4 sm:py-6">
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
            <div>
              <h1 className="text-xl sm:text-2xl font-bold text-navy">
                Upload Statement
              </h1>
              <p className="text-xs sm:text-sm text-gray-500 mt-0.5">
                Upload your mobile money statement to extract transactions
              </p>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] sm:text-xs text-gray-400">
                Supported: PDF, CSV
              </span>
            </div>
          </div>

          {/* Main Content */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
            {/* Upload Area - Takes 2/3 on desktop */}
            <div className="lg:col-span-2 space-y-4 sm:space-y-6">
              {/* Upload Card */}
              <div className="bg-white rounded-xl shadow-card-dark p-4 sm:p-6">
                <div className="flex items-center gap-2 mb-4">
                  <UploadIcon className="w-5 h-5 text-electric-blue" />
                  <h2 className="text-base sm:text-lg font-semibold text-navy">
                    Upload Statement
                  </h2>
                </div>

                {/* Show upload area when idle or error */}
                {(isIdle || isError) && (
                  <>
                    <FileUpload
                      onUploadStart={handleUploadStart}
                      isUploading={isUploading}
                      onUploadComplete={handleUploadComplete}
                      onUploadError={handleUploadError}
                    />

                    {/* Upload Error */}
                    {isError && (
                      <div className="mt-4 p-4 bg-rose-50 border border-rose-200 rounded-lg animate-fade-in">
                        <div className="flex items-start gap-3">
                          <AlertCircle className="w-5 h-5 text-rose-500 flex-shrink-0 mt-0.5" />
                          <div>
                            <h4 className="text-sm font-semibold text-rose-700">
                              Upload Failed
                            </h4>
                            <p className="text-xs text-rose-600 mt-0.5">
                              {uploadError ||
                                "There was an error processing your file. Please try again."}
                            </p>
                            <button
                              onClick={handleReset}
                              className="text-xs px-3 py-1 bg-rose-500 text-white rounded-lg hover:bg-rose-600 transition-colors mt-2"
                            >
                              Try Again
                            </button>
                          </div>
                        </div>
                      </div>
                    )}
                  </>
                )}

                {/* Show progress when uploading or processing */}
                {(isUploading || isComplete) && (
                  <UploadProgress
                    progress={progress}
                    status={uploadStatus}
                    fileName={uploadedFile?.name}
                    transactionCount={uploadedFile?.transactions}
                    onUploadAnother={handleReset}
                  />
                )}

                {/* Show success message when complete */}
                {isComplete && uploadedFile && (
                  <div className="animate-fade-in mt-4">
                    <div className="p-6 bg-gradient-to-br from-emerald-50 to-emerald-100/50 border border-emerald-200 rounded-xl">
                      <div className="flex items-start gap-4">
                        <div className="p-3 bg-emerald-500/10 rounded-full flex-shrink-0">
                          <CheckCircle className="w-8 h-8 text-emerald-500" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <h3 className="text-lg font-semibold text-emerald-700">
                            Upload Complete!
                          </h3>
                          <p className="text-sm text-emerald-600 mt-1">
                            <span className="font-medium">
                              {uploadedFile.name}
                            </span>{" "}
                            has been processed successfully.
                          </p>
                          <div className="flex items-center gap-4 mt-2 text-sm text-emerald-600">
                            <span className="flex items-center gap-1">
                              <FileText className="w-4 h-4" />
                              {uploadedFile.transactions || 0} transactions
                              found
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Tips Card */}
              <div className="rounded-xl bg-gradient-to-br from-electric-blue via-blue-500 to-blue-400 shadow-card-dark p-4 sm:p-6 transition-all duration-300 hover:shadow-card-hover hover:scale-[1.01]">
                <h3 className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
                  Tips for Best Results
                </h3>
                <ul className="space-y-2 text-xs sm:text-sm text-blue-100">
                  <li className="flex items-start gap-2">
                    <span className="text-white font-bold">•</span>
                    Make sure your statement is in PDF or CSV format
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-white font-bold">•</span>
                    The extracted CSV can be used in Excel or Google Sheets
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-white font-bold">•</span>
                    Copy the CSV to clipboard for quick pasting
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-white font-bold">•</span>
                    Download CSV for offline use
                  </li>
                </ul>
              </div>
            </div>

            {/* History - Takes 1/3 on desktop */}
            <div className="lg:col-span-1">
              {isLoadingHistory ? (
                <div className="bg-white rounded-xl shadow-card-dark p-6 flex items-center justify-center h-64">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-electric-blue"></div>
                </div>
              ) : (
                <UploadHistory
                  history={uploadHistory}
                  onViewAll={handleViewAllHistory}
                  onDelete={handleDeleteUpload}
                  onDeleteAll={handleDeleteAllUploads}
                  onRefresh={loadUploadHistory}
                  showAll={showAllHistory}
                />
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}