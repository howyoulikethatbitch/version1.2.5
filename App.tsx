import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AppProvider, useApp } from '@/context/AppContext';
import Header from '@/components/Header';
import SidebarNav, { type TabId } from '@/components/SidebarNav';
import SearchOverlay from '@/components/SearchOverlay';
import OverviewTab from '@/components/tabs/OverviewTab';
import BLSeriesTab from '@/components/tabs/BLSeriesTab';
import OngoingTab from '@/components/tabs/OngoingTab';
import FavoritesTab from '@/components/tabs/FavoritesTab';
import Top10Tab from '@/components/tabs/Top10Tab';
import SettingsTab from '@/components/tabs/SettingsTab';
import './App.css';

function AppContent() {
  const { isLoaded } = useApp();
  const [activeTab, setActiveTab] = useState<TabId>('overview');
  const [searchOpen, setSearchOpen] = useState(false);

  // Handle import events from SettingsTab
  useEffect(() => {
    const handler = (e: Event) => {
      const customEvent = e as CustomEvent<unknown>;
      if (customEvent.detail) {
        window.location.reload();
      }
    };
    window.addEventListener('bl-import', handler);
    return () => window.removeEventListener('bl-import', handler);
  }, []);

  if (!isLoaded) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center">
        <motion.div
          animate={{ scale: [1, 1.2, 1] }}
          transition={{ repeat: Infinity, duration: 1.5 }}
          className="text-[#E50914] font-black text-2xl"
        >
          BL WATCHLIST
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0a0a0a]">
      {/* Sidebar Navigation */}
      <SidebarNav activeTab={activeTab} onTabChange={setActiveTab} />

      {/* Header */}
      <Header onSearchOpen={() => setSearchOpen(true)} />

      {/* Main Content */}
      <main className="pt-16 px-4 pb-6">
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
            className="w-full"
          >
            {activeTab === 'overview' && <OverviewTab />}
            {activeTab === 'blseries' && <BLSeriesTab />}
            {activeTab === 'ongoing' && <OngoingTab />}
            {activeTab === 'favorites' && <FavoritesTab />}
            {activeTab === 'top10' && <Top10Tab />}
            {activeTab === 'settings' && <SettingsTab />}
          </motion.div>
        </AnimatePresence>
      </main>

      {/* Search Overlay */}
      <SearchOverlay
        isOpen={searchOpen}
        onClose={() => setSearchOpen(false)}
      />
    </div>
  );
}

function App() {
  return (
    <AppProvider>
      <AppContent />
    </AppProvider>
  );
}

export default App;
