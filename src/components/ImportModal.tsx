import React, { useState, useRef } from 'react';
import { Modal } from './Modal';
import { Upload, FileText, CheckCircle2, AlertTriangle, Loader2, XCircle } from 'lucide-react';
import { cn } from '@/utils/cn';
import { parseCSV } from '@/utils/csvParser';

export type ImportRowStatus = 'ready' | 'duplicate' | 'error';

export interface ParsedRow {
    index: number;
    data: Record<string, string>;
    status: ImportRowStatus;
    reason?: string;
}

interface ImportModalProps {
    open: boolean;
    onClose: () => void;
    title: string;
    expectedHeaders: string[]; // User must provide these columns
    onValidateRow: (row: Record<string, string>) => Promise<{ status: ImportRowStatus; reason?: string }>;
    onConfirmImport: (validRows: Record<string, string>[]) => Promise<void>;
    sampleCsvUrl?: string; // Optional download link for a template
}

export function ImportModal({
    open,
    onClose,
    title,
    expectedHeaders,
    onValidateRow,
    onConfirmImport,
    sampleCsvUrl
}: ImportModalProps) {
    const [file, setFile] = useState<File | null>(null);
    const [parsing, setParsing] = useState(false);
    const [rows, setRows] = useState<ParsedRow[]>([]);
    const [importing, setImporting] = useState(false);
    const [importDone, setImportDone] = useState(false);
    const [importError, setImportError] = useState<string | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleReset = () => {
        setFile(null);
        setRows([]);
        setImporting(false);
        setImportDone(false);
        setImportError(null);
        setParsing(false);
        if (fileInputRef.current) fileInputRef.current.value = "";
    };

    const handleClose = () => {
        handleReset();
        onClose();
    };

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const f = e.target.files?.[0];
        if (!f) return;
        setFile(f);
        setParsing(true);

        try {
            const text = await f.text();
            const parsed = parseCSV(text);
            if (parsed.length === 0) {
                alert("CSV 檔案為空或無法解析");
                setParsing(false);
                return;
            }

            // Check headers
            const actualHeaders = Object.keys(parsed[0] || {});
            const missingHeaders = expectedHeaders.filter(h => !actualHeaders.includes(h));
            if (missingHeaders.length > 0) {
                alert(`檔案缺少必備的欄位: ${missingHeaders.join(", ")}`);
                setParsing(false);
                return;
            }

            // Validate rows
            const validatedRows: ParsedRow[] = [];
            for (let i = 0; i < parsed.length; i++) {
                const rowData = parsed[i];

                // Basic empty row check
                const hasData = Object.values(rowData).some(v => v.trim() !== "");
                if (!hasData) continue;

                const valResult = await onValidateRow(rowData);
                validatedRows.push({
                    index: i + 1,
                    data: rowData,
                    status: valResult.status,
                    reason: valResult.reason,
                });
            }
            setRows(validatedRows);
        } catch (err: any) {
            alert("解析檔案時發生錯誤: " + err.message);
        } finally {
            setParsing(false);
        }
    };

    const handleConfirm = async () => {
        const readyRows = rows.filter(r => r.status === 'ready').map(r => r.data);
        if (readyRows.length === 0) return;
        setImporting(true);
        setImportError(null);
        try {
            await onConfirmImport(readyRows);
            setImporting(false);
            setImportDone(true);
        } catch (err: any) {
            setImportError(err.message || "匯入過程中發生未知的錯誤");
            setImporting(false);
        }
    };

    const readyCount = rows.filter(r => r.status === 'ready').length;
    const errorCount = rows.filter(r => r.status === 'error').length;
    const dupCount = rows.filter(r => r.status === 'duplicate').length;

    return (
        <Modal open={open} onClose={handleClose} title={title} width="max-w-4xl">
            <div className="flex flex-col gap-6">

                {/* State 1: Upload or Loading */}
                {!importDone && rows.length === 0 && (
                    <div className="flex flex-col items-center justify-center border-2 border-dashed border-slate-300 dark:border-slate-700 rounded-xl p-10 bg-slate-50 dark:bg-slate-800/50">
                        {parsing ? (
                            <>
                                <Loader2 className="w-10 h-10 text-slate-400 animate-spin mb-4" />
                                <p className="text-slate-600 dark:text-slate-300 font-medium">正在解析檔案與驗證資料...</p>
                            </>
                        ) : (
                            <>
                                <Upload className="w-10 h-10 text-slate-400 mb-4" />
                                <p className="text-slate-700 dark:text-slate-200 font-medium mb-1">點擊或拖曳上傳 CSV 檔案</p>
                                <p className="text-sm text-slate-500 mb-6">請確保第一行為正確的欄位名稱</p>
                                <input
                                    type="file"
                                    accept=".csv"
                                    className="hidden"
                                    ref={fileInputRef}
                                    onChange={handleFileChange}
                                />
                                <div className="flex gap-3">
                                    <button
                                        onClick={() => fileInputRef.current?.click()}
                                        className="px-5 py-2.5 bg-red-700 hover:bg-red-800 text-white font-bold text-sm rounded-lg transition-colors shadow-sm"
                                    >
                                        選擇檔案
                                    </button>
                                    {sampleCsvUrl && (
                                        <a
                                            href={sampleCsvUrl}
                                            download
                                            className="px-5 py-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 font-bold text-sm rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
                                        >
                                            下載範例檔
                                        </a>
                                    )}
                                </div>
                            </>
                        )}
                    </div>
                )}

                {/* State 2: Preview & Validation Results */}
                {!importDone && rows.length > 0 && (
                    <div className="flex flex-col gap-4">
                        {/* Summary Cards */}
                        <div className="grid grid-cols-3 gap-4">
                            <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800/30 p-4 rounded-xl">
                                <p className="text-green-700 dark:text-green-400 text-sm font-bold flex items-center gap-1.5"><CheckCircle2 className="w-4 h-4" /> 準備匯入</p>
                                <p className="text-2xl font-black text-green-800 dark:text-green-300">{readyCount} <span className="text-sm font-medium">筆</span></p>
                            </div>
                            <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800/30 p-4 rounded-xl">
                                <p className="text-amber-700 dark:text-amber-400 text-sm font-bold flex items-center gap-1.5"><AlertTriangle className="w-4 h-4" /> 重複資料 (將略過)</p>
                                <p className="text-2xl font-black text-amber-800 dark:text-amber-300">{dupCount} <span className="text-sm font-medium">筆</span></p>
                            </div>
                            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800/30 p-4 rounded-xl">
                                <p className="text-red-700 dark:text-red-400 text-sm font-bold flex items-center gap-1.5"><XCircle className="w-4 h-4" /> 錯誤資料 (將略過)</p>
                                <p className="text-2xl font-black text-red-800 dark:text-red-300">{errorCount} <span className="text-sm font-medium">筆</span></p>
                            </div>
                        </div>

                        {/* Dynamic Table Preview */}
                        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden max-h-[300px] flex flex-col">
                            <div className="overflow-auto flex-1">
                                <table className="w-full text-left text-sm whitespace-nowrap">
                                    <thead className="bg-slate-50 dark:bg-slate-800 text-slate-500 sticky top-0 z-10 border-b border-slate-200 dark:border-slate-700">
                                        <tr>
                                            <th className="px-4 py-3 font-semibold">行號</th>
                                            <th className="px-4 py-3 font-semibold">狀態</th>
                                            <th className="px-4 py-3 font-semibold">原因</th>
                                            {expectedHeaders.slice(0, 5).map(h => <th key={h} className="px-4 py-3 font-semibold text-xs">{h}</th>)}
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                                        {rows.map(r => (
                                            <tr key={r.index} className={cn(
                                                r.status === 'ready' && "hover:bg-slate-50 dark:hover:bg-slate-800",
                                                r.status === 'duplicate' && "bg-amber-50/50 dark:bg-amber-900/10 text-slate-500",
                                                r.status === 'error' && "bg-red-50/50 dark:bg-red-900/10 text-slate-500"
                                            )}>
                                                <td className="px-4 py-2 font-medium">{r.index}</td>
                                                <td className="px-4 py-2">
                                                    {r.status === 'ready' && <span className="inline-flex px-2 py-0.5 rounded text-xs font-bold bg-green-100 text-green-700">準備匯入</span>}
                                                    {r.status === 'duplicate' && <span className="inline-flex px-2 py-0.5 rounded text-xs font-bold bg-amber-100 text-amber-700">重複</span>}
                                                    {r.status === 'error' && <span className="inline-flex px-2 py-0.5 rounded text-xs font-bold bg-red-100 text-red-700">錯誤</span>}
                                                </td>
                                                <td className="px-4 py-2 max-w-[200px] truncate text-xs">{r.reason || '-'}</td>
                                                {expectedHeaders.slice(0, 5).map(h => <td key={h} className="px-4 py-2 text-xs truncate max-w-[150px]">{r.data[h]}</td>)}
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>

                        {importError && (
                            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800/30 p-3 rounded-lg flex items-start gap-2 text-red-700 dark:text-red-400 text-sm">
                                <AlertTriangle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                                <div>
                                    <p className="font-bold text-red-800 dark:text-red-300">匯入作業失敗</p>
                                    <p>{importError}</p>
                                </div>
                            </div>
                        )}

                        <div className="flex gap-3 justify-end mt-2">
                            <button
                                onClick={handleReset}
                                className="px-5 py-2.5 border border-slate-200 dark:border-slate-700 font-bold text-sm rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                                disabled={importing}
                            >
                                重新上傳
                            </button>
                            <button
                                onClick={handleConfirm}
                                disabled={readyCount === 0 || importing}
                                className="px-5 py-2.5 bg-red-700 hover:bg-red-800 disabled:opacity-50 text-white font-bold text-sm rounded-lg shadow-sm transition-colors flex items-center gap-2"
                            >
                                {importing ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                                {importing ? "匯入中..." : `確認匯入 ${readyCount} 筆資料`}
                            </button>
                        </div>
                    </div>
                )}

                {/* State 3: Success */}
                {importDone && (
                    <div className="flex flex-col items-center justify-center p-8 text-center">
                        <div className="w-16 h-16 bg-green-100 text-green-600 rounded-full flex items-center justify-center mb-4">
                            <CheckCircle2 className="w-8 h-8" />
                        </div>
                        <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2">匯入成功！</h3>
                        <p className="text-slate-500 mb-8">成功匯入 {readyCount} 筆資料，已略過重複與錯誤的項目。</p>
                        <button
                            onClick={handleClose}
                            className="px-6 py-2.5 bg-slate-900 dark:bg-white text-white dark:text-slate-900 font-bold text-sm rounded-lg transition-colors"
                        >
                            關閉視窗與整理頁面
                        </button>
                    </div>
                )}
            </div>
        </Modal>
    );
}
