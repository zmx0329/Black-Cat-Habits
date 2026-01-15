import React from 'react';
import { HashRouter, Routes, Route, useLocation, Navigate } from 'react-router-dom';
import { AppProvider, useApp } from './context/AppContext';

// Pages
import HomePage from './pages/HomePage';
import AddEditHabitPage from './pages/AddEditHabitPage';
import HabitDetailsPage from './pages/HabitDetailsPage';
import StatisticsPage from './pages/StatisticsPage';
import ChatPage from './pages/ChatPage';
import ProfilePage from './pages/ProfilePage';
import JournalPage from './pages/JournalPage';
import AuthPage from './pages/AuthPage';

// Components
import BottomNav from './components/BottomNav';

const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, loading } = useApp();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F2F2F7]">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-gray-300 border-t-black"></div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
};

const Layout: React.FC = () => {
  const location = useLocation();
  const { user, loading } = useApp();
  const hideBottomNavRoutes = ['/add', '/edit', '/journal', '/login'];
  const shouldHideBottomNav = hideBottomNavRoutes.some(route => location.pathname.startsWith(route));

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F2F2F7]">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-gray-300 border-t-black"></div>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen bg-[#F2F2F7]">
      <div className="flex-1 overflow-y-auto no-scrollbar">
        <Routes>
          <Route path="/login" element={<AuthPage />} />
          <Route path="/" element={<ProtectedRoute><HomePage /></ProtectedRoute>} />
          <Route path="/add" element={<ProtectedRoute><AddEditHabitPage /></ProtectedRoute>} />
          <Route path="/edit/:id" element={<ProtectedRoute><AddEditHabitPage /></ProtectedRoute>} />
          <Route path="/details/:id" element={<ProtectedRoute><HabitDetailsPage /></ProtectedRoute>} />
          <Route path="/statistics" element={<ProtectedRoute><StatisticsPage /></ProtectedRoute>} />
          <Route path="/chat" element={<ProtectedRoute><ChatPage /></ProtectedRoute>} />
          <Route path="/profile" element={<ProtectedRoute><ProfilePage /></ProtectedRoute>} />
          <Route path="/journal/:logId" element={<ProtectedRoute><JournalPage /></ProtectedRoute>} />
        </Routes>
      </div>
      {user && !shouldHideBottomNav && <BottomNav />}
    </div>
  );
};

const App: React.FC = () => {
  return (
    <AppProvider>
      <HashRouter>
        <Layout />
      </HashRouter>
    </AppProvider>
  );
};

export default App;