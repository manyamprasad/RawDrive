/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { ThemeProvider } from './components/ThemeProvider';
import { Background } from './components/Background';
import { AuthProvider } from './contexts/AuthContext';
import Landing from './pages/Landing';
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import EventView from './pages/EventView';
import AlbumView from './pages/AlbumView';
import FaceSearch from './pages/FaceSearch';
import Pricing from './pages/Pricing';
import Upload from './pages/Upload';
import ProfileSettings from './pages/ProfileSettings';
import PublicProfile from './pages/PublicProfile';
import CompanySettings from './pages/CompanySettings';
import PublicCompany from './pages/PublicCompany';
import { Chatbot } from './components/Chatbot';

export default function App() {
  return (
    <ThemeProvider defaultTheme="system" storageKey="rawdrive-theme">
      <AuthProvider>
        <Background />
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Landing />} />
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/dashboard/profile" element={<ProfileSettings />} />
            <Route path="/dashboard/company" element={<CompanySettings />} />
            <Route path="/event/:id" element={<EventView />} />
            <Route path="/album/:id" element={<AlbumView />} />
            <Route path="/find-me/:albumId" element={<FaceSearch />} />
            <Route path="/pricing" element={<Pricing />} />
            <Route path="/upload" element={<Upload />} />
            <Route path="/p/:slug" element={<PublicProfile />} />
            <Route path="/c/:slug" element={<PublicCompany />} />
            <Route path="*" element={<Landing />} />
          </Routes>
          <Chatbot />
        </BrowserRouter>
      </AuthProvider>
    </ThemeProvider>
  );
}
