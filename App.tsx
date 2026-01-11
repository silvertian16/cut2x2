
import React, { useState, useCallback, useRef } from 'react';
import { 
  CloudArrowUpIcon, 
  TrashIcon, 
  ArrowsPointingOutIcon, 
  CheckCircleIcon,
  ArchiveBoxArrowDownIcon,
  ArrowPathIcon,
  PhotoIcon
} from '@heroicons/react/24/outline';
import { FileWithPreview, ProcessedImage, ProcessingStatus } from './types';
import { splitImageIntoFour, dataURLtoBlob } from './utils/imageHelpers';

// HeroIcons aren't strictly required but they make it look world-class.
// Since we don't have npm install, we use standard SVG icons in a component.

const App: React.FC = () => {
  const [files, setFiles] = useState<FileWithPreview[]>([]);
  const [processed, setProcessed] = useState<ProcessedImage[]>([]);
  const [status, setStatus] = useState<ProcessingStatus>(ProcessingStatus.IDLE);
  const [progress, setProgress] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      // Fix: Explicitly type 'file' as 'File' to ensure it's compatible with URL.createObjectURL which requires Blob | MediaSource
      const newFiles = Array.from(e.target.files).map((file: File) => Object.assign(file, {
        preview: URL.createObjectURL(file),
        status: 'pending' as const
      }) as FileWithPreview);
      setFiles(prev => [...prev, ...newFiles]);
    }
  };

  const removeFile = (index: number) => {
    setFiles(prev => {
      const newFiles = [...prev];
      if (newFiles[index].preview) URL.revokeObjectURL(newFiles[index].preview!);
      newFiles.splice(index, 1);
      return newFiles;
    });
  };

  const clearAll = () => {
    files.forEach(f => f.preview && URL.revokeObjectURL(f.preview));
    setFiles([]);
    setProcessed([]);
    setStatus(ProcessingStatus.IDLE);
    setProgress(0);
  };

  const processImages = async () => {
    if (files.length === 0) return;
    
    setStatus(ProcessingStatus.PROCESSING);
    setProcessed([]);
    setProgress(0);
    
    const results: ProcessedImage[] = [];
    
    for (let i = 0; i < files.length; i++) {
      try {
        const file = files[i];
        const quadrants = await splitImageIntoFour(file);
        results.push({
          id: Math.random().toString(36).substr(2, 9),
          originalName: file.name.split('.')[0],
          quadrants
        });
        setProgress(Math.round(((i + 1) / files.length) * 100));
      } catch (error) {
        console.error('Error processing file:', error);
      }
    }
    
    setProcessed(results);
    setStatus(ProcessingStatus.COMPLETED);
  };

  const downloadZip = async () => {
    // @ts-ignore
    const JSZip = window.JSZip;
    if (!JSZip) {
      alert("JSZip library not loaded yet. Please refresh.");
      return;
    }

    const zip = new JSZip();
    processed.forEach((item) => {
      const folder = zip.folder(item.originalName);
      item.quadrants.forEach((dataUrl, idx) => {
        const blob = dataURLtoBlob(dataUrl);
        folder.file(`${item.originalName}_quad_${idx + 1}.png`, blob);
      });
    });

    const content = await zip.generateAsync({ type: "blob" });
    const url = URL.createObjectURL(content);
    const link = document.createElement('a');
    link.href = url;
    link.download = `quadsplit_images_${new Date().getTime()}.zip`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="min-h-screen flex flex-col">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-50 px-6 py-4">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="bg-indigo-600 p-2 rounded-lg">
              <ArrowsPointingOutIcon className="w-6 h-6 text-white" />
            </div>
            <h1 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-indigo-600 to-purple-600">
              QuadSplit
            </h1>
          </div>
          <div className="flex items-center gap-4">
            <a 
              href="https://github.com" 
              target="_blank" 
              className="text-slate-500 hover:text-slate-900 transition-colors text-sm font-medium"
            >
              Github
            </a>
            <button 
              onClick={clearAll}
              className="px-4 py-2 text-sm font-medium text-slate-600 hover:text-red-600 hover:bg-red-50 rounded-full transition-all"
            >
              Reset
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-grow max-w-6xl mx-auto w-full px-6 py-12">
        <div className="text-center mb-12">
          <h2 className="text-4xl font-extrabold text-slate-900 mb-4 tracking-tight">
            Batch Crop Images into Quadrants
          </h2>
          <p className="text-lg text-slate-600 max-w-2xl mx-auto">
            Split your 2x2 grid images (like Midjourney results) into individual high-quality files automatically. 
            Runs locally in your browser for 100% privacy.
          </p>
        </div>

        {/* Dropzone */}
        <div 
          onClick={() => fileInputRef.current?.click()}
          className={`
            relative group border-2 border-dashed rounded-2xl p-12 transition-all cursor-pointer text-center
            ${files.length > 0 ? 'bg-white border-indigo-200' : 'bg-slate-50 border-slate-300 hover:border-indigo-400 hover:bg-indigo-50'}
          `}
        >
          <input 
            type="file" 
            ref={fileInputRef}
            onChange={handleFileChange}
            multiple 
            accept="image/*"
            className="hidden" 
          />
          <CloudArrowUpIcon className="w-16 h-16 mx-auto text-slate-400 group-hover:text-indigo-500 transition-colors mb-4" />
          <h3 className="text-xl font-semibold text-slate-900 mb-1">
            {files.length > 0 ? `${files.length} images selected` : 'Click or Drag to Upload'}
          </h3>
          <p className="text-slate-500">Supports PNG, JPG, WEBP and more</p>
        </div>

        {/* Action Bar */}
        {files.length > 0 && (
          <div className="flex flex-wrap items-center justify-between gap-4 mt-8 glass-effect p-6 rounded-2xl shadow-sm sticky bottom-8">
            <div className="flex items-center gap-4">
              <span className="text-sm font-semibold text-slate-700">
                {files.length} Files Ready
              </span>
              {status === ProcessingStatus.PROCESSING && (
                <div className="flex items-center gap-2">
                  <div className="w-32 h-2 bg-slate-200 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-indigo-600 transition-all duration-300" 
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                  <span className="text-xs text-slate-500 font-medium">{progress}%</span>
                </div>
              )}
            </div>

            <div className="flex items-center gap-3">
               {status === ProcessingStatus.COMPLETED && (
                <button 
                  onClick={downloadZip}
                  className="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white px-6 py-3 rounded-xl font-semibold shadow-lg shadow-green-100 transition-all transform active:scale-95"
                >
                  <ArchiveBoxArrowDownIcon className="w-5 h-5" />
                  Download ZIP ({processed.length * 4} Images)
                </button>
              )}
              
              <button 
                onClick={processImages}
                disabled={status === ProcessingStatus.PROCESSING}
                className={`
                  flex items-center gap-2 px-6 py-3 rounded-xl font-semibold shadow-lg transition-all transform active:scale-95
                  ${status === ProcessingStatus.PROCESSING 
                    ? 'bg-slate-100 text-slate-400 cursor-not-allowed' 
                    : 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-indigo-100'}
                `}
              >
                {status === ProcessingStatus.PROCESSING ? (
                  <ArrowPathIcon className="w-5 h-5 animate-spin" />
                ) : (
                  <CheckCircleIcon className="w-5 h-5" />
                )}
                {status === ProcessingStatus.COMPLETED ? 'Process Again' : 'Split Images Now'}
              </button>
            </div>
          </div>
        )}

        {/* File List / Previews */}
        {files.length > 0 && (
          <div className="mt-12 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {files.map((file, idx) => (
              <div key={idx} className="bg-white rounded-xl border border-slate-200 p-4 group relative hover:shadow-md transition-shadow">
                <div className="aspect-square rounded-lg overflow-hidden bg-slate-100 mb-3 relative">
                  {file.preview ? (
                    <img 
                      src={file.preview} 
                      alt={file.name} 
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <PhotoIcon className="w-8 h-8 text-slate-300" />
                    </div>
                  )}
                  {/* Quadrant Lines Overlay */}
                  <div className="absolute inset-0 grid grid-cols-2 grid-rows-2 pointer-events-none opacity-20 group-hover:opacity-60 transition-opacity">
                    <div className="border-r border-b border-white"></div>
                    <div className="border-b border-white"></div>
                    <div className="border-r border-white"></div>
                    <div></div>
                  </div>
                </div>
                <div className="flex items-start justify-between">
                  <div className="truncate pr-4">
                    <p className="text-sm font-semibold text-slate-900 truncate">{file.name}</p>
                    <p className="text-xs text-slate-500">{(file.size / 1024).toFixed(1)} KB</p>
                  </div>
                  <button 
                    onClick={(e) => { e.stopPropagation(); removeFile(idx); }}
                    className="p-1 text-slate-400 hover:text-red-500 transition-colors"
                  >
                    <TrashIcon className="w-5 h-5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Empty State Instructions */}
        {files.length === 0 && (
          <div className="mt-16 grid md:grid-cols-3 gap-8">
            <div className="p-6 bg-white rounded-2xl border border-slate-200">
              <div className="w-10 h-10 bg-indigo-100 rounded-lg flex items-center justify-center text-indigo-600 mb-4 font-bold">1</div>
              <h4 className="font-bold text-slate-900 mb-2">Upload Grids</h4>
              <p className="text-sm text-slate-600 leading-relaxed">Select one or multiple images that you want to split. We support all common formats.</p>
            </div>
            <div className="p-6 bg-white rounded-2xl border border-slate-200">
              <div className="w-10 h-10 bg-indigo-100 rounded-lg flex items-center justify-center text-indigo-600 mb-4 font-bold">2</div>
              <h4 className="font-bold text-slate-900 mb-2">Auto-Slice</h4>
              <p className="text-sm text-slate-600 leading-relaxed">Our tool detects the dimensions and perfectly slices the image into 4 equal quadrants (top-left, top-right, bottom-left, bottom-right).</p>
            </div>
            <div className="p-6 bg-white rounded-2xl border border-slate-200">
              <div className="w-10 h-10 bg-indigo-100 rounded-lg flex items-center justify-center text-indigo-600 mb-4 font-bold">3</div>
              <h4 className="font-bold text-slate-900 mb-2">Batch Export</h4>
              <p className="text-sm text-slate-600 leading-relaxed">Download all your split images in a single ZIP file, organized into folders by original name.</p>
            </div>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="mt-auto py-8 border-t border-slate-200 bg-white">
        <div className="max-w-6xl mx-auto px-6 text-center text-slate-500 text-sm">
          <p>© {new Date().getFullYear()} QuadSplit. Professional Image Tools for Creators.</p>
          <p className="mt-1">All processing happens on your device. Your data never leaves your computer.</p>
        </div>
      </footer>
    </div>
  );
};

// SVG Components used because we don't have Lucide/HeroIcons installed via npm
const ArrowsPointingOutIcon: React.FC<{className?: string}> = ({ className }) => (
  <svg fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 3.75v4.5m0-4.5h4.5m-4.5 0L9 9M3.75 20.25v-4.5m0 4.5h4.5m-4.5 0L9 15M20.25 3.75h-4.5m4.5 0v4.5m0-4.5L15 9m5.25 11.25h-4.5m4.5 0v-4.5m0 4.5L15 15" />
  </svg>
);

const CloudArrowUpIcon: React.FC<{className?: string}> = ({ className }) => (
  <svg fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 16.5V9.75m0 0l3 3m-3-3l-3 3M6.75 19.5a4.5 4.5 0 01-1.41-8.775 5.25 5.25 0 0110.233-2.33 3 3 0 013.758 3.848A3.752 3.752 0 0118 19.5H6.75z" />
  </svg>
);

const TrashIcon: React.FC<{className?: string}> = ({ className }) => (
  <svg fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
  </svg>
);

const ArchiveBoxArrowDownIcon: React.FC<{className?: string}> = ({ className }) => (
  <svg fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 7.5l-.625 10.632a2.25 2.25 0 01-2.247 2.118H6.622a2.25 2.25 0 01-2.247-2.118L3.75 7.5M10 11.25h4M3.375 7.5h17.25c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125z" />
  </svg>
);

const ArrowPathIcon: React.FC<{className?: string}> = ({ className }) => (
  <svg fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99" />
  </svg>
);

const CheckCircleIcon: React.FC<{className?: string}> = ({ className }) => (
  <svg fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>
);

const PhotoIcon: React.FC<{className?: string}> = ({ className }) => (
  <svg fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 001.5-1.5V6a1.5 1.5 0 00-1.5-1.5H3.75A1.5 1.5 0 002.25 6v12a1.5 1.5 0 001.5 1.5zm10.5-11.25h.008v.008h-.008V6.75zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" />
  </svg>
);

export default App;
