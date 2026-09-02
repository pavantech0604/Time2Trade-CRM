import React, { useState, useRef } from 'react';
import { useAuth } from '../../context/AuthContext';
import { 
  Upload, 
  Camera, 
  Trash2, 
  Plus, 
  Loader2, 
  CheckCircle2, 
  Play, 
  FileText, 
  AlertCircle,
  HelpCircle,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import { uploadFileToBucket, supabase } from '../../lib/supabase';
import Tesseract from 'tesseract.js';

interface ParsedLead {
  id: string;
  name: string;
  phone: string;
  language: string;
  notes: string;
}

export const TelecallerLeadsPhoto: React.FC = () => {
  const { currentUser, addLead } = useAuth();
  
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [rotation, setRotation] = useState<number>(0);
  const [isUploading, setIsUploading] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [ocrProgress, setOcrProgress] = useState(0);
  const [rawText, setRawText] = useState('');
  const [parsedLeads, setParsedLeads] = useState<ParsedLead[]>([]);
  const [expandedLeadId, setExpandedLeadId] = useState<string | null>(null);
  const [showRawText, setShowRawText] = useState(false);
  const [toastMsg, setToastMsg] = useState<string | null>(null);
  const [ocrStepStatus, setOcrStepStatus] = useState<string>('');
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!currentUser) return null;

  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 4000);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      showToast("Error: Image exceeds maximum size of 5 MB");
      return;
    }

    setSelectedFile(file);
    const objectUrl = URL.createObjectURL(file);
    setPreviewUrl(objectUrl);
    setRotation(0);
    
    // Reset previous states
    setRawText('');
    setParsedLeads([]);
    setOcrProgress(0);
  };

  const sanitizePhoneNumber = (phoneStr: string): string => {
    // Correct common OCR digit detection errors including pen slash modifications
    let cleaned = phoneStr.toLowerCase()
      .replace(/[lIi]/g, '1')
      .replace(/[o]/g, '0')
      .replace(/[s]/g, '5')
      .replace(/[b]/g, '8')
      .replace(/[z]/g, '2')
      .replace(/[t]/g, '7')
      .replace(/[gq]/g, '9')
      .replace(/[f]/g, '7')
      .replace(/[a]/g, '4')
      .replace(/\D/g, ''); // strip remaining non-digits
    return cleaned.slice(-10);
  };

  const parseExtractedText = (text: string): ParsedLead[] => {
    // Clean spaces/tabs/hyphens/dots/slashes/pipes/brackets sandwiched between digits or typical OCR digit typos to keep numbers intact
    let processedText = text
      .replace(/([0-9lIioOBsSZzTtGgFfqQaA])[\s\-\.\/\\\|\,\:\;\(\)\[\]\_\~\*\+]+([0-9lIioOBsSZzTtGgFfqQaA])/gi, '$1$2')
      .replace(/([0-9lIioOBsSZzTtGgFfqQaA])[\s\-\.\/\\\|\,\:\;\(\)\[\]\_\~\*\+]+([0-9lIioOBsSZzTtGgFfqQaA])/gi, '$1$2'); // run twice to cover multiple spaces

    const lines = processedText.split('\n');
    const languagesList = [
      'Kannada', 'Hindi', 'English', 'Telugu', 'Tamil', 
      'Malayalam', 'Marathi', 'Gujarati', 'Bengali', 'Punjabi'
    ];

    // Highly lenient matching for 9 to 11 digit numbers (allows any digit/typo to cover OCR errors)
    const phoneRegex = /(?:\+?91[\s-]?)?([0-9lIioOBsSZzTtGgFfqQaA]{9,11})/i;
    const phoneRegexGlobal = /(?:\+?91[\s-]?)?([0-9lIioOBsSZzTtGgFfqQaA]{9,11})/gi;

    // 1. Row-by-Row Parsing Mode (when name and phone are on the same line)
    const rowLeads: ParsedLead[] = [];
    lines.forEach((line, index) => {
      const trimmed = line.trim();
      if (!trimmed) return;

      // Clean vertical table borders and brackets to prevent character gluing
      let cleanLine = trimmed.replace(/[\|\[\]\(\)\-\:\,\.\/]/g, ' ');

      // Merge spaces that are sandwiched between digits or typical OCR digit typos (e.g. 936 266 375 1)
      cleanLine = cleanLine.replace(/([0-9lIioOBsS])\s+([0-9lIioOBsS])/gi, '$1$2');
      cleanLine = cleanLine.replace(/([0-9lIioOBsS])\s+([0-9lIioOBsS])/gi, '$1$2'); // run twice to cover multiple spaces

      const phoneMatch = cleanLine.match(phoneRegex);
      if (!phoneMatch) return;

      const rawPhone = phoneMatch[0];
      const cleanPhone = sanitizePhoneNumber(rawPhone);
      if (cleanPhone.length < 9 || cleanPhone.length > 11) return;

      // Extract language
      const wordsLower = cleanLine.toLowerCase().split(/\s+/);
      const matchedLang = languagesList.find(lang => wordsLower.includes(lang.toLowerCase()));
      const language = matchedLang || 'English';

      // Clean the line of PAN codes, pin codes, and status keywords before extracting name
      let namePart = cleanLine.replace(rawPhone, '');
      namePart = namePart.replace(/\b[A-Z]{3,5}[0-9]{3,5}[A-Z]\b/gi, ' ');
      namePart = namePart.replace(/\b[0-9]{6}\b/g, ' ');
      namePart = namePart.replace(/\b(busy|na|rnr|nc|cw|loss|voice|nt|nw|call|later)\b/gi, ' ');
      if (matchedLang) {
        const langRegex = new RegExp(matchedLang, 'gi');
        namePart = namePart.replace(langRegex, '');
      }

      // Clean non-alphabetic noise
      namePart = namePart.replace(/[0-9\-\|\,\:\(\)\_\+\=\[\]\.\/]/g, ' ');
      const words = namePart.split(/\s+/).map(w => w.trim()).filter(w => {
        if (!w) return false;
        const lower = w.toLowerCase();
        return !['email', 'name', 'phone', 'utr', 'trader', 'lead', 'mobile', 'details', 'notes', 'telecaller', 'rm', 'language', 'time2trade', 'trade', 'tamil', 'hindi', 'kannada', 'telugu', 'english'].includes(lower);
      });

      let name = words.slice(0, 3).join(' ');
      if (!name) {
        name = `Lead ${cleanPhone.slice(-4)}`;
      }

      const notesPart = cleanLine.replace(rawPhone, '').replace(name, '');
      const notes = notesPart.replace(/\s+/g, ' ').trim();

      rowLeads.push({
        id: `row-${Date.now()}-${index}`,
        name: name,
        phone: cleanPhone,
        language: language,
        notes: notes || '',
      });
    });

    // 2. Column-by-Column Parsing Mode (Fallback when columns are separated or read sequentially)
    const allPhoneMatches = processedText.match(phoneRegexGlobal) || [];
    const allPhones = allPhoneMatches
      .map(m => sanitizePhoneNumber(m))
      .filter(p => p.length >= 9 && p.length <= 11);

    const allNames: string[] = [];
    const allLanguages: string[] = [];

    lines.forEach(line => {
      let clean = line.trim();
      if (!clean) return;

      // Skip if it contains a phone number
      if (clean.match(phoneRegex)) return;

      // Skip if it matches a PAN code
      if (clean.match(/\b[A-Z]{3,5}[0-9]{3,5}[A-Z]\b/i)) return;

      // Skip if it matches a 6-digit pin code
      if (clean.match(/\b[0-9]{6}\b/)) return;

      // Skip if it matches status keywords
      const lower = clean.toLowerCase();
      const isStatus = ['busy', 'na', 'rnr', 'nc', 'cw', 'loss', 'voice', 'nt', 'nw', 'call', 'later', 'interested', 'new'].some(status => {
        return lower === status || lower.startsWith(status + ' ') || lower.endsWith(' ' + status);
      });
      if (isStatus) return;

      // Clean numbers and common symbols to get candidate names
      clean = clean.replace(/[0-9\|\[\]\(\)\-\:\,\.\/_{\}+\=\#\*\@]/g, ' ').replace(/\s+/g, ' ').trim();
      if (!clean) return;

      const lowerClean = clean.toLowerCase();
      // Skip lines that are just headers, noise, or short segments
      const isHeader = [
        'sl no', 'trader name', 'roll no', 'id', 'segment', 'language', 'phone', 'sl.no', 'serial no', 'name', 'pan', 'pincode', 'status'
      ].some(header => lowerClean === header || lowerClean === header + 's');

      if (isHeader) return;

      // Extract language if present
      const matchedLang = languagesList.find(lang => lowerClean.includes(lang.toLowerCase()));
      if (matchedLang) {
        allLanguages.push(matchedLang);
        const langRegex = new RegExp(matchedLang, 'gi');
        clean = clean.replace(langRegex, '').trim();
      }

      // If there are words left, it's a name candidate (allow short names down to 2 characters)
      if (clean.length >= 2 && clean.length <= 35) {
        allNames.push(clean);
      }
    });

    // If row-by-row captured at least 60% of the found phone numbers, use row-by-row list
    if (rowLeads.length >= allPhones.length * 0.6 && rowLeads.length >= 5) {
      return rowLeads;
    }

    // Otherwise, build leads by pairing names and phones
    const columnLeads: ParsedLead[] = [];
    allPhones.forEach((phone, idx) => {
      const name = allNames[idx] || `Lead ${phone.slice(-4)}`;
      const language = allLanguages[idx] || 'English';

      columnLeads.push({
        id: `col-${Date.now()}-${idx}`,
        name: name,
        phone: phone,
        language: language,
        notes: '',
      });
    });

    return columnLeads.length > 0 ? columnLeads : rowLeads;
  };

  const preprocessImage = (file: File, rotationAngle: number): Promise<HTMLCanvasElement> => {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.src = URL.createObjectURL(file);
      img.onload = () => {
        if (img.width < 150 || img.height < 150) {
          reject(new Error(`Image resolution is too low (${img.width}x${img.height}). Please upload a clear photo of the A4 lead sheet.`));
          return;
        }

        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error("Failed to initialize canvas context."));
          return;
        }

        // Calculate dimensions based on rotation
        const is90or270 = rotationAngle === 90 || rotationAngle === 270;
        const srcWidth = is90or270 ? img.height : img.width;
        const srcHeight = is90or270 ? img.width : img.height;

        // Upscale image to a healthy high-resolution width of 2200px to ensure crisp font rendering
        let targetWidth = srcWidth * 2;
        if (targetWidth < 2200) {
          targetWidth = 2200;
        }
        const scaleFactor = targetWidth / srcWidth;
        const targetHeight = srcHeight * scaleFactor;

        canvas.width = targetWidth;
        canvas.height = targetHeight;

        // Draw image rotated and scaled
        ctx.translate(targetWidth / 2, targetHeight / 2);
        ctx.rotate((rotationAngle * Math.PI) / 180);
        
        const drawWidth = is90or270 ? targetHeight : targetWidth;
        const drawHeight = is90or270 ? targetWidth : targetHeight;
        ctx.drawImage(img, -drawWidth / 2, -drawHeight / 2, drawWidth, drawHeight);

        // Apply Grid-Based Adaptive Thresholding to flatten shadows and highlights
        const imgData = ctx.getImageData(0, 0, targetWidth, targetHeight);
        const data = imgData.data;

        const blockSize = 40;
        const cols = Math.ceil(targetWidth / blockSize);
        const rows = Math.ceil(targetHeight / blockSize);

        const blockMeans = new Float32Array(cols * rows);
        const blockCounts = new Int32Array(cols * rows);

        // First pass: accumulate grayscale averages for grid blocks
        for (let y = 0; y < targetHeight; y++) {
          const rowOffset = y * targetWidth * 4;
          const gridY = Math.floor(y / blockSize);

          for (let x = 0; x < targetWidth; x++) {
            const idx = rowOffset + x * 4;
            const r = data[idx];
            const g = data[idx + 1];
            const b = data[idx + 2];

            const gray = 0.299 * r + 0.587 * g + 0.114 * b;
            const gridX = Math.floor(x / blockSize);
            const blockIdx = gridY * cols + gridX;

            blockMeans[blockIdx] += gray;
            blockCounts[blockIdx]++;
          }
        }

        // Calculate means
        for (let i = 0; i < blockMeans.length; i++) {
          if (blockCounts[i] > 0) {
            blockMeans[i] /= blockCounts[i];
          } else {
            blockMeans[i] = 127;
          }
        }

        // Second pass: binarize pixels relative to local block averages
        for (let y = 0; y < targetHeight; y++) {
          const rowOffset = y * targetWidth * 4;
          const gridY = Math.floor(y / blockSize);

          for (let x = 0; x < targetWidth; x++) {
            const idx = rowOffset + x * 4;
            const r = data[idx];
            const g = data[idx + 1];
            const b = data[idx + 2];

            const gray = 0.299 * r + 0.587 * g + 0.114 * b;
            const gridX = Math.floor(x / blockSize);
            const blockIdx = gridY * cols + gridX;

            // Threshold is local block average minus contrast constant (22)
            const localMean = blockMeans[blockIdx];
            const threshold = Math.max(localMean - 22, 60);

            const value = gray < threshold ? 0 : 255;

            data[idx] = value;
            data[idx + 1] = value;
            data[idx + 2] = value;
          }
        }

        ctx.putImageData(imgData, 0, 0);
        resolve(canvas);
      };
      img.onerror = () => {
        reject(new Error("Failed to load image file. Please ensure it is a valid JPG/PNG photo."));
      };
    });
  };

  const handleProcessImage = async () => {
    if (!selectedFile) return;

    setIsProcessing(true);
    setOcrProgress(0);
    setRawText('');
    setParsedLeads([]);

    let worker: Tesseract.Worker | null = null;
    try {
      setOcrStepStatus("Optimizing image resolution & rotation...");
      const processedCanvas = await preprocessImage(selectedFile, rotation);
      
      setOcrStepStatus("Initializing OCR engine...");
      worker = await Tesseract.createWorker('eng', 1, {
        logger: (m: any) => {
          if (m.status === 'recognizing text') {
            setOcrProgress(Math.round(m.progress * 100));
          }
        }
      });

      await worker.setParameters({
        tessedit_pageseg_mode: '6' as any,
      });

      setOcrStepStatus("Extracting text and structure...");
      const { data } = await worker.recognize(processedCanvas);
      const text = data.text;
      setRawText(text);
      
      const parsed = parseExtractedText(text);
      setParsedLeads(parsed);

      if (parsed.length > 0) {
        showToast(`Successfully extracted ${parsed.length} leads!`);
      } else {
        showToast("No valid phone numbers found in image. Please double-check image resolution.");
      }
    } catch (err: any) {
      showToast("OCR processing failed: " + (err?.message || "Unknown error"));
    } finally {
      if (worker) {
        await worker.terminate();
      }
      setOcrStepStatus('');
      setIsProcessing(false);
    }
  };

  const handleAddRow = () => {
    const newLead: ParsedLead = {
      id: `manual-${Date.now()}`,
      name: '',
      phone: '',
      language: 'English',
      notes: 'Manually added',
    };
    setParsedLeads(prev => [...prev, newLead]);
  };

  const handleDeleteRow = (id: string) => {
    setParsedLeads(prev => prev.filter(item => item.id !== id));
  };

  const handleFieldChange = (id: string, field: keyof ParsedLead, value: string) => {
    setParsedLeads(prev => 
      prev.map(item => item.id === id ? { ...item, [field]: value } : item)
    );
  };

  const handleSaveLeads = async () => {
    if (parsedLeads.length === 0) return;

    // Validate inputs
    const invalidLeads = parsedLeads.filter(l => !l.name.trim() || l.phone.length !== 10);
    if (invalidLeads.length > 0) {
      showToast("Validation Error: Please ensure all leads have a valid name and 10-digit phone number.");
      return;
    }

    setIsUploading(true);
    let uploadedImageUrl = '';

    // Upload scanned image to private Supabase bucket in background if configured
    try {
      const pathPrefix = currentUser.id;
      const fileExt = selectedFile?.name.split('.').pop() || 'jpg';
      const fileName = `${Date.now()}_scan.${fileExt}`;
      
      const res = await uploadFileToBucket('leads-photos', selectedFile!, pathPrefix);
      if (res.path) {
        if (supabase) {
          const { data } = supabase.storage.from('leads-photos').getPublicUrl(`${pathPrefix}/${fileName}`);
          uploadedImageUrl = data?.publicUrl || '';
        } else {
          uploadedImageUrl = `https://storage.time2trade.com/${res.path}`;
        }
      }
    } catch {
      // Storage upload fallback handled gracefully
    }

    // Insert leads
    try {
      parsedLeads.forEach(lead => {
        const isRM = currentUser.role === 'relationship_manager';
        addLead({
          name: lead.name.trim(),
          phone: lead.phone.trim(),
          language: lead.language,
          source: 'leads_photo',
          assigned_to: isRM ? undefined : currentUser.id,
          rm_assigned_to: isRM ? currentUser.id : undefined,
          rm_assigned_to_name: isRM ? currentUser.name : undefined,
          status: isRM ? 'interested_rm_required' : 'new',
          upload_date: new Date().toISOString().split('T')[0],
          telecaller_notes: `[Scanned Photo Lead] ${lead.notes.trim()}` + (uploadedImageUrl ? ` | Document Link: ${uploadedImageUrl}` : ''),
        });
      });

      showToast(`Successfully saved ${parsedLeads.length} leads to Leads Master!`);
      
      // Reset
      setSelectedFile(null);
      setPreviewUrl(null);
      setRawText('');
      setParsedLeads([]);
    } catch (err: any) {
      showToast("Failed to save leads: " + err.message);
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6 animate-in fade-in duration-300 font-sans pb-10">
      
      {/* Toast Notification */}
      {toastMsg && (
        <div className="fixed top-4 right-4 z-50 bg-[#091A2F] border border-[#C5A028]/35 text-white py-3 px-5 rounded-2xl shadow-2xl flex items-center gap-3 animate-in fade-in slide-in-from-top-4 duration-300">
          <CheckCircle2 className="w-5 h-5 text-[#C5A028]" />
          <span className="text-xs font-semibold">{toastMsg}</span>
        </div>
      )}

      {/* Header Title */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-black text-[#091A2F] uppercase tracking-tight font-heading">
            Upload Leads Photo
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Scan physical printed A4 lead sheets using OCR to import leads directly into the system.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* Left Column: Image Selection & Dropzone */}
        <div className="lg:col-span-5 bg-white border border-[#C5A028]/25 p-5 rounded-3xl shadow-md space-y-4">
          <h3 className="text-sm font-bold text-[#091A2F] font-mono uppercase tracking-wider flex items-center gap-2">
            <Camera className="w-4 h-4 text-[#C5A028]" /> Select Lead Sheet Photo
          </h3>

          <div 
            onClick={() => fileInputRef.current?.click()}
            className={`border-2 border-dashed rounded-2xl p-6 text-center space-y-3 cursor-pointer transition-all ${
              previewUrl 
                ? 'border-emerald-500/40 bg-emerald-50/10' 
                : 'border-slate-200 hover:border-[#16A34A]/50 bg-[#FAF8F5]'
            }`}
          >
            <input 
              type="file" 
              ref={fileInputRef}
              onChange={handleFileChange}
              accept="image/*"
              className="hidden"
            />
            
            {previewUrl ? (
              <div className="space-y-3">
                <div className="overflow-hidden flex items-center justify-center p-2 rounded-xl border border-slate-100 bg-white">
                  <img 
                    src={previewUrl} 
                    alt="Lead Sheet Scan Preview" 
                    className="max-h-56 object-contain rounded-xl shadow-sm origin-center"
                    style={{ transform: `rotate(${rotation}deg)`, transition: 'transform 0.2s ease-in-out' }}
                  />
                </div>
                <div className="flex gap-2 justify-center" onClick={(e) => e.stopPropagation()}>
                  <button
                    type="button"
                    onClick={() => setRotation(prev => (prev - 90 + 360) % 360)}
                    className="px-2.5 py-1.5 rounded-xl bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-700 text-[10px] font-bold cursor-pointer transition-all active:scale-95"
                  >
                    ↺ Rotate Left
                  </button>
                  <button
                    type="button"
                    onClick={() => setRotation(prev => (prev + 90) % 360)}
                    className="px-2.5 py-1.5 rounded-xl bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-700 text-[10px] font-bold cursor-pointer transition-all active:scale-95"
                  >
                    ↻ Rotate Right
                  </button>
                </div>
                <p className="text-[11px] text-emerald-600 font-semibold">
                  Selected: {selectedFile?.name} (Click to change)
                </p>
              </div>
            ) : (
              <div className="space-y-2 py-4">
                <Upload className="w-8 h-8 text-slate-400 mx-auto" />
                <p className="text-xs text-slate-650 font-semibold">
                  Drag and drop lead sheet photo or click to browse
                </p>
                <p className="text-[10px] text-slate-400 font-mono">
                  Accepts JPG, JPEG, PNG (max 5MB)
                </p>
              </div>
            )}
          </div>

          <div className="bg-[#FAF8F5] border border-slate-200 p-3.5 rounded-2xl space-y-2">
            <h4 className="text-[11px] font-bold text-[#091A2F] uppercase flex items-center gap-1.5">
              <HelpCircle className="w-3.5 h-3.5 text-[#C5A028]" /> Scanning Guidelines:
            </h4>
            <ul className="text-[10px] text-slate-500 space-y-1 list-disc list-inside">
              <li>Ensure the text on the sheet is printed, clean, and legible.</li>
              <li>Position the camera directly above the paper (avoid steep angles).</li>
              <li>Ensure adequate lighting to minimize shadows and blurry lines.</li>
              <li>Handwritten lead sheets may fail to scan correctly.</li>
            </ul>
          </div>

          {selectedFile && (
            <button
              onClick={handleProcessImage}
              disabled={isProcessing}
              className="w-full py-3 rounded-xl bg-[#091A2F] border border-[#C5A028]/35 hover:bg-[#122842] hover:border-[#C5A028] text-white font-bold text-xs transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {isProcessing ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin text-white" />
                  Extracting Text... ({ocrProgress}%)
                </>
              ) : (
                <>
                  <Play className="w-4 h-4 text-white" />
                  Process & Extract Leads
                </>
              )}
            </button>
          )}

          {isProcessing && (
            <div className="space-y-2 p-3 bg-[#FAF8F5] border border-slate-200 rounded-2xl animate-pulse">
              <div className="flex justify-between text-[10px] font-mono font-bold text-slate-500">
                <span className="text-[#16A34A]">{ocrStepStatus || 'Processing...'}</span>
                <span>{ocrProgress}%</span>
              </div>
              <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-gradient-to-r from-emerald-500 to-[#C5A028] rounded-full transition-all duration-300"
                  style={{ width: `${ocrProgress}%` }}
                />
              </div>
            </div>
          )}
        </div>

        {/* Right Column: Parsed Leads Table / Cards Preview */}
        <div className="lg:col-span-7 space-y-4">
          
          {/* Raw Text Debugger Accordion */}
          {rawText && (
            <div className="bg-white border border-slate-200 rounded-3xl overflow-hidden shadow-sm">
              <button
                onClick={() => setShowRawText(!showRawText)}
                className="w-full px-5 py-3.5 bg-[#FAF8F5] flex items-center justify-between border-b border-slate-150 hover:bg-slate-100/55 transition-colors cursor-pointer"
              >
                <span className="text-xs font-bold text-[#091A2F] font-mono uppercase tracking-wider flex items-center gap-2">
                  <FileText className="w-4 h-4 text-[#C5A028]" /> Raw Extracted OCR Output
                </span>
                <span className="text-[11px] font-bold text-slate-400">
                  {showRawText ? 'Hide Raw text' : 'Show Raw text'}
                </span>
              </button>
              {showRawText && (
                <div className="p-4 bg-slate-50 border-t border-slate-100">
                  <textarea
                    value={rawText}
                    readOnly
                    rows={6}
                    className="w-full bg-[#FAF8F5] border border-slate-200 text-slate-650 font-mono text-[10.5px] p-3 rounded-2xl outline-none"
                  />
                </div>
              )}
            </div>
          )}

          {/* Table Container */}
          <div className="bg-white border border-[#C5A028]/25 rounded-3xl p-5 shadow-md space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-sm font-bold text-[#091A2F] font-mono uppercase tracking-wider">
                Parsed Leads Preview ({parsedLeads.length})
              </h3>
              
              <button
                onClick={handleAddRow}
                className="py-1.5 px-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 hover:bg-emerald-500/15 text-emerald-700 font-bold text-[10.5px] transition-all flex items-center gap-1.5 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" /> Add Lead Row
              </button>
            </div>

            {parsedLeads.length === 0 ? (
              <div className="text-center py-10 text-slate-400 space-y-2">
                <AlertCircle className="w-8 h-8 mx-auto text-slate-300" />
                <p className="text-xs">No parsed leads to preview yet.</p>
                <p className="text-[10px] text-slate-400 max-w-sm mx-auto">
                  Upload a printed lead sheet image on the left and click "Process" to automatically parse leads, or click "Add Lead Row" to create them manually.
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                
                {/* Desktop view: structured table */}
                <div className="hidden md:block overflow-x-auto">
                  <table className="w-full border-collapse text-left text-[11.5px]">
                    <thead>
                      <tr className="border-b border-slate-200 text-slate-400 font-mono uppercase">
                        <th className="py-2.5 px-3 font-semibold">Lead Name *</th>
                        <th className="py-2.5 px-3 font-semibold">Phone *</th>
                        <th className="py-2.5 px-3 font-semibold">Language</th>
                        <th className="py-2.5 px-3 font-semibold">Notes</th>
                        <th className="py-2.5 px-2 text-center font-semibold">Delete</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {parsedLeads.map((lead) => (
                        <tr key={lead.id} className="hover:bg-slate-50/50 transition-colors">
                          <td className="py-2 px-1">
                            <input
                              type="text"
                              required
                              value={lead.name}
                              placeholder="Name"
                              onChange={(e) => handleFieldChange(lead.id, 'name', e.target.value)}
                              className="w-full bg-white border border-slate-200 rounded-lg px-2 py-1.5 focus:outline-none focus:border-blue-500 font-semibold text-slate-800"
                            />
                          </td>
                          <td className="py-2 px-1">
                            <input
                              type="text"
                              required
                              maxLength={10}
                              value={lead.phone}
                              placeholder="Phone"
                              onChange={(e) => handleFieldChange(lead.id, 'phone', e.target.value.replace(/\D/g, ''))}
                              className="w-full bg-white border border-slate-200 rounded-lg px-2 py-1.5 focus:outline-none focus:border-blue-500 font-mono text-slate-855"
                            />
                          </td>
                          <td className="py-2 px-1">
                            <select
                              value={lead.language}
                              onChange={(e) => handleFieldChange(lead.id, 'language', e.target.value)}
                              className="w-full bg-white border border-slate-200 rounded-lg px-2 py-1.5 focus:outline-none focus:border-blue-500 text-slate-750 font-semibold cursor-pointer"
                            >
                              <option value="English">English</option>
                              <option value="Hindi">Hindi</option>
                              <option value="Kannada">Kannada</option>
                              <option value="Telugu">Telugu</option>
                              <option value="Tamil">Tamil</option>
                              <option value="Malayalam">Malayalam</option>
                              <option value="Marathi">Marathi</option>
                              <option value="Gujarati">Gujarati</option>
                              <option value="Bengali">Bengali</option>
                              <option value="Punjabi">Punjabi</option>
                            </select>
                          </td>
                          <td className="py-2 px-1">
                            <input
                              type="text"
                              value={lead.notes}
                              placeholder=""
                              onChange={(e) => handleFieldChange(lead.id, 'notes', e.target.value)}
                              className="w-full bg-white border border-slate-200 rounded-lg px-2 py-1.5 focus:outline-none focus:border-blue-500 text-slate-600"
                            />
                          </td>
                          <td className="py-2 px-2 text-center">
                            <button
                              onClick={() => handleDeleteRow(lead.id)}
                              className="p-1.5 rounded-lg text-rose-500 hover:bg-rose-50 hover:text-rose-600 transition-colors cursor-pointer"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Mobile view: stack of responsive cards */}
                <div className="grid grid-cols-1 gap-2.5 md:hidden block">
                  {parsedLeads.map((lead, idx) => {
                    const isExpanded = expandedLeadId === lead.id;
                    const hasError = !lead.name.trim() || lead.phone.length !== 10;

                    return (
                      <div 
                        key={lead.id} 
                        className={`border rounded-2xl transition-all overflow-hidden ${
                          isExpanded 
                            ? 'bg-[#FAF8F5] border-[#C5A028]/50 shadow-md' 
                            : hasError
                              ? 'bg-rose-50/20 border-rose-200'
                              : 'bg-white border-slate-100 hover:border-slate-200 shadow-sm'
                        }`}
                      >
                        {/* Accordion Header */}
                        <div 
                          onClick={() => setExpandedLeadId(isExpanded ? null : lead.id)}
                          className="p-3.5 flex items-center justify-between cursor-pointer select-none"
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <span className="font-mono text-[10px] font-bold px-2 py-1 rounded bg-[#091A2F]/5 text-[#091A2F] shrink-0">
                              #{idx + 1}
                            </span>
                            <div className="min-w-0">
                              <h4 className="text-xs font-bold text-slate-800 truncate">
                                {lead.name.trim() || <span className="text-rose-500 italic">No Name Added</span>}
                              </h4>
                              <p className="text-[10.5px] font-mono text-slate-550 mt-0.5">
                                {lead.phone.trim() || <span className="text-rose-500 italic">No Phone</span>}
                              </p>
                            </div>
                          </div>

                          <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                            <span className="text-[9.5px] text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full font-bold">
                              {lead.language}
                            </span>
                            
                            {/* Expand toggle */}
                            <button
                              onClick={() => setExpandedLeadId(isExpanded ? null : lead.id)}
                              className="p-1 rounded-lg text-slate-400 hover:bg-slate-100 cursor-pointer"
                            >
                              {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                            </button>

                            {/* Delete button */}
                            <button
                              onClick={() => handleDeleteRow(lead.id)}
                              className="p-1 rounded-lg text-rose-500 hover:bg-rose-50 cursor-pointer"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>

                        {/* Accordion Form Content (Only visible if expanded) */}
                        {isExpanded && (
                          <div className="px-4 pb-4 pt-1 border-t border-slate-100 bg-[#FAF8F5] grid grid-cols-1 gap-3 text-xs animate-in slide-in-from-top-2 duration-200">
                            <div>
                              <label className="text-[9px] font-bold text-slate-400 block mb-0.5 uppercase tracking-wide">
                                Lead Name *
                              </label>
                              <input
                                type="text"
                                required
                                value={lead.name}
                                onChange={(e) => handleFieldChange(lead.id, 'name', e.target.value)}
                                className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-slate-800 font-medium focus:outline-none focus:border-blue-500 shadow-sm"
                              />
                            </div>

                            <div>
                              <label className="text-[9px] font-bold text-slate-400 block mb-0.5 uppercase tracking-wide">
                                Phone Number *
                              </label>
                              <input
                                type="text"
                                required
                                maxLength={10}
                                value={lead.phone}
                                onChange={(e) => handleFieldChange(lead.id, 'phone', e.target.value.replace(/\D/g, ''))}
                                className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-slate-800 font-mono focus:outline-none focus:border-blue-500 shadow-sm"
                              />
                            </div>

                            <div>
                              <label className="text-[9px] font-bold text-slate-400 block mb-0.5 uppercase tracking-wide">
                                Language
                              </label>
                              <select
                                value={lead.language}
                                onChange={(e) => handleFieldChange(lead.id, 'language', e.target.value)}
                                className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-slate-750 font-bold focus:outline-none focus:border-blue-500 cursor-pointer shadow-sm"
                              >
                                <option value="English">English</option>
                                <option value="Hindi">Hindi</option>
                                <option value="Kannada">Kannada</option>
                                <option value="Telugu">Telugu</option>
                                <option value="Tamil">Tamil</option>
                                <option value="Malayalam">Malayalam</option>
                                <option value="Marathi">Marathi</option>
                                <option value="Gujarati">Gujarati</option>
                                <option value="Bengali">Bengali</option>
                                <option value="Punjabi">Punjabi</option>
                              </select>
                            </div>

                            <div>
                              <label className="text-[9px] font-bold text-slate-400 block mb-0.5 uppercase tracking-wide">
                                Notes / Details
                              </label>
                              <input
                                type="text"
                                value={lead.notes}
                                onChange={(e) => handleFieldChange(lead.id, 'notes', e.target.value)}
                                className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-slate-650 focus:outline-none focus:border-blue-500 shadow-sm"
                              />
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>

                <div className="pt-3 border-t border-slate-100 flex justify-end gap-3">
                  <button
                    onClick={() => setParsedLeads([])}
                    className="py-2.5 px-4 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-650 font-bold text-xs cursor-pointer transition-colors"
                  >
                    Clear All
                  </button>
                  <button
                    onClick={handleSaveLeads}
                    disabled={isUploading}
                    className="py-2.5 px-6 rounded-xl bg-emerald-600 border border-emerald-600/35 hover:bg-emerald-500 hover:border-emerald-500 text-white font-bold text-xs transition-all shadow-md shadow-emerald-500/10 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60"
                  >
                    {isUploading ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        Saving Leads...
                      </>
                    ) : (
                      <>
                        Save Leads
                      </>
                    )}
                  </button>
                </div>

              </div>
            )}

          </div>

        </div>

      </div>

    </div>
  );
};
