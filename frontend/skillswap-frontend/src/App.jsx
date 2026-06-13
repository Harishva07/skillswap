/**
 * SkillSwap - Main App Component
 * Router setup with all pages and protected routes
 */

import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import { ToastProvider } from './components/common/Toast';
import { ProtectedRoute } from './components/Auth/ProtectedRoute';
import { Layout } from './components/Layout/Layout';

// Pages
import { Landing } from './pages/Landing';
import { Login } from './pages/Login';
import { Register } from './pages/Register';
import { Dashboard } from './pages/Dashboard';
import { Profile } from './pages/Profile';
import { EditProfile } from './pages/EditProfile';
import { SkillSearch } from './pages/SkillSearch';
import { SkillMatch } from './pages/SkillMatch';
import { ExchangeRequests } from './pages/ExchangeRequests';
import { Chat } from './pages/Chat';
import { Reviews } from './pages/Reviews';
import { AdminDashboard } from './pages/admin/AdminDashboard';

// Wrap page in layout
const WithLayout = ({ children }) => (
  <Layout>{children}</Layout>
);

function App() {
  return (
    <BrowserRouter>
      <ThemeProvider>
        <AuthProvider>
          <ToastProvider>
            <Routes>
              {/* Public Routes */}
              <Route path="/" element={<Landing />} />
              <Route path="/login" element={<Login />} />
              <Route path="/register" element={<Register />} />

              {/* Protected Routes */}
              <Route path="/dashboard" element={
                <ProtectedRoute><WithLayout><Dashboard /></WithLayout></ProtectedRoute>
              } />
              <Route path="/profile" element={
                <ProtectedRoute><WithLayout><Profile /></WithLayout></ProtectedRoute>
              } />
              <Route path="/profile/:id" element={
                <ProtectedRoute><WithLayout><Profile /></WithLayout></ProtectedRoute>
              } />
              <Route path="/edit-profile" element={
                <ProtectedRoute><WithLayout><EditProfile /></WithLayout></ProtectedRoute>
              } />
              <Route path="/skills" element={
                <ProtectedRoute><WithLayout><SkillSearch /></WithLayout></ProtectedRoute>
              } />
              <Route path="/matches" element={
                <ProtectedRoute><WithLayout><SkillMatch /></WithLayout></ProtectedRoute>
              } />
              <Route path="/exchanges" element={
                <ProtectedRoute><WithLayout><ExchangeRequests /></WithLayout></ProtectedRoute>
              } />
              <Route path="/chat" element={
                <ProtectedRoute><WithLayout><Chat /></WithLayout></ProtectedRoute>
              } />
              <Route path="/reviews" element={
                <ProtectedRoute><WithLayout><Reviews /></WithLayout></ProtectedRoute>
              } />

              {/* Admin Routes */}
              <Route path="/admin" element={
                <ProtectedRoute adminOnly><WithLayout><AdminDashboard /></WithLayout></ProtectedRoute>
              } />

              {/* Catch-all redirect */}
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </ToastProvider>
        </AuthProvider>
      </ThemeProvider>
    </BrowserRouter>
  );
}

export default App;
