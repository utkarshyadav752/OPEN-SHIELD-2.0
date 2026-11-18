import React, { useState } from 'react';
import {
  FolderGit2,
  FileCode2,
  Copy,
  Check,
  Download,
  Terminal
} from 'lucide-react';
import { MONOREPO_FILES, type MonorepoFileItem } from '../data/monorepoFiles';

export const MonorepoExplorerSection: React.FC = () => {
  const [selectedFile, setSelectedFile] = useState<MonorepoFileItem>(MONOREPO_FILES[0]);
  const [copiedPath, setCopiedPath] = useState<string | null>(null);

  const handleCopyCode = async (file: MonorepoFileItem) => {
    try {
      await navigator.clipboard.writeText(file.content);
      setCopiedPath(file.path);
      setTimeout(() => setCopiedPath(null), 2000);
    } catch {
      setCopiedPath(file.path);
      setTimeout(() => setCopiedPath(null), 2000);
    }
  };

  const handleDownloadFile = (file: MonorepoFileItem) => {
    const blob = new Blob([file.content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = file.path.split('/').pop() || 'openshield-file.txt';
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  return (
    <section className="space-y-6">
      {/* Load Unpacked Instructions Bar */}
      <div className="rounded-xl border border-slate-800 bg-slate-900/90 p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h3 className="text-base font-bold text-slate-100 flex items-center gap-2">
            <Terminal className="w-4 h-4 text-sky-400" />
            Complete OpenShield Monorepo (/extension &amp; /website)
          </h3>
          <p className="text-xs text-slate-400 mt-1">
            Every file in the openshield/ repository is generated with zero placeholders. Load
            /extension directly in chrome://extensions (Developer Mode &rarr; Load unpacked) or
            about:debugging in Firefox.
          </p>
        </div>
        <div className="flex items-center gap-2.5 shrink-0">
          <button
            type="button"
            onClick={() => handleDownloadFile(selectedFile)}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-sky-500 hover:bg-sky-400 text-slate-950 font-bold text-xs cursor-pointer transition-colors whitespace-nowrap"
          >
            <Download className="w-3.5 h-3.5" />
            Download {selectedFile.path.split('/').pop()}
          </button>
        </div>
      </div>

      {/* 2-Column File Tree + Source Code Viewer */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left File Tree */}
        <div className="lg:col-span-4 rounded-xl border border-slate-800 bg-slate-900 overflow-hidden">
          <div className="px-4 py-3 bg-slate-950 border-b border-slate-800 text-xs font-bold text-slate-300 flex items-center gap-2">
            <FolderGit2 className="w-4 h-4 text-sky-400" />
            openshield/ Monorepo Files ({MONOREPO_FILES.length})
          </div>
          <div className="divide-y divide-slate-800/70">
            {MONOREPO_FILES.map((file) => {
              const isSelected = file.path === selectedFile.path;
              return (
                <button
                  key={file.path}
                  type="button"
                  onClick={() => setSelectedFile(file)}
                  className={`w-full text-left px-4 py-3 transition-colors cursor-pointer flex items-center justify-between gap-2 ${
                    isSelected
                      ? 'bg-sky-500/15 text-sky-300'
                      : 'text-slate-300 hover:bg-slate-800/60'
                  }`}
                >
                  <div className="min-w-0">
                    <div className="font-mono text-xs font-semibold truncate">{file.path}</div>
                    <div className="text-[11px] text-slate-400 truncate mt-0.5">
                      {file.description}
                    </div>
                  </div>
                  <span className="font-mono text-[10px] text-slate-400 shrink-0">
                    {file.linesOfCode}L
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Right Code Inspector */}
        <div className="lg:col-span-8 rounded-xl border border-slate-800 bg-slate-950 overflow-hidden">
          <div className="flex items-center justify-between gap-4 px-4 py-3 bg-slate-900 border-b border-slate-800">
            <div className="min-w-0">
              <div className="font-mono text-xs font-bold text-sky-400 flex items-center gap-2">
                <FileCode2 className="w-4 h-4 shrink-0" />
                {selectedFile.path}
              </div>
              <div className="text-xs text-slate-400 mt-0.5">{selectedFile.description}</div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={() => handleCopyCode(selectedFile)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-200 cursor-pointer transition-colors whitespace-nowrap"
              >
                {copiedPath === selectedFile.path ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                    Copied!
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    Copy Code
                  </>
                )}
              </button>
            </div>
          </div>

          <pre className="p-4 text-xs font-mono text-slate-200 overflow-x-auto max-h-[540px] leading-relaxed">
            <code>{selectedFile.content}</code>
          </pre>
        </div>
      </div>
    </section>
  );
};
