// Booking Settings Page - Calendly-inspired design

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import {
  ExternalLink,
  Copy,
  Calendar,
  Clock,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
  Plus,
  Settings2,
  Link2,
  ChevronRight,
  Sparkles
} from 'lucide-react';
import { toast } from 'sonner';
import { EventTypeList } from '../components/EventTypes';
import { AvailabilityEditor } from '../components/Availability';
import { useProfile } from '@/hooks/useProfile';
import { useBookingStats } from '../hooks';

// Calendly-inspired design tokens
const styles = {
  container: {
    fontFamily: "'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, sans-serif",
    minHeight: '100vh',
    backgroundColor: '#FAFBFC',
  },
  header: {
    background: 'linear-gradient(135deg, #0066FF 0%, #0052CC 100%)',
    padding: '48px 0 80px',
    position: 'relative' as const,
    overflow: 'hidden',
  },
  headerPattern: {
    position: 'absolute' as const,
    inset: 0,
    backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='0.05'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
  },
  linkBox: {
    background: 'rgba(255, 255, 255, 0.15)',
    backdropFilter: 'blur(10px)',
    border: '1px solid rgba(255, 255, 255, 0.2)',
    borderRadius: '12px',
    padding: '12px 16px',
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    maxWidth: '500px',
  },
  statsCard: {
    background: '#FFFFFF',
    borderRadius: '16px',
    padding: '24px',
    border: '1px solid #E5E7EB',
    boxShadow: '0 1px 3px rgba(0, 0, 0, 0.04)',
    transition: 'all 0.2s ease',
  },
  tab: {
    padding: '16px 24px',
    borderRadius: '12px',
    fontWeight: 500,
    fontSize: '15px',
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
    border: 'none',
    background: 'transparent',
  },
  activeTab: {
    background: '#0066FF',
    color: '#FFFFFF',
    boxShadow: '0 4px 12px rgba(0, 102, 255, 0.25)',
  },
  inactiveTab: {
    background: '#FFFFFF',
    color: '#64748B',
    border: '1px solid #E5E7EB',
  },
};

type TabValue = 'event-types' | 'availability';

export function BookingSettingsPage() {
  const { profile } = useProfile();
  const { data: stats } = useBookingStats();
  const [activeTab, setActiveTab] = useState<TabValue>('event-types');
  const [linkCopied, setLinkCopied] = useState(false);

  const bookingUrl = profile?.username
    ? `${window.location.origin}/book/${profile.username}`
    : null;

  const handleCopyLink = () => {
    if (bookingUrl) {
      navigator.clipboard.writeText(bookingUrl);
      setLinkCopied(true);
      toast.success('Enlace copiado');
      setTimeout(() => setLinkCopied(false), 2000);
    }
  };

  const handleOpenLink = () => {
    if (bookingUrl) {
      window.open(bookingUrl, '_blank');
    }
  };

  const statsItems = [
    {
      label: 'Este mes',
      value: stats?.total ?? 0,
      sublabel: 'reservas totales',
      icon: Calendar,
      color: '#0066FF',
      bgColor: '#EFF6FF',
    },
    {
      label: 'Pendientes',
      value: stats?.pending ?? 0,
      sublabel: 'por confirmar',
      icon: AlertCircle,
      color: '#F59E0B',
      bgColor: '#FFFBEB',
    },
    {
      label: 'Confirmadas',
      value: stats?.confirmed ?? 0,
      sublabel: 'próximas',
      icon: CheckCircle2,
      color: '#10B981',
      bgColor: '#ECFDF5',
    },
    {
      label: 'Completadas',
      value: stats?.completed ?? 0,
      sublabel: 'este mes',
      icon: Sparkles,
      color: '#8B5CF6',
      bgColor: '#F5F3FF',
    },
  ];

  return (
    <div style={styles.container}>
      {/* Header con gradiente */}
      <header style={styles.header}>
        <div style={styles.headerPattern} />
        <div className="relative z-10 max-w-6xl mx-auto px-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-6"
          >
            <div className="flex items-center gap-3 text-white/80">
              <Settings2 className="w-5 h-5" />
              <span className="text-sm font-medium">Configuración</span>
            </div>

            <h1 className="text-4xl font-bold text-white tracking-tight">
              Tu calendario de reservas
            </h1>

            <p className="text-white/80 text-lg max-w-xl">
              Configura tus tipos de citas y disponibilidad para que tus clientes puedan agendar fácilmente.
            </p>

            {/* Booking Link */}
            {bookingUrl && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                style={styles.linkBox}
              >
                <Link2 className="w-5 h-5 text-white/70 flex-shrink-0" />
                <span className="text-white text-sm font-medium truncate flex-1">
                  {bookingUrl}
                </span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleCopyLink}
                  className="text-white hover:bg-white/10 h-8 px-3"
                >
                  {linkCopied ? (
                    <CheckCircle2 className="w-4 h-4 text-green-300" />
                  ) : (
                    <Copy className="w-4 h-4" />
                  )}
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleOpenLink}
                  className="text-white hover:bg-white/10 h-8 px-3"
                >
                  <ExternalLink className="w-4 h-4" />
                </Button>
              </motion.div>
            )}
          </motion.div>
        </div>
      </header>

      {/* Stats Cards - overlapping header */}
      <div className="max-w-6xl mx-auto px-6 -mt-10 relative z-20">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4"
        >
          {statsItems.map((item, index) => (
            <motion.div
              key={item.label}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 + index * 0.1 }}
              style={styles.statsCard}
              className="hover:shadow-md hover:-translate-y-0.5"
            >
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm font-medium text-slate-500">{item.label}</p>
                  <p className="text-3xl font-bold text-slate-900 mt-1">{item.value}</p>
                  <p className="text-xs text-slate-400 mt-1">{item.sublabel}</p>
                </div>
                <div
                  className="p-2.5 rounded-xl"
                  style={{ backgroundColor: item.bgColor }}
                >
                  <item.icon className="w-5 h-5" style={{ color: item.color }} />
                </div>
              </div>
            </motion.div>
          ))}
        </motion.div>
      </div>

      {/* Tabs Navigation */}
      <div className="max-w-6xl mx-auto px-6 mt-10">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="flex gap-3 mb-8"
        >
          <button
            onClick={() => setActiveTab('event-types')}
            style={{
              ...styles.tab,
              ...(activeTab === 'event-types' ? styles.activeTab : styles.inactiveTab),
            }}
          >
            <Calendar className="w-5 h-5" />
            Tipos de evento
            {activeTab === 'event-types' && <ChevronRight className="w-4 h-4 ml-1" />}
          </button>

          <button
            onClick={() => setActiveTab('availability')}
            style={{
              ...styles.tab,
              ...(activeTab === 'availability' ? styles.activeTab : styles.inactiveTab),
            }}
          >
            <Clock className="w-5 h-5" />
            Disponibilidad
            {activeTab === 'availability' && <ChevronRight className="w-4 h-4 ml-1" />}
          </button>
        </motion.div>

        {/* Tab Content */}
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.2 }}
            className="pb-12"
          >
            {activeTab === 'event-types' && <EventTypeList />}
            {activeTab === 'availability' && <AvailabilityEditor />}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}
