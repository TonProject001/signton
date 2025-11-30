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

  // --- Actions ---

  const addMedia = async (item: MediaItem) => {
    try {
      // Note: Storing Base64 in Firestore 'url' field directly. 
      // Firestore doc limit is 1MB. 720p compressed images usually fit.
      await setDoc(doc(db, 'media', item.id), item);
    } catch (e: any) {
      console.error("Error adding media: ", e);
      if (e.code === 'resource-exhausted' || e.message?.includes('exceeds the maximum size')) {
          alert("เกิดข้อผิดพลาด: ไฟล์รูปภาพยังมีขนาดใหญ่เกินไปสำหรับฐานข้อมูลฟรี (ต้องไม่เกิน 1MB)");
      } else {
          alert("ไม่สามารถบันทึกข้อมูลได้: " + e.message);
      }
    }
  };

  const removeMedia = async (id: string) => {
    await deleteDoc(doc(db, 'media', id));
    // Optional: Clean up usage in playlists is hard to do atomically without Cloud Functions,
    // but the frontend handles missing media gracefully.
  };

  const savePlaylist = async (playlist: Playlist) => {
    await setDoc(doc(db, 'playlists', playlist.id), playlist);
  };

  const removePlaylist = async (id: string) => {
    await deleteDoc(doc(db, 'playlists', id));
  };

  const updateDevicePlaylist = async (deviceId: string, playlistId: string | null) => {
    const deviceRef = doc(db, 'devices', deviceId);
    await updateDoc(deviceRef, { assignedPlaylistId: playlistId });
  };

  const registerDevice = async (device: ScreenDevice) => {
    const deviceRef = doc(db, 'devices', device.id);
    const docSnap = await getDoc(deviceRef);
    
    if (!docSnap.exists()) {
      await setDoc(deviceRef, device);
    } else {
      // Just update online status if already exists
      await updateDoc(deviceRef, { 
        status: 'online', 
        lastPing: Date.now() 
      });
    }
  };

  const heartbeat = async (deviceId: string) => {
     const deviceRef = doc(db, 'devices', deviceId);
     // Use updateDoc to just update the timestamp
     try {
       await updateDoc(deviceRef, { lastPing: Date.now(), status: 'online' });
     } catch (e) {
       // Ignore if device deleted
     }
  };

  const refreshState = useCallback(() => {
     // No-op for Firestore as it's realtime, but kept for compatibility
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