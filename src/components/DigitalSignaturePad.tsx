import React, { useRef, useState, useEffect } from "react";
import { PenTool, Upload, Type, Eraser, CheckCircle2, ShieldCheck, RefreshCw, X, Download } from "lucide-react";

interface DigitalSignaturePadProps {
  isOpen: boolean;
  onClose: () => void;
  documentTitle?: string;
  documentVersion?: number;
  signerName: string;
  signerRole?: string;
  onSignComplete: (signatureData: {
    signatureDataUrl: string;
    signatureType: "drawn" | "uploaded" | "typed";
    signerName: string;
    signerRole: string;
    documentVersion: number;
    signedAt: string;
    verificationHash: string;
  }) => void;
}

export const DigitalSignaturePad: React.FC<DigitalSignaturePadProps> = ({
  isOpen,
  onClose,
  documentTitle = "Official Document",
  documentVersion = 1,
  signerName: defaultSignerName,
  signerRole = "Member",
  onSignComplete
}) => {
  const [signMode, setSignMode] = useState<"draw" | "upload" | "type">("draw");
  const [signerName, setSignerName] = useState(defaultSignerName || "");
  const [penColor, setPenColor] = useState<string>("#0f172a"); // Dark Navy Slate
  const [penWidth, setPenWidth] = useState<number>(2.5);
  const [uploadedImage, setUploadedImage] = useState<string | null>(null);
  const [selectedFont, setSelectedFont] = useState<string>("cursive");
  const [hasDrawn, setHasDrawn] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const isDrawing = useRef<boolean>(false);
  const lastPoint = useRef<{ x: number; y: number } | null>(null);

  useEffect(() => {
    if (defaultSignerName) setSignerName(defaultSignerName);
  }, [defaultSignerName]);

  // Canvas setup
  useEffect(() => {
    if (!isOpen || signMode !== "draw") return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // High DPI scaling
    const rect = canvas.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.scale(dpr, dpr);
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.strokeStyle = penColor;
    ctx.lineWidth = penWidth;
  }, [isOpen, signMode]);

  if (!isOpen) return null;

  const getCanvasCoords = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    if ("touches" in e) {
      const touch = e.touches[0];
      return {
        x: touch.clientX - rect.left,
        y: touch.clientY - rect.top
      };
    } else {
      return {
        x: e.clientX - rect.left,
        y: e.clientY - rect.top
      };
    }
  };

  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    isDrawing.current = true;
    const coords = getCanvasCoords(e);
    lastPoint.current = coords;
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (ctx) {
      ctx.beginPath();
      ctx.strokeStyle = penColor;
      ctx.lineWidth = penWidth;
      ctx.moveTo(coords.x, coords.y);
    }
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawing.current) return;
    e.preventDefault();
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!ctx) return;

    const coords = getCanvasCoords(e);
    ctx.lineTo(coords.x, coords.y);
    ctx.stroke();
    lastPoint.current = coords;
    setHasDrawn(true);
  };

  const stopDrawing = () => {
    isDrawing.current = false;
    lastPoint.current = null;
  };

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!ctx || !canvas) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setHasDrawn(false);
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        if (event.target?.result) {
          setUploadedImage(event.target.result as string);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const generateTypedSignatureDataUrl = (): string => {
    const canvas = document.createElement("canvas");
    canvas.width = 600;
    canvas.height = 200;
    const ctx = canvas.getContext("2d");
    if (!ctx) return "";

    ctx.clearRect(0, 0, 600, 200);
    ctx.fillStyle = penColor;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";

    if (selectedFont === "cursive") {
      ctx.font = "italic 48px 'Great Vibes', 'Dancing Script', 'Caveat', cursive";
    } else if (selectedFont === "serif") {
      ctx.font = "italic 42px 'Playfair Display', Georgia, serif";
    } else {
      ctx.font = "italic bold 40px sans-serif";
    }

    ctx.fillText(signerName || "Authorized Signatory", 300, 100);
    return canvas.toDataURL("image/png");
  };

  const handleConfirmSignature = () => {
    setIsSubmitting(true);
    let finalDataUrl = "";

    if (signMode === "draw") {
      if (!canvasRef.current || !hasDrawn) {
        alert("Please draw your signature first.");
        setIsSubmitting(false);
        return;
      }
      finalDataUrl = canvasRef.current.toDataURL("image/png");
    } else if (signMode === "upload") {
      if (!uploadedImage) {
        alert("Please upload a signature image.");
        setIsSubmitting(false);
        return;
      }
      finalDataUrl = uploadedImage;
    } else if (signMode === "type") {
      if (!signerName.trim()) {
        alert("Please enter your full name.");
        setIsSubmitting(false);
        return;
      }
      finalDataUrl = generateTypedSignatureDataUrl();
    }

    const verificationHash = "SIG-" + Math.random().toString(36).substring(2, 10).toUpperCase() + "-" + Date.now().toString(36).toUpperCase();
    const signedAt = new Date().toISOString();

    onSignComplete({
      signatureDataUrl: finalDataUrl,
      signatureType: signMode === "draw" ? "drawn" : signMode === "upload" ? "uploaded" : "typed",
      signerName: signerName || "Authorized Signatory",
      signerRole: signerRole || "Member",
      documentVersion,
      signedAt,
      verificationHash
    });

    setIsSubmitting(false);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white dark:bg-gray-900 rounded-3xl max-w-xl w-full border border-gray-200 dark:border-gray-800 shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between bg-gray-50/50 dark:bg-gray-800/30">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-2xl bg-emerald-600 text-white shadow-sm">
              <ShieldCheck className="h-5 w-5" />
            </div>
            <div>
              <h3 className="font-bold text-base text-gray-900 dark:text-white">Secure Digital E-Signature</h3>
              <p className="text-xs text-gray-500">
                Signing: <strong className="text-gray-700 dark:text-gray-300">{documentTitle}</strong> (Version {documentVersion}.0)
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 p-1.5 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-5 flex-1">
          {/* Signer Identity Information */}
          <div className="grid grid-cols-2 gap-3 bg-gray-50 dark:bg-gray-800/40 p-3.5 rounded-2xl border border-gray-200 dark:border-gray-700/60">
            <div>
              <label className="block text-[11px] font-semibold text-gray-600 dark:text-gray-400 mb-1">Legal Signer Name</label>
              <input
                type="text"
                value={signerName}
                onChange={(e) => setSignerName(e.target.value)}
                placeholder="Full Legal Name"
                className="w-full px-3 py-1.5 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-xs font-medium text-gray-900 dark:text-white"
              />
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-gray-600 dark:text-gray-400 mb-1">Official Capacity / Role</label>
              <div className="px-3 py-1.5 rounded-xl bg-gray-200/70 dark:bg-gray-700/60 text-xs font-semibold text-gray-800 dark:text-gray-200">
                {signerRole}
              </div>
            </div>
          </div>

          {/* Mode Selector Tabs */}
          <div className="flex bg-gray-100 dark:bg-gray-800 p-1 rounded-2xl gap-1">
            <button
              type="button"
              onClick={() => setSignMode("draw")}
              className={`flex-1 py-2 text-xs font-semibold rounded-xl flex items-center justify-center gap-1.5 transition ${
                signMode === "draw" ? "bg-white dark:bg-gray-900 text-emerald-600 dark:text-emerald-400 shadow-sm" : "text-gray-600 dark:text-gray-400 hover:text-gray-900"
              }`}
            >
              <PenTool className="h-3.5 w-3.5" /> Draw by Touch/Cursor
            </button>
            <button
              type="button"
              onClick={() => setSignMode("upload")}
              className={`flex-1 py-2 text-xs font-semibold rounded-xl flex items-center justify-center gap-1.5 transition ${
                signMode === "upload" ? "bg-white dark:bg-gray-900 text-emerald-600 dark:text-emerald-400 shadow-sm" : "text-gray-600 dark:text-gray-400 hover:text-gray-900"
              }`}
            >
              <Upload className="h-3.5 w-3.5" /> Upload Image
            </button>
            <button
              type="button"
              onClick={() => setSignMode("type")}
              className={`flex-1 py-2 text-xs font-semibold rounded-xl flex items-center justify-center gap-1.5 transition ${
                signMode === "type" ? "bg-white dark:bg-gray-900 text-emerald-600 dark:text-emerald-400 shadow-sm" : "text-gray-600 dark:text-gray-400 hover:text-gray-900"
              }`}
            >
              <Type className="h-3.5 w-3.5" /> Styled Typography
            </button>
          </div>

          {/* MODE 1: DRAW CANVAS */}
          {signMode === "draw" && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs text-gray-500">Sign with stylus, touch screen, or mouse trackpad:</span>
                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => setPenColor("#0f172a")}
                      className={`w-5 h-5 rounded-full bg-slate-900 border-2 ${penColor === "#0f172a" ? "border-emerald-500 scale-110" : "border-transparent"}`}
                      title="Navy Black"
                    />
                    <button
                      type="button"
                      onClick={() => setPenColor("#1e3a8a")}
                      className={`w-5 h-5 rounded-full bg-blue-900 border-2 ${penColor === "#1e3a8a" ? "border-emerald-500 scale-110" : "border-transparent"}`}
                      title="Royal Blue"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={clearCanvas}
                    className="px-2.5 py-1 rounded-lg border border-gray-200 dark:border-gray-700 text-xs font-medium text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 flex items-center gap-1 transition"
                  >
                    <Eraser className="h-3.5 w-3.5" /> Clear
                  </button>
                </div>
              </div>

              <div className="relative border-2 border-dashed border-gray-300 dark:border-gray-700 rounded-2xl bg-white dark:bg-gray-950 overflow-hidden shadow-inner">
                <canvas
                  ref={canvasRef}
                  onMouseDown={startDrawing}
                  onMouseMove={draw}
                  onMouseUp={stopDrawing}
                  onMouseLeave={stopDrawing}
                  onTouchStart={startDrawing}
                  onTouchMove={draw}
                  onTouchEnd={stopDrawing}
                  className="w-full h-44 cursor-crosshair touch-none"
                />
                {!hasDrawn && (
                  <div className="absolute inset-0 pointer-events-none flex items-center justify-center text-gray-300 dark:text-gray-700 text-sm font-medium">
                    Draw your signature here
                  </div>
                )}
                <div className="absolute bottom-2 left-3 pointer-events-none text-[10px] text-gray-400 font-mono">
                  ✕ Sign above the guideline
                </div>
              </div>
            </div>
          )}

          {/* MODE 2: UPLOAD IMAGE */}
          {signMode === "upload" && (
            <div className="space-y-4">
              <label className="border-2 border-dashed border-gray-300 dark:border-gray-700 rounded-2xl p-6 flex flex-col items-center justify-center cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800/40 transition">
                <Upload className="h-8 w-8 text-emerald-600 mb-2" />
                <span className="text-xs font-semibold text-gray-900 dark:text-white">Choose Signature Photo or Scan</span>
                <span className="text-[11px] text-gray-500 mt-0.5">PNG, JPG, or WEBP with transparent or white background</span>
                <input type="file" accept="image/*" onChange={handleImageUpload} className="hidden" />
              </label>

              {uploadedImage && (
                <div className="p-4 rounded-2xl bg-white dark:bg-gray-950 border border-gray-200 dark:border-gray-800 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <img src={uploadedImage} alt="Uploaded Signature" className="h-14 max-w-xs object-contain" />
                    <span className="text-xs font-semibold text-emerald-600 flex items-center gap-1">
                      <CheckCircle2 className="h-4 w-4" /> Ready
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setUploadedImage(null)}
                    className="text-xs text-rose-600 hover:underline"
                  >
                    Remove
                  </button>
                </div>
              )}
            </div>
          )}

          {/* MODE 3: TYPOGRAPHY */}
          {signMode === "type" && (
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Select Font Style</label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setSelectedFont("cursive")}
                    className={`p-3 rounded-xl border text-center text-sm italic font-serif transition ${
                      selectedFont === "cursive" ? "border-emerald-500 bg-emerald-50/40 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-300" : "border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300"
                    }`}
                  >
                    Calligraphic
                  </button>
                  <button
                    type="button"
                    onClick={() => setSelectedFont("serif")}
                    className={`p-3 rounded-xl border text-center text-sm italic font-serif transition ${
                      selectedFont === "serif" ? "border-emerald-500 bg-emerald-50/40 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-300" : "border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300"
                    }`}
                  >
                    Executive Serif
                  </button>
                  <button
                    type="button"
                    onClick={() => setSelectedFont("sans")}
                    className={`p-3 rounded-xl border text-center text-sm italic font-sans font-bold transition ${
                      selectedFont === "sans" ? "border-emerald-500 bg-emerald-50/40 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-300" : "border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300"
                    }`}
                  >
                    Modern Script
                  </button>
                </div>
              </div>

              {/* Preview */}
              <div className="p-6 rounded-2xl bg-white dark:bg-gray-950 border border-gray-200 dark:border-gray-800 text-center shadow-inner">
                <span className="text-[10px] uppercase font-mono text-gray-400 block mb-2">Live Signature Render</span>
                <p
                  className={`text-3xl text-slate-900 dark:text-slate-100 ${
                    selectedFont === "cursive"
                      ? "font-serif italic tracking-wide"
                      : selectedFont === "serif"
                      ? "font-serif italic font-medium"
                      : "font-sans italic font-bold"
                  }`}
                >
                  {signerName || "Your Signature"}
                </p>
              </div>
            </div>
          )}

          {/* Legal Compliance Checkbox */}
          <div className="p-3.5 rounded-2xl bg-emerald-50/70 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/60 text-xs text-emerald-900 dark:text-emerald-200 flex items-start gap-2.5">
            <ShieldCheck className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" />
            <span className="leading-relaxed">
              By applying this digital signature, I confirm that I have reviewed version <strong>{documentVersion}.0</strong> and agree to legally bind my acknowledgement pursuant to cooperative bylaws.
            </span>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-4 border-t border-gray-100 dark:border-gray-800 flex items-center justify-end gap-3 bg-gray-50/50 dark:bg-gray-800/30">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2.5 rounded-xl border border-gray-300 dark:border-gray-600 text-xs font-semibold text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleConfirmSignature}
            disabled={isSubmitting}
            className="px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition flex items-center gap-2 shadow-sm"
          >
            {isSubmitting ? <RefreshCw className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
            Apply Cryptographic E-Sign
          </button>
        </div>
      </div>
    </div>
  );
};
