import React from 'react';
import { HashRouter, Routes, Route, Link } from 'react-router-dom';
import { SignageProvider } from './context/SignageContext';
import { AdminDashboard } from './pages/AdminDashboard';
import { PlayerView } from './pages/PlayerView';
import { Layout } from './components/Layout'; // Imported only for type checking, not used in render here

// Landing Page Component for selecting mode
const Home = () => (
  <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-4">
    <div className="max-w-md w-full text-center space-y-8">
      <div className="space-y-2">
        <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-400 to-cyan-400 bg-clip-text text-transparent">
          CloudSignage Pro
        </h1>
        <p className="text-slate-400">เลือกระบบการทำงานที่ต้องการ</p>
      </div>
      
      <div className="grid grid-cols-1 gap-4">
        <Link to="/admin" className="group relative block p-6 bg-slate-900 border border-slate-800 rounded-2xl hover:border-blue-500 transition-all text-left">
          <div className="absolute inset-0 bg-gradient-to-r from-blue-600/10 to-cyan-600/10 opacity-0 group-hover:opacity-100 rounded-2xl transition-opacity" />
          <h3 className="text-xl font-semibold text-white mb-2">ระบบจัดการ (Admin Dashboard)</h3>
          <p className="text-sm text-slate-400">สำหรับคอมพิวเตอร์ หรือมือถือ เพื่อจัดการหน้าจอ อัปโหลดรูปภาพ และตั้งเวลา</p>
        </Link>

        <Link to="/player" className="group relative block p-6 bg-slate-900 border border-slate-800 rounded-2xl hover:border-purple-500 transition-all text-left">
           <div className="absolute inset-0 bg-gradient-to-r from-purple-600/10 to-pink-600/10 opacity-0 group-hover:opacity-100 rounded-2xl transition-opacity" />
          <h3 className="text-xl font-semibold text-white mb-2">ระบบแสดงผล (Player Mode)</h3>
          <p className="text-sm text-slate-400">สำหรับกล่อง Android Box หรือสมาร์ททีวี เพื่อแสดงภาพและวิดีโอตามที่กำหนด</p>
        </Link>
      </div>
    </div>
  </div>
);

const App: React.FC = () => {
  return (
    <SignageProvider>
      <HashRouter>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/admin" element={<AdminDashboard />} />
          <Route path="/player" element={<PlayerView />} />
        </Routes>
      </HashRouter>
    </SignageProvider>
  );
};

export default App;