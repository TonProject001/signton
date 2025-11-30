export enum MediaType {
  IMAGE = 'IMAGE',
  VIDEO = 'VIDEO',
  WEB = 'WEB'
}

export type Orientation = 'landscape' | 'portrait';

export interface Schedule {
  days: number[]; // 0=Sunday, 1=Monday, ...
  startTime: string; // "08:00"
  endTime: string; // "20:00"
  active: boolean;
}

export interface MediaItem {
  id: string;
  type: MediaType;
  url: string;
  name: string;
  duration: number; // default duration in seconds
  thumbnail?: string;
  orientation?: Orientation; // helps filter media suitable for screen
}

export interface PlaylistItem {
  mediaId: string;
  duration: number;
}

export interface Playlist {
  id: string;
  name: string;
  items: PlaylistItem[]; // References to MediaItem
  orientation: Orientation;
  schedule: Schedule;
}

export interface ScreenDevice {
  id: string;
  name: string;
  location: string;
  status: 'online' | 'offline';
  assignedPlaylistId: string | null; // The manually assigned playlist (override)
  lastPing: number;
}

export interface AppState {
  mediaLibrary: MediaItem[];
  playlists: Playlist[];
  devices: ScreenDevice[];
}