import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { AppState, MediaItem, Playlist, ScreenDevice, MediaType } from '../types';
import { db } from '../services/firebase';
import { collection, onSnapshot, doc, setDoc, deleteDoc, updateDoc, getDoc } from 'firebase/firestore';

// Initial Empty Data - data will come from Firestore
const INITIAL_DATA: AppState = {
  mediaLibrary: [],
  playlists: [],
  devices: []
};

interface SignageContextType {
  state: AppState;
  addMedia: (item: MediaItem) => Promise<void>;
  removeMedia: (id: string) => Promise<void>;
  savePlaylist: (playlist: Playlist) => Promise<void>;
  removePlaylist: (id: string) => Promise<void>;
  updateDevicePlaylist: (deviceId: string, playlistId: string | null) => Promise<void>;
  refreshState: () => void;
  getMediaById: (id: string) => MediaItem | undefined;
  registerDevice: (device: ScreenDevice) => Promise<void>;
  heartbeat: (deviceId: string) => Promise<void>;
}

const SignageContext = createContext<SignageContextType | undefined>(undefined);

export const SignageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [state, setState] = useState<AppState>(INITIAL_DATA);
  const [loading, setLoading] = useState(true);

  // --- Real-time Sync with Firestore ---
  useEffect(() => {
    // 1. Listen to Media
    const unsubMedia = onSnapshot(collection(db, 'media'), (snapshot) => {
      const items: MediaItem[] = [];
      snapshot.forEach((doc) => items.push(doc.data() as MediaItem));
      setState(prev => ({ ...prev, mediaLibrary: items }));
    }, (error) => {
       console.error("Media sync error:", error);
       if (error.code === 'permission-denied') {
         alert("การเชื่อมต่อถูกปฏิเสธ: กรุณาไปที่ Firebase Console > Firestore Database > Rules และตั้งค่าเป็น 'allow read, write: if true;'");
       }
    });

    // 2. Listen to Playlists
    const unsubPlaylist = onSnapshot(collection(db, 'playlists'), (snapshot) => {
      const items: Playlist[] = [];
      snapshot.forEach((doc) => items.push(doc.data() as Playlist));
      setState(prev => ({ ...prev, playlists: items }));
    });

    // 3. Listen to Devices
    const unsubDevices = onSnapshot(collection(db, 'devices'), (snapshot) => {
      const items: ScreenDevice[] = [];
      snapshot.forEach((doc) => items.push(doc.data() as ScreenDevice));
      setState(prev => ({ ...prev, devices: items }));
    });

    return () => {
      unsubMedia();
      unsubPlaylist();
      unsubDevices();
    };
  }, []);

  // --- Helper for Errors ---
  const handleError = (e: any, action: string) => {
      console.error(`Error ${action}: `, e);
      if (e.code === 'permission-denied') {
          alert(`ไม่สามารถบันทึกข้อมูลได้ (${action}): ติดสิทธิ์การเข้าถึง\n\nวิธีแก้: ไปที่ Firebase Console -> Firestore Database -> Rules\nแล้วแก้เป็น allow read, write: if true;`);
      } else if (e.code === 'resource-exhausted' || e.message?.includes('exceeds the maximum size')) {
          alert("เกิดข้อผิดพลาด: ไฟล์มีขนาดใหญ่เกินไปสำหรับฐานข้อมูลฟรี (ต้องไม่เกิน 1MB)");
      } else {
          alert(`ไม่สามารถทำรายการได้ (${action}): ` + e.message);
      }
  };

  // --- Actions ---

  const addMedia = async (item: MediaItem) => {
    try {
      await setDoc(doc(db, 'media', item.id), item);
    } catch (e: any) {
      handleError(e, 'addMedia');
    }
  };

  const removeMedia = async (id: string) => {
    try {
        await deleteDoc(doc(db, 'media', id));
    } catch (e: any) {
        handleError(e, 'removeMedia');
    }
  };

  const savePlaylist = async (playlist: Playlist) => {
    try {
        await setDoc(doc(db, 'playlists', playlist.id), playlist);
    } catch (e: any) {
        handleError(e, 'savePlaylist');
    }
  };

  const removePlaylist = async (id: string) => {
    try {
        await deleteDoc(doc(db, 'playlists', id));
    } catch (e: any) {
        handleError(e, 'removePlaylist');
    }
  };

  const updateDevicePlaylist = async (deviceId: string, playlistId: string | null) => {
    try {
        const deviceRef = doc(db, 'devices', deviceId);
        await updateDoc(deviceRef, { assignedPlaylistId: playlistId });
    } catch (e: any) {
        handleError(e, 'updateDevicePlaylist');
    }
  };

  const registerDevice = async (device: ScreenDevice) => {
    try {
        const deviceRef = doc(db, 'devices', device.id);
        const docSnap = await getDoc(deviceRef);
        
        if (!docSnap.exists()) {
          await setDoc(deviceRef, device);
        } else {
          await updateDoc(deviceRef, { 
            status: 'online', 
            lastPing: Date.now() 
          });
        }
    } catch (e: any) {
        // Silent error for registration mostly, but warn if permission denied
        if (e.code === 'permission-denied') {
            console.error("Device registration failed due to permissions");
        }
    }
  };

  const heartbeat = async (deviceId: string) => {
     try {
       const deviceRef = doc(db, 'devices', deviceId);
       await updateDoc(deviceRef, { lastPing: Date.now(), status: 'online' });
     } catch (e) {
       // Ignore errors on heartbeat to avoid spamming
     }
  };

  const refreshState = useCallback(() => {
     console.log("Refreshed (Realtime)");
  }, []);

  const getMediaById = (id: string) => state.mediaLibrary.find(m => m.id === id);

  return (
    <SignageContext.Provider value={{ state, addMedia, removeMedia, savePlaylist, removePlaylist, updateDevicePlaylist, refreshState, getMediaById, registerDevice, heartbeat }}>
      {children}
    </SignageContext.Provider>
  );
};

export const useSignage = () => {
  const context = useContext(SignageContext);
  if (!context) throw new Error("useSignage must be used within a SignageProvider");
  return context;
};
