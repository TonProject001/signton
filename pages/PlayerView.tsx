import React, { useEffect, useState, useRef } from 'react';
import { useSignage } from '../context/SignageContext';
import { MediaType, Playlist, ScreenDevice } from '../types';
import { WifiOff, Clock, Settings, Save, Monitor } from 'lucide-react';

export const PlayerView: React.FC = () => {
  const { state, getMediaById, registerDevice, heartbeat } = useSignage();
  
  // Local Device State
  const [deviceId, setDeviceId] = useState<string | null>(localStorage.getItem('signage_device_id'));
  const [tempIdInput, setTempIdInput] = useState('');
  
  const [activePlaylist, setActivePlaylist] = useState<Playlist | null>(null);
  const [currentMediaIndex, setCurrentMediaIndex] = useState(0);
  const videoRef = useRef<HTMLVideoElement>(null);
  const timerRef = useRef<number | null>(null);

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
    
    // Initial Register (in case it wasn't registered before or data was cleared on server)
    const initRegister = async () => {
        const deviceExists = state.devices.some(d => d.id === deviceId);
        if (!deviceExists) {
             const newDevice: ScreenDevice = {
                id: deviceId,
                name: `Device ${deviceId}`,
                location: 'Auto-Registered',
                status: 'online',
                assignedPlaylistId: null,
                lastPing: Date.now()
            };
            await registerDevice(newDevice);
        }
    };
    initRegister();

    // Heartbeat every 30 seconds
    const interval = setInterval(() => {
      heartbeat(deviceId);
    }, 30000);
    
    // Immediate heartbeat
    heartbeat(deviceId);

    return () => clearInterval(interval);
  }, [deviceId]);

  // 2. Playlist Scheduler Logic
  useEffect(() => {
    if (!deviceId) return;

    const checkSchedule = () => {
      // Find THIS device in the centralized state (simulated cloud)
      const deviceConfig = state.devices.find(d => d.id === deviceId);
      
      let targetPlaylist: Playlist | null = null;

      // A. Check for Forced/Assigned Playlist first
      if (deviceConfig?.assignedPlaylistId) {
        targetPlaylist = state.playlists.find(p => p.id === deviceConfig.assignedPlaylistId) || null;
      } 
      // B. Check Schedule
      else {
        const now = new Date();
        const currentDay = now.getDay(); // 0-6
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
          } else {
              const currentContent = JSON.stringify(activePlaylist.items);
              const newContent = JSON.stringify(targetPlaylist.items);
              
              if (currentContent !== newContent) {
                  console.log("Playlist content updated detected");
                  setActivePlaylist(targetPlaylist);
                  setCurrentMediaIndex(prev => prev >= targetPlaylist!.items.length ? 0 : prev);
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
  const displayDurationMs = ((currentPlaylistItem?.duration || currentMedia?.duration || 10) * 1000);

  // 4. Timer Effect
  useEffect(() => {
    if (!deviceId || !mediaId || !mediaType || !activePlaylist) return;

    const handleNext = () => {
       setCurrentMediaIndex(prev => (prev + 1) % activePlaylist.items.length);
    };

    if (mediaType === MediaType.IMAGE) {
        if (timerRef.current) window.clearTimeout(timerRef.current);
        timerRef.current = window.setTimeout(handleNext, displayDurationMs);
    }

    return () => {
        if (timerRef.current) window.clearTimeout(timerRef.current);
    };
  }, [mediaId, mediaType, displayDurationMs, activePlaylist, deviceId]);

  const onVideoEnded = () => {
      if (activePlaylist) {
        setCurrentMediaIndex(prev => (prev + 1) % activePlaylist.items.length);
      }
  };

  // --- RENDER: SETUP SCREEN (If no Device ID) ---
  if (!deviceId) {
    return (
      <div className="h-screen w-screen bg-slate-950 flex flex-col items-center justify-center p-4">
         <div className="bg-slate-900 p-8 rounded-2xl border border-slate-800 shadow-2xl max-w-md w-full text-center">
            <div className="w-16 h-16 bg-blue-600 rounded-full flex items-center justify-center mx-auto mb-6 shadow-lg shadow-blue-900/50">
              <Monitor className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-2xl font-bold text-white mb-2">ลงทะเบียนหน้าจอ</h1>
            <p className="text-slate-400 mb-6 text-sm">กรุณาตั้งชื่อหรือรหัสอ้างอิงสำหรับจอนี้ (Device ID) เพื่อให้ Admin สั่งการได้ถูกต้อง</p>
            
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
            <p className="mt-4 text-xs text-slate-500">
              * รหัสนี้ต้องตรงกับที่ระบุในหน้า Admin
            </p>
         </div>
      </div>
    );
  }

  // --- RENDER: NO CONTENT ---
  if (!activePlaylist || !currentMedia) {
    return (
      <div className="h-screen w-screen bg-black flex flex-col items-center justify-center text-slate-500 relative group">
        <Clock className="w-16 h-16 mb-4 opacity-50" />
        <h2 className="text-xl font-light">ไม่อยู่ในช่วงเวลาออกอากาศ</h2>
        <p className="text-sm mt-2 font-mono">ID: {deviceId}</p>
        
        {/* Secret Reset Button (Visible on hover bottom right) */}
        <button 
          onClick={handleResetDevice}
          className="absolute bottom-4 right-4 p-2 text-slate-700 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
          title="Reset Device ID"
        >
          <Settings className="w-4 h-4" />
        </button>
      </div>
    );
  }

  // --- RENDER: PLAYER ---
  return (
    <div className="h-screen w-screen bg-black overflow-hidden relative flex items-center justify-center group">
      {currentMedia.type === MediaType.IMAGE && (
        <img
          key={currentMedia.id}
          src={currentMedia.url}
          alt={currentMedia.name}
          className="w-full h-full object-contain animate-fade-in" 
          style={{ maxWidth: '100%', maxHeight: '100%' }}
        />
      )}
      {currentMedia.type === MediaType.VIDEO && (
        <video
          key={currentMedia.id}
          ref={videoRef}
          src={currentMedia.url}
          autoPlay
          muted
          playsInline
          onEnded={onVideoEnded}
          className="w-full h-full object-contain animate-fade-in"
        />
      )}

      {/* Secret Reset Button for Active Player */}
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