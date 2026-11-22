import React, { useState, useEffect, useRef } from "react";
import { 
  FileSpreadsheet, 
  FileText, 
  Plus, 
  Trash2, 
  Edit, 
  Download, 
  Send, 
  CheckCircle, 
  Save, 
  FileUp, 
  Share2, 
  X, 
  Calculator, 
  Lock, 
  BarChart, 
  LineChart, 
  HelpCircle, 
  UserPlus, 
  Check, 
  CornerDownRight, 
  Printer, 
  Bold, 
  Italic, 
  Underline,
  Heading1, 
  Heading2, 
  List, 
  ListOrdered,
  AlignLeft, 
  AlignCenter, 
  AlignRight, 
  Info,
  Smartphone,
  ArrowUpDown,
  Sigma,
  Palette,
  Menu,
  Settings2,
  Maximize2,
  Minimize2,
  PenTool,
  Upload
} from "lucide-react";
import { Document, OrgMember } from "../types";
import { useCreateMember } from "../hooks/useImpactoData";
import { useToast } from "../components/Toast";
import { DigitalSignaturePad } from "./DigitalSignaturePad";
import { MockDB } from "../lib/mockData";
import { useTranslation } from "react-i18next";

interface DocumentOfficeProps {
  activeOrg: any;
  activeMember: OrgMember | undefined;
  members: OrgMember[];
  documents: Document[];
  onSaveDocument: (payload: {
    org_id: string;
    name: string;
    uploaded_by: string;
    uploader_name: string;
    requires_acknowledgement: boolean;
    content: string;
    file_type: "word" | "excel";
    recipient_member_ids?: string[];
    is_letter?: boolean;
    file_size?: string;
    file_url?: string;
  }) => Promise<any>;
  onUpdateDocument: (payload: {
    id: string;
    org_id: string;
    name?: string;
    content?: string;
    file_size?: string;
    recipient_member_ids?: string[];
  }) => Promise<any>;
  onDeleteDocument: (id: string) => Promise<any>;
  editingDoc?: Document | null;
  viewingDoc?: Document | null;
  onClose: () => void;
  readOnly?: boolean;
}

export const DocumentOffice: React.FC<DocumentOfficeProps> = ({
  activeOrg,
  activeMember,
  members,
  documents,
  onSaveDocument,
  onUpdateDocument,
  onDeleteDocument,
  editingDoc,
  viewingDoc,
  onClose,
  readOnly = false
}) => {
  const { t, i18n } = useTranslation();
  const { addToast } = useToast();
  const createMemberMutation = useCreateMember();

  // Mode: "word" or "excel"
  const [fileType, setFileType] = useState<"word" | "excel">("excel");
  const [docName, setDocName] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [isPrivateDoc, setIsPrivateDoc] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isFluidWidth, setIsFluidWidth] = useState(true);

  // --- Signature States ---
  const [signatureMenuOpen, setSignatureMenuOpen] = useState(false);
  const [showSignaturePad, setShowSignaturePad] = useState(false);

  const isProPlan = activeOrg?.subscription_status === "trial" || activeOrg?.subscription_tier === "growth" || activeOrg?.subscription_tier === "enterprise";

  // --- Word Editor States ---
  const [wordPages, setWordPages] = useState<string[]>([""]);
  const [activePageIndex, setActivePageIndex] = useState<number>(0);
  const [isLetter, setIsLetter] = useState(false);
  const [showBrandedHeader, setShowBrandedHeader] = useState(false);
  const [showRefBar, setShowRefBar] = useState(false);
  const [showSignatoryFooter, setShowSignatoryFooter] = useState(false);
  const [isCustomizedDissemination, setIsCustomizedDissemination] = useState(false);
  const [selectedRecipients, setSelectedRecipients] = useState<string[]>([]);
  const [sendToAll, setSendToAll] = useState(false);
  const [memberSearchQuery, setMemberSearchQuery] = useState("");
  const [showMobileSettings, setShowMobileSettings] = useState(false);
  const editorRef = useRef<HTMLDivElement>(null);

  // --- Excel Editor States (Multi-Sheet, Empty Grid by Default) ---
  interface ExcelSheet {
    id: string;
    name: string;
    data: string[][];
  }
  const [sheets, setSheets] = useState<ExcelSheet[]>([
    { id: "sheet-1", name: "Sheet 1", data: Array.from({ length: 15 }, () => Array(8).fill("")) }
  ]);
  const [activeSheetId, setActiveSheetId] = useState<string>("sheet-1");

  const activeSheet = sheets.find(s => s.id === activeSheetId) || sheets[0];
  const gridData = activeSheet.data;

  const setGridData = (updater: string[][] | ((prev: string[][]) => string[][])) => {
    setSheets(prevSheets =>
      prevSheets.map(sheet => {
        if (sheet.id === activeSheetId) {
          const nextData = typeof updater === "function" ? updater(sheet.data) : updater;
          return { ...sheet, data: nextData };
        }
        return sheet;
      })
    );
  };

  const handleAddSheet = () => {
    const newId = `sheet-${Date.now()}`;
    const newName = t("doc_office.sheet_default_name", { num: sheets.length + 1, defaultValue: "Sheet {{num}}" });
    const emptyData = Array.from({ length: 15 }, () => Array(8).fill(""));
    setSheets(prev => [...prev, { id: newId, name: newName, data: emptyData }]);
    setActiveSheetId(newId);
    addToast(t("doc_office.toast_sheet_added", { name: newName, defaultValue: "Added {{name}}" }), "success");
  };

  const handleDeleteSheet = (id: string) => {
    if (sheets.length <= 1) {
      addToast(t("doc_office.warn_last_sheet", "Cannot delete the only remaining sheet"), "warning");
      return;
    }
    const nextSheets = sheets.filter(s => s.id !== id);
    setSheets(nextSheets);
    if (activeSheetId === id) {
      setActiveSheetId(nextSheets[0].id);
    }
    addToast(t("doc_office.toast_sheet_removed", "Sheet removed"), "info");
  };

  // Excel Grid Dimension Modal State
  const [isGridModalOpen, setIsGridModalOpen] = useState(false);
  const [modalRows, setModalRows] = useState(15);
  const [modalCols, setModalCols] = useState(8);

  const handleConfigureGridDimensions = () => {
    setModalRows(gridData.length);
    setModalCols(gridData[0]?.length || 8);
    setIsGridModalOpen(true);
  };

  // Excel chart config
  const [chartXCol, setChartXCol] = useState(0); // Label column
  const [chartYCol, setChartYCol] = useState(1); // Value column
  const [chartType, setChartType] = useState<"bar" | "line">("bar");

  // Excel bulk member importer config
  const [importNameCol, setImportNameCol] = useState(0);
  const [importEmailCol, setImportEmailCol] = useState(1);
  const [isBulkImportOpen, setIsBulkImportOpen] = useState(false);

  // Excel dynamic calculation, sorting and formatting states
  const [selectedCalcCol, setSelectedCalcCol] = useState(0);
  
  interface HighlightRule {
    columnIdx: number;
    type: "none" | "less_than_avg" | "range" | "less_than_val" | "greater_than_val";
    minVal?: number;
    maxVal?: number;
    customVal?: number;
    color: "red" | "green" | "yellow" | "blue";
  }

  const [highlightRule, setHighlightRule] = useState<HighlightRule>({
    columnIdx: 0,
    type: "none",
    minVal: 0,
    maxVal: 100000,
    customVal: 100000,
    color: "red"
  });

  // --- Initialize based on editing/viewing Doc ---
  useEffect(() => {
    const doc = editingDoc || viewingDoc;
    if (doc) {
      setDocName(doc.name);
      setFileType(doc.file_type === "excel" ? "excel" : "word");
      setIsPrivateDoc(!!doc.is_private);
      setSelectedRecipients(doc.recipient_member_ids || []);
      if (doc.file_type === "excel") {
        try {
          const parsed = JSON.parse(doc.content || "[]");
          if (Array.isArray(parsed) && parsed.length > 0) {
            setSheets([{ id: "sheet-1", name: "Sheet 1", data: parsed }]);
            setActiveSheetId("sheet-1");
          }
        } catch (e) {
          console.error("Error parsing spreadsheet data:", e);
        }
      } else {
        const text = doc.content || "";
        setWordPages([text]);
        setActivePageIndex(0);
        if (editorRef.current) {
          editorRef.current.innerHTML = text;
        }
        setIsLetter(!!doc.is_letter);
        setShowBrandedHeader(!!doc.show_header);
      }
    } else {
      setDocName("");
      setFileType("excel");
      setIsPrivateDoc(false);
      setSelectedRecipients([]);
      setIsLetter(false);
      setSendToAll(false);
      setShowBrandedHeader(false);
      setShowRefBar(false);
      setShowSignatoryFooter(false);
      setWordPages([""]);
      setActivePageIndex(0);
      setSheets([{ id: "sheet-1", name: "Sheet 1", data: Array.from({ length: 15 }, () => Array(8).fill("")) }]);
      setActiveSheetId("sheet-1");
      if (editorRef.current) {
        editorRef.current.innerHTML = "";
      }
    }
  }, [editingDoc, viewingDoc]);

  // --- Word Editor Command Triggers ---
  const execCmd = (command: string, value: string = "") => {
    document.execCommand(command, false, value);
    if (editorRef.current) {
      const nextPages = [...wordPages];
      nextPages[activePageIndex] = editorRef.current.innerHTML;
      setWordPages(nextPages);
    }
  };

  const handleEditorInput = () => {
    if (editorRef.current) {
      const nextPages = [...wordPages];
      nextPages[activePageIndex] = editorRef.current.innerHTML;
      setWordPages(nextPages);
    }
  };

  // --- Import word/txt file helper ---
  const handleWordImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      
      // Prevent loading binary or compressed files like .docx, .doc, or .pdf
      if (
        file.name.endsWith(".docx") || 
        file.name.endsWith(".doc") || 
        file.name.endsWith(".pdf") || 
        file.name.endsWith(".xlsx") || 
        file.name.endsWith(".xls")
      ) {
        addToast({
          title: t("doc_office.import_notice_title", "Import Format Notice"),
          message: t("doc_office.import_notice_msg", "Microsoft Word (.docx), Excel (.xlsx), and PDF files are compressed binary formats. To edit them online, please copy-paste the text directly into the editor or import a plain text (.txt) or Markdown (.md) file."),
          type: "warning"
        });
        return;
      }

      const reader = new FileReader();
      reader.onload = (event) => {
        const text = event.target?.result as string;
        // Simple HTML formatting for text linebreaks
        const formatted = text
          .split("\n")
          .map((line) => `<p>${line.trim() ? line : "<br>"}</p>`)
          .join("");
        const nextPages = [...wordPages];
        nextPages[activePageIndex] = formatted;
        setWordPages(nextPages);
        if (editorRef.current) {
          editorRef.current.innerHTML = formatted;
        }
        addToast({
          title: t("doc_office.file_imported_title", "File Imported"),
          message: t("doc_office.file_imported_msg", { file: file.name, defaultValue: 'Successfully loaded plain text from "{{file}}".' }),
          type: "success"
        });
      };
      reader.readAsText(file);
    }
  };

  // --- Excel Spreadsheet Handlers ---
  const handleCellChange = (rowIndex: number, colIndex: number, val: string) => {
    const nextGrid = [...gridData];
    nextGrid[rowIndex] = [...nextGrid[rowIndex]];
    nextGrid[rowIndex][colIndex] = val;
    setGridData(nextGrid);
  };

  const addRow = () => {
    const colsCount = gridData[0]?.length || 6;
    setGridData([...gridData, Array(colsCount).fill("")]);
  };

  const deleteRow = (idx: number) => {
    if (gridData.length <= 2) return; // keep header and 1 row
    const nextGrid = gridData.filter((_, rIdx) => rIdx !== idx);
    setGridData(nextGrid);
  };

  const addColumn = () => {
    const nextGrid = gridData.map((row, rIdx) => {
      return [...row, rIdx === 0 ? t("doc_office.col_num", { num: row.length + 1, defaultValue: "Column {{num}}" }) : ""];
    });
    setGridData(nextGrid);
  };

  const deleteColumn = () => {
    if (gridData[0].length <= 1) return;
    const nextGrid = gridData.map((row) => row.slice(0, -1));
    setGridData(nextGrid);
  };

  // Excel mathematical helper for Sums/Averages/Min/Max/Count
  const getColStats = (colIdx: number) => {
    let sum = 0;
    let count = 0;
    let min = Infinity;
    let max = -Infinity;

    for (let r = 1; r < gridData.length; r++) {
      const cellVal = gridData[r][colIdx];
      if (cellVal !== undefined && cellVal !== null && cellVal.trim() !== "") {
        const parsed = parseFloat(cellVal.replace(/[^0-9.-]/g, ""));
        if (!isNaN(parsed)) {
          sum += parsed;
          count++;
          if (parsed < min) min = parsed;
          if (parsed > max) max = parsed;
        }
      }
    }

    return {
      sum: count > 0 ? sum : 0,
      count,
      avg: count > 0 ? sum / count : 0,
      min: min === Infinity ? 0 : min,
      max: max === -Infinity ? 0 : max,
    };
  };

  const injectFormulaRow = (colIdx: number, type: "SUM" | "AVERAGE" | "MIN" | "MAX" | "COUNT") => {
    const stats = getColStats(colIdx);
    let val = 0;
    let label = "";
    const colLabel = gridData[0][colIdx] || t("doc_office.col_short", { num: colIdx + 1, defaultValue: "Col {{num}}" });

    switch (type) {
      case "SUM":
        val = stats.sum;
        label = `${t("doc_office.formula_sum", "Total Sum")} (${colLabel})`;
        break;
      case "AVERAGE":
        val = stats.avg;
        label = `${t("doc_office.formula_avg", "Average")} (${colLabel})`;
        break;
      case "MIN":
        val = stats.min;
        label = `${t("doc_office.formula_min", "Min")} (${colLabel})`;
        break;
      case "MAX":
        val = stats.max;
        label = `${t("doc_office.formula_max", "Max")} (${colLabel})`;
        break;
      case "COUNT":
        val = stats.count;
        label = `${t("doc_office.formula_count", "Count")} (${colLabel})`;
        break;
    }

    const nextGrid = [...gridData];
    // Find first empty row or append
    let inserted = false;
    for (let r = 1; r < nextGrid.length; r++) {
      if (nextGrid[r].every(cell => cell === "")) {
        nextGrid[r] = [...nextGrid[r]];
        nextGrid[r][0] = label;
        nextGrid[r][colIdx] = val % 1 === 0 ? val.toString() : val.toFixed(2);
        inserted = true;
        break;
      }
    }
    if (!inserted) {
      const newRow = Array(gridData[0].length).fill("");
      newRow[0] = label;
      newRow[colIdx] = val % 1 === 0 ? val.toString() : val.toFixed(2);
      nextGrid.push(newRow);
    }

    setGridData(nextGrid);
    addToast({
      title: t("doc_office.calc_appended_title", "Calculation Appended"),
      message: t("doc_office.calc_appended_msg", { type, defaultValue: "Successfully appended {{type}} formula row into spreadsheet." }),
      type: "success"
    });
  };

  // Sort function for the spreadsheet grid data rows
  const handleSortGrid = (colIdx: number, direction: "asc" | "desc" | "num_asc" | "num_desc") => {
    const headers = gridData[0];
    const dataRows = gridData.slice(1);

    dataRows.sort((rowA, rowB) => {
      const valA = rowA[colIdx] || "";
      const valB = rowB[colIdx] || "";

      if (direction === "num_asc" || direction === "num_desc") {
        const numA = parseFloat(valA.replace(/[^0-9.-]/g, "")) || 0;
        const numB = parseFloat(valB.replace(/[^0-9.-]/g, "")) || 0;
        return direction === "num_asc" ? numA - numB : numB - numA;
      } else {
        return direction === "asc" 
          ? valA.localeCompare(valB, undefined, { numeric: true, sensitivity: 'base' })
          : valB.localeCompare(valA, undefined, { numeric: true, sensitivity: 'base' });
      }
    });

    setGridData([headers, ...dataRows]);
    addToast({
      title: t("doc_office.sorted_title", "Spreadsheet Sorted"),
      message: t("doc_office.sorted_msg", { col: headers[colIdx] || t("doc_office.col_num", { num: colIdx + 1, defaultValue: "Column {{num}}" }), defaultValue: 'Sorted grid rows by "{{col}}" successfully.' }),
      type: "success"
    });
  };

  // Highlights spreadsheet cells based on custom rules configured by the user
  const getCellHighlightClass = (rowIndex: number, colIdx: number, cellVal: string): string => {
    if (rowIndex === 0) return ""; // Ignore headers
    if (highlightRule.type === "none" || highlightRule.columnIdx !== colIdx) return "";
    if (!cellVal || cellVal.trim() === "") return "";

    const numVal = parseFloat(cellVal.replace(/[^0-9.-]/g, ""));
    if (isNaN(numVal)) return "";

    let isMatched = false;

    if (highlightRule.type === "less_than_avg") {
      const stats = getColStats(colIdx);
      if (numVal < stats.avg) {
        isMatched = true;
      }
    } else if (highlightRule.type === "range") {
      const min = highlightRule.minVal ?? 0;
      const max = highlightRule.maxVal ?? Infinity;
      if (numVal >= min && numVal <= max) {
        isMatched = true;
      }
    } else if (highlightRule.type === "less_than_val") {
      const threshold = highlightRule.customVal ?? 0;
      if (numVal < threshold) {
        isMatched = true;
      }
    } else if (highlightRule.type === "greater_than_val") {
      const threshold = highlightRule.customVal ?? 0;
      if (numVal > threshold) {
        isMatched = true;
      }
    }

    if (isMatched) {
      switch (highlightRule.color) {
        case "red":
          return "bg-red-50 dark:bg-red-950/20 text-red-700 dark:text-red-400 border-x border-red-200 dark:border-red-900/40 font-bold";
        case "green":
          return "bg-emerald-50 dark:bg-emerald-950/20 text-emerald-700 dark:text-emerald-400 border-x border-emerald-200 dark:border-emerald-900/40 font-bold";
        case "yellow":
          return "bg-amber-50 dark:bg-amber-950/20 text-amber-700 dark:text-amber-400 border-x border-amber-200 dark:border-amber-900/40 font-bold";
        case "blue":
          return "bg-blue-50 dark:bg-blue-950/20 text-blue-700 dark:text-blue-400 border-x border-blue-200 dark:border-blue-900/40 font-bold";
      }
    }

    return "";
  };

  // --- Excel Local File CSV Reader ---
  const handleCSVImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      const reader = new FileReader();
      reader.onload = (event) => {
        const text = event.target?.result as string;
        const rows = text
          .split(/\r?\n/)
          .map((row) => {
            return row
              .split(/,(?=(?:(?:[^"]*"){2})*[^"]*$)/)
              .map((cell) => cell.replace(/^"|"$/g, "").trim());
          })
          .filter((row) => row.length > 0 && row.some((cell) => cell !== ""));

        if (rows.length > 0) {
          setGridData(rows);
          addToast({
            title: t("doc_office.sheet_loaded_title", "Spreadsheet Loaded"),
            message: t("doc_office.sheet_loaded_msg", { count: rows.length, file: file.name, defaultValue: 'Successfully loaded grid data with {{count}} rows from "{{file}}".' }),
            type: "success"
          });
        }
      };
      reader.readAsText(file);
    }
  };

  // --- Export Excel Grid as CSV ---
  const handleExportCSV = () => {
    const isFree = !activeOrg?.subscription_plan || activeOrg.subscription_plan === "free";
    if (isFree) {
      addToast({
        title: t("doc_office.free_pdf_title", "Free Plan: Save as PDF"),
        message: t("doc_office.free_pdf_msg", "On the Free plan, documents can be saved and printed as PDF. Upgrade to unlock raw CSV spreadsheet exports."),
        type: "info"
      });
      window.print();
      return;
    }
    const csvContent = "data:text/csv;charset=utf-8," 
      + gridData.map(e => e.map(cell => `"${(cell || "").replace(/"/g, '""')}"`).join(",")).join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `${docName || "Spreadsheet"}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // --- Dynamic SVG Chart Data Generator ---
  const chartData = React.useMemo(() => {
    const list: { label: string; value: number }[] = [];
    for (let r = 1; r < gridData.length; r++) {
      const row = gridData[r];
      const label = row[chartXCol] || "";
      const rawVal = row[chartYCol] || "";
      const numericVal = parseFloat(rawVal.replace(/[^0-9.-]/g, ""));
      if (label && !isNaN(numericVal)) {
        list.push({ label, value: numericVal });
      }
    }
    return list;
  }, [gridData, chartXCol, chartYCol]);

  // Max value for chart scaling
  const maxChartVal = React.useMemo(() => {
    const vals = chartData.map(d => d.value);
    return vals.length > 0 ? Math.max(...vals, 1) : 100;
  }, [chartData]);

  // --- Bulk Cooperative Members Importer ---
  const handleBulkMembersImport = async () => {
    let successCount = 0;
    let failCount = 0;

    setIsSaving(true);
    for (let r = 1; r < gridData.length; r++) {
      const row = gridData[r];
      const name = row[importNameCol] || "";
      const email = row[importEmailCol] || "";

      // simple format verification
      if (name && email.includes("@")) {
        try {
          await createMemberMutation.mutateAsync({
            orgId: activeOrg?.id,
            email: email,
            fullName: name,
            role: "member"
          });
          successCount++;
        } catch (err) {
          console.error("Failed to import row:", row, err);
          failCount++;
        }
      }
    }
    setIsSaving(false);
    setIsBulkImportOpen(false);

    addToast({
      title: t("doc_office.bulk_done_title", "Bulk Member Import Completed"),
      message: `${t("doc_office.bulk_done_msg", { count: successCount, defaultValue: "Successfully imported {{count}} members." })} ${failCount > 0 ? t("doc_office.bulk_failed_msg", { count: failCount, defaultValue: "Failed {{count}} rows." }) : ""}`,
      type: successCount > 0 ? "success" : "error"
    });
  };

  // --- Save / Update Entire Document Handle ---
  const handleSaveOfficeDocument = async () => {
    if (!docName.trim()) {
      addToast({
        title: t("doc_office.err_filename_title", "Filename Required"),
        message: t("doc_office.err_filename_msg", "Please enter a valid document name before saving."),
        type: "error"
      });
      return;
    }

    setIsSaving(true);
    try {
      if (editorRef.current) {
        wordPages[activePageIndex] = editorRef.current.innerHTML;
      }
      const contentString = fileType === "excel" 
        ? JSON.stringify(gridData) 
        : wordPages.join("\n--- PAGE BREAK ---\n");
      
      const mimeType = fileType === "excel" ? "application/json" : "text/html";
      const fileUrl = `data:${mimeType};base64,${btoa(unescape(encodeURIComponent(contentString)))}`;
      
      // Bulk customized dissemination (Pro Feature)
      if (fileType === "word" && isCustomizedDissemination && !editingDoc) {
        if (!isProPlan) {
          addToast({
            title: t("doc_office.pro_upgrade_title", "Pro Feature Upgrade"),
            message: t("doc_office.pro_dissemination_msg", "Customized Bulk Dissemination with individualized placeholders requires a Pro/Enterprise plan. Please upgrade to unlock."),
            type: "error"
          });
          setIsSaving(false);
          return;
        }

        const targetedMembers = sendToAll 
          ? members 
          : members.filter(m => selectedRecipients.includes(m.id));

        if (targetedMembers.length === 0) {
          addToast({
            title: t("doc_office.no_recipients_title", "No Recipients Selected"),
            message: t("doc_office.no_recipients_msg", "Please select at least one recipient to receive customized documents."),
            type: "error"
          });
          setIsSaving(false);
          return;
        }

        // Loop over each member and save a customized copy
        for (const m of targetedMembers) {
          const memberName = m.user?.full_name || t("doc_office.coop_member", "Cooperative Member");
          const memberEmail = m.user?.email || "member@cooperative.rw";
          const rawRole = m.role || "Member";
          const memberRole = rawRole === "org_admin" || rawRole === "admin_representative" || rawRole === "admin" ? "admin" : rawRole;
          
          const interpolatedContent = contentString
            .replace(/\{\{\s*(full\s+name|full_name|fullname|name)\s*\}\}/gi, memberName)
            .replace(/\{\{\s*email\s*\}\}/gi, memberEmail)
            .replace(/\{\{\s*role\s*\}\}/gi, memberRole)
            .replace(/\{\{\s*(org\s+name|org_name|orgname|org)\s*\}\}/gi, activeOrg?.name || t("doc_office.coop_fallback", "Cooperative"))
            .replace(/\{\{\s*date\s*\}\}/gi, new Date().toLocaleDateString(i18n.language));

          const customizedSizeKB = (interpolatedContent.length / 1024).toFixed(1);
          const customizedDocName = `${docName} - ${memberName}`;

          await onSaveDocument({
            org_id: activeOrg?.id,
            name: customizedDocName,
            uploaded_by: activeMember?.id || "anonymous",
            uploader_name: activeMember?.user?.full_name || t("doc_office.representative", "Representative"),
            requires_acknowledgement: false,
            content: interpolatedContent,
            file_type: "word",
            is_letter: true,
            recipient_member_ids: [m.id],
            file_size: `${customizedSizeKB} KB`,
            show_header: showBrandedHeader
          });
        }

        addToast({
          title: t("doc_office.dispatched_title", "Customized Documents Dispatched"),
          message: t("doc_office.dispatched_msg", { count: targetedMembers.length, defaultValue: "Successfully generated and sent {{count}} customized copies into their documents sections." }),
          type: "success"
        });
        onClose();
        return;
      }

      const sizeKB = (contentString.length / 1024).toFixed(1);

      if (editingDoc) {
        await onUpdateDocument({
          id: editingDoc.id,
          org_id: activeOrg?.id,
          name: docName,
          content: contentString,
          file_size: `${sizeKB} KB`,
          recipient_member_ids: isLetter ? (sendToAll ? members.map(m => m.id) : selectedRecipients) : (isPrivateDoc ? selectedRecipients : []),
          show_header: showBrandedHeader,
          is_private: isPrivateDoc
        });
        addToast({
          title: t("doc_office.updated_title", "Document Updated"),
          message: t("doc_office.updated_msg", { name: docName, defaultValue: '"{{name}}" has been successfully saved in workspace.' }),
          type: "success"
        });
      } else {
        await onSaveDocument({
          org_id: activeOrg?.id,
          name: docName,
          uploaded_by: activeMember?.id || "anonymous",
          uploader_name: activeMember?.user?.full_name || t("doc_office.representative", "Representative"),
          requires_acknowledgement: false,
          content: contentString,
          file_url: fileUrl,
          file_type: fileType,
          is_letter: isLetter,
          recipient_member_ids: isLetter ? (sendToAll ? members.map(m => m.id) : selectedRecipients) : (isPrivateDoc ? selectedRecipients : []),
          file_size: `${sizeKB} KB`,
          show_header: showBrandedHeader,
          is_private: isPrivateDoc
        });
        addToast({
          title: t("doc_office.created_title", "Document Created"),
          message: t("doc_office.created_msg", { type: fileType, defaultValue: "Successfully persisted your in-app {{type}} document." }),
          type: "success"
        });
      }
      onClose();
    } catch (err: any) {
      console.error(err);
      addToast({
        title: t("doc_office.save_failed_title", "Save Failed"),
        message: err.message || t("doc_office.save_failed_msg", "An unexpected error occurred during save."),
        type: "error"
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleToggleRecipient = (memberId: string) => {
    setSelectedRecipients(prev => 
      prev.includes(memberId) 
        ? prev.filter(id => id !== memberId) 
        : [...prev, memberId]
    );
  };

  return (
    <div className="fixed inset-0 z-50 overflow-hidden bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-0 md:p-1">
      <div className={`w-full h-full ${isFullscreen ? 'md:h-full md:max-w-none md:rounded-none' : 'md:h-[99vh] md:max-w-[99vw] md:rounded-xl'} bg-white dark:bg-slate-900 shadow-2xl border dark:border-slate-800 flex flex-col overflow-hidden relative animate-in fade-in zoom-in duration-200 transition-all`}>
        
        {/* OFFICE HEADER */}
        <div className="px-4 py-3 md:px-6 md:py-3.5 border-b border-gray-150 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3 bg-white dark:bg-slate-900 shrink-0">
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <div className="h-10 w-10 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-100 dark:border-emerald-900/60 flex items-center justify-center text-[#156c45] dark:text-emerald-400 shrink-0 shadow-3xs">
              {fileType === "excel" ? <FileSpreadsheet className="h-5 w-5" /> : <FileText className="h-5 w-5" />}
            </div>
            <div className="flex-1 min-w-0 max-w-md">
              <input 
                type="text" 
                value={docName}
                onChange={(e) => setDocName(e.target.value)}
                placeholder={fileType === "excel" ? t("doc_office.spreadsheet_filename_placeholder", { defaultValue: "Spreadsheet filename..." }) : t("doc_office.document_filename_placeholder", { defaultValue: "Document filename..." })}
                disabled={readOnly}
                className="bg-transparent font-display font-semibold text-base md:text-lg text-gray-800 dark:text-white outline-none w-full py-0.5 truncate placeholder:text-gray-400 focus:placeholder:text-gray-300 transition"
              />
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 sm:gap-3 shrink-0">
            {!readOnly && (
              <label className="flex items-center gap-2 cursor-pointer select-none text-xs font-semibold text-gray-700 dark:text-gray-300 hover:text-gray-900 transition">
                <input 
                  type="checkbox" 
                  checked={isPrivateDoc}
                  onChange={(e) => setIsPrivateDoc(e.target.checked)}
                  className="h-4 w-4 rounded border-gray-300 text-[#156c45] focus:ring-[#156c45] cursor-pointer"
                />
                <span>{t("doc_office.private", { defaultValue: "Private" })}</span>
              </label>
            )}

            <button 
              onClick={() => window.print()}
              type="button"
              className="flex items-center gap-1.5 px-3 py-2 text-xs font-bold text-slate-700 dark:text-slate-200 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 rounded-xl transition cursor-pointer"
              title={t("doc_office.export_pdf_tooltip", { defaultValue: "Save or Export as PDF" })}
            >
              <Printer className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
              <span>{t("doc_office.save_as_pdf", { defaultValue: "Save as PDF" })}</span>
            </button>

            {!readOnly && (
              <button 
                onClick={handleSaveOfficeDocument}
                disabled={isSaving}
                className="flex items-center gap-2 px-4 py-2 text-xs font-bold text-white bg-[#156c45] hover:bg-[#115436] disabled:bg-[#156c45]/60 rounded-xl transition shadow-sm cursor-pointer"
              >
                <Save className="h-3.5 w-3.5 shrink-0" />
                <span>{isSaving ? t("doc_office.saving", { defaultValue: "Saving..." }) : t("doc_office.save_to_cloud", { defaultValue: "Save to Cloud" })}</span>
              </button>
            )}

            <button 
              onClick={() => setShowMobileSettings(!showMobileSettings)}
              className="lg:hidden p-2 hover:bg-gray-100 dark:hover:bg-slate-800 rounded-xl text-gray-600 dark:text-gray-300 transition cursor-pointer"
            >
              <Settings2 className="h-4.5 w-4.5" />
            </button>

            <button 
              type="button"
              onClick={() => setIsFullscreen(!isFullscreen)}
              title={isFullscreen ? t("doc_office.exit_fullscreen", { defaultValue: "Exit Fullscreen" }) : t("doc_office.fullscreen_interface", { defaultValue: "Fullscreen Interface" })}
              className="p-2 hover:bg-gray-100 dark:hover:bg-slate-800 rounded-xl text-gray-400 hover:text-gray-700 dark:hover:text-white transition hidden sm:flex items-center justify-center cursor-pointer"
            >
              {isFullscreen ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
            </button>

            <button 
              onClick={onClose}
              className="p-2 hover:bg-gray-100 dark:hover:bg-slate-800 rounded-xl text-gray-400 hover:text-gray-700 dark:hover:text-white transition cursor-pointer"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* SECONDARY TOOLBAR & TABS BAR */}
        <div className="px-4 py-2.5 sm:px-6 border-b border-gray-150 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3 bg-white dark:bg-slate-900 shrink-0">
          <div className="flex flex-wrap items-center gap-2">
            <button 
              onClick={() => setFileType("word")}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                fileType === "word" 
                  ? "bg-[#156c45] text-white shadow-3xs" 
                  : "bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 text-gray-700 dark:text-gray-300 hover:border-[#156c45] hover:text-[#156c45] dark:hover:border-emerald-500 dark:hover:text-emerald-400"
              }`}
            >
              {t("doc_office.word_letter_tab", { defaultValue: "Word / Letter" })}
            </button>
            <button 
              onClick={() => setFileType("excel")}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                fileType === "excel" 
                  ? "bg-[#156c45] text-white shadow-3xs" 
                  : "bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 text-gray-700 dark:text-gray-300 hover:border-[#156c45] hover:text-[#156c45] dark:hover:border-emerald-500 dark:hover:text-emerald-400"
              }`}
            >
              {t("doc_office.excel_spreadsheet_tab", { defaultValue: "Excel Spreadsheet" })}
            </button>
          </div>

          <div className="flex flex-wrap items-center gap-2 justify-end flex-1 min-w-0">
            {/* Word Toolbar */}
            {fileType === "word" && !readOnly && (
              <div className="flex flex-wrap items-center gap-2">
                <div className="flex items-center gap-1">
                  <button onClick={() => execCmd("bold")} className="px-2 py-1 hover:bg-gray-100 dark:hover:bg-slate-800 rounded text-xs font-bold text-gray-700 dark:text-slate-300 transition cursor-pointer" title={t("doc_office.bold", { defaultValue: "Bold" })}>
                    B
                  </button>
                  <button onClick={() => execCmd("italic")} className="px-2 py-1 hover:bg-gray-100 dark:hover:bg-slate-800 rounded text-xs italic text-gray-700 dark:text-slate-300 transition cursor-pointer" title={t("doc_office.italic", { defaultValue: "Italic" })}>
                    I
                  </button>
                  <button onClick={() => execCmd("underline")} className="px-2 py-1 hover:bg-gray-100 dark:hover:bg-slate-800 rounded text-xs underline text-gray-700 dark:text-slate-300 transition cursor-pointer" title={t("doc_office.underline", { defaultValue: "Underline" })}>
                    U
                  </button>
                </div>

                <div className="h-4 w-px bg-gray-200 dark:bg-slate-800 mx-0.5" />

                <div className="flex items-center gap-1">
                  <button onClick={() => execCmd("formatBlock", "H1")} className="px-2 py-1 hover:bg-gray-100 dark:hover:bg-slate-800 rounded text-xs font-bold text-gray-700 dark:text-slate-300 transition cursor-pointer" title={t("doc_office.heading_1", { defaultValue: "Heading 1" })}>
                    H1
                  </button>
                  <button onClick={() => execCmd("formatBlock", "H2")} className="px-2 py-1 hover:bg-gray-100 dark:hover:bg-slate-800 rounded text-xs font-bold text-gray-700 dark:text-slate-300 transition cursor-pointer" title={t("doc_office.heading_2", { defaultValue: "Heading 2" })}>
                    H2
                  </button>
                </div>

                <div className="h-4 w-px bg-gray-200 dark:bg-slate-800 mx-0.5" />

                <div className="flex items-center gap-1">
                  <button onClick={() => execCmd("justifyLeft")} className="p-1 hover:bg-gray-100 dark:hover:bg-slate-800 rounded text-gray-700 dark:text-slate-300 transition cursor-pointer" title={t("doc_office.align_left", { defaultValue: "Align Left" })}>
                    <AlignLeft className="h-3.5 w-3.5" />
                  </button>
                  <button onClick={() => execCmd("justifyCenter")} className="p-1 hover:bg-gray-100 dark:hover:bg-slate-800 rounded text-gray-700 dark:text-slate-300 transition cursor-pointer" title={t("doc_office.align_center", { defaultValue: "Align Center" })}>
                    <AlignCenter className="h-3.5 w-3.5" />
                  </button>
                  <button onClick={() => execCmd("justifyRight")} className="p-1 hover:bg-gray-100 dark:hover:bg-slate-800 rounded text-gray-700 dark:text-slate-300 transition cursor-pointer" title={t("doc_office.align_right", { defaultValue: "Align Right" })}>
                    <AlignRight className="h-3.5 w-3.5" />
                  </button>
                </div>

                <div className="h-4 w-px bg-gray-200 dark:bg-slate-800 mx-0.5" />

                {/* Size select */}
                <select 
                  onChange={(e) => execCmd("fontSize", e.target.value)} 
                  className="px-2 py-1 text-xs font-semibold bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-lg text-gray-700 dark:text-slate-300 outline-none cursor-pointer"
                  defaultValue="3"
                  title={t("doc_office.font_size", { defaultValue: "Font Size" })}
                >
                  <option value="1">XS</option>
                  <option value="2">SM</option>
                  <option value="3">MD</option>
                  <option value="4">LG</option>
                  <option value="5">XL</option>
                  <option value="6">2XL</option>
                </select>

                {/* Color select */}
                <select 
                  onChange={(e) => execCmd("foreColor", e.target.value)} 
                  className="px-2 py-1 text-xs font-semibold bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-lg text-gray-700 dark:text-slate-300 outline-none cursor-pointer"
                  defaultValue="#1E293B"
                  title={t("doc_office.text_color", { defaultValue: "Text Color" })}
                >
                  <option value="#1E293B">{t("doc_office.color_slate", { defaultValue: "Slate" })}</option>
                  <option value="#156c45">{t("doc_office.color_forest", { defaultValue: "Forest" })}</option>
                  <option value="#EF4444">{t("doc_office.color_red", { defaultValue: "Red" })}</option>
                  <option value="#3B82F6">{t("doc_office.color_blue", { defaultValue: "Blue" })}</option>
                  <option value="#F59E0B">{t("doc_office.color_amber", { defaultValue: "Amber" })}</option>
                  <option value="#8B5CF6">{t("doc_office.color_purple", { defaultValue: "Purple" })}</option>
                </select>

                <div className="h-4 w-px bg-gray-200 dark:bg-slate-800 mx-0.5" />

                {/* Import File Button */}
                <label className="flex items-center gap-1.5 px-3 py-1 hover:bg-gray-100 dark:hover:bg-slate-800 rounded-lg cursor-pointer text-xs font-bold text-gray-700 dark:text-slate-300 transition select-none">
                  <span>{t("doc_office.import_file", { defaultValue: "Import File" })}</span>
                  <input 
                    type="file" 
                    accept=".txt,.md,.html,.docx" 
                    onChange={handleWordImport}
                    className="hidden" 
                  />
                </label>
              </div>
            )}

            {/* Excel Toolbar */}
            {fileType === "excel" && !readOnly && (
              <div className="flex flex-wrap items-center gap-2">
                <button 
                  onClick={addRow} 
                  className="flex items-center gap-1 px-2.5 py-1 bg-emerald-50 hover:bg-emerald-100 text-[#156c45] rounded-lg text-xs font-bold transition cursor-pointer"
                >
                  <Plus className="h-3.5 w-3.5 shrink-0" />
                  <span>{t("doc_office.row", { defaultValue: "Row" })}</span>
                </button>
                <button 
                  onClick={addColumn} 
                  className="flex items-center gap-1 px-2.5 py-1 bg-emerald-50 hover:bg-emerald-100 text-[#156c45] rounded-lg text-xs font-bold transition cursor-pointer"
                >
                  <Plus className="h-3.5 w-3.5 shrink-0" />
                  <span>{t("doc_office.column", { defaultValue: "Column" })}</span>
                </button>
                <button 
                  onClick={deleteColumn} 
                  className="flex items-center gap-1 px-2.5 py-1 bg-red-50 hover:bg-red-100 text-red-600 rounded-lg text-xs font-bold transition cursor-pointer"
                >
                  <Trash2 className="h-3.5 w-3.5 shrink-0" />
                  <span>{t("doc_office.remove_col", { defaultValue: "Remove Col" })}</span>
                </button>
                <button 
                  onClick={() => injectFormulaRow(4, "SUM")}
                  className="flex items-center gap-1 px-2.5 py-1 bg-emerald-50 hover:bg-emerald-100 text-[#156c45] rounded-lg text-xs font-bold transition cursor-pointer"
                >
                  <Calculator className="h-3.5 w-3.5 shrink-0" />
                  <span>{t("doc_office.auto_sum", { defaultValue: "Auto-Sum" })}</span>
                </button>

                <label className="flex items-center gap-1.5 px-3 py-1 hover:bg-gray-100 dark:hover:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-lg cursor-pointer text-xs font-bold text-gray-700 dark:text-slate-300 transition select-none">
                  <FileUp className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                  <span>{t("doc_office.import_csv", { defaultValue: "Import CSV" })}</span>
                  <input 
                    type="file" 
                    accept=".csv" 
                    onChange={handleCSVImport}
                    className="hidden" 
                  />
                </label>
              </div>
            )}

            {!readOnly && (
              <>
                <div className="h-4 w-px bg-gray-200 dark:bg-slate-800 mx-1 hidden sm:block" />
                <div className="relative flex items-center">
                  <button
                    type="button"
                    onClick={() => setSignatureMenuOpen(!signatureMenuOpen)}
                    className="flex items-center gap-1.5 px-2.5 py-1 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg text-xs font-bold text-gray-700 dark:text-slate-200 transition cursor-pointer"
                  >
                    <PenTool className="h-3.5 w-3.5 text-[#156c45] shrink-0" />
                    <span className="hidden sm:inline">{t("doc_office.signature", { defaultValue: "Signature" })}</span>
                  </button>
                  
                  {signatureMenuOpen && (
                    <>
                      <div className="fixed inset-0 z-40" onClick={() => setSignatureMenuOpen(false)} />
                      <div className="absolute right-0 top-10 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-xl w-48 overflow-hidden shrink-0 z-50 py-1">
                        <div className="px-3 py-1.5 border-b border-slate-100 dark:border-slate-700 font-mono text-[9px] uppercase tracking-wider text-slate-400 font-bold">
                          {t("doc_office.digital_signatures", { defaultValue: "Digital Signatures" })}
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            setSignatureMenuOpen(false);
                            setShowSignaturePad(true);
                          }}
                          className="w-full text-left px-3.5 py-2.5 text-xs text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 flex items-center gap-2 transition cursor-pointer font-semibold"
                        >
                          <Upload className="h-3.5 w-3.5 text-[#156c45] shrink-0" />
                          <span>{t("doc_office.import_create_signature", { defaultValue: "Import / Create Signature" })}</span>
                        </button>
                      </div>
                    </>
                  )}
                </div>
              </>
            )}
          </div>
        </div>

        {/* WORKSPACE AREA */}
        <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">
          
          {/* MAIN CANVAS */}
          <div className="flex-1 p-3 sm:p-5 md:p-6 overflow-y-auto bg-stone-100/60 dark:bg-slate-950/40 flex flex-col items-center min-w-0">
            
            {/* A: WORD / LETTER DRAFTING INTERFACE */}
            {fileType === "word" && (
              <div className="w-full max-w-5xl flex flex-col gap-4 flex-1 transition-all duration-200">
                
                {/* PAGE NAVIGATION TABS */}
                <div className="flex flex-wrap items-center justify-between gap-2 bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-xl p-2.5 shadow-3xs">
                  <div className="flex items-center gap-1.5 overflow-x-auto">
                    {wordPages.map((_, pIdx) => (
                      <button
                        key={pIdx}
                        type="button"
                        onClick={() => {
                          const nextPages = [...wordPages];
                          if (editorRef.current) nextPages[activePageIndex] = editorRef.current.innerHTML;
                          setWordPages(nextPages);
                          setActivePageIndex(pIdx);
                          if (editorRef.current) editorRef.current.innerHTML = nextPages[pIdx] || "";
                        }}
                        className={`px-3.5 py-1 rounded-lg text-xs font-bold transition cursor-pointer whitespace-nowrap shrink-0 ${
                          activePageIndex === pIdx
                            ? "bg-[#156c45] text-white shadow-3xs"
                            : "bg-gray-100 dark:bg-slate-800 text-gray-700 dark:text-slate-300 hover:bg-gray-200 dark:hover:bg-slate-700"
                        }`}
                      >
                        {t("doc_office.page_number", { num: pIdx + 1, defaultValue: `Page ${pIdx + 1}` })}
                      </button>
                    ))}
                    {!readOnly && (
                      <button
                        type="button"
                        onClick={() => {
                          const nextPages = [...wordPages];
                          if (editorRef.current) nextPages[activePageIndex] = editorRef.current.innerHTML;
                          nextPages.push("");
                          setWordPages(nextPages);
                          const newIdx = nextPages.length - 1;
                          setActivePageIndex(newIdx);
                          if (editorRef.current) editorRef.current.innerHTML = "";
                          addToast({
                            title: t("doc_office.page_added_title", { defaultValue: "Page Added" }),
                            message: t("doc_office.added_page_msg", { num: newIdx + 1, defaultValue: `Added Page ${newIdx + 1}` }),
                            type: "success"
                          });
                        }}
                        className="px-3 py-1 rounded-lg border border-dashed border-gray-300 dark:border-slate-700 text-gray-500 hover:border-[#156c45] hover:text-[#156c45] text-xs font-bold flex items-center gap-1 transition cursor-pointer whitespace-nowrap shrink-0"
                      >
                        <Plus className="h-3.5 w-3.5" />
                        <span>{t("doc_office.add_page", { defaultValue: "Add Page" })}</span>
                      </button>
                    )}
                  </div>

                  {!readOnly && wordPages.length > 1 && (
                    <button
                      type="button"
                      onClick={() => {
                        if (wordPages.length <= 1) return;
                        const nextPages = wordPages.filter((_, idx) => idx !== activePageIndex);
                        setWordPages(nextPages);
                        const nextIdx = Math.max(0, activePageIndex - 1);
                        setActivePageIndex(nextIdx);
                        if (editorRef.current) editorRef.current.innerHTML = nextPages[nextIdx] || "";
                        addToast({
                          title: t("doc_office.page_removed_title", { defaultValue: "Page Removed" }),
                          message: t("doc_office.page_removed_msg", { defaultValue: "Page removed" }),
                          type: "info"
                        });
                      }}
                      className="text-xs text-red-500 hover:underline font-bold px-2 py-1 cursor-pointer shrink-0"
                    >
                      {t("doc_office.delete_page", { defaultValue: "Delete Page" })}
                    </button>
                  )}
                </div>

                {/* PAPER CANVAS */}
                <div className="w-full bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-2xl shadow-sm p-4 sm:p-8 md:p-12 flex flex-col min-h-[580px] flex-1">
                  {/* Cooperative Branded Header */}
                  {showBrandedHeader && (
                    <div className="border-b-2 border-[#156c45] pb-4 mb-6 text-center select-none shrink-0">
                      <h1 className="text-xl sm:text-2xl md:text-3xl font-bold font-serif tracking-wider text-gray-900 dark:text-white uppercase break-words">
                        {activeOrg?.name ? activeOrg.name : "WALKER"}
                      </h1>
                      <p className="text-[10px] sm:text-[11px] font-mono tracking-widest text-[#4a6357] dark:text-emerald-400 font-semibold uppercase mt-1 break-words">
                        {t("doc_office.branded_desk_subtitle", { defaultValue: "Branded Cooperative Official Communication Desk" })}
                      </p>
                      {isLetter && (
                        <div className="mt-2.5 flex items-center justify-center gap-1.5">
                          <span className="px-3 py-0.5 bg-[#e8f5ee] dark:bg-emerald-950/40 text-[9px] font-bold text-[#156c45] dark:text-emerald-400 rounded-full tracking-wider uppercase select-none border border-emerald-200 dark:border-emerald-900/50">
                            {t("doc_office.official_coop_letter", { defaultValue: "OFFICIAL CO-OP LETTER" })}
                          </span>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Date & Reference Area */}
                  {showRefBar && (
                    <div className="flex flex-wrap justify-between gap-2 text-xs font-mono text-[#4a6357] dark:text-slate-400 mb-6 shrink-0 select-none">
                      <span>{t("doc_office.ref_prefix", { defaultValue: "Ref" })}: COOP/DOC-{Math.floor(1000 + Math.random() * 9000)}</span>
                      <span>{t("common.date", { defaultValue: "Date" })}: {new Date().toLocaleDateString(i18n.language, { year: "numeric", month: "long", day: "numeric" })}</span>
                    </div>
                  )}

                  {/* Dynamic letter info panel in view mode */}
                  {viewingDoc?.is_letter && (
                    <div className="mb-6 p-3 sm:p-4 bg-[#e8f5ee]/40 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-900/40 rounded-xl leading-relaxed text-[#156c45] dark:text-emerald-300">
                      <h4 className="font-bold text-xs select-none">{t("doc_office.received_docket_title", { defaultValue: "Received Communication Docket" })}</h4>
                      <p className="text-[11px] font-medium mt-1">
                        {t("doc_office.received_docket_desc", { defaultValue: "This document has been shared with you by the cooperative administrative desk. You have access to review and respond inside the portal." })}
                      </p>
                    </div>
                  )}

                  {/* RICH EDITOR CONTAINER */}
                  <div 
                    ref={editorRef}
                    contentEditable={!readOnly}
                    onInput={handleEditorInput}
                    className="flex-1 outline-none text-sm sm:text-base font-sans leading-relaxed text-gray-800 dark:text-slate-100 min-h-[300px] overflow-visible select-text prose dark:prose-invert max-w-none focus:outline-none break-words"
                    style={{ minHeight: "300px" }}
                    data-placeholder={t("doc_office.editor_placeholder", { defaultValue: "Begin typing your official cooperative letter, resolution, or guidelines here..." })}
                  />

                  {/* DIGITAL SIGNATURE & VERIFICATION SECTION */}
                  {showSignatoryFooter && (
                    <div className="mt-8 pt-6 border-t border-gray-200 dark:border-slate-800 flex flex-col sm:flex-row items-start sm:items-end justify-between gap-4 select-none">
                      <div className="space-y-1 min-w-0">
                        <div className="flex items-center gap-1.5 text-xs font-bold text-gray-700 dark:text-slate-300">
                          <CheckCircle className="h-4 w-4 text-[#156c45] shrink-0" />
                          <span>{t("doc_office.verified_digital_author", { defaultValue: "Verified Digital Author:" })}</span>
                        </div>
                        <p className="text-sm font-semibold text-gray-900 dark:text-white break-words">
                          {activeMember?.user?.full_name || t("doc_office.official_signatory", { defaultValue: "Official Signatory" })}
                        </p>
                        <p className="text-xs text-gray-400 capitalize break-words">
                          {activeMember?.role ? t(`roles.${activeMember.role}`, { defaultValue: activeMember.role.replace("_", " ") }) : t("doc_office.authorized_rep", { defaultValue: "Authorized Representative" })} • {activeOrg?.name || "Impacto"}
                        </p>
                      </div>

                      <div className="flex flex-col items-end gap-1.5 shrink-0">
                        <div className="h-16 w-44 border-b-2 border-gray-400 dark:border-slate-600 flex items-center justify-center bg-gray-50/50 dark:bg-slate-800/30 rounded-t-lg relative group">
                          <span className="font-serif italic text-lg text-gray-800 dark:text-slate-200 select-none">
                            {activeMember?.user?.full_name || t("doc_office.signatory_fallback", { defaultValue: "Signatory" })}
                          </span>
                          <div className="absolute right-1 top-1">
                            <span className="text-[8px] bg-emerald-100 dark:bg-emerald-950 text-[#156c45] font-bold px-1.5 py-0.5 rounded border border-emerald-200 dark:border-emerald-800">
                              {t("doc_office.esigned_badge", { defaultValue: "E-SIGNED" })}
                            </span>
                          </div>
                        </div>
                        <span className="text-[10px] text-gray-400 font-mono">
                          {t("doc_office.doc_version_secured", { defaultValue: "Document Version Secured & Timestamped" })}
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* B: EXCEL / SPREADSHEET BUILDER */}
            {fileType === "excel" && (
              <div className="w-full flex flex-col gap-4 flex-1">
                
                {/* TOOLBAR */}
                {!readOnly && (
                  <div className="p-3 bg-white dark:bg-slate-900 border rounded-xl flex flex-wrap items-center justify-between gap-3 shadow-xs shrink-0 min-w-0">
                    <div className="flex items-center flex-wrap gap-2 min-w-0">
                      <button 
                        onClick={addRow} 
                        className="flex items-center gap-1 px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 rounded-lg text-xs font-bold text-gray-700 dark:text-slate-300 transition shrink-0"
                      >
                        <Plus className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                        <span>{t("doc_office.add_row", { defaultValue: "Add Row" })}</span>
                      </button>
                      <button 
                        onClick={() => deleteRow(gridData.length - 1)} 
                        className="flex items-center gap-1 px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 rounded-lg text-xs font-bold text-red-600 transition shrink-0"
                      >
                        <Trash2 className="h-3.5 w-3.5 shrink-0" />
                        <span>{t("doc_office.remove_last_row", { defaultValue: "Remove Last Row" })}</span>
                      </button>
                      <button 
                        onClick={addColumn} 
                        className="flex items-center gap-1 px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 rounded-lg text-xs font-bold text-gray-700 dark:text-slate-300 transition shrink-0"
                      >
                        <Plus className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                        <span>{t("doc_office.add_column", { defaultValue: "Add Column" })}</span>
                      </button>
                      <button 
                        onClick={deleteColumn} 
                        className="flex items-center gap-1 px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 rounded-lg text-xs font-bold text-red-600 transition shrink-0"
                      >
                        <Trash2 className="h-3.5 w-3.5 shrink-0" />
                        <span>{t("doc_office.remove_last_column", { defaultValue: "Remove Last Column" })}</span>
                      </button>
                      <button 
                        onClick={handleConfigureGridDimensions}
                        className="flex items-center gap-1 px-2.5 py-1.5 bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/40 rounded-lg text-xs font-bold text-[#156c45] dark:text-emerald-400 transition shrink-0"
                      >
                        <Settings2 className="h-3.5 w-3.5 shrink-0" />
                        <span>{t("doc_office.configure_dimensions", { defaultValue: "Configure Dimensions" })}</span>
                      </button>

                      <div className="h-5 w-px bg-gray-200 dark:bg-slate-800 mx-1 hidden sm:block" />

                      {/* Math action */}
                      <button 
                        onClick={() => injectFormulaRow(4, "SUM")} // default column index 4 is amount
                        className="flex items-center gap-1 px-2.5 py-1.5 bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-900/30 dark:hover:bg-emerald-900/50 rounded-lg text-xs font-bold text-emerald-700 dark:text-emerald-400 transition shrink-0"
                        title={t("doc_office.auto_sum_title", { defaultValue: "Incorporate columns summation inside grid" })}
                      >
                        <Calculator className="h-3.5 w-3.5 shrink-0" />
                        <span>{t("doc_office.auto_sum", { defaultValue: "Auto-Sum Shares/RWF" })}</span>
                      </button>
                    </div>

                    <div className="flex items-center flex-wrap gap-2">
                      {/* CSV File Import */}
                      <label className="flex items-center gap-1.5 px-3 py-1.5 bg-stone-50 hover:bg-stone-100 dark:bg-slate-800 dark:hover:bg-slate-700 border border-stone-250 dark:border-slate-700 rounded-lg cursor-pointer text-xs font-bold text-stone-600 dark:text-slate-300 transition select-none shrink-0">
                        <FileUp className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                        <span>{t("doc_office.import_csv", { defaultValue: "Import CSV/Excel" })}</span>
                        <input 
                          type="file" 
                          accept=".csv" 
                          onChange={handleCSVImport}
                          className="hidden" 
                        />
                      </label>

                      {/* Bulk member list button */}
                      {(activeMember?.role === "org_admin" || activeMember?.role === "manager" || activeMember?.role === "accountant") && (
                        <button 
                          onClick={() => setIsBulkImportOpen(true)}
                          className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-500 hover:bg-amber-600 text-slate-950 rounded-lg text-xs font-bold transition shrink-0"
                        >
                          <UserPlus className="h-3.5 w-3.5 shrink-0" />
                          <span>{t("doc_office.import_to_members", { defaultValue: "Import to Co-op Members" })}</span>
                        </button>
                      )}
                    </div>
                  </div>
                )}

                {/* SPREADSHEET GRID SHEET CONTAINER */}
                <div className="w-full bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-2xl shadow-md overflow-hidden flex flex-col">
                  
                  {/* Grid Scroll Area */}
                  <div className="overflow-x-auto w-full max-h-[400px]">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead>
                        <tr className="bg-gray-100 dark:bg-slate-950 border-b border-gray-200 dark:border-slate-800 text-gray-550 select-none">
                          <th className="p-2 border-r border-gray-200 dark:border-slate-800 text-center w-10 font-mono font-bold">#</th>
                          {gridData[0]?.map((header, colIdx) => (
                            <th key={colIdx} className="p-2.5 border-r border-gray-200 dark:border-slate-800 font-bold min-w-[120px]">
                              <input
                                  type="text"
                                  value={header}
                                  onChange={(e) => handleCellChange(0, colIdx, e.target.value)}
                                  disabled={readOnly}
                                  className="bg-transparent font-bold outline-none border-b border-transparent focus:border-emerald-500 w-full font-sans uppercase text-[10px] tracking-wider"
                              />
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {gridData.slice(1).map((row, rIdx) => {
                          const realRowIdx = rIdx + 1;
                          return (
                            <tr 
                              key={realRowIdx} 
                              className="border-b border-gray-100 dark:border-slate-805/70 hover:bg-slate-50/50 dark:hover:bg-slate-800/40"
                            >
                              <td className="p-2 border-r border-gray-200 dark:border-slate-800 text-center font-mono text-gray-400 select-none font-semibold">
                                {realRowIdx}
                              </td>
                              {row.map((cell, colIdx) => {
                                const highlightClass = getCellHighlightClass(realRowIdx, colIdx, cell);
                                return (
                                  <td 
                                    key={colIdx} 
                                    className={`p-2 border-r border-gray-200 dark:border-slate-800 font-medium transition-colors duration-150 ${highlightClass}`}
                                  >
                                    <input
                                      type="text"
                                      value={cell}
                                      onChange={(e) => handleCellChange(realRowIdx, colIdx, e.target.value)}
                                      disabled={readOnly}
                                      className="bg-transparent outline-none w-full py-0.5 text-inherit font-sans"
                                    />
                                  </td>
                                );
                              })}
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>

                  {/* Export CSV footer */}
                  <div className="p-3 bg-gray-50 dark:bg-slate-950/20 border-t flex flex-wrap justify-between items-center gap-2 shrink-0 text-[11px] text-gray-450 select-none min-w-0">
                    <span className="min-w-0 break-words">
                      {t("doc_office.total_rows_grid", { defaultValue: "Total rows inside workspace grid:" })} <strong>{gridData.length}</strong>
                    </span>
                    <button 
                      onClick={handleExportCSV}
                      className="flex items-center gap-1.5 px-3 py-1 bg-white hover:bg-gray-100 dark:bg-slate-850 dark:hover:bg-slate-800 border text-gray-600 dark:text-slate-300 font-bold rounded-lg transition shrink-0"
                    >
                      <Download className="h-3 w-3 text-emerald-600 shrink-0" />
                      <span>{t("doc_office.download_csv", { defaultValue: "Download Spreadsheet CSV" })}</span>
                    </button>
                  </div>

                  {/* Multi-Sheet Tabs Bar */}
                  <div className="px-4 py-2 bg-white dark:bg-slate-900 border-t border-gray-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-2 overflow-x-auto shrink-0">
                    <div className="flex items-center flex-wrap gap-1.5 min-w-0">
                      {sheets.map(sheet => (
                        <div key={sheet.id} className="flex items-center">
                          <button
                            type="button"
                            onClick={() => setActiveSheetId(sheet.id)}
                            className={`px-3.5 py-1 rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shrink-0 ${
                              activeSheetId === sheet.id
                                ? "bg-[#156c45] text-white shadow-3xs"
                                : "bg-gray-100 dark:bg-slate-800 text-gray-700 dark:text-slate-300 hover:bg-gray-200 dark:hover:bg-slate-700"
                            }`}
                          >
                            <span>{sheet.name}</span>
                            {!readOnly && sheets.length > 1 && (
                              <span
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleDeleteSheet(sheet.id);
                                }}
                                className="hover:text-red-300 ml-1 font-mono cursor-pointer"
                              >
                                x
                              </span>
                            )}
                          </button>
                        </div>
                      ))}
                      {!readOnly && (
                        <button
                          type="button"
                          onClick={handleAddSheet}
                          className="px-3 py-1 rounded-lg border border-dashed border-gray-300 dark:border-slate-700 text-gray-500 hover:border-[#156c45] hover:text-[#156c45] text-xs font-bold flex items-center gap-1 transition cursor-pointer shrink-0"
                        >
                          <Plus className="h-3.5 w-3.5 shrink-0" />
                          <span>{t("doc_office.add_sheet", { defaultValue: "Add Sheet" })}</span>
                        </button>
                      )}
                    </div>
                    {!readOnly && (
                      <button
                        type="button"
                        onClick={handleConfigureGridDimensions}
                        className="px-3 py-1 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-[#156c45] text-xs font-bold transition cursor-pointer shrink-0"
                      >
                        {t("doc_office.configure_grid", { defaultValue: "Configure Grid" })}
                      </button>
                    )}
                  </div>
                </div>

                {/* VISUALIZATION SECTION (NATIVE SVG CHARTS) */}
                {chartData.length > 0 && (
                  <div className="w-full bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-2xl shadow-sm p-5 flex flex-col gap-3 min-w-0">
                    <div className="flex flex-wrap items-center justify-between gap-2 border-b pb-2 select-none min-w-0">
                      <h3 className="text-xs font-black uppercase tracking-wider text-gray-500 font-display flex items-center gap-1.5 min-w-0">
                        <BarChart className="h-4 w-4 text-emerald-500 shrink-0" />
                        <span className="truncate">{t("doc_office.live_charts_title", { defaultValue: "Live Spreadsheet Charts Analytics" })}</span>
                      </h3>
                      <div className="flex flex-wrap items-center gap-3 text-xs">
                        <div className="flex items-center gap-1">
                          <span className="text-gray-400 font-medium">{t("doc_office.x_labels", { defaultValue: "X (Labels):" })}</span>
                          <select 
                            value={chartXCol} 
                            onChange={(e) => setChartXCol(Number(e.target.value))}
                            className="bg-gray-100 dark:bg-slate-800 border-none outline-none rounded p-1 text-[11px] font-bold"
                          >
                            {gridData[0]?.map((col, idx) => (
                              <option key={idx} value={idx}>{col || `${t("doc_office.col_short", { defaultValue: "Col" })} ${idx + 1}`}</option>
                            ))}
                          </select>
                        </div>
                        <div className="flex items-center gap-1">
                          <span className="text-gray-400 font-medium">{t("doc_office.y_values", { defaultValue: "Y (Values):" })}</span>
                          <select 
                            value={chartYCol} 
                            onChange={(e) => setChartYCol(Number(e.target.value))}
                            className="bg-gray-100 dark:bg-slate-800 border-none outline-none rounded p-1 text-[11px] font-bold"
                          >
                            {gridData[0]?.map((col, idx) => (
                              <option key={idx} value={idx}>{col || `${t("doc_office.col_short", { defaultValue: "Col" })} ${idx + 1}`}</option>
                            ))}
                          </select>
                        </div>
                        <div className="flex bg-gray-100 dark:bg-slate-800 rounded p-0.5">
                          <button 
                            onClick={() => setChartType("bar")}
                            className={`p-1 rounded ${chartType === "bar" ? "bg-white dark:bg-slate-700 text-indigo-600 shadow-xs" : "text-gray-400"}`}
                          >
                            <BarChart className="h-3 w-3" />
                          </button>
                          <button 
                            onClick={() => setChartType("line")}
                            className={`p-1 rounded ${chartType === "line" ? "bg-white dark:bg-slate-700 text-indigo-600 shadow-xs" : "text-gray-400"}`}
                          >
                            <LineChart className="h-3 w-3" />
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* SVG GRAPH BOARD */}
                    <div className="h-56 w-full flex items-end justify-between px-6 pt-4 relative">
                      {/* Grid Background indicators */}
                      <div className="absolute inset-x-6 top-4 bottom-0 flex flex-col justify-between pointer-events-none select-none">
                        <div className="border-t border-dashed border-gray-100 dark:border-slate-800 w-full h-px" />
                        <div className="border-t border-dashed border-gray-100 dark:border-slate-800 w-full h-px" />
                        <div className="border-t border-dashed border-gray-100 dark:border-slate-800 w-full h-px" />
                        <div className="border-t border-dashed border-gray-100 dark:border-slate-800 w-full h-px" />
                      </div>

                      {/* Columns chart renderer */}
                      <div className="flex-1 h-full flex items-end justify-around relative z-10 select-none">
                        {chartData.map((data, idx) => {
                          const percent = Math.min((data.value / maxChartVal) * 100, 100);
                          return (
                            <div key={idx} className="flex flex-col items-center group relative h-full justify-end flex-1 max-w-[50px] mx-1">
                              
                              {/* Tooltip on Hover */}
                              <div className="absolute bottom-full mb-1 opacity-0 group-hover:opacity-100 bg-slate-900 text-white text-[9px] py-1 px-2 rounded-md transition duration-150 shadow-md font-mono pointer-events-none whitespace-nowrap font-bold z-20">
                                {data.label}: <span className="text-emerald-400">{data.value.toLocaleString()}</span>
                              </div>

                              {/* Graph Elements */}
                              {chartType === "bar" ? (
                                <div 
                                  style={{ height: `${percent}%` }}
                                  className="w-full bg-gradient-to-t from-emerald-600 to-indigo-500 dark:from-emerald-700 dark:to-indigo-600 rounded-t-lg transition-all duration-300 relative"
                                >
                                  {/* inner highlight */}
                                  <div className="absolute inset-x-0 top-0 h-1 bg-white/20 rounded-t-lg" />
                                </div>
                              ) : (
                                <div className="w-full flex flex-col justify-end items-center h-full">
                                  {/* Line Dot */}
                                  <div 
                                    style={{ marginBottom: `calc(${percent}% - 6px)` }}
                                    className="h-3 w-3 rounded-full bg-indigo-600 dark:bg-indigo-400 border-2 border-white dark:border-slate-900 shadow-md transition-all duration-300" 
                                  />
                                </div>
                              )}

                              {/* Label */}
                              <span className="text-[10px] text-gray-400 font-mono mt-2 truncate w-full text-center font-bold">
                                {data.label.substring(0, 6)}
                              </span>
                            </div>
                          );
                        })}
                      </div>

                      {/* Left Axis */}
                      <div className="absolute left-1 top-4 bottom-6 flex flex-col justify-between text-[8px] font-mono text-gray-400 select-none font-bold">
                        <span>{maxChartVal.toLocaleString()}</span>
                        <span>{(maxChartVal * 0.67).toLocaleString()}</span>
                        <span>{(maxChartVal * 0.33).toLocaleString()}</span>
                        <span>0</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* RIGHT SIDE PANEL: LETTER SHARING & DETAILS */}
          {!readOnly && (
            <>
              {/* Mobile overlay */}
              {showMobileSettings && (
                <div 
                  className="absolute inset-0 bg-slate-900/50 z-30 lg:hidden backdrop-blur-sm"
                  onClick={() => setShowMobileSettings(false)}
                />
              )}
              {/* Settings Panel */}
              <div className={`
                absolute lg:static top-0 right-0 bottom-0 z-40 lg:z-auto
                w-[85%] sm:w-80 lg:w-80 shrink-0 border-l border-gray-150 dark:border-slate-800 bg-gray-50 dark:bg-slate-900/95 lg:dark:bg-slate-900/60 shadow-2xl lg:shadow-none p-6 flex flex-col gap-5 overflow-y-auto
                transition-transform duration-300 ease-in-out lg:translate-x-0
                ${showMobileSettings ? 'translate-x-0' : 'translate-x-full'}
              `}>
                <div className="flex items-center justify-between lg:hidden mb-1 -mt-2 min-w-0">
                  <h3 className="text-sm font-bold text-gray-900 dark:text-white truncate">{t("common.settings", { defaultValue: "Settings" })}</h3>
                  <button onClick={() => setShowMobileSettings(false)} className="p-1 text-gray-500 hover:text-gray-800 dark:hover:text-white bg-gray-200 dark:bg-slate-800 rounded-lg shrink-0">
                    <X className="h-5 w-5" />
                  </button>
                </div>
                <div className="min-w-0">
                  <h3 className="text-xs font-black uppercase tracking-wider text-gray-500 font-display flex items-center gap-1.5 select-none">
                    <Share2 className="h-4 w-4 text-indigo-500 shrink-0" />
                    <span className="break-words">{t("doc_office.dissemination_sharing", { defaultValue: "Dissemination & Sharing" })}</span>
                  </h3>
                <p className="text-[10px] text-gray-400 leading-normal mt-1 select-none break-words">
                  {t("doc_office.dissemination_desc", { defaultValue: "Control accessibility, privacy, and which cooperative members can view this document." })}
                </p>
              </div>

              {/* PRIVACY & ACCESS CONTROL */}
              <div className={`flex flex-col gap-3 p-3.5 bg-white dark:bg-slate-900 border rounded-xl transition min-w-0 ${isPrivateDoc ? 'border-[#156c45] ring-1 ring-[#156c45]/20 bg-emerald-50/20 dark:bg-emerald-950/10' : 'border-gray-200 dark:border-slate-800'}`}>
                <label className="flex items-start gap-2.5 cursor-pointer select-none min-w-0">
                  <input 
                    type="checkbox" 
                    checked={isPrivateDoc}
                    onChange={(e) => setIsPrivateDoc(e.target.checked)}
                    className="mt-1 rounded border-gray-350 text-[#156c45] focus:ring-[#156c45] h-4 w-4 shrink-0 accent-[#156c45]"
                  />
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5">
                      <Lock className="h-3.5 w-3.5 text-[#156c45] shrink-0" />
                      <span className="text-xs font-bold text-gray-700 dark:text-slate-200 block break-words">{t("doc_office.private_document", { defaultValue: "Private Document" })}</span>
                    </div>
                    <span className="text-[10px] text-gray-400 mt-0.5 block leading-tight break-words">
                      {t("doc_office.private_document_desc", { defaultValue: "When enabled, only you and explicitly chosen cooperative members can access this file." })}
                    </span>
                  </div>
                </label>

                {isPrivateDoc && !isLetter && (
                  <div className="pt-2 border-t flex flex-col gap-2 animate-in fade-in duration-150 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[10px] font-bold text-gray-600 dark:text-slate-400 uppercase tracking-wider truncate">
                        {t("doc_office.authorized_members", { defaultValue: "Authorized Members" })} ({selectedRecipients.length})
                      </span>
                      {selectedRecipients.length > 0 && (
                        <button 
                          onClick={() => setSelectedRecipients([])} 
                          className="text-[10px] text-rose-500 hover:underline font-bold shrink-0"
                        >
                          {t("common.clear", { defaultValue: "Clear" })}
                        </button>
                      )}
                    </div>
                    <input 
                      type="text" 
                      placeholder={t("doc_office.search_member_placeholder", { defaultValue: "Search member name/email..." })} 
                      value={memberSearchQuery} 
                      onChange={(e) => setMemberSearchQuery(e.target.value)}
                      className="w-full text-xs p-1.5 bg-gray-50 dark:bg-slate-800 border rounded-lg outline-none focus:border-indigo-500"
                    />
                    <div className="max-h-48 overflow-y-auto border dark:border-slate-800 rounded-lg bg-gray-50/50 dark:bg-slate-950/40 p-1.5 divide-y divide-gray-100 dark:divide-slate-800/60">
                      {members
                        .filter(m => {
                          const q = memberSearchQuery.toLowerCase().trim();
                          if (!q) return true;
                          return (m.user?.full_name || "").toLowerCase().includes(q) ||
                            (m.user?.email || "").toLowerCase().includes(q);
                        })
                        .map((member, idx) => {
                          const isChecked = selectedRecipients.includes(member.id);
                          return (
                            <div 
                              key={`recip-${member.id}-${idx}`}
                              onClick={() => handleToggleRecipient(member.id)}
                              className="flex items-center justify-between p-1.5 hover:bg-white dark:hover:bg-slate-800 rounded-md cursor-pointer transition select-none"
                            >
                              <div className="flex items-center gap-2 min-w-0">
                                <div className="h-5 w-5 bg-[#e8f5ee] text-[#156c45] rounded-full flex items-center justify-center text-[9px] font-black shrink-0">
                                  {member.user?.full_name?.substring(0, 2) || "CO"}
                                </div>
                                <div className="min-w-0">
                                  <span className="text-[11px] font-bold text-gray-700 dark:text-slate-200 block truncate">
                                    {member.user?.full_name || t("roles.member", { defaultValue: "Member" })}
                                  </span>
                                  <span className="text-[9px] text-gray-400 block truncate">
                                    {member.user?.email}
                                  </span>
                                </div>
                              </div>
                              <div className={`h-3.5 w-3.5 rounded border flex items-center justify-center shrink-0 ${isChecked ? "bg-[#156c45] border-[#156c45] text-white" : "border-gray-300 dark:border-slate-700"}`}>
                                {isChecked && <Check className="h-2.5 w-2.5 font-bold" />}
                              </div>
                            </div>
                          );
                        })}
                    </div>
                  </div>
                )}
              </div>

              {/* WORD LETTER SPECIFIC SETTINGS */}
              {fileType === "word" && (
                <div className="flex flex-col gap-4 min-w-0">
                  
                  {/* Letter toggle */}
                  <label className={`flex items-start gap-2.5 p-3.5 bg-white dark:bg-slate-900 border rounded-xl cursor-pointer transition select-none hover:shadow-3xs min-w-0 ${isLetter ? 'border-[#156c45] ring-1 ring-[#156c45]/20 bg-emerald-50/20 dark:bg-emerald-950/10' : 'border-gray-200 dark:border-slate-800'}`}>
                    <input 
                      type="checkbox" 
                      checked={isLetter}
                      onChange={(e) => {
                        setIsLetter(e.target.checked);
                        if (!e.target.checked) {
                          setIsCustomizedDissemination(false);
                        }
                      }}
                      className="mt-1 rounded border-gray-350 text-[#156c45] focus:ring-[#156c45] h-4 w-4 shrink-0 accent-[#156c45]"
                    />
                    <div className="min-w-0">
                      <span className="text-xs font-bold text-gray-700 dark:text-slate-200 block break-words">{t("doc_office.treat_as_letter", { defaultValue: "Treat as Official Letter" })}</span>
                      <span className="text-[10px] text-gray-400 mt-0.5 block leading-tight break-words">
                        {t("doc_office.treat_as_letter_desc", { defaultValue: "Convert this page into a letter and target specific cooperative members in their received box." })}
                      </span>
                    </div>
                  </label>

                  {/* Letterhead Toggle */}
                  <label className={`flex items-start gap-2.5 p-3.5 bg-white dark:bg-slate-900 border rounded-xl cursor-pointer transition select-none hover:shadow-3xs min-w-0 ${showBrandedHeader ? 'border-[#156c45] ring-1 ring-[#156c45]/20 bg-emerald-50/20 dark:bg-emerald-950/10' : 'border-gray-200 dark:border-slate-800'}`}>
                    <input 
                      type="checkbox" 
                      checked={showBrandedHeader}
                      onChange={(e) => setShowBrandedHeader(e.target.checked)}
                      className="mt-1 rounded border-gray-350 text-[#156c45] focus:ring-[#156c45] h-4 w-4 shrink-0 accent-[#156c45]"
                    />
                    <div className="min-w-0">
                      <span className="text-xs font-bold text-gray-700 dark:text-slate-200 block break-words">{t("doc_office.include_branded_header", { defaultValue: "Include Branded Header" })}</span>
                      <span className="text-[10px] text-gray-400 mt-0.5 block leading-tight break-words">
                        {t("doc_office.include_branded_header_desc", { defaultValue: "Display the official cooperative letterhead banner at the top of the canvas." })}
                      </span>
                    </div>
                  </label>

                  {/* Reference & Date Bar Toggle */}
                  <label className={`flex items-start gap-2.5 p-3.5 bg-white dark:bg-slate-900 border rounded-xl cursor-pointer transition select-none hover:shadow-3xs min-w-0 ${showRefBar ? 'border-[#156c45] ring-1 ring-[#156c45]/20 bg-emerald-50/20 dark:bg-emerald-950/10' : 'border-gray-200 dark:border-slate-800'}`}>
                    <input 
                      type="checkbox" 
                      checked={showRefBar}
                      onChange={(e) => setShowRefBar(e.target.checked)}
                      className="mt-1 rounded border-gray-350 text-[#156c45] focus:ring-[#156c45] h-4 w-4 shrink-0 accent-[#156c45]"
                    />
                    <div className="min-w-0">
                      <span className="text-xs font-bold text-gray-700 dark:text-slate-200 block break-words">{t("doc_office.include_ref_bar", { defaultValue: "Include Reference & Date Bar" })}</span>
                      <span className="text-[10px] text-gray-400 mt-0.5 block leading-tight break-words">
                        {t("doc_office.include_ref_bar_desc", { defaultValue: "Display reference number and formal date bar on the document." })}
                      </span>
                    </div>
                  </label>

                  {/* Signatory Footer Toggle */}
                  <label className={`flex items-start gap-2.5 p-3.5 bg-white dark:bg-slate-900 border rounded-xl cursor-pointer transition select-none hover:shadow-3xs min-w-0 ${showSignatoryFooter ? 'border-[#156c45] ring-1 ring-[#156c45]/20 bg-emerald-50/20 dark:bg-emerald-950/10' : 'border-gray-200 dark:border-slate-800'}`}>
                    <input 
                      type="checkbox" 
                      checked={showSignatoryFooter}
                      onChange={(e) => setShowSignatoryFooter(e.target.checked)}
                      className="mt-1 rounded border-gray-350 text-[#156c45] focus:ring-[#156c45] h-4 w-4 shrink-0 accent-[#156c45]"
                    />
                    <div className="min-w-0">
                      <span className="text-xs font-bold text-gray-700 dark:text-slate-200 block break-words">{t("doc_office.include_signatory_footer", { defaultValue: "Include Signatory & Timestamp Footer" })}</span>
                      <span className="text-[10px] text-gray-400 mt-0.5 block leading-tight break-words">
                        {t("doc_office.include_signatory_footer_desc", { defaultValue: "Display verified digital author signature and cryptographic timestamp block at the bottom." })}
                      </span>
                    </div>
                  </label>

                  {/* Customized Dissemination Toggle */}
                  {isLetter && !editingDoc && (
                    <div className="relative min-w-0">
                      <label className="flex items-start gap-2.5 p-3.5 bg-white dark:bg-slate-900 border rounded-xl cursor-pointer transition select-none hover:shadow-3xs min-w-0">
                        <input 
                          type="checkbox" 
                          checked={isCustomizedDissemination}
                          onChange={(e) => {
                            setIsCustomizedDissemination(e.target.checked);
                          }}
                          className="mt-1 rounded border-gray-350 text-amber-600 focus:ring-amber-500 h-4 w-4 shrink-0"
                        />
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center flex-wrap gap-1.5">
                            <span className="text-xs font-bold text-gray-700 dark:text-slate-200 block break-words">{t("doc_office.individualized_dissemination", { defaultValue: "Individualized Dissemination" })}</span>
                            <span className="px-1.5 py-0.2 bg-amber-500 text-white font-bold text-[8px] uppercase tracking-wide rounded shrink-0">PRO</span>
                          </div>
                          <span className="text-[10px] text-gray-400 mt-0.5 block leading-tight break-words">
                            {t("doc_office.individualized_dissemination_desc", { defaultValue: "Generate and deliver customized individual copies mapped dynamically to organization members in the database." })}
                          </span>
                          
                          <div className="mt-2.5 p-2.5 bg-slate-50 dark:bg-slate-900/40 rounded-xl border border-gray-100 dark:border-slate-800 text-[10px] space-y-1.5 select-none min-w-0">
                            <span className="font-bold text-gray-600 dark:text-slate-350 block uppercase tracking-wider text-[8px]">
                              {t("doc_office.active_db_vars", { defaultValue: "Active Database Variables" })}
                            </span>
                            <div className="flex flex-col gap-1.5">
                              <div className="flex items-center justify-between gap-2">
                                <span className="font-mono text-[#156c45] dark:text-emerald-400 font-bold bg-[#e8f5ee] dark:bg-emerald-950/40 px-1.5 py-0.5 rounded text-[8px] shrink-0">
                                  {t("doc_office.var_full_name", { defaultValue: "full name" })}
                                </span>
                                <span className="text-gray-550 dark:text-slate-400 max-w-[130px] truncate font-medium">
                                  {activeMember?.user?.full_name || t("doc_office.cooperative_member", { defaultValue: "Cooperative Member" })}
                                </span>
                              </div>
                              <div className="flex items-center justify-between gap-2">
                                <span className="font-mono text-[#156c45] dark:text-emerald-400 font-bold bg-[#e8f5ee] dark:bg-emerald-950/40 px-1.5 py-0.5 rounded text-[8px] shrink-0">
                                  {t("doc_office.var_email", { defaultValue: "email" })}
                                </span>
                                <span className="text-gray-550 dark:text-slate-400 max-w-[130px] truncate font-medium">
                                  {activeMember?.user?.email || "member@cooperative.rw"}
                                </span>
                              </div>
                              <div className="flex items-center justify-between gap-2">
                                <span className="font-mono text-[#156c45] dark:text-emerald-400 font-bold bg-[#e8f5ee] dark:bg-emerald-950/40 px-1.5 py-0.5 rounded text-[8px] shrink-0">
                                  {t("doc_office.var_role", { defaultValue: "role" })}
                                </span>
                                <span className="text-gray-550 dark:text-slate-400 capitalize font-medium truncate">
                                  {(() => {
                                    const r = activeMember?.role || "member";
                                    const normalized = r === "org_admin" || r === "admin_representative" || r === "admin" ? "admin" : r;
                                    return t(`roles.${normalized}`, { defaultValue: normalized });
                                  })()}
                                </span>
                              </div>
                              <div className="flex items-center justify-between gap-2">
                                <span className="font-mono text-indigo-600 dark:text-indigo-400 font-bold bg-indigo-50 dark:bg-indigo-950/40 px-1.5 py-0.5 rounded text-[8px] shrink-0">
                                  {t("doc_office.var_org_name", { defaultValue: "org name" })}
                                </span>
                                <span className="text-gray-550 dark:text-slate-400 max-w-[130px] truncate font-medium">
                                  {activeOrg?.name || t("doc_office.cooperative_default", { defaultValue: "Cooperative" })}
                                </span>
                              </div>
                              <div className="flex items-center justify-between gap-2">
                                <span className="font-mono text-indigo-600 dark:text-indigo-400 font-bold bg-indigo-50 dark:bg-indigo-950/40 px-1.5 py-0.5 rounded text-[8px] shrink-0">
                                  {t("doc_office.var_date", { defaultValue: "date" })}
                                </span>
                                <span className="text-gray-550 dark:text-slate-400 font-medium">
                                  {new Date().toLocaleDateString(i18n.language)}
                                </span>
                              </div>
                            </div>
                          </div>
                        </div>
                      </label>
                      {!isProPlan && (
                        <div className="absolute inset-0 bg-stone-50/15 dark:bg-slate-950/25 backdrop-grayscale-sm rounded-xl cursor-not-allowed flex items-center justify-end p-2" title={t("doc_office.pro_feature_lock", { defaultValue: "Pro Feature Lock" })}>
                          <span className="p-1.5 bg-white/90 dark:bg-slate-800/90 rounded-lg shadow-sm border dark:border-slate-700">
                            <Lock className="h-4 w-4 text-amber-500" />
                          </span>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Letter Target selections */}
                  {isLetter && (
                    <div className="flex flex-col gap-2.5 animate-in fade-in slide-in-from-top duration-200 min-w-0">
                      
                      {/* Send to all active members check */}
                      <label className="flex items-center gap-2 px-1 select-none cursor-pointer">
                        <input 
                          type="checkbox" 
                          checked={sendToAll}
                          onChange={(e) => {
                            setSendToAll(e.target.checked);
                            if (e.target.checked) setSelectedRecipients([]);
                          }}
                          className="rounded border-gray-350 text-indigo-600 focus:ring-indigo-500 h-3.5 w-3.5 shrink-0"
                        />
                        <span className="text-[11px] font-bold text-gray-650 dark:text-slate-300 break-words">
                          {t("doc_office.send_to_all_active", { defaultValue: "Send to all active cooperative members" })}
                        </span>
                      </label>

                      {!sendToAll && (
                        <div className="flex flex-col gap-2 mt-1 min-w-0">
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-[10px] uppercase font-mono tracking-wider font-bold text-gray-400 select-none truncate">
                              {t("doc_office.recipients", { defaultValue: "Recipients" })} ({selectedRecipients.length}):
                            </span>
                            {selectedRecipients.length > 0 && (
                              <button 
                                onClick={() => setSelectedRecipients([])} 
                                className="text-[10px] text-rose-500 hover:underline font-bold shrink-0"
                              >
                                {t("common.clear", { defaultValue: "Clear" })}
                              </button>
                            )}
                          </div>

                          <input 
                            type="text" 
                            placeholder={t("doc_office.filter_members_placeholder", { defaultValue: "Filter members..." })} 
                            value={memberSearchQuery} 
                            onChange={(e) => setMemberSearchQuery(e.target.value)}
                            className="w-full text-xs p-1.5 bg-white dark:bg-slate-900 border rounded-lg outline-none focus:border-indigo-500"
                          />

                          <div className="max-h-56 overflow-y-auto border dark:border-slate-800 rounded-xl bg-white dark:bg-slate-950/40 p-2 divide-y divide-gray-100 dark:divide-slate-800/60">
                            {members
                              .filter(m => {
                                const q = memberSearchQuery.toLowerCase().trim();
                                if (!q) return true;
                                return (m.user?.full_name || "").toLowerCase().includes(q) ||
                                  (m.user?.email || "").toLowerCase().includes(q);
                              })
                              .map((member, idx) => {
                                const isChecked = selectedRecipients.includes(member.id);
                                return (
                                  <div 
                                    key={`recip-doc-${member.id}-${idx}`}
                                    onClick={() => handleToggleRecipient(member.id)}
                                    className="flex items-center justify-between p-2 hover:bg-slate-50 dark:hover:bg-slate-800/50 rounded-lg cursor-pointer transition select-none"
                                  >
                                    <div className="flex items-center gap-2 min-w-0">
                                      <div className="h-6.5 w-6.5 bg-indigo-55 rounded-full flex items-center justify-center text-[10px] font-black uppercase text-indigo-705 shrink-0 select-none">
                                        {member.user?.full_name?.substring(0, 2) || "CO"}
                                      </div>
                                      <div className="flex flex-col min-w-0">
                                        <span className="text-[11px] font-bold text-gray-700 dark:text-slate-200 truncate leading-none">
                                          {member.user?.full_name || t("doc_office.cooperative_partner", { defaultValue: "Cooperative Partner" })}
                                        </span>
                                        <span className="text-[9px] text-gray-400 font-mono mt-0.5 truncate leading-none">
                                          {member.user?.email}
                                        </span>
                                      </div>
                                    </div>

                                    <div className={`h-4 w-4 rounded-md border flex items-center justify-center transition shrink-0 ${isChecked ? "bg-indigo-600 border-indigo-600 text-white" : "border-gray-300 dark:border-slate-700"}`}>
                                      {isChecked && <Check className="h-3 w-3 font-bold" />}
                                    </div>
                                  </div>
                                );
                              })}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* EXCEL CALCULATIONS, SORTING & FORMATTING SIDEBAR */}
              {fileType === "excel" && (
                <div className="flex flex-col gap-4 animate-in fade-in duration-150 min-w-0">
                  
                  {/* Active target column selector */}
                  <div className="bg-white dark:bg-slate-900 border dark:border-slate-800 rounded-xl p-3 shadow-xs">
                    <label className="text-[10px] uppercase font-mono font-bold tracking-wider text-gray-400 block mb-1">{t("doc_office.active_target_col", { defaultValue: "Active Target Column" })}</label>
                    <select
                      value={selectedCalcCol}
                      onChange={(e) => {
                        const idx = Number(e.target.value);
                        setSelectedCalcCol(idx);
                        // Sync highlight rule column too to make it seamless
                        setHighlightRule(prev => ({ ...prev, columnIdx: idx }));
                      }}
                      className="w-full bg-gray-50 dark:bg-slate-950 border border-gray-200 dark:border-slate-800 rounded-lg p-2 font-bold text-xs focus:ring-1 focus:ring-emerald-500"
                    >
                      {gridData[0]?.map((col, idx) => (
                        <option key={idx} value={idx}>{col || `${t("doc_office.column_label", { defaultValue: "Column" })} ${idx + 1}`}</option>
                      ))}
                    </select>
                  </div>

                  {/* Mathematical Formulas & Summary Statistics */}
                  <div className="bg-white dark:bg-slate-900 border dark:border-slate-800 rounded-xl p-3.5 shadow-xs flex flex-col gap-2.5 min-w-0">
                    <div className="flex items-center gap-1.5 border-b pb-2">
                      <Sigma className="h-4 w-4 text-emerald-600 shrink-0" />
                      <span className="text-xs font-black text-gray-800 dark:text-slate-100 uppercase tracking-tight font-display break-words">{t("doc_office.formulas_calculations", { defaultValue: "Formulas & Calculations" })}</span>
                    </div>

                    <div className="space-y-2">
                      {(() => {
                        const stats = getColStats(selectedCalcCol);
                        const calcOptions = [
                          { label: t("doc_office.sum_total", { defaultValue: "Sum Total" }), val: stats.sum, type: "SUM" as const },
                          { label: t("doc_office.average_value", { defaultValue: "Average Value" }), val: stats.avg, type: "AVERAGE" as const },
                          { label: t("doc_office.minimum_value", { defaultValue: "Minimum Value" }), val: stats.min, type: "MIN" as const },
                          { label: t("doc_office.maximum_value", { defaultValue: "Maximum Value" }), val: stats.max, type: "MAX" as const },
                          { label: t("doc_office.count_numeric", { defaultValue: "Count (Numeric)" }), val: stats.count, type: "COUNT" as const },
                        ];

                        return calcOptions.map((opt) => (
                          <div key={opt.type} className="flex items-center justify-between gap-2 py-1 px-2 hover:bg-slate-50 dark:hover:bg-slate-850 rounded-lg group select-none transition min-w-0">
                            <div className="flex flex-col min-w-0">
                              <span className="text-[10px] text-gray-400 font-semibold truncate">{opt.label}</span>
                              <span className="text-xs font-black text-gray-800 dark:text-slate-200 font-mono">
                                {opt.val % 1 === 0 ? opt.val.toLocaleString(i18n.language) : opt.val.toLocaleString(i18n.language, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                              </span>
                            </div>
                            <button
                              onClick={() => injectFormulaRow(selectedCalcCol, opt.type)}
                              className="p-1 bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/30 dark:hover:bg-emerald-950/50 text-emerald-600 rounded-lg text-[10px] font-black tracking-wider transition opacity-0 group-hover:opacity-100 flex items-center gap-1 cursor-pointer shrink-0"
                              title={t("doc_office.inject_formula_row", { defaultValue: `Inject ${opt.type} row`, type: opt.type })}
                            >
                              <Plus className="h-3.5 w-3.5 shrink-0" />
                              <span>{t("doc_office.append", { defaultValue: "Append" })}</span>
                            </button>
                          </div>
                        ));
                      })()}
                    </div>
                  </div>

                  {/* Active Column Sorting Center */}
                  <div className="bg-white dark:bg-slate-900 border dark:border-slate-800 rounded-xl p-3.5 shadow-xs flex flex-col gap-2.5 min-w-0">
                    <div className="flex items-center gap-1.5 border-b pb-2">
                      <ArrowUpDown className="h-4 w-4 text-indigo-550 shrink-0" />
                      <span className="text-xs font-black text-gray-800 dark:text-slate-100 uppercase tracking-tight font-display break-words">{t("doc_office.sorting_ordering", { defaultValue: "Sorting & Ordering" })}</span>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <button
                        onClick={() => handleSortGrid(selectedCalcCol, "asc")}
                        className="px-2 py-1.5 border border-gray-150 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-850 rounded-lg text-[10px] font-black text-gray-700 dark:text-slate-300 flex items-center justify-center gap-1 transition cursor-pointer"
                      >
                        {t("doc_office.sort_az", { defaultValue: "Sort A → Z" })}
                      </button>
                      <button
                        onClick={() => handleSortGrid(selectedCalcCol, "desc")}
                        className="px-2 py-1.5 border border-gray-150 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-850 rounded-lg text-[10px] font-black text-gray-700 dark:text-slate-300 flex items-center justify-center gap-1 transition cursor-pointer"
                      >
                        {t("doc_office.sort_za", { defaultValue: "Sort Z → A" })}
                      </button>
                      <button
                        onClick={() => handleSortGrid(selectedCalcCol, "num_asc")}
                        className="px-2 py-1.5 border border-gray-150 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-850 rounded-lg text-[10px] font-black text-gray-700 dark:text-slate-300 flex items-center justify-center gap-1 transition col-span-2 cursor-pointer"
                      >
                        {t("doc_office.sort_num_asc", { defaultValue: "Sort Numerically (Min → Max)" })}
                      </button>
                      <button
                        onClick={() => handleSortGrid(selectedCalcCol, "num_desc")}
                        className="px-2 py-1.5 border border-gray-150 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-850 rounded-lg text-[10px] font-black text-gray-700 dark:text-slate-300 flex items-center justify-center gap-1 transition col-span-2 cursor-pointer"
                      >
                        {t("doc_office.sort_num_desc", { defaultValue: "Sort Numerically (Max → Min)" })}
                      </button>
                    </div>
                  </div>

                  {/* Custom Conditional Formatting Studio */}
                  <div className="bg-white dark:bg-slate-900 border dark:border-slate-800 rounded-xl p-3.5 shadow-xs flex flex-col gap-3 min-w-0">
                    <div className="flex items-center gap-1.5 border-b pb-2">
                      <Palette className="h-4 w-4 text-amber-500 shrink-0" />
                      <span className="text-xs font-black text-gray-800 dark:text-slate-100 uppercase tracking-tight font-display break-words">{t("doc_office.conditional_highlights", { defaultValue: "Conditional Highlights" })}</span>
                    </div>

                    <div className="flex flex-col gap-2 text-[11px]">
                      <div className="flex flex-col gap-1">
                        <span className="font-bold text-gray-500">{t("doc_office.formatting_rule", { defaultValue: "Formatting Rule:" })}</span>
                        <select
                          value={highlightRule.type}
                          onChange={(e) => {
                            setHighlightRule(prev => ({ 
                              ...prev, 
                              type: e.target.value as any
                            }));
                          }}
                          className="bg-gray-50 dark:bg-slate-950 border border-gray-200 dark:border-slate-800 rounded-lg p-2 font-bold text-xs text-gray-700 dark:text-slate-300"
                        >
                          <option value="none">{t("doc_office.rule_none", { defaultValue: "Disabled (No Highlight)" })}</option>
                          <option value="less_than_avg">{t("doc_office.rule_less_avg", { defaultValue: "Less than Column Average" })}</option>
                          <option value="range">{t("doc_office.rule_range", { defaultValue: "Within Custom Range (Min to Max)" })}</option>
                          <option value="less_than_val">{t("doc_office.rule_less_val", { defaultValue: "Less than Custom Value" })}</option>
                          <option value="greater_than_val">{t("doc_office.rule_greater_val", { defaultValue: "Greater than Custom Value" })}</option>
                        </select>
                      </div>

                      {highlightRule.type === "range" && (
                        <div className="grid grid-cols-2 gap-2 animate-in slide-in-from-top-1 duration-150">
                          <div className="flex flex-col gap-1">
                            <span className="font-bold text-gray-500 text-[10px]">{t("doc_office.min_value", { defaultValue: "Min Value" })}</span>
                            <input
                              type="number"
                              value={highlightRule.minVal ?? ""}
                              onChange={(e) => setHighlightRule(prev => ({ ...prev, minVal: Number(e.target.value) }))}
                              className="w-full bg-gray-50 dark:bg-slate-950 border border-gray-200 dark:border-slate-800 rounded-lg p-1.5 text-xs font-bold text-center"
                            />
                          </div>
                          <div className="flex flex-col gap-1">
                            <span className="font-bold text-gray-500 text-[10px]">{t("doc_office.max_value", { defaultValue: "Max Value" })}</span>
                            <input
                              type="number"
                              value={highlightRule.maxVal ?? ""}
                              onChange={(e) => setHighlightRule(prev => ({ ...prev, maxVal: Number(e.target.value) }))}
                              className="w-full bg-gray-50 dark:bg-slate-950 border border-gray-200 dark:border-slate-800 rounded-lg p-1.5 text-xs font-bold text-center"
                            />
                          </div>
                        </div>
                      )}

                      {(highlightRule.type === "less_than_val" || highlightRule.type === "greater_than_val") && (
                        <div className="flex flex-col gap-1 animate-in slide-in-from-top-1 duration-150">
                          <span className="font-bold text-gray-500 text-[10px]">{t("doc_office.threshold_value", { defaultValue: "Threshold Value" })}</span>
                          <input
                            type="number"
                            value={highlightRule.customVal ?? ""}
                            onChange={(e) => setHighlightRule(prev => ({ ...prev, customVal: Number(e.target.value) }))}
                            className="w-full bg-gray-50 dark:bg-slate-950 border border-gray-200 dark:border-slate-800 rounded-lg p-1.5 text-xs font-bold text-center"
                          />
                        </div>
                      )}

                      <div className="flex flex-col gap-1.5 mt-1">
                        <span className="font-bold text-gray-500">{t("doc_office.highlight_palette", { defaultValue: "Highlight Palette:" })}</span>
                        <div className="flex items-center gap-2">
                          {[
                            { color: "red" as const, bg: "bg-red-500 ring-red-450" },
                            { color: "green" as const, bg: "bg-emerald-500 ring-emerald-450" },
                            { color: "yellow" as const, bg: "bg-amber-500 ring-amber-450" },
                            { color: "blue" as const, bg: "bg-blue-500 ring-blue-450" },
                          ].map((pal) => (
                            <button
                              key={pal.color}
                              onClick={() => setHighlightRule(prev => ({ ...prev, color: pal.color }))}
                              className={`h-5 w-5 rounded-full ${pal.bg} transition ${highlightRule.color === pal.color ? "ring-4 scale-110" : "opacity-80 hover:opacity-100"}`}
                            />
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>

                </div>
              )}

              {/* GENERAL GUIDANCE CORNER */}
              <div className="mt-auto p-4 bg-indigo-50/50 dark:bg-slate-800/30 border dark:border-slate-800/60 rounded-2xl select-none min-w-0">
                <div className="flex items-start gap-2">
                  <Info className="h-4.5 w-4.5 text-indigo-500 shrink-0 mt-0.5" />
                  <div className="min-w-0">
                    <span className="text-xs font-black text-indigo-905 dark:text-indigo-400 break-words">{t("doc_office.offline_suite", { defaultValue: "Offline Office Suite" })}</span>
                    <p className="text-[10px] leading-relaxed text-slate-550 dark:text-slate-400 mt-1 break-words">
                      {t("doc_office.offline_suite_desc", { defaultValue: "Draft letters and spreadsheets. Documents are cached in the secure database so you never lose administrative progress." })}
                    </p>
                  </div>
                </div>
              </div>
              </div>
            </>
          )}
        </div>
      </div>

      {/* MODAL FOR SPREADSHEET DIMENSION SETUP */}
      {isGridModalOpen && (
        <div className="fixed inset-0 z-50 overflow-hidden bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="w-full max-w-sm max-h-[90vh] overflow-y-auto bg-white dark:bg-slate-900 rounded-2xl border border-gray-200 dark:border-slate-800 shadow-xl overflow-hidden flex flex-col animate-in fade-in duration-150">
            <div className="p-4 border-b bg-gray-50 dark:bg-slate-950/40 flex items-center justify-between gap-2 select-none shrink-0 min-w-0">
              <span className="text-sm font-black text-gray-900 dark:text-white flex items-center gap-1.5 min-w-0 truncate">
                <Settings2 className="h-4 w-4 text-[#156c45] shrink-0" />
                <span className="truncate">{t("doc_office.configure_sheet_dimensions", { defaultValue: "Configure Sheet Dimensions" })}</span>
              </span>
              <button 
                onClick={() => setIsGridModalOpen(false)} 
                className="p-1 hover:bg-gray-150 dark:hover:bg-slate-800 rounded-lg text-gray-400 cursor-pointer shrink-0"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="p-5 flex flex-col gap-4 text-xs">
              <p className="text-gray-500 dark:text-slate-400 select-none break-words">
                {t("doc_office.configure_dimensions_desc", { defaultValue: "Specify the exact number of rows and columns to generate for this spreadsheet:" })}
              </p>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-gray-700 dark:text-slate-300 block mb-1">{t("doc_office.rows", { defaultValue: "Rows" })}</label>
                  <input
                    type="number"
                    min={1}
                    max={200}
                    value={modalRows}
                    onChange={(e) => setModalRows(Math.max(1, parseInt(e.target.value, 10) || 1))}
                    className="w-full bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-lg p-2 font-bold focus:ring-1 focus:ring-emerald-500 outline-none"
                  />
                </div>
                <div>
                  <label className="font-bold text-gray-700 dark:text-slate-300 block mb-1">{t("doc_office.columns", { defaultValue: "Columns" })}</label>
                  <input
                    type="number"
                    min={1}
                    max={50}
                    value={modalCols}
                    onChange={(e) => setModalCols(Math.max(1, parseInt(e.target.value, 10) || 1))}
                    className="w-full bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-lg p-2 font-bold focus:ring-1 focus:ring-emerald-500 outline-none"
                  />
                </div>
              </div>
              <div className="flex flex-wrap items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsGridModalOpen(false)}
                  className="px-3 py-1.5 rounded-lg text-xs font-bold text-gray-600 dark:text-slate-400 hover:bg-gray-100 dark:hover:bg-slate-800 transition cursor-pointer"
                >
                  {t("common.cancel", { defaultValue: "Cancel" })}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const rowCount = Math.max(1, modalRows);
                    const colCount = Math.max(1, modalCols);
                    const newGrid = Array.from({ length: rowCount }, (_, r) =>
                      Array.from({ length: colCount }, (_, c) => gridData[r]?.[c] || "")
                    );
                    setGridData(newGrid);
                    setIsGridModalOpen(false);
                    addToast(t("doc_office.grid_configured_toast", { defaultValue: `Grid configured to ${rowCount} rows x ${colCount} columns`, rows: rowCount, cols: colCount }), "success");
                  }}
                  className="px-4 py-1.5 rounded-lg text-xs font-bold bg-[#156c45] hover:bg-[#125939] text-white transition cursor-pointer"
                >
                  {t("doc_office.apply_dimensions", { defaultValue: "Apply Dimensions" })}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL FOR BULK COOPERATIVE MEMBER MAPPING & REVIEW */}
      {isBulkImportOpen && (
        <div className="fixed inset-0 z-50 overflow-hidden bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="w-full max-w-lg bg-white dark:bg-slate-900 rounded-2xl border shadow-xl overflow-hidden flex flex-col max-h-[85vh] animate-in fade-in duration-150">
            <div className="p-4 border-b bg-gray-50 dark:bg-slate-950/40 flex items-center justify-between gap-2 select-none shrink-0 min-w-0">
              <span className="text-sm font-black text-gray-901 dark:text-white flex items-center gap-1.5 min-w-0 truncate">
                <UserPlus className="h-4 w-4 text-amber-500 shrink-0" />
                <span className="truncate">{t("doc_office.map_bulk_members", { defaultValue: "Map Bulk Members Spreadsheet" })}</span>
              </span>
              <button onClick={() => setIsBulkImportOpen(false)} className="p-1 hover:bg-gray-150 dark:hover:bg-slate-800 rounded-lg text-gray-400 shrink-0">
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="p-5 overflow-y-auto flex flex-col gap-4 text-xs">
              <p className="text-gray-500 select-none break-words">
                {t("doc_office.map_bulk_members_desc", { defaultValue: "The spreadsheet rows can be mapped directly to create new active registered members of the organization. Select the appropriate columns:" })}
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 select-none">
                <div className="flex flex-col gap-1.5">
                  <span className="font-bold text-gray-700 dark:text-slate-300">{t("doc_office.name_column", { defaultValue: "Name Column:" })}</span>
                  <select 
                    value={importNameCol}
                    onChange={(e) => setImportNameCol(Number(e.target.value))}
                    className="w-full bg-white dark:bg-slate-800 border dark:border-slate-700 rounded-lg p-2 font-bold focus:ring-1 focus:ring-amber-500"
                  >
                    {gridData[0]?.map((col, idx) => (
                      <option key={idx} value={idx}>{col || `${t("doc_office.column_label", { defaultValue: "Column" })} ${idx + 1}`}</option>
                    ))}
                  </select>
                </div>

                <div className="flex flex-col gap-1.5">
                  <span className="font-bold text-gray-700 dark:text-slate-300">{t("doc_office.email_column", { defaultValue: "Email Column:" })}</span>
                  <select 
                    value={importEmailCol}
                    onChange={(e) => setImportEmailCol(Number(e.target.value))}
                    className="w-full bg-white dark:bg-slate-800 border dark:border-slate-700 rounded-lg p-2 font-bold focus:ring-1 focus:ring-amber-500"
                  >
                    {gridData[0]?.map((col, idx) => (
                      <option key={idx} value={idx}>{col || `${t("doc_office.column_label", { defaultValue: "Column" })} ${idx + 1}`}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Rows preview table */}
              <div className="flex flex-col gap-2">
                <span className="font-mono text-[10px] text-gray-400 uppercase tracking-wider font-bold select-none">{t("doc_office.preview_rows_import", { defaultValue: "Preview of Rows to Import:" })}</span>
                <div className="border rounded-xl overflow-hidden max-h-48 overflow-y-auto">
                  <table className="w-full text-left">
                    <thead>
                      <tr className="bg-gray-50 dark:bg-slate-950 border-b font-bold text-gray-500 text-[10px] select-none uppercase">
                        <th className="p-2 border-r">{t("doc_office.no_col", { defaultValue: "No." })}</th>
                        <th className="p-2 border-r">{t("doc_office.parsed_name", { defaultValue: "Parsed Name" })}</th>
                        <th className="p-2">{t("doc_office.parsed_email", { defaultValue: "Parsed Email" })}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {gridData.slice(1).map((row, idx) => {
                        const name = row[importNameCol] || "";
                        const email = row[importEmailCol] || "";
                        const isValid = name && email.includes("@");
                        return (
                          <tr key={idx} className={`border-b border-gray-100 dark:border-slate-805/70 text-[11px] ${isValid ? "bg-emerald-50/20 dark:bg-emerald-950/10" : "bg-red-50/25 dark:bg-red-950/10"}`}>
                            <td className="p-2 border-r font-mono text-gray-400">{idx + 1}</td>
                            <td className="p-2 border-r font-bold truncate max-w-[120px]">{name || <em className="text-gray-400">{t("doc_office.empty_cell", { defaultValue: "Empty" })}</em>}</td>
                            <td className="p-2 font-mono truncate max-w-[150px]">{email || <em className="text-gray-400">{t("doc_office.empty_cell", { defaultValue: "Empty" })}</em>}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            <div className="p-4 bg-gray-50 dark:bg-slate-950/40 border-t flex flex-wrap justify-end gap-2.5 shrink-0 select-none">
              <button 
                onClick={() => setIsBulkImportOpen(false)}
                className="px-4 py-2 border rounded-lg text-xs font-bold hover:bg-gray-100 dark:hover:bg-slate-800 transition text-gray-600 dark:text-slate-300"
              >
                {t("common.cancel", { defaultValue: "Cancel" })}
              </button>
              <button 
                onClick={handleBulkMembersImport}
                disabled={isSaving}
                className="px-5 py-2 bg-amber-500 hover:bg-amber-600 text-slate-950 rounded-lg text-xs font-bold transition"
              >
                {isSaving ? t("doc_office.importing", { defaultValue: "Importing..." }) : t("doc_office.confirm_bulk_import", { defaultValue: "Confirm Bulk Import" })}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Signature Pad */}
      <DigitalSignaturePad
        isOpen={showSignaturePad}
        onClose={() => setShowSignaturePad(false)}
        documentTitle={docName || t("doc_office.official_workspace_doc", { defaultValue: "Official Workspace Document" })}
        documentVersion={1}
        signerName={activeMember?.user?.full_name || t("doc_office.authorized_member", { defaultValue: "Authorized Member" })}
        signerRole={t("doc_office.executive_official", { defaultValue: "Executive Official" })}
        onSignComplete={(data) => {
          const sigs = MockDB.getDocumentSignatures();
          const newSig = {
            id: "sig-" + Date.now(),
            document_id: editingDoc?.id || "doc-draft",
            member_id: activeMember?.id || "mem-1",
            org_id: activeOrg?.id || "default-org",
            signer_name: data.signerName,
            signer_role: data.signerRole,
            signature_type: data.signatureType,
            signature_data_url: data.signatureDataUrl,
            document_version: data.documentVersion,
            verification_hash: data.verificationHash,
            signed_at: data.signedAt
          };
          MockDB.saveDocumentSignatures([newSig, ...sigs]);
          addToast(t("doc_office.signature_registered", { defaultValue: `Signature successfully registered with verification hash ${data.verificationHash}!`, hash: data.verificationHash }), "success");
        }}
      />
    </div>
  );
};
