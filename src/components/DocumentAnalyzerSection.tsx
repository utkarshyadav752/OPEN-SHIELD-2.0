import React, { useState, useRef } from 'react';
import {
  FileText,
  Image as ImageIcon,
  ClipboardPaste,
  Upload,
  Trash2,
  Loader2,
  Check,
  Copy,
  Download,
  AlertTriangle,
  CheckCircle2,
  RotateCcw,
  GitCompare,
} from 'lucide-react';
import {
  comparePolicyDocuments,
  type AnalysisReport,
  type PolicyDiffReport,
  type RiskLevel,
  type SupportedLanguage,
} from '../engine/documentAndUrlAnalyzer';
import {
  HiddenCostCalculatorCard,
  ActionPlanChecklistCard,
  EvidenceFindingCard,
} from './IntelligenceReportSections';
import {
  ListenToResultsPanel,
  type ActiveSpokenTarget,
} from './ListenToResultsPanel';

type UploadTab = 'pdf' | 'image' | 'text' | 'compare';

interface SelectedFileState {
  fileName: string;
  mimeType: string;
  sizeBytes: number;
  base64Data: string;
  sampleImageTranscript?: string;
}

const SAMPLE_PREDATORY_TEXT = `Section 1. Automatic Renewal & Recurring Billing
Your subscription costs ₹999 per month and will automatically renew each year unless you cancel at least 30 days before your renewal date. You authorize us to charge your payment method on file for recurring annual fees.

Section 2. Strict No-Refund Policy & Early Termination Penalty
All fees are non-refundable under any circumstances. Should you cancel before the end of your 12-month commitment, you will be billed an early termination penalty equal to 50% of your remaining annual contract obligation.

Section 3. Free Trial Conversion & Pre-Selected Add-Ons
Your 14-day free trial will automatically convert to a paid annual subscription unless cancelled 48 hours prior. Optional VIP Cloud Backup (+₹299/mo) is pre-selected at checkout.

Section 4. Mandatory Binding Arbitration & Class-Action Waiver
Any dispute arising from this agreement shall be resolved exclusively through final and binding arbitration, and you waive any right to participate in a class action lawsuit.

Section 5. Third-Party Data Sharing & Unilateral Changes
We may sell your personal information to third-party marketing partners and data brokers. We may modify these terms at any time without notice.`;

const SAMPLE_FRIENDLY_TEXT = `Section 1. Transparent Month-to-Month Billing
We have zero auto-renewals without your explicit opt-in, and we never automatically renew annual plans without advance confirmation.

Section 2. Fair 30-Day Refund Guarantee
We offer a full refund policy within 30 days of purchase and a pro-rated refund at any time you choose to cancel online in one click.

Section 3. Your Legal & Privacy Rights
We do not require binding arbitration and you do not waive your class-action rights. We never sell your personal data to third parties or data brokers.`;

const SAMPLE_DIFF_VERSION_A = `Section 1. Pricing & Billing: Your subscription costs ₹499 per month and can be cancelled online at any time with one click.
Section 2. Refund Policy: We offer a full refund within 14 days of purchase.
Section 3. Privacy Policy: We never sell your personal data to third parties or data brokers.
Section 4. Dispute Resolution: Disputes may be brought in your local consumer forum or civil court.`;

const SAMPLE_DIFF_VERSION_B = `Section 1. Pricing & Billing: Your subscription costs ₹899 per month and will automatically renew each year unless cancelled 30 days prior.
Section 2. Refund Policy: All membership fees are strictly non-refundable under any circumstances and early cancellation incurs a 50% early termination penalty.
Section 3. Privacy Policy: We may share personal information with third-party marketing partners and data brokers.
Section 4. Dispute Resolution: Any dispute will be resolved by binding arbitration and you waive any right to participate in a class action lawsuit.`;

function createClientSamplePdfBase64(): { fileName: string; sizeBytes: number; base64Data: string } {
  const lines = [
    'Section 1. Subscription Renewal: Your 14-day free trial converts to INR 999/month and will automatically renew each year unless cancelled 30 days prior.',
    'Section 2. Refunds & Early Termination: All fees are non-refundable under any circumstances and early cancellation incurs a 50% of remaining annual contract penalty.',
    'Section 3. Preselected Add-Ons: Optional VIP Cloud Protection (+INR 249/mo) is pre-selected at checkout.',
    'Section 4. Dispute Resolution: All disputes shall be resolved through binding arbitration and you waive any right to a class action lawsuit.',
    'Section 5. Privacy & Data Brokers: We may sell your personal information to third-party marketing partners and modify these terms at any time without notice.',
  ];
  const tjStream = lines
    .map((l) => `(${l.replace(/\\/g, '\\\\').replace(/\(/g, '\\(').replace(/\)/g, '\\)')}) Tj`)
    .join('\n');
  const rawPdf = `%PDF-1.4
1 0 obj
<< /Type /Catalog /Pages 2 0 R >>
endobj
2 0 obj
<< /Type /Pages /Count 2 >>
endobj
3 0 obj
<< /Type /Page >>
endobj
4 0 obj
<< /Type /Page >>
endobj
stream
BT
${tjStream}
ET
endstream
%%EOF`;
  const bytes = new TextEncoder().encode(rawPdf);
  let binary = '';
  bytes.forEach((b) => {
    binary += String.fromCharCode(b);
  });
  const base64Data = btoa(binary);
  return {
    fileName: 'StreamVault-Annual-Subscription-Agreement.pdf',
    sizeBytes: bytes.byteLength,
    base64Data,
  };
}

function createClientSamplePngBase64(): {
  fileName: string;
  sizeBytes: number;
  base64Data: string;
  transcript: string;
} {
  const pngBytes = new Uint8Array([
    0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00, 0x00, 0x0d, 0x49, 0x48, 0x44, 0x52,
    0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01, 0x08, 0x06, 0x00, 0x00, 0x00, 0x1f, 0x15, 0xc4,
    0x89, 0x00, 0x00, 0x00, 0x0a, 0x49, 0x44, 0x41, 0x54, 0x78, 0x9c, 0x63, 0x00, 0x01, 0x00, 0x00,
    0x05, 0x00, 0x01, 0x0d, 0x0a, 0x2d, 0xb4, 0x00, 0x00, 0x00, 0x00, 0x49, 0x45, 0x4e, 0x44, 0xae,
    0x42, 0x60, 0x82,
  ]);
  let binary = '';
  pngBytes.forEach((b) => {
    binary += String.fromCharCode(b);
  });
  return {
    fileName: 'GymClub-Signup-Contract-Photo.png',
    sizeBytes: pngBytes.byteLength,
    base64Data: btoa(binary),
    transcript: `Section 1. Trial & Recurring Dues: Your 7-day free trial will automatically convert to a paid membership of ₹1,999/mo and automatically renew each month.
Section 2. Cancellation Rules: To cancel your membership, written notification must be delivered in person at your home club or via certified mail. All fees are non-refundable under any circumstances.
Section 3. Arbitration: By signing, you submit to binding arbitration and waive class action rights.`,
  };
}

interface DocumentAnalyzerSectionProps {
  lang: SupportedLanguage;
  externalPasteText?: string | null;
  onClearExternalPasteText?: () => void;
}

export const DocumentAnalyzerSection: React.FC<DocumentAnalyzerSectionProps> = ({
  lang,
  externalPasteText,
  onClearExternalPasteText,
}) => {
  const [activeTab, setActiveTab] = useState<UploadTab>('pdf');
  const [selectedFile, setSelectedFile] = useState<SelectedFileState | null>(() => {
    const samplePdf = createClientSamplePdfBase64();
    return {
      fileName: samplePdf.fileName,
      mimeType: 'application/pdf',
      sizeBytes: samplePdf.sizeBytes,
      base64Data: samplePdf.base64Data,
    };
  });
  const [pastedText, setPastedText] = useState<string>(SAMPLE_PREDATORY_TEXT);

  // Version Diff Comparison state
  const [versionAText, setVersionAText] = useState<string>(SAMPLE_DIFF_VERSION_A);
  const [versionBText, setVersionBText] = useState<string>(SAMPLE_DIFF_VERSION_B);
  const [diffReport, setDiffReport] = useState<PolicyDiffReport | null>(null);

  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [isAnalyzing, setIsAnalyzing] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [report, setReport] = useState<AnalysisReport | null>(null);
  const [riskFilter, setRiskFilter] = useState<'ALL' | RiskLevel>('ALL');
  const [highlightedQuote, setHighlightedQuote] = useState<string | null>(null);
  const [copiedReport, setCopiedReport] = useState<boolean>(false);
  const [activeSpokenTarget, setActiveSpokenTarget] = useState<ActiveSpokenTarget>({
    sectionId: null,
    findingId: null,
    kind: null,
  });

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const extractedTextRef = useRef<HTMLDivElement | null>(null);

  React.useEffect(() => {
    if (externalPasteText !== null && externalPasteText !== undefined) {
      setActiveTab('text');
      if (externalPasteText.trim()) {
        setPastedText(externalPasteText);
      }
      onClearExternalPasteText?.();
    }
  }, [externalPasteText, onClearExternalPasteText]);

  const handleFileSelect = (file: File) => {
    setErrorMsg(null);

    if (file.size === 0) {
      setErrorMsg(`The file "${file.name}" is empty (0 bytes).`);
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setErrorMsg(
        `File "${file.name}" (${(file.size / (1024 * 1024)).toFixed(2)} MB) exceeds the 5.00 MB limit.`
      );
      return;
    }

    const lower = file.name.toLowerCase();
    const validPdf = lower.endsWith('.pdf') || file.type === 'application/pdf';
    const validImage =
      lower.endsWith('.jpg') ||
      lower.endsWith('.jpeg') ||
      lower.endsWith('.png') ||
      lower.endsWith('.webp') ||
      file.type === 'image/jpeg' ||
      file.type === 'image/png' ||
      file.type === 'image/webp';

    if (!validPdf && !validImage) {
      setErrorMsg(
        `Unsupported file format "${file.name}". Supported formats: .pdf, .jpg, .jpeg, .png, .webp.`
      );
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const resultStr = String(reader.result || '');
      const base64 = resultStr.includes(',') ? resultStr.split(',')[1] : resultStr;
      setSelectedFile({
        fileName: file.name,
        mimeType: file.type || (validPdf ? 'application/pdf' : 'image/png'),
        sizeBytes: file.size,
        base64Data: base64,
      });
      if (validPdf) setActiveTab('pdf');
      else setActiveTab('image');
    };
    reader.onerror = () => {
      setErrorMsg('Failed to read the selected file from disk.');
    };
    reader.readAsDataURL(file);
  };

  const handleAnalyzeDocument = async () => {
    setErrorMsg(null);
    setHighlightedQuote(null);

    if (activeTab === 'compare') {
      if (!versionAText.trim() || !versionBText.trim()) {
        setErrorMsg('Please provide both Version A and Version B policy text to compare.');
        return;
      }
      const computedDiff = comparePolicyDocuments(
        versionAText,
        versionBText,
        'Version A (Previous Policy)',
        'Version B (Updated Policy)'
      );
      setDiffReport(computedDiff);
      return;
    }

    if (activeTab === 'text') {
      if (!pastedText.trim()) {
        setErrorMsg('Please paste your Terms & Conditions or policy text before analyzing.');
        return;
      }
    } else if (!selectedFile) {
      setErrorMsg(
        activeTab === 'pdf'
          ? 'Please select or drop a PDF file (.pdf) first.'
          : 'Please select or drop an image file (.jpg, .png, .webp) first.'
      );
      return;
    }

    setIsAnalyzing(true);
    try {
      const payload =
        activeTab === 'text'
          ? {
              fileName: 'Pasted Terms & Conditions.txt',
              mimeType: 'text/plain',
              sizeBytes: new Blob([pastedText]).size,
              plainText: pastedText,
            }
          : {
              fileName: selectedFile!.fileName,
              mimeType: selectedFile!.mimeType,
              sizeBytes: selectedFile!.sizeBytes,
              base64Data: selectedFile!.base64Data,
              sampleImageTranscript: selectedFile!.sampleImageTranscript,
            };

      const res = await fetch('/api/analyze-document', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok || data.error) {
        setErrorMsg(data.error || 'Could not analyze the document.');
      } else {
        setReport(data.report);
        setRiskFilter('ALL');
      }
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : 'Network error while analyzing document.');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleCopyReport = () => {
    if (!report) return;
    const summaryLines = [
      `OpenShield Document Analysis Report — ${report.title}`,
      `Scanned At: ${new Date(report.scannedAt).toLocaleString()}`,
      `Overall Assessment: ${report.overallRisk} (${report.findings.length} findings across ${report.clausesAnalyzed} clauses)`,
      `Summary: ${lang === 'hi' ? report.overallSummaryHi : report.overallSummary}`,
      '',
      ...report.findings.map(
        (f, i) =>
          `${i + 1}. [${f.riskLevel.toUpperCase()}] ${f.category} — ${
            lang === 'hi' ? f.titleHi : f.title
          } (${f.location})\n   Explanation: ${
            lang === 'hi' ? f.explanationHi : f.explanation
          }\n   Exact Quote: "${f.quote}"\n   Why It Matters: ${
            lang === 'hi' ? f.whyItMattersHi : f.whyItMatters
          }\n   What To Check: ${lang === 'hi' ? f.whatToCheckHi : f.whatToCheck}`
      ),
    ].join('\n');
    navigator.clipboard?.writeText(summaryLines);
    setCopiedReport(true);
    setTimeout(() => setCopiedReport(false), 2000);
  };

  const handleDownloadReport = () => {
    if (!report) return;
    const blob = new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `openshield-document-report-${report.title.replace(/[^a-z0-9.-]/gi, '-')}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleJumpToQuote = (quote: string) => {
    setHighlightedQuote(quote);
    extractedTextRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  };

  const filteredFindings = report
    ? riskFilter === 'ALL'
      ? report.findings
      : report.findings.filter((f) => f.riskLevel === riskFilter)
    : [];

  return (
    <section
      id="upload-document-section"
      data-testid="upload-document-section"
      className="rounded-2xl bg-white border border-slate-200 p-6 sm:p-8"
    >
      {/* Section Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-6 border-b border-slate-200">
        <div>
          <div className="text-xs font-bold text-[#0b57d0] tracking-wide mb-1">
            02. Upload &amp; Analyze Documents (PDF · Screenshot · Text · Policy Diff)
          </div>
          <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900">
            {lang === 'hi'
              ? 'दस्तावेज़ अपलोड करें। बारीक शर्तों को सरल भाषा में समझें।'
              : 'Upload a document. Understand the fine print.'}
          </h2>
          <p className="text-sm text-slate-600 mt-1 max-w-3xl">
            {lang === 'hi'
              ? 'PDF अपलोड करें, स्क्रीनशॉट चुनें, अपना अनुबंध पेस्ट करें या दो नीतियों की तुलना करें। OpenShield छिपे हुए खर्चों और अनुचित शर्तों को प्रमाण-सहित समझाएगा।'
              : 'Upload a PDF, snap a photo, paste your Terms & Conditions, or compare two policy versions. OpenShield analyzes the content and explains potentially unfair terms in plain English.'}
          </p>
        </div>

        {/* Privacy & Ephemeral Processing Reassurance */}
        <div className="text-xs text-slate-600 bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 shrink-0">
          <div className="font-bold text-slate-900">
            {lang === 'hi' ? 'अस्थायी इन-मेमोरी प्रोसेसिंग' : 'Ephemeral In-Memory Processing'}
          </div>
          <div>
            {lang === 'hi'
              ? 'फ़ाइलें केवल मेमोरी में जाँची जाती हैं और कभी भी स्थायी रूप से स्टोर नहीं की जातीं।'
              : 'Files are analyzed in memory and never stored permanently.'}
          </div>
        </div>
      </div>

      {/* 4 Selectable Input Tabs: PDF | Image | Paste Text | Compare Versions */}
      <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
        <div
          role="tablist"
          aria-label="Document input mode"
          className="inline-flex flex-wrap rounded-xl bg-slate-100 p-1 border border-slate-200 gap-1"
        >
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'pdf'}
            data-testid="tab-upload-pdf"
            onClick={() => {
              setActiveTab('pdf');
              setErrorMsg(null);
              const samplePdf = createClientSamplePdfBase64();
              setSelectedFile({
                fileName: samplePdf.fileName,
                mimeType: 'application/pdf',
                sizeBytes: samplePdf.sizeBytes,
                base64Data: samplePdf.base64Data,
              });
            }}
            className={`px-4 py-2 rounded-lg text-xs font-bold cursor-pointer transition-colors inline-flex items-center gap-1.5 ${
              activeTab === 'pdf'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <FileText className="w-3.5 h-3.5 text-[#0b57d0]" />
            <span>PDF</span>
          </button>

          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'image'}
            data-testid="tab-upload-image"
            onClick={() => {
              setActiveTab('image');
              setErrorMsg(null);
              const sampleImg = createClientSamplePngBase64();
              setSelectedFile({
                fileName: sampleImg.fileName,
                mimeType: 'image/png',
                sizeBytes: sampleImg.sizeBytes,
                base64Data: sampleImg.base64Data,
                sampleImageTranscript: sampleImg.transcript,
              });
            }}
            className={`px-4 py-2 rounded-lg text-xs font-bold cursor-pointer transition-colors inline-flex items-center gap-1.5 ${
              activeTab === 'image'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <ImageIcon className="w-3.5 h-3.5 text-[#0b57d0]" />
            <span>Image</span>
          </button>

          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'text'}
            data-testid="tab-paste-text"
            onClick={() => {
              setActiveTab('text');
              setErrorMsg(null);
            }}
            className={`px-4 py-2 rounded-lg text-xs font-bold cursor-pointer transition-colors inline-flex items-center gap-1.5 ${
              activeTab === 'text'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <ClipboardPaste className="w-3.5 h-3.5 text-[#0b57d0]" />
            <span>Paste Text</span>
          </button>

          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'compare'}
            data-testid="tab-compare-diff"
            onClick={() => {
              setActiveTab('compare');
              setErrorMsg(null);
              const initialDiff = comparePolicyDocuments(
                versionAText,
                versionBText,
                'Version A (2025 Policy)',
                'Version B (2026 Updated Policy)'
              );
              setDiffReport(initialDiff);
            }}
            className={`px-4 py-2 rounded-lg text-xs font-bold cursor-pointer transition-colors inline-flex items-center gap-1.5 ${
              activeTab === 'compare'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <GitCompare className="w-3.5 h-3.5 text-[#0b57d0]" />
            <span>Compare Versions (Diff)</span>
          </button>
        </div>

        {/* Quick Sample Loaders */}
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <span className="text-slate-500 font-medium">Quick Samples:</span>
          <button
            type="button"
            data-testid="sample-pdf-btn"
            onClick={() => {
              setActiveTab('pdf');
              setErrorMsg(null);
              const samplePdf = createClientSamplePdfBase64();
              setSelectedFile({
                fileName: samplePdf.fileName,
                mimeType: 'application/pdf',
                sizeBytes: samplePdf.sizeBytes,
                base64Data: samplePdf.base64Data,
              });
            }}
            className="px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium cursor-pointer transition-colors"
          >
            Sample Subscription PDF
          </button>

          <button
            type="button"
            data-testid="sample-image-btn"
            onClick={() => {
              setActiveTab('image');
              setErrorMsg(null);
              const sampleImg = createClientSamplePngBase64();
              setSelectedFile({
                fileName: sampleImg.fileName,
                mimeType: 'image/png',
                sizeBytes: sampleImg.sizeBytes,
                base64Data: sampleImg.base64Data,
                sampleImageTranscript: sampleImg.transcript,
              });
            }}
            className="px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium cursor-pointer transition-colors"
          >
            Sample Contract Screenshot
          </button>

          <button
            type="button"
            data-testid="sample-friendly-text-btn"
            onClick={() => {
              setActiveTab('text');
              setErrorMsg(null);
              setPastedText(SAMPLE_FRIENDLY_TEXT);
            }}
            className="px-3 py-1.5 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-900 font-medium cursor-pointer transition-colors"
          >
            Fair Terms Sample (0 Traps)
          </button>
        </div>
      </div>

      {/* Input Area */}
      <div className="mt-5">
        {activeTab === 'pdf' || activeTab === 'image' ? (
          <div
            onDragOver={(e) => {
              e.preventDefault();
              setIsDragging(true);
            }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={(e) => {
              e.preventDefault();
              setIsDragging(false);
              const file = e.dataTransfer.files?.[0];
              if (file) handleFileSelect(file);
            }}
            className={`rounded-2xl border-2 border-dashed p-6 sm:p-8 text-center transition-colors ${
              isDragging
                ? 'border-[#0b57d0] bg-blue-50/50'
                : 'border-slate-300 bg-slate-50/70 hover:border-slate-400'
            }`}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept={activeTab === 'pdf' ? '.pdf,application/pdf' : '.jpg,.jpeg,.png,.webp,image/*'}
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) handleFileSelect(file);
              }}
              className="hidden"
              data-testid="document-file-input"
            />

            <div className="w-12 h-12 rounded-2xl bg-white border border-slate-200 flex items-center justify-center mx-auto mb-3 shadow-2xs">
              <Upload className="w-5 h-5 text-[#0b57d0]" />
            </div>

            <div className="text-sm font-bold text-slate-900">
              {activeTab === 'pdf'
                ? 'Drag and drop a Terms & Conditions PDF here'
                : 'Drag and drop a screenshot or contract photo here'}
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Supported formats: <strong>.pdf, .jpg, .jpeg, .png, .webp</strong> · Maximum file
              size: <strong>5.00 MB</strong>
            </p>

            <div className="mt-4">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="px-4 py-2 rounded-xl bg-white border border-slate-300 hover:bg-slate-100 text-xs font-bold text-slate-800 cursor-pointer transition-colors"
              >
                Browse files
              </button>
            </div>

            {selectedFile && (
              <div
                data-testid="selected-file-preview"
                className="mt-5 max-w-xl mx-auto p-3.5 rounded-xl bg-white border border-slate-200 flex items-center justify-between gap-3 text-left"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-9 h-9 rounded-lg bg-slate-100 flex items-center justify-center shrink-0">
                    {selectedFile.mimeType.includes('pdf') ? (
                      <FileText className="w-4 h-4 text-[#0b57d0]" />
                    ) : (
                      <ImageIcon className="w-4 h-4 text-[#0b57d0]" />
                    )}
                  </div>
                  <div className="min-w-0">
                    <div className="text-xs font-bold text-slate-900 truncate">
                      {selectedFile.fileName}
                    </div>
                    <div className="text-[11px] text-slate-500 tabular-nums">
                      {selectedFile.mimeType} · {(selectedFile.sizeBytes / 1024).toFixed(1)} KB
                    </div>
                  </div>
                </div>

                <button
                  type="button"
                  aria-label="Remove selected file"
                  onClick={() => setSelectedFile(null)}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 cursor-pointer transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>
        ) : activeTab === 'text' ? (
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs text-slate-600">
              <label htmlFor="paste-legal-textarea" className="font-bold text-slate-800">
                Paste Terms of Service, Privacy Policy, Rental Lease, or Subscription Fine Print:
              </label>
              <span className="font-mono tabular-nums text-slate-500">
                {pastedText.length.toLocaleString()} / 250,000 characters
              </span>
            </div>
            <textarea
              id="paste-legal-textarea"
              data-testid="paste-legal-textarea"
              rows={7}
              value={pastedText}
              onChange={(e) => setPastedText(e.target.value)}
              placeholder="Paste any contract clauses, checkout terms, cancellation policy, or subscription disclosure here..."
              className="w-full p-4 rounded-xl bg-slate-50 border border-slate-300 text-xs sm:text-sm text-slate-900 font-mono leading-relaxed focus:outline-none focus:border-[#0b57d0] focus:bg-white"
            />
          </div>
        ) : (
          /* Compare Two Versions Tab */
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-800 block">
                Version A — Previous Policy / Original Agreement:
              </label>
              <textarea
                rows={6}
                data-testid="diff-version-a-input"
                value={versionAText}
                onChange={(e) => setVersionAText(e.target.value)}
                className="w-full p-3.5 rounded-xl bg-slate-50 border border-slate-300 text-xs font-mono text-slate-900 leading-relaxed focus:outline-none focus:border-[#0b57d0]"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-800 block">
                Version B — Updated Policy / New Agreement:
              </label>
              <textarea
                rows={6}
                data-testid="diff-version-b-input"
                value={versionBText}
                onChange={(e) => setVersionBText(e.target.value)}
                className="w-full p-3.5 rounded-xl bg-slate-50 border border-slate-300 text-xs font-mono text-slate-900 leading-relaxed focus:outline-none focus:border-[#0b57d0]"
              />
            </div>
          </div>
        )}

        {/* Action Row */}
        <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
          <div className="text-xs text-slate-500">
            {activeTab === 'compare'
              ? 'Compares exact clause wording between Version A and Version B (ignoring whitespace/formatting noise).'
              : 'Includes Hidden Cost Calculator, Action Plan Checklist, Clause Translator, and India Legal Context.'}
          </div>

          <button
            type="button"
            disabled={isAnalyzing}
            data-testid="analyze-document-btn"
            onClick={handleAnalyzeDocument}
            className="px-6 py-3 rounded-xl bg-[#0b57d0] hover:bg-[#0842a0] disabled:opacity-50 text-white font-bold text-sm cursor-pointer transition-colors inline-flex items-center justify-center gap-2 whitespace-nowrap shrink-0"
          >
            {isAnalyzing ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Analyzing document...</span>
              </>
            ) : activeTab === 'compare' ? (
              <>
                <GitCompare className="w-4 h-4" />
                <span>Compare policy versions</span>
              </>
            ) : (
              <>
                <FileText className="w-4 h-4" />
                <span>Analyze document</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Error Notice */}
      {errorMsg && (
        <div
          data-testid="document-error-alert"
          className="mt-5 p-4 rounded-xl bg-red-50 border border-red-200 text-xs text-red-800 flex items-start gap-2.5"
        >
          <AlertTriangle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
          <div>
            <div className="font-bold">Document Analysis Notice</div>
            <div className="mt-0.5">{errorMsg}</div>
          </div>
        </div>
      )}

      {/* =====================================================================
          POLICY VERSION COMPARISON RESULTS (WHEN COMPARE TAB IS ACTIVE)
         ===================================================================== */}
      {activeTab === 'compare' && diffReport && (
        <div
          data-testid="policy-diff-report"
          className="mt-8 pt-6 border-t border-slate-200 space-y-4"
        >
          <div className="p-5 rounded-xl bg-slate-50 border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="text-xs font-bold text-[#0b57d0] uppercase tracking-wider">
                Side-by-Side Policy Version Diff ({diffReport.versionALabel} →{' '}
                {diffReport.versionBLabel})
              </div>
              <p className="text-sm font-bold text-slate-900 mt-1">
                {lang === 'hi' ? diffReport.summaryHi : diffReport.summaryEn}
              </p>
            </div>
            <div className="flex items-center gap-2 text-xs font-bold shrink-0">
              <span className="px-3 py-1 rounded-lg bg-amber-100 text-amber-900">
                {diffReport.modifiedCount} Modified
              </span>
              <span className="px-3 py-1 rounded-lg bg-red-100 text-red-900">
                +{diffReport.addedCount} Added
              </span>
              <span className="px-3 py-1 rounded-lg bg-slate-200 text-slate-800">
                -{diffReport.removedCount} Removed
              </span>
            </div>
          </div>

          <div className="space-y-3">
            {diffReport.changes.map((chg) => (
              <div
                key={chg.id}
                data-testid="policy-diff-change-card"
                className="p-4 rounded-xl bg-white border border-slate-200 space-y-2.5 text-xs"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="font-extrabold text-slate-900">{chg.changeType}</span>
                  <span
                    className={`px-2.5 py-0.5 rounded font-bold ${
                      chg.riskImpact === 'Increased Risk'
                        ? 'bg-red-100 text-red-900'
                        : chg.riskImpact === 'Reduced Risk'
                        ? 'bg-emerald-100 text-emerald-900'
                        : 'bg-slate-100 text-slate-700'
                    }`}
                  >
                    {chg.riskImpact}
                  </span>
                </div>
                <p className="text-slate-700">
                  {lang === 'hi' ? chg.summaryHi : chg.summaryEn}
                </p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div className="p-3 rounded-lg bg-red-50/50 border border-red-200 font-mono text-slate-800">
                    <div className="text-[10px] font-sans font-bold uppercase text-red-800 mb-1">
                      Version A (Before)
                    </div>
                    {chg.beforeQuote ? `“${chg.beforeQuote}”` : '— Not present in Version A —'}
                  </div>
                  <div className="p-3 rounded-lg bg-emerald-50/50 border border-emerald-200 font-mono text-slate-800">
                    <div className="text-[10px] font-sans font-bold uppercase text-emerald-800 mb-1">
                      Version B (After)
                    </div>
                    {chg.afterQuote ? `“${chg.afterQuote}”` : '— Removed in Version B —'}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* =====================================================================
          DETAILED DOCUMENT ANALYSIS RESULTS VIEW
         ===================================================================== */}
      {activeTab !== 'compare' && report && (
        <div
          data-testid="document-analysis-report"
          className="mt-8 pt-6 border-t border-slate-200 space-y-6"
        >
          {/* 1. Document Overview Bar + User Actions */}
          <div
            data-tts-active={activeSpokenTarget.kind === 'overview' ? 'true' : 'false'}
            className={`flex flex-col lg:flex-row lg:items-center justify-between gap-4 p-5 rounded-xl border transition-all ${
              activeSpokenTarget.kind === 'overview'
                ? 'bg-blue-50/60 border-[#0b57d0] ring-2 ring-[#0b57d0]/60 shadow-sm'
                : 'bg-slate-50 border-slate-200'
            }`}
          >
            <div className="space-y-1">
              <div className="flex flex-wrap items-center gap-2 text-xs text-slate-600">
                <span className="font-bold text-slate-900">{report.title}</span>
                <span aria-hidden="true">·</span>
                <span className="uppercase font-semibold">{report.sourceType}</span>
                {report.pageCount && (
                  <>
                    <span aria-hidden="true">·</span>
                    <span className="tabular-nums">
                      {report.pageCount} {report.pageCount === 1 ? 'page/section' : 'pages'}
                    </span>
                  </>
                )}
                <span aria-hidden="true">·</span>
                <span className="tabular-nums">{report.clausesAnalyzed} clauses analyzed</span>
                <span aria-hidden="true">·</span>
                <span>{report.analysisMode}</span>
              </div>

              <div className="text-base font-extrabold text-slate-900">
                {lang === 'hi' ? 'समग्र जोखिम मूल्यांकन:' : 'Overall Assessment:'}{' '}
                <span
                  className={
                    report.overallRisk === 'High Concern'
                      ? 'text-red-700'
                      : report.overallRisk === 'Moderate Concern'
                      ? 'text-amber-700'
                      : 'text-emerald-700'
                  }
                >
                  {report.overallRisk}
                </span>
              </div>

              <p className="text-xs sm:text-sm text-slate-700 max-w-3xl leading-relaxed">
                {lang === 'hi' ? report.overallSummaryHi : report.overallSummary}
              </p>
              <p className="text-[11px] text-slate-500">
                {lang === 'hi' ? report.limitationsHi : report.limitations}
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={handleCopyReport}
                className="px-3.5 py-2 rounded-lg bg-white border border-slate-300 hover:bg-slate-100 text-xs font-bold text-slate-800 cursor-pointer inline-flex items-center gap-1.5"
              >
                {copiedReport ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Copied report</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    <span>Copy report</span>
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={handleDownloadReport}
                className="px-3.5 py-2 rounded-lg bg-white border border-slate-300 hover:bg-slate-100 text-xs font-bold text-slate-800 cursor-pointer inline-flex items-center gap-1.5"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Download report</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setReport(null);
                  setHighlightedQuote(null);
                }}
                className="px-3.5 py-2 rounded-lg bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold cursor-pointer inline-flex items-center gap-1.5"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Analyze another document</span>
              </button>
            </div>
          </div>

          {/* 1B. Listen to Results (Text-to-Speech) Panel */}
          <ListenToResultsPanel
            report={report}
            lang={lang}
            testIdPrefix="doc-tts"
            onActiveTargetChange={(target) => {
              setActiveSpokenTarget(target);
              if (target.findingId && riskFilter !== 'ALL') {
                setRiskFilter('ALL');
              }
            }}
          />

          {report.promptInjectionDetected && (
            <div className="p-4 rounded-xl bg-amber-50 border border-amber-300 text-xs text-amber-950">
              <div className="font-bold">Untrusted Prompt-Injection Attempt Isolated</div>
              <div className="mt-0.5">{report.promptInjectionNote}</div>
            </div>
          )}

          {/* 2. Hidden Cost Calculator */}
          <HiddenCostCalculatorCard
            rawText={report.extractedText}
            initialEstimate={report.hiddenCostEstimate}
            lang={lang}
            onJumpToQuote={handleJumpToQuote}
          />

          {/* 3. Risk Summary Filter Buttons */}
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
            <button
              type="button"
              onClick={() => setRiskFilter('ALL')}
              className={`p-3.5 rounded-xl border text-left cursor-pointer transition-colors ${
                riskFilter === 'ALL'
                  ? 'bg-slate-900 text-white border-slate-900'
                  : 'bg-slate-50 text-slate-800 border-slate-200 hover:bg-slate-100'
              }`}
            >
              <div className="text-xl font-extrabold tabular-nums">{report.findings.length}</div>
              <div className="text-xs font-semibold opacity-90">All Findings</div>
            </button>

            <button
              type="button"
              onClick={() => setRiskFilter('Critical')}
              className={`p-3.5 rounded-xl border text-left cursor-pointer transition-colors ${
                riskFilter === 'Critical'
                  ? 'bg-red-700 text-white border-red-700'
                  : 'bg-red-50/70 text-red-950 border-red-200 hover:bg-red-100/70'
              }`}
            >
              <div className="text-xl font-extrabold tabular-nums">
                {report.countsByRisk.Critical}
              </div>
              <div className="text-xs font-semibold">Critical Risk</div>
            </button>

            <button
              type="button"
              onClick={() => setRiskFilter('High')}
              className={`p-3.5 rounded-xl border text-left cursor-pointer transition-colors ${
                riskFilter === 'High'
                  ? 'bg-orange-600 text-white border-orange-600'
                  : 'bg-orange-50/70 text-orange-950 border-orange-200 hover:bg-orange-100/70'
              }`}
            >
              <div className="text-xl font-extrabold tabular-nums">{report.countsByRisk.High}</div>
              <div className="text-xs font-semibold">High Risk</div>
            </button>

            <button
              type="button"
              onClick={() => setRiskFilter('Medium')}
              className={`p-3.5 rounded-xl border text-left cursor-pointer transition-colors ${
                riskFilter === 'Medium'
                  ? 'bg-amber-500 text-slate-950 border-amber-500'
                  : 'bg-amber-50/70 text-amber-950 border-amber-200 hover:bg-amber-100/70'
              }`}
            >
              <div className="text-xl font-extrabold tabular-nums">
                {report.countsByRisk.Medium}
              </div>
              <div className="text-xs font-semibold">Medium Risk</div>
            </button>

            <button
              type="button"
              onClick={() => setRiskFilter('Low')}
              className={`p-3.5 rounded-xl border text-left cursor-pointer transition-colors ${
                riskFilter === 'Low'
                  ? 'bg-slate-700 text-white border-slate-700'
                  : 'bg-slate-50 text-slate-800 border-slate-200 hover:bg-slate-100'
              }`}
            >
              <div className="text-xl font-extrabold tabular-nums">{report.countsByRisk.Low}</div>
              <div className="text-xs font-semibold">Low Risk</div>
            </button>
          </div>

          {/* 4. Individual Finding Cards with Clause Translator & India Legal Context */}
          {filteredFindings.length === 0 ? (
            <div className="p-6 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center gap-3 text-emerald-950">
              <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
              <div className="text-xs sm:text-sm font-medium">
                {report.findings.length === 0
                  ? 'No risky or predatory clauses matched across all 14 screening categories in this document. (Not a legal guarantee of safety.)'
                  : `No findings in the "${riskFilter}" filter category.`}
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredFindings.map((finding) => (
                <EvidenceFindingCard
                  key={finding.id}
                  finding={finding}
                  lang={lang}
                  testId="document-finding-card"
                  onJumpToQuote={handleJumpToQuote}
                  isBeingReadAloud={activeSpokenTarget.findingId === finding.id}
                />
              ))}
            </div>
          )}

          {/* 5. OpenShield Action Plan Checklist */}
          <ActionPlanChecklistCard
            actionPlan={report.actionPlan}
            lang={lang}
            isBeingReadAloud={activeSpokenTarget.kind === 'action-plan'}
          />

          {/* 6. Extracted Source Text Viewer with Highlight Support */}
          <div
            ref={extractedTextRef}
            className="p-4 rounded-xl bg-slate-900 text-slate-100 border border-slate-800 space-y-2"
          >
            <div className="flex items-center justify-between text-xs">
              <span className="font-bold text-slate-200">
                Verified Extracted Document Text ({report.title})
              </span>
              {highlightedQuote && (
                <button
                  type="button"
                  onClick={() => setHighlightedQuote(null)}
                  className="text-emerald-400 hover:underline cursor-pointer"
                >
                  Clear highlight
                </button>
              )}
            </div>
            <div className="max-h-48 overflow-y-auto text-xs font-mono text-slate-300 whitespace-pre-wrap leading-relaxed p-3 rounded-lg bg-slate-950 border border-slate-800">
              {highlightedQuote && report.extractedText.includes(highlightedQuote) ? (
                <>
                  {report.extractedText.split(highlightedQuote)[0]}
                  <mark className="bg-amber-400 text-slate-950 font-bold px-1 rounded">
                    {highlightedQuote}
                  </mark>
                  {report.extractedText
                    .split(highlightedQuote)
                    .slice(1)
                    .join(highlightedQuote)}
                </>
              ) : (
                report.extractedText
              )}
            </div>
          </div>
        </div>
      )}
    </section>
  );
};
