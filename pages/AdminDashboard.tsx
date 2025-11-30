import React, { useState, useRef, useEffect } from 'react';
import { useSignage } from '../context/SignageContext';
import { Layout } from '../components/Layout';
import { Plus, Tv, Play, Trash2, Upload, Clock, Film, Image as ImageIcon, Save, X, Edit, Crop, Monitor, Smartphone, Link as LinkIcon, Eye, GripVertical, AlertTriangle, Youtube } from 'lucide-react';
import { MediaType, MediaItem, Playlist, Orientation } from '../types';

// --- Helper: Get YouTube ID ---
const getYouTubeId = (url: string) => {
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
    const match = url.match(regExp);
    return (match && match[2].length === 11) ? match[2] : null;
};

// --- Components for Dialogs/Modals ---

const Modal: React.FC<{ isOpen: boolean; onClose: () => void; title: string; children: React.ReactNode }> = ({ isOpen, onClose, title, children }) => {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-4xl max-h-[90vh] flex flex-col shadow-2xl">
        <div className="p-4 border-b border-slate-800 flex justify-between items-center">
          <h3 className="text-xl font-bold text-white">{title}</h3>
          <button onClick={onClose} className="p-2 hover:bg-slate-800 rounded-full transition-colors"><X className="w-5 h-5" /></button>
        </div>
        <div className="p-6 overflow-y-auto flex-1 custom-scrollbar">
          {children}
        </div>
      </div>
    </div>
  );
};

// --- Preview Modal Component ---
const PreviewModal: React.FC<{ item: MediaItem | null; onClose: () => void }> = ({ item, onClose }) => {
    const [error, setError] = useState(false);

    useEffect(() => {
        setError(false);
    }, [item]);

    if (!item) return null;

    const youtubeId = item.type === MediaType.VIDEO ? getYouTubeId(item.url) : null;

    return (
        <div className="fixed inset-0 bg-black/90 z-[60] flex items-center justify-center p-4" onClick={onClose}>
            <div className="relative max-w-5xl max-h-full w-full flex flex-col items-center" onClick={e => e.stopPropagation()}>
                <button onClick={onClose} className="absolute -top-10 right-0 text-white hover:text-red-400 p-2">
                    <X className="w-8 h-8" />
                </button>
                
                {error ? (
                    <div className="bg-slate-800 border border-red-500/50 rounded-lg p-10 flex flex-col items-center text-center">
                        <AlertTriangle className="w-16 h-16 text-red-500 mb-4" />
                        <h3 className="text-xl font-bold text-white">ไม่สามารถเล่นไฟล์นี้ได้</h3>
                        <p className="text-slate-400 mt-2">ลิงก์อาจไม่ถูกต้อง หรือไฟล์ถูกลบไปแล้ว</p>
                        <p className="text-xs text-slate-500 mt-4 break-all bg-black/30 p-2 rounded">{item.url}</p>
                    </div>
                ) : (
                    item.type === MediaType.IMAGE ? (
                        <img 
                            src={item.url} 
                            alt={item.name} 
                            onError={() => setError(true)}
                            className="max-w-full max-h-[80vh] object-contain rounded-lg shadow-2xl border border-slate-700" 
                        />
                    ) : (
                        youtubeId ? (
                             <div className="w-full aspect-video max-h-[80vh] rounded-lg overflow-hidden shadow-2xl border border-slate-700 bg-black">
                                <iframe 
                                    width="100%" 
                                    height="100%" 
                                    src={`https://www.youtube.com/embed/${youtubeId}?autoplay=1`}
                                    title="YouTube video player" 
                                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" 
                                    allowFullScreen
                                    className="w-full h-full"
                                ></iframe>
                             </div>
                        ) : (
                            <video 
                                src={item.url} 
                                controls 
                                autoPlay 
                                onError={() => setError(true)}
                                className="max-w-full max-h-[80vh] rounded-lg shadow-2xl border border-slate-700" 
                            />
                        )
                    )
                )}

                <div className="mt-4 text-center">
                    <h3 className="text-xl font-bold text-white">{item.name}</h3>
                    <p className="text-slate-400 text-sm">
                        ประเภท: {item.type === MediaType.IMAGE ? 'รูปภาพ' : (youtubeId ? 'YouTube' : 'วิดีโอ MP4')} | 
                        แนว: {item.orientation === 'portrait' ? 'แนวตั้ง' : 'แนวนอน'}
                    </p>
                </div>
            </div>
        </div>
    );
};

// --- Image Cropper & Compressor Component ---
const ImageCropper: React.FC<{ 
  file: File; 
  onConfirm: (base64: string, orientation: Orientation) => void; 
  onCancel: () => void 
}> = ({ file, onConfirm, onCancel }) => {
  const [targetOrientation, setTargetOrientation] = useState<Orientation>('landscape');
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [imageSrc, setImageSrc] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [fileSizeWarning, setFileSizeWarning] = useState<string | null>(null);

  useEffect(() => {
    const reader = new FileReader();
    reader.onload = () => setImageSrc(reader.result as string);
    reader.readAsDataURL(file);
  }, [file]);

  const handleCropAndCompress = () => {
    if (!canvasRef.current || !imageSrc) return;
    setIsProcessing(true);
    setFileSizeWarning(null);

    // ใช้ setTimeout เพื่อให้ UI อัปเดตสถานะ "กำลังประมวลผล" ก่อนทำงานหนัก
    setTimeout(() => {
        const canvas = canvasRef.current!;
        const ctx = canvas.getContext('2d');
        const img = new Image();
        img.src = imageSrc;

        img.onload = () => {
            if (!ctx) return;

            // 1. Setup Aspect Ratio
            const aspectRatio = targetOrientation === 'landscape' ? 16/9 : 9/16;
            
            // 2. Calculate Crop Source from original image
            let srcWidth = img.width;
            let srcHeight = img.height;
            let srcX = 0;
            let srcY = 0;

            if (srcWidth / srcHeight > aspectRatio) {
                const newWidth = srcHeight * aspectRatio;
                srcX = (srcWidth - newWidth) / 2;
                srcWidth = newWidth;
            } else {
                const newHeight = srcWidth / aspectRatio;
                srcY = (srcHeight - newHeight) / 2;
                srcHeight = newHeight;
            }

            // 3. Setup Target Resolution: Try Full HD (1920x1080) first
            let targetWidth = targetOrientation === 'landscape' ? 1920 : 1080;
            let targetHeight = targetOrientation === 'landscape' ? 1080 : 1920;
            
            canvas.width = targetWidth;
            canvas.height = targetHeight;

            // 4. Draw Image (Full HD)
            ctx.drawImage(img, srcX, srcY, srcWidth, srcHeight, 0, 0, targetWidth, targetHeight);
            
            // 5. Smart Compression Loop
            // Firestore limit is 1MB. Safe limit for Base64 string length is ~950,000 chars.
            const MAX_STRING_LENGTH = 950000;
            
            let quality = 0.85; // Start at 85% for Full HD
            let dataUrl = canvas.toDataURL('image/jpeg', quality);
            
            // Round 1: Try to compress Full HD
            while (dataUrl.length > MAX_STRING_LENGTH && quality > 0.5) {
                quality -= 0.1;
                console.log(`Full HD too big, reducing quality to ${quality.toFixed(1)}... Size: ${dataUrl.length}`);
                dataUrl = canvas.toDataURL('image/jpeg', quality);
            }

            // Round 2: If still too big, fallback to HD (1280x720)
            if (dataUrl.length > MAX_STRING_LENGTH) {
                console.log("Full HD failed to fit. Downscaling to HD (1280x720)...");
                setFileSizeWarning("ภาพมีความละเอียดสูงมาก ระบบลดขนาดลงเป็น HD เพื่อให้บันทึกได้");

                targetWidth = targetOrientation === 'landscape' ? 1280 : 720;
                targetHeight = targetOrientation === 'landscape' ? 720 : 1280;
                canvas.width = targetWidth;
                canvas.height = targetHeight;

                // Redraw at smaller size
                ctx.drawImage(img, srcX, srcY, srcWidth, srcHeight, 0, 0, targetWidth, targetHeight);
                
                // Reset quality for HD
                quality = 0.9;
                dataUrl = canvas.toDataURL('image/jpeg', quality);

                // Compress HD if needed
                while (dataUrl.length > MAX_STRING_LENGTH && quality > 0.1) {
                    quality -= 0.1;
                    dataUrl = canvas.toDataURL('image/jpeg', quality);
                }
            }

            if (dataUrl.length > 1048000) {
                setFileSizeWarning("ไม่สามารถบันทึกได้: รูปภาพมีรายละเอียดมากเกินไปแม้จะลดขนาดแล้ว");
                setIsProcessing(false);
            } else {
                onConfirm(dataUrl, targetOrientation);
            }
        };
    }, 100);
  };

  if (!imageSrc) return <div className="text-center p-8">Loading image...</div>;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex justify-center gap-4">
        <button 
          onClick={() => setTargetOrientation('landscape')}
          className={`flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all ${targetOrientation === 'landscape' ? 'border-blue-500 bg-blue-500/10 text-white' : 'border-slate-700 text-slate-400 hover:bg-slate-800'}`}
        >
          <Monitor className="w-8 h-8" />
          <span>แนวนอน (16:9)</span>
        </button>
        <button 
          onClick={() => setTargetOrientation('portrait')}
          className={`flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all ${targetOrientation === 'portrait' ? 'border-blue-500 bg-blue-500/10 text-white' : 'border-slate-700 text-slate-400 hover:bg-slate-800'}`}
        >
          <Smartphone className="w-8 h-8" />
          <span>แนวตั้ง (9:16)</span>
        </button>
      </div>

      <div className="bg-black/50 p-4 rounded-lg flex justify-center overflow-hidden h-[400px] relative">
         <img 
            src={imageSrc} 
            className="h-full object-contain" 
            style={{ 
                aspectRatio: targetOrientation === 'landscape' ? '16/9' : '9/16',
                objectFit: 'cover',
                border: '2px dashed #3b82f6',
                opacity: isProcessing ? 0.5 : 1
            }} 
            alt="Preview" 
         />
         {isProcessing && (
             <div className="absolute inset-0 flex items-center justify-center">
                 <div className="bg-black/80 text-white px-4 py-2 rounded-lg flex items-center gap-2">
                     <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                     กำลังปรับขนาด Full HD และบีบอัด...
                 </div>
             </div>
         )}
      </div>
      
      {fileSizeWarning && (
          <div className="bg-yellow-500/10 border border-yellow-500/50 text-yellow-200 p-3 rounded text-sm text-center">
              {fileSizeWarning}
          </div>
      )}

      <p className="text-center text-sm text-slate-400">
          ระบบจะพยายามบันทึกที่ความละเอียด <strong>1920x1080 (Full HD)</strong>
          <br/>
          <span className="text-xs text-slate-500">(หากไฟล์ใหญ่เกิน 1MB ระบบจะลดคุณภาพหรือขนาดลงอัตโนมัติ)</span>
      </p>

      <canvas ref={canvasRef} className="hidden" />

      <div className="flex justify-end gap-3 pt-4 border-t border-slate-800">
        <button onClick={onCancel} className="px-4 py-2 rounded-lg text-slate-300 hover:bg-slate-800" disabled={isProcessing}>ยกเลิก</button>
        <button 
            onClick={handleCropAndCompress} 
            disabled={isProcessing}
            className="px-6 py-2 bg-blue-600 hover:bg-blue-500 disabled:bg-blue-800 disabled:text-slate-400 text-white rounded-lg font-medium flex items-center gap-2"
        >
            <Crop className="w-4 h-4" />
            <span>{isProcessing ? 'กำลังประมวลผล...' : 'ยืนยันและบันทึก'}</span>
        </button>
      </div>
    </div>
  );
};

// --- Playlist Builder Component ---
const PlaylistEditor: React.FC<{ 
  playlist?: Playlist; 
  onSave: (p: Playlist) => void; 
  onCancel: () => void 
}> = ({ playlist, onSave, onCancel }) => {
  const { state } = useSignage();
  const [name, setName] = useState(playlist?.name || '');
  const [orientation, setOrientation] = useState<Orientation>(playlist?.orientation || 'landscape');
  const [selectedItems, setSelectedItems] = useState<{mediaId: string, duration: number}[]>(playlist?.items || []);
  const [days, setDays] = useState<number[]>(playlist?.schedule?.days || [0,1,2,3,4,5,6]);
  const [startTime, setStartTime] = useState(playlist?.schedule?.startTime || "06:00");
  const [endTime, setEndTime] = useState(playlist?.schedule?.endTime || "22:00");

  // Drag and Drop State
  const [draggedItemIndex, setDraggedItemIndex] = useState<number | null>(null);

  const availableMedia = state.mediaLibrary;

  const handleAddItem = (media: MediaItem) => {
    // Default duration: 15s for image, 30s for video/youtube as a placeholder
    const defaultDur = media.type === MediaType.VIDEO ? 30 : 10;
    setSelectedItems([...selectedItems, { mediaId: media.id, duration: defaultDur }]);
  };

  const handleRemoveItem = (index: number) => {
    const newItems = [...selectedItems];
    newItems.splice(index, 1);
    setSelectedItems(newItems);
  };

  // Helper to update specific time parts
  const handleTimeChange = (index: number, field: 'min' | 'sec', value: number) => {
    const item = selectedItems[index];
    const currentDuration = item.duration;
    
    // Calculate current min/sec from total duration
    let minutes = Math.floor(currentDuration / 60);
    let seconds = currentDuration % 60;

    if (field === 'min') minutes = value;
    if (field === 'sec') seconds = value;

    // Calc total seconds
    const totalSeconds = (minutes * 60) + seconds;
    
    const newItems = [...selectedItems];
    newItems[index] = { ...item, duration: totalSeconds };
    setSelectedItems(newItems);
  };

  const toggleDay = (day: number) => {
    if (days.includes(day)) {
        setDays(days.filter(d => d !== day));
    } else {
        setDays([...days, day].sort());
    }
  };

  // Drag Handlers
  const onDragStart = (e: React.DragEvent<HTMLDivElement>, index: number) => {
    // Set data for some browsers
    e.dataTransfer.setData("text/plain", index.toString());
    e.dataTransfer.effectAllowed = "move";
    setDraggedItemIndex(index);
  };

  const onDragOver = (e: React.DragEvent<HTMLDivElement>, index: number) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
  };

  const onDrop = (e: React.DragEvent<HTMLDivElement>, dropIndex: number) => {
    e.preventDefault();
    if (draggedItemIndex === null) return;
    if (draggedItemIndex === dropIndex) return;

    const newItems = [...selectedItems];
    const [draggedItem] = newItems.splice(draggedItemIndex, 1);
    newItems.splice(dropIndex, 0, draggedItem);
    
    setSelectedItems(newItems);
    setDraggedItemIndex(null);
  };

  const handleSave = () => {
    if (!name) return alert("กรุณาตั้งชื่อเพลย์ลิสต์");
    if (selectedItems.length === 0) return alert("กรุณาเลือกสื่ออย่างน้อย 1 รายการ");

    const newPlaylist: Playlist = {
        id: playlist?.id || Date.now().toString(),
        name,
        orientation,
        schedule: {
            days,
            startTime,
            endTime,
            active: true
        },
        items: selectedItems
    };
    onSave(newPlaylist);
  };

  const dayNames = ['อา', 'จ', 'อ', 'พ', 'พฤ', 'ศ', 'ส'];

  return (
    <div className="space-y-8">
      {/* 1. Basic Settings */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div className="space-y-4">
            <h4 className="font-bold text-lg text-blue-400 border-b border-slate-700 pb-2">1. ตั้งค่าทั่วไป</h4>
            <div>
                <label className="block text-sm text-slate-400 mb-1">ชื่อเพลย์ลิสต์</label>
                <input 
                    type="text" 
                    value={name} 
                    onChange={e => setName(e.target.value)}
                    className="w-full bg-slate-800 border border-slate-700 rounded px-3 py-2 text-white" 
                    placeholder="เช่น โปรโมชั่นเช้าวันจันทร์"
                />
            </div>
            <div>
                <label className="block text-sm text-slate-400 mb-2">แนวการแสดงผลของจอ</label>
                <div className="flex gap-4">
                    <button 
                        onClick={() => setOrientation('landscape')}
                        className={`flex-1 py-2 px-3 rounded border flex items-center justify-center gap-2 ${orientation === 'landscape' ? 'bg-blue-600 border-blue-500 text-white' : 'border-slate-700 text-slate-400'}`}
                    >
                        <Monitor className="w-4 h-4" /> แนวนอน
                    </button>
                    <button 
                        onClick={() => setOrientation('portrait')}
                         className={`flex-1 py-2 px-3 rounded border flex items-center justify-center gap-2 ${orientation === 'portrait' ? 'bg-blue-600 border-blue-500 text-white' : 'border-slate-700 text-slate-400'}`}
                    >
                        <Smartphone className="w-4 h-4" /> แนวตั้ง
                    </button>
                </div>
            </div>
          </div>

          <div className="space-y-4">
            <h4 className="font-bold text-lg text-blue-400 border-b border-slate-700 pb-2">2. กำหนดเวลาแสดงผล</h4>
            <div>
                <label className="block text-sm text-slate-400 mb-2">วันที่แสดง</label>
                <div className="flex justify-between gap-1">
                    {dayNames.map((d, idx) => (
                        <button 
                            key={idx}
                            onClick={() => toggleDay(idx)}
                            className={`w-10 h-10 rounded-full text-sm font-bold transition-colors ${days.includes(idx) ? 'bg-green-600 text-white shadow-lg shadow-green-900/50' : 'bg-slate-800 text-slate-500'}`}
                        >
                            {d}
                        </button>
                    ))}
                </div>
            </div>
            <div className="flex gap-4 items-center">
                <div className="flex-1">
                    <label className="block text-sm text-slate-400 mb-1">เวลาเริ่ม</label>
                    <input type="time" value={startTime} onChange={e => setStartTime(e.target.value)} className="w-full bg-slate-800 border border-slate-700 rounded px-2 py-2" />
                </div>
                <span className="text-slate-500 mt-6">-</span>
                <div className="flex-1">
                    <label className="block text-sm text-slate-400 mb-1">เวลาสิ้นสุด</label>
                    <input type="time" value={endTime} onChange={e => setEndTime(e.target.value)} className="w-full bg-slate-800 border border-slate-700 rounded px-2 py-2" />
                </div>
            </div>
          </div>
      </div>

      {/* 2. Content Selection */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 h-[500px]">
          <div className="flex flex-col bg-slate-950/50 rounded-xl border border-slate-800 overflow-hidden">
             <div className="p-3 bg-slate-800 font-semibold text-slate-300">A. เลือกสื่อจากคลัง (คลิกเพื่อเพิ่ม)</div>
             <div className="p-4 overflow-y-auto flex-1 grid grid-cols-2 gap-3 custom-scrollbar content-start">
                {availableMedia.map(item => {
                    const isYoutube = item.type === MediaType.VIDEO && getYouTubeId(item.url);
                    return (
                        <button 
                            key={item.id}
                            onClick={() => handleAddItem(item)}
                            className="relative group aspect-video bg-slate-900 rounded-lg overflow-hidden border border-slate-700 hover:border-blue-500 text-left transition-all hover:shadow-lg"
                        >
                            {item.type === MediaType.IMAGE ? (
                                <img src={item.url} className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity" />
                            ) : (
                                <div className="w-full h-full flex items-center justify-center bg-slate-800 relative">
                                    {isYoutube ? <Youtube className="w-8 h-8 text-red-500 z-10" /> : <Film className="w-8 h-8 text-slate-500 group-hover:text-blue-400" />}
                                    {isYoutube && <img src={`https://img.youtube.com/vi/${getYouTubeId(item.url)}/hqdefault.jpg`} className="absolute inset-0 w-full h-full object-cover opacity-50" />}
                                </div>
                            )}
                            <div className="absolute bottom-0 inset-x-0 bg-black/70 p-2 truncate text-xs text-white z-20">
                                {item.name}
                            </div>
                            <div className="absolute top-1 right-1 px-1.5 py-0.5 rounded bg-black/50 text-[10px] text-white z-20">
                                {item.orientation === 'landscape' ? 'แนวนอน' : 'แนวตั้ง'}
                            </div>
                        </button>
                    )
                })}
             </div>
          </div>

          <div className="flex flex-col bg-slate-950/50 rounded-xl border border-slate-800 overflow-hidden">
             <div className="p-3 bg-slate-800 font-semibold text-slate-300 flex justify-between">
                <span>B. ลำดับการเล่น ({selectedItems.length} รายการ)</span>
                <span className="text-xs font-normal text-blue-300 self-center flex items-center gap-1"><GripVertical className="w-3 h-3"/> ลากเพื่อเปลี่ยนลำดับ</span>
             </div>
             <div className="p-4 overflow-y-auto flex-1 space-y-2 custom-scrollbar">
                {selectedItems.length === 0 && <div className="text-center text-slate-500 mt-10">ยังไม่ได้เลือกสื่อ</div>}
                {selectedItems.map((item, idx) => {
                    const media = state.mediaLibrary.find(m => m.id === item.mediaId);
                    if (!media) return null;
                    const isYoutube = media.type === MediaType.VIDEO && getYouTubeId(media.url);
                    
                    const min = Math.floor(item.duration / 60);
                    const sec = item.duration % 60;

                    return (
                        <div 
                            key={idx} 
                            draggable
                            onDragStart={(e) => onDragStart(e, idx)}
                            onDragOver={(e) => onDragOver(e, idx)}
                            onDrop={(e) => onDrop(e, idx)}
                            className={`flex items-center gap-3 bg-slate-900 p-2 rounded-lg border border-slate-700 cursor-move hover:border-blue-500 transition-colors ${draggedItemIndex === idx ? 'opacity-50 border-blue-500 border-dashed' : ''}`}
                        >
                            <div className="text-slate-600 cursor-move">
                                <GripVertical className="w-5 h-5" />
                            </div>
                            <div className="w-8 h-8 rounded bg-slate-800 flex-shrink-0 text-slate-500 font-bold flex items-center justify-center border border-slate-700 overflow-hidden relative">
                                {idx + 1}
                            </div>
                            <div className="w-16 h-10 bg-black rounded overflow-hidden flex-shrink-0 relative">
                                {media.type === MediaType.IMAGE ? (
                                    <img src={media.url} className="w-full h-full object-cover" />
                                ) : (
                                    <div className="w-full h-full flex items-center justify-center">
                                         {isYoutube ? <Youtube className="w-4 h-4 text-red-500 z-10" /> : <Film className="w-4 h-4" />}
                                         {isYoutube && <img src={`https://img.youtube.com/vi/${getYouTubeId(media.url)}/mqdefault.jpg`} className="absolute inset-0 w-full h-full object-cover opacity-50" />}
                                    </div>
                                )}
                            </div>
                            <div className="flex-1 min-w-0">
                                <p className="text-sm truncate text-white">{media.name}</p>
                                <div className="flex items-center gap-2 mt-1">
                                    <Clock className="w-3 h-3 text-slate-500" />
                                    <div className={`flex items-center gap-1 text-xs text-slate-400 bg-slate-950 rounded border px-1 ${isYoutube ? 'border-yellow-600/50' : 'border-slate-700'}`}>
                                        <input 
                                            type="number" 
                                            value={min} 
                                            onChange={(e) => handleTimeChange(idx, 'min', Math.max(0, parseInt(e.target.value) || 0))}
                                            className="w-6 bg-transparent text-center focus:outline-none text-white"
                                            placeholder="0"
                                        />
                                        <span>น.</span>
                                        <input 
                                            type="number" 
                                            value={sec} 
                                            onChange={(e) => handleTimeChange(idx, 'sec', Math.max(0, parseInt(e.target.value) || 0))}
                                            className="w-14 bg-transparent text-center focus:outline-none text-white border-l border-slate-700 pl-1"
                                            placeholder="0"
                                            max="59"
                                        />
                                        <span>วิ.</span>
                                    </div>
                                    {isYoutube && <span className="text-[10px] text-yellow-500">* ตั้งเวลาให้ตรงกับคลิป</span>}
                                </div>
                            </div>
                            <button onClick={() => handleRemoveItem(idx)} className="p-2 text-slate-500 hover:text-red-400 hover:bg-red-900/20 rounded">
                                <Trash2 className="w-4 h-4" />
                            </button>
                        </div>
                    );
                })}
             </div>
          </div>
      </div>

      <div className="flex justify-end gap-4 pt-4 border-t border-slate-800">
          <button onClick={onCancel} className="px-6 py-2 rounded-lg text-slate-400 hover:text-white transition-colors">ยกเลิก</button>
          <button onClick={handleSave} className="px-8 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg font-bold shadow-lg shadow-blue-900/50 flex items-center gap-2">
              <Save className="w-4 h-4" />
              <span>บันทึกเพลย์ลิสต์</span>
          </button>
      </div>
    </div>
  );
};


// --- Main Dashboard ---

export const AdminDashboard: React.FC = () => {
  const { state, addMedia, removeMedia, savePlaylist, removePlaylist, updateDevicePlaylist } = useSignage();
  const [activeTab, setActiveTab] = useState('dashboard');
  
  // Modals State
  const [showCropModal, setShowCropModal] = useState(false);
  const [selectedFileForCrop, setSelectedFileForCrop] = useState<File | null>(null);
  
  const [showPlaylistModal, setShowPlaylistModal] = useState(false);
  const [playlistToEdit, setPlaylistToEdit] = useState<Playlist | undefined>(undefined);

  const [previewItem, setPreviewItem] = useState<MediaItem | null>(null);

  // Video Link State
  const [videoUrlInput, setVideoUrlInput] = useState('');
  const [videoNameInput, setVideoNameInput] = useState('');

  // 1. Handlers for Media
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.type.startsWith('image')) {
        setSelectedFileForCrop(file);
        setShowCropModal(true);
        // Reset input value so same file can be selected again
        e.target.value = '';
      } else {
         alert("สำหรับวิดีโอ กรุณาใช้ช่องเพิ่มลิงก์ด้านล่างเพื่อประสิทธิภาพที่ดีที่สุด");
      }
    }
  };

  const onCropConfirm = async (base64: string, orientation: Orientation) => {
     if (!selectedFileForCrop) return;
     const newItem: MediaItem = {
         id: Date.now().toString(),
         name: selectedFileForCrop.name,
         type: MediaType.IMAGE,
         url: base64,
         duration: 10,
         orientation: orientation
     };
     await addMedia(newItem);
     setShowCropModal(false);
     setSelectedFileForCrop(null);
  };

  const handleAddVideoLink = () => {
    if (videoUrlInput && videoNameInput) {
        // Updated: Allow YouTube links
        const newItem: MediaItem = {
            id: Date.now().toString(),
            name: videoNameInput,
            type: MediaType.VIDEO,
            url: videoUrlInput,
            duration: 30, // Default duration for video/youtube
            orientation: 'landscape' // Default for video
        };
        addMedia(newItem);
        setVideoUrlInput('');
        setVideoNameInput('');
    }
  };

  // 2. Handlers for Playlists
  const openNewPlaylist = () => {
      setPlaylistToEdit(undefined);
      setShowPlaylistModal(true);
  };
  
  const openEditPlaylist = (p: Playlist) => {
      setPlaylistToEdit(p);
      setShowPlaylistModal(true);
  };

  const handleSavePlaylist = (p: Playlist) => {
      savePlaylist(p);
      setShowPlaylistModal(false);
  };

  const renderContent = () => {
    switch (activeTab) {
      case 'dashboard':
        return (
          <div className="space-y-6">
            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <div className="bg-slate-900 p-6 rounded-2xl border border-slate-800">
                 <h3 className="text-slate-400 text-sm mb-2">จอที่ออนไลน์</h3>
                 <p className="text-3xl font-bold text-green-400">{state.devices.filter(d => d.status === 'online').length} / {state.devices.length}</p>
              </div>
               <div className="bg-slate-900 p-6 rounded-2xl border border-slate-800">
                 <h3 className="text-slate-400 text-sm mb-2">เพลย์ลิสต์ทั้งหมด</h3>
                 <p className="text-3xl font-bold text-blue-400">{state.playlists.length}</p>
              </div>
            </div>

            {/* Device Table */}
            <div className="bg-slate-900 rounded-2xl border border-slate-800 overflow-hidden">
              <div className="p-6 border-b border-slate-800">
                <h2 className="text-lg font-semibold text-white">จัดการอุปกรณ์</h2>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead className="bg-slate-950/50 text-slate-400 text-sm">
                    <tr>
                      <th className="p-4">ชื่ออุปกรณ์</th>
                      <th className="p-4">สถานที่</th>
                      <th className="p-4">สถานะ</th>
                      <th className="p-4">คำสั่ง (บังคับเพลย์ลิสต์)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800">
                    {state.devices.map(device => (
                      <tr key={device.id} className="text-slate-300">
                        <td className="p-4 font-medium">{device.name}</td>
                        <td className="p-4">{device.location}</td>
                        <td className="p-4">
                            <span className={`px-2 py-1 rounded text-xs ${device.status === 'online' ? 'bg-green-500/10 text-green-400' : 'bg-red-500/10 text-red-400'}`}>
                                {device.status === 'online' ? 'Online' : 'Offline'}
                            </span>
                        </td>
                        <td className="p-4">
                            <select 
                                className="bg-slate-800 border-none text-sm rounded text-slate-300 focus:ring-1 focus:ring-blue-500 w-full max-w-xs"
                                value={device.assignedPlaylistId || ''}
                                onChange={(e) => updateDevicePlaylist(device.id, e.target.value || null)}
                            >
                                <option value="">อัตโนมัติตามตารางเวลา</option>
                                {state.playlists.map(p => (
                                    <option key={p.id} value={p.id}>[บังคับ] {p.name}</option>
                                ))}
                            </select>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        );

      case 'media':
        return (
          <div className="space-y-6">
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
              <h2 className="text-2xl font-bold">คลังรูปและวิดีโอ</h2>
              <label className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-lg cursor-pointer transition-colors shadow-lg shadow-blue-900/30">
                  <Upload className="w-4 h-4" />
                  <span>อัปโหลดรูปภาพใหม่ (พร้อมตัด)</span>
                  <input type="file" className="hidden" accept="image/*" onChange={handleFileSelect} />
              </label>
            </div>

            {/* Video Input */}
            <div className="bg-slate-900 p-4 rounded-xl border border-slate-800 flex flex-col gap-2">
                <div className="flex gap-4 items-end flex-wrap">
                    <div className="flex-1 min-w-[200px]">
                        <label className="block text-xs text-slate-400 mb-1">ชื่อวิดีโอ / YouTube</label>
                        <input type="text" value={videoNameInput} onChange={e => setVideoNameInput(e.target.value)} className="w-full bg-slate-950 border border-slate-700 rounded px-3 py-2 text-sm" placeholder="เช่น โฆษณาตัวที่ 1" />
                    </div>
                    <div className="flex-[2] min-w-[300px]">
                        <label className="block text-xs text-slate-400 mb-1">ลิงก์วิดีโอ (YouTube หรือไฟล์ .mp4)</label>
                        <input type="text" value={videoUrlInput} onChange={e => setVideoUrlInput(e.target.value)} className="w-full bg-slate-950 border border-slate-700 rounded px-3 py-2 text-sm" placeholder="https://youtube.com/watch?v=... หรือ https://site.com/video.mp4" />
                    </div>
                    <button onClick={handleAddVideoLink} className="bg-slate-800 hover:bg-slate-700 text-white px-4 py-2 rounded-lg flex items-center gap-2">
                        <LinkIcon className="w-4 h-4" /> เพิ่มวิดีโอ
                    </button>
                </div>
                <p className="text-xs text-slate-500 flex items-center gap-1">
                    <Youtube className="w-3 h-3 text-red-500" />
                    รองรับ YouTube Link (กรุณาตั้งเวลาเล่นให้ตรงกับความยาวคลิป) และไฟล์ .mp4
                </p>
            </div>
            
            {/* Gallery */}
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
              {state.mediaLibrary.map(item => {
                const isYoutube = item.type === MediaType.VIDEO && getYouTubeId(item.url);
                return (
                    <div key={item.id} className="group relative bg-slate-900 rounded-xl overflow-hidden border border-slate-800 hover:border-blue-500/50 transition-all shadow-sm hover:shadow-xl">
                    <div className="aspect-video bg-slate-800 relative cursor-pointer" onClick={() => setPreviewItem(item)}>
                        {item.type === MediaType.IMAGE ? (
                            <img src={item.url} alt={item.name} className="w-full h-full object-cover" />
                        ) : (
                            <div className="w-full h-full flex items-center justify-center relative">
                                {isYoutube ? <Youtube className="w-8 h-8 text-red-500 z-10" /> : <Film className="w-8 h-8 text-slate-500" />}
                                {isYoutube && <img src={`https://img.youtube.com/vi/${getYouTubeId(item.url)}/hqdefault.jpg`} className="absolute inset-0 w-full h-full object-cover opacity-50" />}
                            </div>
                        )}
                        <div className="absolute top-2 right-2 flex gap-1 z-10">
                            {/* Preview Icon */}
                            <div className="w-6 h-6 bg-black/60 rounded-full flex items-center justify-center text-white backdrop-blur hover:bg-blue-600 transition-colors">
                                <Eye className="w-3 h-3" />
                            </div>
                        </div>
                        <div className="absolute bottom-2 right-2 flex gap-1 z-10">
                            <span className="px-1.5 py-0.5 bg-black/60 rounded text-[10px] text-white backdrop-blur">
                                {item.orientation === 'portrait' ? 'แนวตั้ง' : 'แนวนอน'}
                            </span>
                        </div>
                    </div>
                    <div className="p-3 flex justify-between items-start">
                        <div className="min-w-0">
                            <p className="font-medium text-sm truncate text-slate-200">{item.name}</p>
                        </div>
                        <button onClick={(e) => { e.stopPropagation(); removeMedia(item.id); }} className="text-slate-600 hover:text-red-400 transition-colors p-1">
                            <Trash2 className="w-4 h-4" />
                        </button>
                    </div>
                    </div>
                );
              })}
            </div>
          </div>
        );

      case 'playlists':
        return (
            <div className="space-y-6">
                 <div className="flex items-center justify-between">
                    <h2 className="text-2xl font-bold">เพลย์ลิสต์ (ตารางเวลา)</h2>
                    <button onClick={openNewPlaylist} className="bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-lg flex items-center gap-2 shadow-lg shadow-blue-900/30">
                        <Plus className="w-4 h-4" />
                        <span>สร้างเพลย์ลิสต์ใหม่</span>
                    </button>
                </div>

                <div className="grid grid-cols-1 gap-4">
                    {state.playlists.map(playlist => (
                        <div key={playlist.id} className="bg-slate-900 p-5 rounded-xl border border-slate-800 flex flex-col md:flex-row items-center justify-between gap-4">
                            <div className="flex-1">
                                <div className="flex items-center gap-3 mb-1">
                                    <h4 className="font-bold text-lg text-white">{playlist.name}</h4>
                                    <span className={`px-2 py-0.5 rounded text-[10px] border ${playlist.orientation === 'landscape' ? 'border-blue-500/30 text-blue-400' : 'border-purple-500/30 text-purple-400'}`}>
                                        {playlist.orientation === 'landscape' ? 'จอแนวนอน' : 'จอแนวตั้ง'}
                                    </span>
                                </div>
                                <div className="flex flex-wrap gap-4 text-sm text-slate-400">
                                    <div className="flex items-center gap-1">
                                        <Clock className="w-4 h-4" />
                                        <span>{playlist.schedule.startTime} - {playlist.schedule.endTime}</span>
                                    </div>
                                    <div className="flex items-center gap-1">
                                        <span>{playlist.schedule.days.length === 7 ? 'ทุกวัน' : `${playlist.schedule.days.length} วัน/สัปดาห์`}</span>
                                    </div>
                                    <div className="flex items-center gap-1">
                                        <Film className="w-4 h-4" />
                                        <span>{playlist.items.length} รายการ</span>
                                    </div>
                                </div>
                            </div>
                            
                            {/* Playlist Preview Strip */}
                            <div className="flex -space-x-2">
                                {playlist.items.slice(0, 5).map((item, idx) => {
                                    const media = state.mediaLibrary.find(m => m.id === item.mediaId);
                                    if(!media) return null;
                                    const isYoutube = media.type === MediaType.VIDEO && getYouTubeId(media.url);
                                    return (
                                        <div key={idx} className="w-10 h-10 rounded-full border-2 border-slate-900 bg-slate-800 overflow-hidden relative">
                                            {media.type === MediaType.IMAGE ? 
                                                <img src={media.url} className="w-full h-full object-cover" /> :
                                                <div className="w-full h-full flex items-center justify-center">
                                                    {isYoutube ? <Youtube className="w-4 h-4 text-red-500 z-10" /> : <Film className="w-4 h-4" />}
                                                </div>
                                            }
                                        </div>
                                    );
                                })}
                            </div>

                            <div className="flex items-center gap-2">
                                <button onClick={() => openEditPlaylist(playlist)} className="p-2 bg-slate-800 hover:bg-blue-600/20 hover:text-blue-400 rounded-lg transition-colors">
                                    <Edit className="w-5 h-5" />
                                </button>
                                <button onClick={() => { if(confirm('ยืนยันการลบ?')) removePlaylist(playlist.id) }} className="p-2 bg-slate-800 hover:bg-red-600/20 hover:text-red-400 rounded-lg transition-colors">
                                    <Trash2 className="w-5 h-5" />
                                </button>
                            </div>
                        </div>
                    ))}
                    {state.playlists.length === 0 && (
                        <div className="text-center py-10 text-slate-500 bg-slate-900/50 rounded-xl border border-dashed border-slate-800">
                            ยังไม่มีเพลย์ลิสต์ กด "สร้างเพลย์ลิสต์ใหม่" เพื่อเริ่มใช้งาน
                        </div>
                    )}
                </div>
            </div>
        )

      default:
        return <div>Select a tab</div>;
    }
  };

  return (
    <Layout activeTab={activeTab} onTabChange={setActiveTab}>
      {renderContent()}
      
      {/* Cropper Modal */}
      <Modal isOpen={showCropModal} onClose={() => setShowCropModal(false)} title="ปรับแต่งรูปภาพ">
        {selectedFileForCrop && (
            <ImageCropper 
                file={selectedFileForCrop} 
                onConfirm={onCropConfirm}
                onCancel={() => setShowCropModal(false)}
            />
        )}
      </Modal>

      {/* Playlist Modal */}
      <Modal isOpen={showPlaylistModal} onClose={() => setShowPlaylistModal(false)} title={playlistToEdit ? "แก้ไขเพลย์ลิสต์" : "สร้างเพลย์ลิสต์ใหม่"}>
         <PlaylistEditor 
            playlist={playlistToEdit}
            onSave={handleSavePlaylist}
            onCancel={() => setShowPlaylistModal(false)}
         />
      </Modal>

      {/* Preview Modal */}
      {previewItem && (
          <PreviewModal item={previewItem} onClose={() => setPreviewItem(null)} />
      )}

    </Layout>
  );
};
