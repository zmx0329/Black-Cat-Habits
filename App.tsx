import React, { useState, createContext, useContext, useEffect } from 'react';
import { HashRouter, Routes, Route, useLocation } from 'react-router-dom';
import { Habit, Log, ChatMessage, HabitType } from './types';
import { INITIAL_HABITS, INITIAL_LOGS, INITIAL_MESSAGES } from './constants';

// Pages
import HomePage from './pages/HomePage';
import AddEditHabitPage from './pages/AddEditHabitPage';
import HabitDetailsPage from './pages/HabitDetailsPage';
import StatisticsPage from './pages/StatisticsPage';
import ChatPage from './pages/ChatPage';
import ProfilePage from './pages/ProfilePage';
import JournalPage from './pages/JournalPage';

// Components
import BottomNav from './components/BottomNav';

interface AppContextType {
  habits: Habit[];
  logs: Log[];
  messages: ChatMessage[];
  addHabit: (habit: Habit) => void;
  updateHabit: (habit: Habit) => void;
  reorderHabits: (newHabits: Habit[]) => void;
  addLog: (log: Log) => void;
  deleteLog: (logId: string) => void;
  updateLogNote: (logId: string, note: string) => void;
  sendMessage: (text: string) => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) throw new Error('useApp must be used within AppProvider');
  return context;
};

const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [habits, setHabits] = useState<Habit[]>(INITIAL_HABITS);
  const [logs, setLogs] = useState<Log[]>(INITIAL_LOGS);
  const [messages, setMessages] = useState<ChatMessage[]>(INITIAL_MESSAGES);

  const addHabit = (habit: Habit) => {
    setHabits([...habits, habit]);
  };

  const updateHabit = (updatedHabit: Habit) => {
    setHabits(habits.map(h => h.id === updatedHabit.id ? updatedHabit : h));
  };

  const reorderHabits = (newHabits: Habit[]) => {
    setHabits(newHabits);
  };

  const addLog = (log: Log) => {
    setLogs([log, ...logs]);
    // Also update habit today count
    const habit = habits.find(h => h.id === log.habitId);
    if (habit) {
       updateHabit({...habit, todayCount: habit.todayCount + 1});
    }
  };

  const deleteLog = (logId: string) => {
     const log = logs.find(l => l.id === logId);
     if (log) {
        const habit = habits.find(h => h.id === log.habitId);
        if (habit) {
            updateHabit({...habit, todayCount: Math.max(0, habit.todayCount - 1)});
        }
     }
    setLogs(logs.filter(l => l.id !== logId));
  };

  const updateLogNote = (logId: string, note: string) => {
    setLogs(logs.map(l => l.id === logId ? { ...l, note } : l));
  };

  const sendMessage = (text: string) => {
    const newUserMsg: ChatMessage = {
      id: Date.now().toString(),
      sender: 'user',
      text,
      timestamp: Date.now(),
    };
    setMessages(prev => [...prev, newUserMsg]);
    
    // Simulate AI response
    setTimeout(() => {
        const aiMsg: ChatMessage = {
            id: (Date.now() + 1).toString(),
            sender: 'ai',
            text: '哼，继续保持。',
            timestamp: Date.now(),
        };
        setMessages(prev => [...prev, aiMsg]);
    }, 1000);
  };

  return (
    <AppContext.Provider value={{ habits, logs, messages, addHabit, updateHabit, reorderHabits, addLog, deleteLog, updateLogNote, sendMessage }}>
      {children}
    </AppContext.Provider>
  );
};

const Layout: React.FC = () => {
  const location = useLocation();
  const hideBottomNavRoutes = ['/add', '/edit', '/chat', '/journal'];
  const shouldHideBottomNav = hideBottomNavRoutes.some(route => location.pathname.startsWith(route));

  return (
    <div className="flex flex-col min-h-screen bg-[#F2F2F7]">
        <div className="flex-1 overflow-y-auto no-scrollbar">
            <Routes>
                <Route path="/" element={<HomePage />} />
                <Route path="/add" element={<AddEditHabitPage />} />
                <Route path="/edit/:id" element={<AddEditHabitPage />} />
                <Route path="/details/:id" element={<HabitDetailsPage />} />
                <Route path="/statistics" element={<StatisticsPage />} />
                <Route path="/chat" element={<ChatPage />} />
                <Route path="/profile" element={<ProfilePage />} />
                <Route path="/journal/:logId" element={<JournalPage />} />
            </Routes>
        </div>
        {!shouldHideBottomNav && <BottomNav />}
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