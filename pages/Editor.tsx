import React, { useState, useRef, useEffect } from 'react';
import { Upload, Move, Check, Loader2, Palette, Shirt, ArrowRight, Undo, Globe, Settings, Printer, Wand2, Calculator, Smartphone, Monitor, FileText, Image as ImageIcon, FileType } from 'lucide-react';
import { jsPDF } from "jspdf";
import { Step, PassportStandard } from '../types';
import { performCrop, createTiledSheet } from '../utils/canvasUtils';
import { editPassportPhoto } from '../services/geminiService';

const PASSPORT_STANDARDS: PassportStandard[] = [
  {
    id: 'us_2x2',
    name: 'United States (2x2")',
    description: '2x2 inch (51x51mm)',
    widthMm: 51,
    heightMm: 51,
    aspectRatio: 1,
    geminiAspectRatio: '1:1'
  },
  {
    id: 'uk_eu',
    name: 'Standard / UK / EU',
    description: '35x45mm (Most Common)',
    widthMm: 35,
    heightMm: 45,
    aspectRatio: 35/45,
    geminiAspectRatio: '3:4'
  },
  {
    id: 'in_pan',
    name: 'India - PAN Card (UTI/NSDL)',
    description: '25x35mm (Strictly for PAN)',
    widthMm: 25,
    heightMm: 35,
    aspectRatio: 25/35,
    geminiAspectRatio: '3:4'
  },
  {
    id: 'in_stamp',
    name: 'Stamp Size',
    description: '20x25mm',
    widthMm: 20,
    heightMm: 25,
    aspectRatio: 20/25,
    geminiAspectRatio: '3:4'
  }
];

const TRENDING_COLORS = [
  { name: 'White', hex: '#FFFFFF', border: 'border-slate-200' },
  { name: 'Light Blue', hex: '#E6F3FF', border: 'border-blue-100' },
  { name: 'Grey', hex: '#F0F0F0', border: 'border-slate-200' },
  { name: 'Red', hex: '#DB1514', border: 'border-red-200' }, 
  { name: 'Blue', hex: '#0047AB', border: 'border-blue-200' }, 
  { name: 'Cream', hex: '#FDFBF7', border: 'border-amber-100' }
];

const Editor: React.FC = () => {
  // Global State
  const [step, setStep] = useState<Step>(Step.SELECT_TYPE);
  const [selectedStandard, setSelectedStandard] = useState<PassportStandard>(PASSPORT_STANDARDS[1]); 
  const [originalImage, setOriginalImage] = useState<HTMLImageElement | null>(null);
  
  // Manual Crop State
  const [cropBox, setCropBox] = useState<{ x: number, y: number, width: number } | null>(null);
  const [imgDimensions, setImgDimensions] = useState<{ width: number, height: number } | null>(null);
  const [interactionMode, setInteractionMode] = useState<'none' | 'move' | 'resize'>('none');
  const [startPos, setStartPos] = useState({ x: 0, y: 0 });
  const [startCrop, setStartCrop] = useState({ x: 0, y: 0, width: 0 });
  const containerRef = useRef<HTMLDivElement>(null);
  
  // Edit & Process State
  const [croppedImage, setCroppedImage] = useState<string | null>(null);
  const [editedImage, setEditedImage] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [editType, setEditType] = useState<'background' | 'clothing'>('background');
  const [customColor, setCustomColor] = useState<string>('#ffffff');
  
  // Print Settings State
  const [printSettings, setPrintSettings] = useState<{ 
    paperSize: '4x6' | 'A4', 
    forceLayout: boolean,
    addGap: boolean,
    useCustomCount: boolean,
    customCount: number
  }>({
    paperSize: 'A4',
    forceLayout: true,
    addGap: true,
    useCustomCount: false,
    customCount: 4
  });

  const [downloadFormat, setDownloadFormat] = useState<'jpg' | 'pdf'>('jpg');
  
  // Preview State
  const [sheetPreviewUrl, setSheetPreviewUrl] = useState<string | null>(null);
  const [isGeneratingPreview, setIsGeneratingPreview] = useState(false);
  
  // Refs
  const fileInputRef = useRef<HTMLInputElement>(null);
  const TARGET_CROP_WIDTH = 600;

  // --- Effects ---
  useEffect(() => {
    if (step === Step.DOWNLOAD && (editedImage || croppedImage)) {
        updateSheetPreview();
    }
  }, [printSettings, editedImage, croppedImage, step]);

  const updateSheetPreview = async () => {
    const source = editedImage || croppedImage;
    if (!source) return;

    setIsGeneratingPreview(true);
    
    // Config for forced layouts
    let forceGrid = undefined;
    
    if (printSettings.forceLayout && (selectedStandard.id === 'us_2x2' || selectedStandard.id === 'uk_eu')) {
        if (printSettings.paperSize === 'A4') {
            forceGrid = { cols: 6, rows: 6 }; 
        } else if (printSettings.paperSize === '4x6') {
            forceGrid = { cols: 3, rows: 4 }; 
        }
    }

    try {
        const url = await createTiledSheet(
            source,
            selectedStandard,
            printSettings.paperSize,
            'portrait', 
            {
                addBorder: printSettings.addGap, // Use this for drawing cut lines
                gapMm: printSettings.addGap ? 4 : 0, // 4mm spacing if requested
                forceGrid: forceGrid,
                limitCount: printSettings.useCustomCount ? printSettings.customCount : undefined
            }
        );
        setSheetPreviewUrl(url);
    } catch (e) {
        console.error("Preview generation failed", e);
    } finally {
        setIsGeneratingPreview(false);
    }
  };

  // --- Handlers ---
  const handleStandardSelect = (std: PassportStandard) => {
    setSelectedStandard(std);
    setStep(Step.UPLOAD);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const img = new Image();
        img.onload = () => {
          setOriginalImage(img);
          setStep(Step.CROP);
          setCroppedImage(null);
          setEditedImage(null);
          setCropBox(null); 
        };
        img.src = event.target?.result as string;
      };
      reader.readAsDataURL(e.target.files[0]);
    }
  };

  // --- Manual Crop Logic (Simplified) ---
  const onImageLoad = (e: React.SyntheticEvent<HTMLImageElement>) => {
    const { width, height } = e.currentTarget;
    setImgDimensions({ width, height });
    const ar = selectedStandard.aspectRatio;
    let initialWidth = width * 0.8;
    let initialHeight = initialWidth / ar;
    if (initialHeight > height * 0.8) {
        initialHeight = height * 0.8;
        initialWidth = initialHeight * ar;
    }
    setCropBox({ x: (width - initialWidth) / 2, y: (height - initialHeight) / 2, width: initialWidth });
  };

  const handlePointerDown = (e: React.PointerEvent, mode: 'move' | 'resize') => {
    e.preventDefault(); e.stopPropagation();
    setInteractionMode(mode);
    setStartPos({ x: e.clientX, y: e.clientY });
    if (cropBox) setStartCrop({ ...cropBox });
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (interactionMode === 'none' || !cropBox || !imgDimensions) return;
    e.preventDefault();
    const dx = e.clientX - startPos.x;
    const dy = e.clientY - startPos.y;
    const ar = selectedStandard.aspectRatio;
    
    if (interactionMode === 'move') {
        let newX = startCrop.x + dx;
        let newY = startCrop.y + dy;
        const currentHeight = cropBox.width / ar;
        newX = Math.max(0, Math.min(newX, imgDimensions.width - cropBox.width));
        newY = Math.max(0, Math.min(newY, imgDimensions.height - currentHeight));
        setCropBox({ ...cropBox, x: newX, y: newY });
    } else if (interactionMode === 'resize') {
        let newWidth = startCrop.width + dx;
        newWidth = Math.max(50, Math.min(newWidth, imgDimensions.width - startCrop.x, (imgDimensions.height - startCrop.y) * ar));
        setCropBox({ ...cropBox, width: newWidth });
    }
  };

  const handleCropComplete = () => {
    if (!originalImage || !cropBox || !imgDimensions) return;
    const scaleFactor = originalImage.naturalWidth / imgDimensions.width;
    const naturalCrop = {
        x: cropBox.x * scaleFactor,
        y: cropBox.y * scaleFactor,
        width: cropBox.width * scaleFactor,
        height: (cropBox.width / selectedStandard.aspectRatio) * scaleFactor
    };
    const dataUrl = performCrop(originalImage, naturalCrop, TARGET_CROP_WIDTH);
    setCroppedImage(dataUrl);
    setStep(Step.EDIT);
  };

  // --- AI Handlers ---
  const handleEdit = async (prompt: string) => {
    if (!croppedImage) return;
    const sourceImage = editedImage || croppedImage;
    setIsProcessing(true);
    try {
        const result = await editPassportPhoto(sourceImage, prompt, selectedStandard.geminiAspectRatio);
        setEditedImage(result);
    } catch (err) {
        alert("Could not process image. Please try again.");
    } finally {
        setIsProcessing(false);
    }
  };

  // --- Download Handlers ---
  const handleDownloadSheet = () => {
    if (!sheetPreviewUrl) return;

    if (downloadFormat === 'pdf') {
        // PDF Download
        // A4: 210 x 297 mm
        // 4x6 inch: 101.6 x 152.4 mm
        const format = printSettings.paperSize === 'A4' ? 'a4' : [101.6, 152.4];
        
        const doc = new jsPDF({
            orientation: 'portrait',
            unit: 'mm',
            format: format
        });

        const width = doc.internal.pageSize.getWidth();
        const height = doc.internal.pageSize.getHeight();

        doc.addImage(sheetPreviewUrl, 'JPEG', 0, 0, width, height);
        doc.save(`passport-sheet-${printSettings.paperSize}.pdf`);

    } else {
        // JPG Download
        const link = document.createElement('a');
        link.download = `passport-sheet-${printSettings.paperSize}.jpg`;
        link.href = sheetPreviewUrl;
        link.click();
    }
  };

  const handleReset = () => {
    setStep(Step.SELECT_TYPE);
    setOriginalImage(null);
    setEditedImage(null);
    setCroppedImage(null);
    setSheetPreviewUrl(null);
  };

  // --- Render Steps ---
  const renderSelectTypeStep = () => (
    <div className="flex flex-col items-center w-full max-w-4xl animate-fade-in px-4">
        <h2 className="text-3xl font-bold text-slate-800 mb-2 text-center">Select Document Type</h2>
        <p className="text-slate-600 mb-8 text-center">Choose the standard size for your needs.</p>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-4 w-full">
            {PASSPORT_STANDARDS.map((std) => (
                <button key={std.id} onClick={() => handleStandardSelect(std)} className="flex flex-row items-center p-4 bg-white border-2 border-slate-200 rounded-xl hover:border-blue-500 hover:shadow-lg transition-all text-left gap-4">
                    <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center shrink-0"><Globe className="w-6 h-6" /></div>
                    <div>
                      <h3 className="text-lg font-bold text-slate-800">{std.name}</h3>
                      <p className="text-sm text-slate-500">{std.description}</p>
                    </div>
                </button>
            ))}
        </div>
    </div>
  );

  const renderUploadStep = () => (
    <div className="flex flex-col items-center p-8 md:p-12 border-2 border-dashed border-blue-200 rounded-3xl bg-blue-50/50 w-full max-w-xl mx-4">
      <Upload className="w-12 h-12 text-blue-600 mb-4" />
      <h2 className="text-2xl font-bold text-slate-800 mb-6 text-center">Upload Photo</h2>
      <input type="file" ref={fileInputRef} onChange={handleFileChange} accept="image/*" className="hidden" />
      <div className="flex flex-col sm:flex-row gap-4 w-full sm:w-auto">
        <button onClick={() => setStep(Step.SELECT_TYPE)} className="px-6 py-3 rounded-xl font-semibold text-slate-500 hover:bg-slate-100 border border-transparent hover:border-slate-200">Back</button>
        <button onClick={() => fileInputRef.current?.click()} className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-3 rounded-xl font-semibold shadow-lg">Select Image</button>
      </div>
    </div>
  );

  const renderCropStep = () => (
    <div className="flex flex-col lg:flex-row gap-8 w-full max-w-6xl px-4" onPointerUp={() => setInteractionMode('none')} onPointerLeave={() => setInteractionMode('none')}>
      <div className="flex-grow flex flex-col items-center bg-slate-100 p-2 md:p-4 rounded-xl w-full">
        <div ref={containerRef} className="relative shadow-2xl overflow-hidden cursor-crosshair touch-none w-full flex justify-center bg-slate-200" onPointerMove={handlePointerMove}>
            {originalImage && (
                <img 
                    src={originalImage.src} 
                    onLoad={onImageLoad} 
                    className="max-w-full max-h-[60vh] md:max-h-[70vh] block pointer-events-none object-contain" 
                />
            )}
            <div className="absolute inset-0 bg-black/50 pointer-events-none"></div>
            {cropBox && (
                <div className="absolute border-2 border-white shadow-[0_0_0_9999px_rgba(0,0,0,0.5)] cursor-move" style={{ left: cropBox.x, top: cropBox.y, width: cropBox.width, height: cropBox.width / selectedStandard.aspectRatio }} onPointerDown={(e) => handlePointerDown(e, 'move')}>
                    <div className="absolute bottom-0 right-0 w-8 h-8 bg-blue-600 rounded-tl-lg cursor-nwse-resize z-10" onPointerDown={(e) => handlePointerDown(e, 'resize')}></div>
                    {/* Grid Lines */}
                    <div className="absolute inset-0 grid grid-cols-3 grid-rows-3 pointer-events-none opacity-50">
                        <div className="border-r border-b border-white/50"></div><div className="border-r border-b border-white/50"></div><div className="border-b border-white/50"></div>
                        <div className="border-r border-b border-white/50"></div><div className="border-r border-b border-white/50"></div><div className="border-b border-white/50"></div>
                        <div className="border-r border-white/50"></div><div className="border-r border-white/50"></div><div></div>
                    </div>
                </div>
            )}
        </div>
        <p className="text-sm text-slate-500 mt-4 flex items-center gap-2"><Move className="w-4 h-4" /> Drag to move • Drag corner to resize</p>
      </div>
      <div className="w-full lg:w-80 bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex flex-col justify-between shrink-0">
        <div><h3 className="font-bold mb-2">Manual Crop</h3><p className="text-sm text-slate-600">Align face within the box.</p></div>
        <button onClick={handleCropComplete} className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3 rounded-xl font-semibold mt-6 flex items-center justify-center gap-2">Next <ArrowRight className="w-4 h-4" /></button>
      </div>
    </div>
  );

  const renderEditStep = () => (
    <div className="flex flex-col lg:flex-row gap-8 w-full max-w-6xl px-4">
       <div className="flex-grow flex flex-col items-center">
            <div className="relative shadow-2xl rounded-sm border-8 border-white max-w-full">
                <img src={editedImage || croppedImage || ''} className="w-full max-w-[400px] h-auto" />
                {isProcessing && <div className="absolute inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center text-white"><Loader2 className="w-10 h-10 animate-spin" /></div>}
            </div>
            {editedImage && <button onClick={() => setEditedImage(null)} className="mt-4 flex items-center gap-2 text-sm text-red-600"><Undo className="w-4 h-4" /> Undo Edits</button>}
       </div>
       <div className="w-full lg:w-96 bg-white p-6 rounded-2xl shadow-sm border border-slate-100 shrink-0">
            <div className="flex p-1 bg-slate-100 rounded-lg mb-4">
                <button onClick={() => setEditType('background')} className={`flex-1 py-2 rounded-md text-sm font-semibold ${editType === 'background' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500'}`}>Background</button>
                <button onClick={() => setEditType('clothing')} className={`flex-1 py-2 rounded-md text-sm font-semibold ${editType === 'clothing' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500'}`}>Clothing</button>
            </div>
            
            {editType === 'background' ? (
                <div className="space-y-6">
                    {/* Trending Colors */}
                    <div>
                        <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">Trending Colors</h4>
                        <div className="grid grid-cols-3 gap-3">
                            {TRENDING_COLORS.map((color) => (
                                <button
                                    key={color.name}
                                    onClick={() => handleEdit(`Change background to solid color ${color.hex}.`)}
                                    disabled={isProcessing}
                                    className="flex flex-col items-center gap-2 p-2 rounded-lg hover:bg-slate-50 border border-transparent hover:border-slate-200 transition-all group"
                                >
                                    <div className={`w-8 h-8 rounded-full border shadow-sm ${color.border}`} style={{ backgroundColor: color.hex }}></div>
                                    <span className="text-xs text-slate-600 font-medium">{color.name}</span>
                                </button>
                            ))}
                        </div>
                    </div>

                    <hr className="border-slate-100" />

                    {/* Manual Selection */}
                    <div>
                        <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">Manual Selection</h4>
                        <div className="flex gap-2">
                             <div className="relative flex-grow h-12 rounded-xl overflow-hidden border border-slate-200 cursor-pointer">
                                <input 
                                    type="color" 
                                    value={customColor}
                                    onChange={(e) => setCustomColor(e.target.value)}
                                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                                />
                                <div className="absolute inset-0 pointer-events-none flex items-center px-3 gap-3">
                                    <div className="w-6 h-6 rounded-full border border-black/10 shadow-sm" style={{ backgroundColor: customColor }}></div>
                                    <span className="text-sm font-medium text-slate-600 uppercase">{customColor}</span>
                                </div>
                             </div>
                             <button 
                                onClick={() => handleEdit(`Change background to solid color ${customColor}.`)}
                                disabled={isProcessing}
                                className="px-4 bg-slate-800 text-white rounded-xl font-semibold text-sm hover:bg-slate-900 transition-colors"
                             >
                                Apply
                             </button>
                        </div>
                    </div>

                    <hr className="border-slate-100" />

                    {/* Auto Color */}
                    <button 
                        onClick={() => handleEdit('Change background to a professional, neutral solid color that complements the subject perfectly for a passport photo.')}
                        disabled={isProcessing}
                        className="w-full bg-gradient-to-r from-violet-500 to-fuchsia-500 hover:from-violet-600 hover:to-fuchsia-600 text-white py-3 rounded-xl font-semibold shadow-lg shadow-violet-200 transition-all flex items-center justify-center gap-2"
                    >
                        <Wand2 className="w-4 h-4" /> Auto-Select Best Color
                    </button>
                </div>
            ) : (
                <div className="flex flex-col gap-3 mb-6">
                    <button onClick={() => handleEdit('Change clothing to a professional black suit with white shirt.')} disabled={isProcessing} className="p-3 border rounded-xl hover:bg-slate-50 text-sm font-medium text-left">Men's Suit</button>
                    <button onClick={() => handleEdit('Change clothing to a navy blue blazer.')} disabled={isProcessing} className="p-3 border rounded-xl hover:bg-slate-50 text-sm font-medium text-left">Women's Blazer</button>
                </div>
            )}
            
            <div className="mt-6 pt-6 border-t border-slate-100">
                <button onClick={() => setStep(Step.DOWNLOAD)} disabled={isProcessing} className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3 rounded-xl font-semibold shadow-lg flex items-center justify-center gap-2">Proceed to Download <ArrowRight className="w-4 h-4" /></button>
            </div>
       </div>
    </div>
  );

  const renderDownloadStep = () => (
    <div className="flex flex-col items-center max-w-6xl w-full px-4">
        <h2 className="text-3xl font-bold text-slate-800 mb-2">Download Sheet</h2>
        <p className="text-slate-600 mb-8 text-center">Select your preferred layout and format.</p>
        <div className="grid lg:grid-cols-2 gap-8 w-full">
            {/* Preview Section - Mobile Friendly Container */}
            <div className="bg-slate-100 rounded-2xl p-4 md:p-6 flex items-center justify-center min-h-[300px] md:min-h-[500px] border border-slate-200 shadow-inner overflow-auto">
                {isGeneratingPreview ? <div className="text-slate-500 flex flex-col items-center"><Loader2 className="w-8 h-8 animate-spin mb-2" />Generating...</div> : 
                 sheetPreviewUrl ? <img src={sheetPreviewUrl} className="max-w-full h-auto shadow-xl" /> : <p className="text-slate-400">Preview</p>}
            </div>

            {/* Controls Section */}
            <div className="flex flex-col gap-6">
                 {/* Layout Options */}
                 <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
                    <h3 className="font-bold text-slate-800 mb-4 flex items-center gap-2"><Settings className="w-5 h-5 text-blue-600" /> Print Settings</h3>
                    
                    {/* Border Toggle */}
                    <div className="flex items-center justify-between p-3 border rounded-lg hover:bg-slate-50 cursor-pointer mb-3" onClick={() => setPrintSettings(s => ({...s, addGap: !s.addGap}))}>
                        <span className="text-sm font-medium text-slate-700">Add 4mm Border & Spacing</span>
                        <div className={`w-10 h-5 rounded-full p-0.5 transition-colors ${printSettings.addGap ? 'bg-blue-600' : 'bg-slate-300'}`}>
                            <div className={`w-4 h-4 rounded-full bg-white transition-transform ${printSettings.addGap ? 'translate-x-5' : ''}`}></div>
                        </div>
                    </div>

                     {/* Custom Quantity Toggle */}
                     <div className="flex flex-col p-3 border rounded-lg hover:bg-slate-50 mb-3">
                        <div className="flex items-center justify-between cursor-pointer" onClick={() => setPrintSettings(s => ({...s, useCustomCount: !s.useCustomCount}))}>
                            <span className="text-sm font-medium text-slate-700">Custom Quantity</span>
                            <div className={`w-10 h-5 rounded-full p-0.5 transition-colors ${printSettings.useCustomCount ? 'bg-blue-600' : 'bg-slate-300'}`}>
                                <div className={`w-4 h-4 rounded-full bg-white transition-transform ${printSettings.useCustomCount ? 'translate-x-5' : ''}`}></div>
                            </div>
                        </div>
                        {printSettings.useCustomCount && (
                            <div className="mt-3 pt-3 border-t border-slate-200 flex items-center gap-3 animate-fade-in">
                                <span className="text-sm text-slate-500">Photos:</span>
                                <div className="flex items-center gap-2">
                                    <button onClick={() => setPrintSettings(s => ({...s, customCount: Math.max(1, s.customCount - 1)}))} className="w-8 h-8 bg-slate-100 rounded-md flex items-center justify-center font-bold text-slate-600 hover:bg-slate-200">-</button>
                                    <input 
                                        type="number" 
                                        value={printSettings.customCount} 
                                        onChange={(e) => setPrintSettings({...printSettings, customCount: parseInt(e.target.value) || 1})}
                                        className="w-16 text-center border rounded-md py-1 font-semibold"
                                    />
                                    <button onClick={() => setPrintSettings(s => ({...s, customCount: s.customCount + 1}))} className="w-8 h-8 bg-slate-100 rounded-md flex items-center justify-center font-bold text-slate-600 hover:bg-slate-200">+</button>
                                </div>
                            </div>
                        )}
                    </div>
                 </div>
                 
                 {/* Format Selection (JPG / PDF) */}
                 <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
                     <h3 className="font-bold text-slate-800 mb-4 flex items-center gap-2"><FileText className="w-5 h-5 text-blue-600" /> File Format</h3>
                     <div className="flex gap-3">
                         <button onClick={() => setDownloadFormat('jpg')} className={`flex-1 py-3 px-4 rounded-xl border-2 font-semibold flex items-center justify-center gap-2 transition-all ${downloadFormat === 'jpg' ? 'border-blue-600 bg-blue-50 text-blue-700' : 'border-slate-200 text-slate-600 hover:border-slate-300'}`}>
                            <ImageIcon className="w-5 h-5" /> JPG
                         </button>
                         <button onClick={() => setDownloadFormat('pdf')} className={`flex-1 py-3 px-4 rounded-xl border-2 font-semibold flex items-center justify-center gap-2 transition-all ${downloadFormat === 'pdf' ? 'border-blue-600 bg-blue-50 text-blue-700' : 'border-slate-200 text-slate-600 hover:border-slate-300'}`}>
                            <FileType className="w-5 h-5" /> PDF
                         </button>
                     </div>
                 </div>

                 {/* Paper Size Selection */}
                 <div className="grid grid-cols-1 gap-4">
                    <button onClick={() => setPrintSettings(s => ({ ...s, paperSize: 'A4' }))} className={`flex items-center gap-4 p-4 border-2 rounded-xl transition-all ${printSettings.paperSize === 'A4' ? 'border-blue-600 bg-blue-50' : 'border-slate-200 hover:border-slate-300'}`}>
                        <div className="w-12 h-12 bg-blue-100 text-blue-600 rounded-lg flex items-center justify-center font-bold text-xl">A4</div>
                        <div className="text-left">
                            <h4 className="font-bold text-slate-800">Paper Size: A4</h4>
                            <p className="text-xs text-slate-500">Best for home printers</p>
                        </div>
                        {printSettings.paperSize === 'A4' && <Check className="ml-auto text-blue-600" />}
                    </button>
                    <button onClick={() => setPrintSettings(s => ({ ...s, paperSize: '4x6' }))} className={`flex items-center gap-4 p-4 border-2 rounded-xl transition-all ${printSettings.paperSize === '4x6' ? 'border-blue-600 bg-blue-50' : 'border-slate-200 hover:border-slate-300'}`}>
                        <div className="w-12 h-12 bg-purple-100 text-purple-600 rounded-lg flex items-center justify-center font-bold text-xl">4x6</div>
                        <div className="text-left">
                            <h4 className="font-bold text-slate-800">Paper Size: 4" x 6"</h4>
                            <p className="text-xs text-slate-500">Standard photo paper</p>
                        </div>
                        {printSettings.paperSize === '4x6' && <Check className="ml-auto text-blue-600" />}
                    </button>
                 </div>

                 <button onClick={handleDownloadSheet} className="w-full bg-blue-600 hover:bg-blue-700 text-white py-4 rounded-xl font-bold text-lg shadow-lg flex items-center justify-center gap-2 mt-auto">
                    <Printer className="w-6 h-6" /> {downloadFormat === 'pdf' ? 'Download PDF' : 'Download JPG'}
                 </button>
                 <button onClick={handleReset} className="text-center text-slate-400 text-sm mt-2 hover:text-slate-600">Start Over</button>
            </div>
        </div>
    </div>
  );

  const renderStepIndicator = (label: string, stepEnum: Step, num: number) => {
    const isAct = step === stepEnum;
    const isDone = Object.values(Step).indexOf(step) > Object.values(Step).indexOf(stepEnum);
    
    // Hide text labels on mobile to save space, show icons/numbers
    return (
        <div className={`flex items-center gap-2 ${isAct || isDone ? 'text-blue-600' : 'text-slate-400'} shrink-0`}>
            <span className={`w-8 h-8 rounded-full flex items-center justify-center border text-sm font-bold ${isAct ? 'border-blue-600 bg-blue-50' : isDone ? 'bg-blue-600 text-white' : 'border-slate-300'}`}>{isDone ? <Check className="w-4 h-4"/> : num}</span>
            <span className="hidden sm:inline font-medium">{label}</span>
        </div>
    );
  }

  return (
    <div className="min-h-screen py-6 px-0 md:px-4 flex flex-col items-center bg-slate-50 w-full overflow-x-hidden">
        {step !== Step.DOWNLOAD && (
            <div className="w-full max-w-4xl px-4 mb-6">
                <div className="flex items-center justify-between w-full">
                    {renderStepIndicator("Type", Step.SELECT_TYPE, 1)}<div className="flex-grow border-t border-slate-200 mx-2"></div>
                    {renderStepIndicator("Upload", Step.UPLOAD, 2)}<div className="flex-grow border-t border-slate-200 mx-2"></div>
                    {renderStepIndicator("Crop", Step.CROP, 3)}<div className="flex-grow border-t border-slate-200 mx-2"></div>
                    {renderStepIndicator("Edit", Step.EDIT, 4)}
                </div>
            </div>
        )}
        {step === Step.SELECT_TYPE && renderSelectTypeStep()}
        {step === Step.UPLOAD && renderUploadStep()}
        {step === Step.CROP && renderCropStep()}
        {step === Step.EDIT && renderEditStep()}
        {step === Step.DOWNLOAD && renderDownloadStep()}
    </div>
  );
};

export default Editor;