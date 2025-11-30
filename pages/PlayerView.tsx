import React, { useEffect, useState, useRef } from 'react';
import { useSignage } from '../context/SignageContext';
import { MediaType, Playlist, ScreenDevice } from '../types';
import { WifiOff, Clock, Settings, Save, Monitor, AlertCircle, FileWarning } from 'lucide-react';

// Helper for YouTube ID (duplicated to avoid export issues across simplified structure)
const getYouTubeId = (url: string) => {
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
    const match = url.match(regExp);
    return (match && match[2].length === 11) ? match[2] : null;
};

export const PlayerView: React.FC = () => {
  const { state, getMediaById, registerDevice, heartbeat } = useSignage();
  
  // Local Device State
  const [deviceId, setDeviceId] = useState<string | null>(localStorage.getItem('signage_device_id'));
  const [tempIdInput, setTempIdInput] = useState('');
  
  const [activePlaylist, setActivePlaylist] = useState<Playlist | null>(null);
  const [currentMediaIndex, setCurrentMediaIndex] = useState(0);
  const videoRef = useRef<HTMLVideoElement>(null);
  const timerRef = useRef<number | null>(null);

  // Error State for current media
  const [mediaError, setMediaError] = useState(false);

  // --- Registration Logic ---
  const handleSaveDeviceId = async () => {
    if (tempIdInput.trim()) {
      const newId = tempIdInput.trim();
      localStorage.setItem('signage_device_id', newId);
      setDeviceId(newId);
      
      // Register to Firestore
      const newDevice: ScreenDevice = {
          id: newId,
          name: `Device ${newId}`,
          location: 'Unknown',
          status: 'online',
          assignedPlaylistId: null,
          lastPing: Date.now()
      };
      await registerDevice(newDevice);
    }
  };

  const handleResetDevice = () => {
    if (confirm('คุณต้องการรีเซ็ตการตั้งค่าจอใช่ไหม? (จะต้องตั้งชื่อจอใหม่)')) {
      localStorage.removeItem('signage_device_id');
      setDeviceId(null);
      setTempIdInput('');
    }
  };

  // 1. Heartbeat & Registration Check
  useEffect(() => {
    if (!deviceId) return;
    
    // Initial Register
    const initRegister = async () => {
        const newDevice: ScreenDevice = {
            id: deviceId,
            name: `Device ${deviceId}`,
            location: 'Auto-Registered',
            status: 'online',
            assignedPlaylistId: null,
            lastPing: Date.now()
        };
        await registerDevice(newDevice);
    };
    initRegister();

    // Heartbeat every 30 seconds
    const interval = setInterval(() => {
      heartbeat(deviceId);
    }, 30000);
    
    heartbeat(deviceId);

    return () => clearInterval(interval);
  }, [deviceId]);

  // 2. Playlist Scheduler Logic
  useEffect(() => {
    if (!deviceId) return;

    const checkSchedule = () => {
      const deviceConfig = state.devices.find(d => d.id === deviceId);
      let targetPlaylist: Playlist | null = null;

      if (deviceConfig?.assignedPlaylistId) {
        targetPlaylist = state.playlists.find(p => p.id === deviceConfig.assignedPlaylistId) || null;
      } else {
        const now = new Date();
        const currentDay = now.getDay();
        const currentTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

        targetPlaylist = state.playlists.find(p => {
           if (!p.schedule.active) return false;
           if (!p.schedule.days.includes(currentDay)) return false;
           return currentTime >= p.schedule.startTime && currentTime <= p.schedule.endTime;
        }) || null;
      }

      if (targetPlaylist) {
          if (!activePlaylist || activePlaylist.id !== targetPlaylist.id) {
              setActivePlaylist(targetPlaylist);
              setCurrentMediaIndex(0);
              setMediaError(false); // Reset error on playlist change
          } else {
              const currentContent = JSON.stringify(activePlaylist.items);
              const newContent = JSON.stringify(targetPlaylist.items);
              if (currentContent !== newContent) {
                  setActivePlaylist(targetPlaylist);
                  setCurrentMediaIndex(prev => prev >= targetPlaylist!.items.length ? 0 : prev);
                  setMediaError(false);
              }
          }
      } else {
          setActivePlaylist(null);
      }
    };

    checkSchedule();
    const scheduleTimer = setInterval(checkSchedule, 2000); 
    return () => clearInterval(scheduleTimer);
  }, [state, activePlaylist, deviceId]);

  // 3. Playback Logic helpers
  const currentPlaylistItem = activePlaylist?.items[currentMediaIndex];
  const currentMedia = currentPlaylistItem ? getMediaById(currentPlaylistItem.mediaId) : null;
  const mediaId = currentMedia?.id;
  const mediaType = currentMedia?.type;
  
  // Detection for YouTube
  const youtubeId = (currentMedia?.type === MediaType.VIDEO && currentMedia.url) ? getYouTubeId(currentMedia.url) : null;
  
  const displayDurationMs = ((currentPlaylistItem?.duration || currentMedia?.duration || 10) * 1000);

  // Function to move to next item
  const handleNext = () => {
       if (!activePlaylist) return;
       setMediaError(false); // Reset error state for next item
       setCurrentMediaIndex(prev => (prev + 1) % activePlaylist.items.length);
  };

  // 4. Timer Effect (Image & YouTube)
  useEffect(() => {
    if (!deviceId || !mediaId || !activePlaylist) return;

    // Use Timer for: 
    // 1. Images
    // 2. YouTube videos (since embed 'onEnded' is unreliable without JS API, use configured duration)
    // 3. Error states (skip fast)
    
    const shouldUseTimer = mediaType === MediaType.IMAGE || youtubeId || mediaError;

    if (shouldUseTimer) {
        // If error, skip faster (e.g., 3 seconds)
        const duration = mediaError ? 3000 : displayDurationMs;
        
        if (timerRef.current) window.clearTimeout(timerRef.current);
        timerRef.current = window.setTimeout(handleNext, duration);
    }

    return () => {
        if (timerRef.current) window.clearTimeout(timerRef.current);
    };
  }, [mediaId, mediaType, youtubeId, displayDurationMs, activePlaylist, deviceId, mediaError]);

  // Video Handlers (Native MP4)
  const onVideoEnded = () => {
      // Only triggered for native video tags
      if (!youtubeId) {
          handleNext();
      }
  };

  const onVideoError = (e: any) => {
      console.error("Video Playback Error:", e);
      setMediaError(true);
  };

  // --- RENDER: SETUP SCREEN ---
  if (!deviceId) {
    return (
      <div className="h-screen w-screen bg-slate-950 flex flex-col items-center justify-center p-4">
         <div className="bg-slate-900 p-8 rounded-2xl border border-slate-800 shadow-2xl max-w-md w-full text-center">
            <div className="w-16 h-16 bg-blue-600 rounded-full flex items-center justify-center mx-auto mb-6 shadow-lg shadow-blue-900/50">
              <Monitor className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-2xl font-bold text-white mb-2">ลงทะเบียนหน้าจอ</h1>
            <p className="text-slate-400 mb-6 text-sm">กรุณาตั้งชื่อหรือรหัสอ้างอิงสำหรับจอนี้ (Device ID)</p>
            <div className="space-y-4">
              <input 
                type="text" 
                value={tempIdInput}
                onChange={(e) => setTempIdInput(e.target.value)}
                placeholder="เช่น d1, screen-bkk-01"
                className="w-full bg-slate-950 border border-slate-700 rounded-lg px-4 py-3 text-white focus:ring-2 focus:ring-blue-500 outline-none text-center font-mono"
              />
              <button 
                onClick={handleSaveDeviceId}
                disabled={!tempIdInput}
                className="w-full bg-blue-600 hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold py-3 rounded-lg transition-colors flex items-center justify-center gap-2"
              >
                <Save className="w-4 h-4" />
                <span>บันทึกและเริ่มทำงาน</span>
              </button>
            </div>
         </div>
      </div>
    );
  }

  // --- RENDER: NO CONTENT ---
  if (!activePlaylist || !currentMedia) {
    const hasAnyPlaylists = state.playlists.length > 0;
    return (
      <div className="h-screen w-screen bg-black flex flex-col items-center justify-center text-slate-500 relative group">
        <div className="bg-slate-900/50 p-8 rounded-2xl border border-slate-800 flex flex-col items-center max-w-md text-center">
            {hasAnyPlaylists ? (
                <>
                    <Clock className="w-16 h-16 mb-4 text-yellow-500/50" />
                    <h2 className="text-xl font-bold text-slate-300">ไม่อยู่ในช่วงเวลาออกอากาศ</h2>
                    <p className="text-sm mt-2 text-slate-500">ขณะนี้ไม่มีตารางเวลาเล่นสำหรับเวลานี้</p>
                </>
            ) : (
                <>
                    <AlertCircle className="w-16 h-16 mb-4 text-red-500/50" />
                    <h2 className="text-xl font-bold text-slate-300">ยังไม่มีเพลย์ลิสต์ในระบบ</h2>
                    <p className="text-sm mt-2 text-slate-500">กรุณาไปที่ Admin Dashboard เพื่อเพิ่มสื่อ</p>
                </>
            )}
            <div className="mt-6 pt-4 border-t border-slate-800 w-full">
                <p className="text-xs font-mono text-slate-600">ID: <span className="text-blue-400">{deviceId}</span></p>
            </div>
        </div>
        <button 
          onClick={handleResetDevice}
          className="absolute bottom-4 right-4 p-2 text-slate-700 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-2"
        >
          <Settings className="w-4 h-4" />
        </button>
      </div>
    );
  }

  // --- RENDER: ERROR STATE ---
  if (mediaError) {
      return (
          <div className="h-screen w-screen bg-black flex flex-col items-center justify-center relative">
              <div className="text-center p-8 bg-slate-900/80 rounded-2xl border border-red-900/50">
                  <FileWarning className="w-16 h-16 text-red-500 mx-auto mb-4" />
                  <h3 className="text-xl font-bold text-red-400">ไม่สามารถเล่นไฟล์ได้</h3>
                  <p className="text-slate-400 mt-2 max-w-md truncate">{currentMedia.name}</p>
                  <p className="text-slate-500 text-sm mt-1">กำลังข้ามไปรายการถัดไป...</p>
              </div>
          </div>
      );
  }

  // --- RENDER: PLAYER ---
  return (
    <div className="h-screen w-screen bg-black overflow-hidden relative flex items-center justify-center group">
      {/* 1. Image */}
      {currentMedia.type === MediaType.IMAGE && (
        <img
          key={currentMedia.id}
          src={currentMedia.url}
          alt={currentMedia.name}
          onError={() => setMediaError(true)}
          className="w-full h-full object-contain animate-fade-in" 
          style={{ maxWidth: '100%', maxHeight: '100%' }}
        />
      )}

      {/* 2. Video (Native MP4) or YouTube */}
      {currentMedia.type === MediaType.VIDEO && (
        youtubeId ? (
            <div className="w-full h-full bg-black relative pointer-events-none">
                 {/* Pointer-events-none prevents user interaction on signage */}
                 <iframe 
                    width="100%" 
                    height="100%" 
                    src={`https://www.youtube.com/embed/${youtubeId}?autoplay=1&controls=0&mute=1&rel=0&iv_load_policy=3&modestbranding=1`}
                    title="YouTube video player" 
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" 
                    className="w-full h-full object-cover"
                ></iframe>
            </div>
        ) : (
            <video
                key={currentMedia.id}
                ref={videoRef}
                src={currentMedia.url}
                autoPlay
                muted
                playsInline
                onEnded={onVideoEnded}
                onError={onVideoError}
                className="w-full h-full object-contain animate-fade-in"
            />
        )
      )}

      {/* Secret Reset Button */}
      <div className="absolute top-0 right-0 p-4 opacity-0 group-hover:opacity-100 transition-opacity z-50">
          <button 
            onClick={handleResetDevice}
            className="bg-black/50 hover:bg-red-600/80 text-white p-2 rounded-full backdrop-blur"
          >
            <Settings className="w-4 h-4" />
          </button>
      </div>
    </div>
  );
};
