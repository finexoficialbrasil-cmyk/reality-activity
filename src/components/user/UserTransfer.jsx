import { useState } from 'react';
import { motion } from 'framer-motion';
import { Send, Download, History as HistoryIcon } from 'lucide-react';
import TransferSend from './TransferSend';
import TransferReceive from './TransferReceive';
import TransferHistory from './TransferHistory';

export default function UserTransfer({ user, userPoints, onTransferComplete }) {
  const [subTab, setSubTab] = useState('send');

  const tabs = [
    { id: 'send', label: 'Enviar', icon: Send },
    { id: 'receive', label: 'Receber', icon: Download },
    { id: 'history', label: 'Histórico', icon: HistoryIcon },
  ];

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
      <div className="flex gap-2 flex-wrap">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setSubTab(tab.id)}
            className={`px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 transition-colors ${
              subTab === tab.id ? 'bg-gold text-background' : 'bg-card border border-border text-muted-foreground hover:text-foreground'
            }`}
          >
            <tab.icon className="w-4 h-4" /> {tab.label}
          </button>
        ))}
      </div>

      {subTab === 'send' && <TransferSend user={user} userPoints={userPoints} onTransferComplete={onTransferComplete} />}
      {subTab === 'receive' && <TransferReceive user={user} />}
      {subTab === 'history' && <TransferHistory user={user} />}
    </motion.div>
  );
}