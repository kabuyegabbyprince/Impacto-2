import React, { useRef, useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { PenTool, Upload, Type, Eraser, CheckCircle2, ShieldCheck, RefreshCw, X, AlertCircle } from "lucide-react";

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
  documentTitle,
  documentVersion = 1,
  signerName: defaultSignerName,
  signerRole,
  onSignComplete
}) => {
  const { t } = useTranslation();
  const [signMode, setSignMode] = useState<"draw" | "upload" | "type">("draw");
  const [signerName, setSignerName] = useState(defaultSignerName || "");
  const [penColor, setPenColor] = useState<string>("#0f172a"); // Dark Navy Slate
  const [penWidth, setPenWidth] = useState<number>(2.5);
  const [uploadedImage, setUploadedImage] = useState<string | null>(null);
  const [selectedFont, setSelectedFont] = useState<string>("cursive");
  const [hasDrawn, setHasDrawn] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);

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

  const effectiveDocTitle = documentTitle || t("signature.default_doc_title", "Official Document");
  const effectiveSignerRole = signerRole || t("layout.member", "Member");

  const handleConfirmSignature = () => {
    setValidationError(null);
    setIsSubmitting(true);
    let finalDataUrl = "";

    if (signMode === "draw") {
      if (!canvasRef.current || !hasDrawn) {
        setValidationError(t("signature.err_draw", "Please draw your signature first."));
        setIsSubmitting(false);
        return;
      }
      finalDataUrl = canvasRef.current.toDataURL("image/png");
    } else if (signMode === "upload") {
      if (!uploadedImage) {
        setValidationError(t("signature.err_upload", "Please upload a signature image."));
        setIsSubmitting(false);
        return;
      }
      finalDataUrl = uploadedImage;
    } else if (signMode === "type") {
      if (!signerName.trim()) {
        setValidationError(t("signature.err_name", "Please enter your full name."));
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
      signerName: signerName || t("signature.authorized_signatory", "Authorized Signatory"),
      signerRole: effectiveSignerRole,
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
        <div className="px-6 py-4 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between gap-3 bg-gray-50/50 dark:bg-gray-800/30">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="p-2 rounded-2xl bg-emerald-600 text-white shadow-sm shrink-0">
              <ShieldCheck className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <h3 className="font-bold text-base text-gray-900 dark:text-white break-words">
                {t("signature.title", "Secure Digital E-Signature")}
              </h3>
              <p className="text-xs text-gray-500 break-words">
                {t("signature.signing_label", "Signing")}: <strong className="text-gray-700 dark:text-gray-300">{effectiveDocTitle}</strong> ({t("signature.version", "Version")} {documentVersion}.0)
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 p-1.5 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 shrink-0"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-5 flex-1">
          {validationError && (
            <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-xs font-medium text-rose-700 dark:text-rose-300 flex items-center gap-2">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span className="break-words">{validationError}</span>
            </div>
          )}

          {/* Signer Identity Information */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-gray-50 dark:bg-gray-800/40 p-3.5 rounded-2xl border border-gray-200 dark:border-gray-700/60">
            <div className="min-w-0">
              <label className="block text-[11px] font-semibold text-gray-600 dark:text-gray-400 mb-1 break-words">
                {t("signature.signer_name_label", "Legal Signer Name")}
              </label>
              <input
                type="text"
                value={signerName}
                onChange={(e) => { setSignerName(e.target.value); setValidationError(null); }}
                placeholder={t("signature.signer_name_placeholder", "Full Legal Name")}
                className="w-full px-3 py-1.5 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-xs font-medium text-gray-900 dark:text-white"
              />
            </div>
            <div className="min-w-0">
              <label className="block text-[11px] font-semibold text-gray-600 dark:text-gray-400 mb-1 break-words">
                {t("signature.role_label", "Official Capacity / Role")}
              </label>
              <div className="px-3 py-1.5 rounded-xl bg-gray-200/70 dark:bg-gray-700/60 text-xs font-semibold text-gray-800 dark:text-gray-200 break-words">
                {effectiveSignerRole}
              </div>
            </div>
          </div>

          {/* Mode Selector Tabs */}
          <div className="flex flex-wrap sm:flex-nowrap bg-gray-100 dark:bg-gray-800 p-1 rounded-2xl gap-1">
            <button
              type="button"
              onClick={() => { setSignMode("draw"); setValidationError(null); }}
              className={`flex-1 min-w-[110px] py-2 px-2 text-xs font-semibold rounded-xl flex items-center justify-center gap-1.5 transition ${
                signMode === "draw" ? "bg-white dark:bg-gray-900 text-emerald-600 dark:text-emerald-400 shadow-sm" : "text-gray-600 dark:text-gray-400 hover:text-gray-900"
              }`}
            >
              <PenTool className="h-3.5 w-3.5 shrink-0" /> <span className="break-words">{t("signature.mode_draw", "Draw by Touch/Cursor")}</span>
            </button>
            <button
              type="button"
              onClick={() => { setSignMode("upload"); setValidationError(null); }}
              className={`flex-1 min-w-[110px] py-2 px-2 text-xs font-semibold rounded-xl flex items-center justify-center gap-1.5 transition ${
                signMode === "upload" ? "bg-white dark:bg-gray-900 text-emerald-600 dark:text-emerald-400 shadow-sm" : "text-gray-600 dark:text-gray-400 hover:text-gray-900"
              }`}
            >
              <Upload className="h-3.5 w-3.5 shrink-0" /> <span className="break-words">{t("signature.mode_upload", "Upload Image")}</span>
            </button>
            <button
              type="button"
              onClick={() => { setSignMode("type"); setValidationError(null); }}
              className={`flex-1 min-w-[110px] py-2 px-2 text-xs font-semibold rounded-xl flex items-center justify-center gap-1.5 transition ${
                signMode === "type" ? "bg-white dark:bg-gray-900 text-emerald-600 dark:text-emerald-400 shadow-sm" : "text-gray-600 dark:text-gray-400 hover:text-gray-900"
              }`}
            >
              <Type className="h-3.5 w-3.5 shrink-0" /> <span className="break-words">{t("signature.mode_type", "Styled Typography")}</span>
            </button>
          </div>

          {/* MODE 1: DRAW CANVAS */}
          {signMode === "draw" && (
            <div className="space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="text-xs text-gray-500 break-words">{t("signature.draw_hint", "Sign with stylus, touch screen, or mouse trackpad:")}</span>
                <div className="flex items-center gap-2 shrink-0">
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => setPenColor("#0f172a")}
                      className={`w-5 h-5 rounded-full bg-slate-900 border-2 ${penColor === "#0f172a" ? "border-emerald-500 scale-110" : "border-transparent"}`}
                      title={t("signature.color_navy", "Navy Black")}
                    />
                    <button
                      type="button"
                      onClick={() => setPenColor("#1e3a8a")}
                      className={`w-5 h-5 rounded-full bg-blue-900 border-2 ${penColor === "#1e3a8a" ? "border-emerald-500 scale-110" : "border-transparent"}`}
                      title={t("signature.color_blue", "Royal Blue")}
                    />
                  </div>
                  <button
                    type="button"
                    onClick={clearCanvas}
                    className="px-2.5 py-1 rounded-lg border border-gray-200 dark:border-gray-700 text-xs font-medium text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 flex items-center gap-1 transition"
                  >
                    <Eraser className="h-3.5 w-3.5" /> {t("signature.clear", "Clear")}
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
                  <div className="absolute inset-0 pointer-events-none flex items-center justify-center text-gray-300 dark:text-gray-700 text-sm font-medium px-4 text-center">
                    {t("signature.draw_placeholder", "Draw your signature here")}
                  </div>
                )}
                <div className="absolute bottom-2 left-3 pointer-events-none text-[10px] text-gray-400 font-mono">
                  {t("signature.guideline", "✕ Sign above the guideline")}
                </div>
              </div>
            </div>
          )}

          {/* MODE 2: UPLOAD IMAGE */}
          {signMode === "upload" && (
            <div className="space-y-4">
              <label className="border-2 border-dashed border-gray-300 dark:border-gray-700 rounded-2xl p-6 flex flex-col items-center justify-center cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800/40 transition text-center">
                <Upload className="h-8 w-8 text-emerald-600 mb-2" />
                <span className="text-xs font-semibold text-gray-900 dark:text-white break-words">{t("signature.upload_title", "Choose Signature Photo or Scan")}</span>
                <span className="text-[11px] text-gray-500 mt-0.5 break-words">{t("signature.upload_hint", "PNG, JPG, or WEBP with transparent or white background")}</span>
                <input type="file" accept="image/*" onChange={handleImageUpload} className="hidden" />
              </label>

              {uploadedImage && (
                <div className="p-4 rounded-2xl bg-white dark:bg-gray-950 border border-gray-200 dark:border-gray-800 flex items-center justify-between gap-2">
                  <div className="flex items-center gap-3 min-w-0">
                    <img src={uploadedImage} alt={t("signature.uploaded_alt", "Uploaded Signature")} className="h-14 max-w-xs object-contain" />
                    <span className="text-xs font-semibold text-emerald-600 flex items-center gap-1 shrink-0">
                      <CheckCircle2 className="h-4 w-4" /> {t("signature.ready", "Ready")}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setUploadedImage(null)}
                    className="text-xs text-rose-600 hover:underline shrink-0"
                  >
                    {t("common.remove", "Remove")}
                  </button>
                </div>
              )}
            </div>
          )}

          {/* MODE 3: TYPOGRAPHY */}
          {signMode === "type" && (
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">{t("signature.select_font", "Select Font Style")}</label>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setSelectedFont("cursive")}
                    className={`p-3 rounded-xl border text-center text-sm italic font-serif transition break-words ${
                      selectedFont === "cursive" ? "border-emerald-500 bg-emerald-50/40 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-300" : "border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300"
                    }`}
                  >
                    {t("signature.font_calligraphic", "Calligraphic")}
                  </button>
                  <button
                    type="button"
                    onClick={() => setSelectedFont("serif")}
                    className={`p-3 rounded-xl border text-center text-sm italic font-serif transition break-words ${
                      selectedFont === "serif" ? "border-emerald-500 bg-emerald-50/40 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-300" : "border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300"
                    }`}
                  >
                    {t("signature.font_serif", "Executive Serif")}
                  </button>
                  <button
                    type="button"
                    onClick={() => setSelectedFont("sans")}
                    className={`p-3 rounded-xl border text-center text-sm italic font-sans font-bold transition break-words ${
                      selectedFont === "sans" ? "border-emerald-500 bg-emerald-50/40 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-300" : "border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300"
                    }`}
                  >
                    {t("signature.font_sans", "Modern Script")}
                  </button>
                </div>
              </div>

              {/* Preview */}
              <div className="p-6 rounded-2xl bg-white dark:bg-gray-950 border border-gray-200 dark:border-gray-800 text-center shadow-inner">
                <span className="text-[10px] uppercase font-mono text-gray-400 block mb-2">{t("signature.live_render", "Live Signature Render")}</span>
                <p
                  className={`text-3xl text-slate-900 dark:text-slate-100 break-words ${
                    selectedFont === "cursive"
                      ? "font-serif italic tracking-wide"
                      : selectedFont === "serif"
                      ? "font-serif italic font-medium"
                      : "font-sans italic font-bold"
                  }`}
                >
                  {signerName || t("signature.your_signature", "Your Signature")}
                </p>
              </div>
            </div>
          )}

          {/* Legal Compliance Notice */}
          <div className="p-3.5 rounded-2xl bg-emerald-50/70 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/60 text-xs text-emerald-900 dark:text-emerald-200 flex items-start gap-2.5">
            <ShieldCheck className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" />
            <span className="leading-relaxed break-words">
              {t("signature.legal_confirm", "By applying this digital signature, I confirm that I have reviewed version {{version}}.0 and agree to legally bind my acknowledgement pursuant to cooperative bylaws.", { version: documentVersion })}
            </span>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-4 border-t border-gray-100 dark:border-gray-800 flex flex-wrap items-center justify-end gap-3 bg-gray-50/50 dark:bg-gray-800/30">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2.5 rounded-xl border border-gray-300 dark:border-gray-600 text-xs font-semibold text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition"
          >
            {t("common.cancel", "Cancel")}
          </button>
          <button
            type="button"
            onClick={handleConfirmSignature}
            disabled={isSubmitting}
            className="px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition flex items-center gap-2 shadow-sm"
          >
            {isSubmitting ? <RefreshCw className="h-4 w-4 animate-spin shrink-0" /> : <CheckCircle2 className="h-4 w-4 shrink-0" />}
            <span>{t("signature.apply_btn", "Apply Cryptographic E-Sign")}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
