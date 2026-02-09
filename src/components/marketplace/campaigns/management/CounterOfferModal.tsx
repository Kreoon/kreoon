import { useState } from 'react';
import { X, Send, DollarSign } from 'lucide-react';
import type { CampaignApplication } from '../../types/marketplace';

interface CounterOfferModalProps {
  application: CampaignApplication;
  onClose: () => void;
  onSubmit: (amount: number, message: string) => void;
}

export function CounterOfferModal({ application, onClose, onSubmit }: CounterOfferModalProps) {
  const [amount, setAmount] = useState<string>(application.bid_amount ? String(Math.round(application.bid_amount * 0.8)) : '');
  const [message, setMessage] = useState('');

  const handleSubmit = () => {
    const numAmount = Number(amount);
    if (!numAmount || numAmount <= 0) return;
    onSubmit(numAmount, message);
  };

  return (
    <div className="fixed inset-0 z-[100]">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="absolute inset-0 flex items-center justify-center p-4">
        <div className="relative bg-[#0f0f1a] border border-white/10 rounded-2xl w-full max-w-md">
          {/* Header */}
          <div className="border-b border-white/10 px-6 py-4 flex items-center justify-between">
            <div>
              <h2 className="text-white font-semibold">Contraoferta</h2>
              <p className="text-gray-500 text-xs mt-0.5">{application.creator.display_name}</p>
            </div>
            <button onClick={onClose} className="w-8 h-8 rounded-full hover:bg-white/10 flex items-center justify-center">
              <X className="h-5 w-5 text-gray-400" />
            </button>
          </div>

          {/* Content */}
          <div className="px-6 py-5 space-y-4">
            {application.bid_amount && (
              <div className="bg-white/5 rounded-lg p-3 flex justify-between items-center">
                <span className="text-gray-400 text-sm">Oferta del creador</span>
                <span className="text-white font-semibold">${application.bid_amount.toLocaleString()} COP</span>
              </div>
            )}

            <div>
              <label className="text-gray-300 text-sm font-medium block mb-1.5">
                Tu contraoferta (COP) <span className="text-red-400">*</span>
              </label>
              <div className="relative">
                <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500" />
                <input
                  type="number"
                  value={amount}
                  onChange={e => setAmount(e.target.value)}
                  placeholder="250000"
                  className="w-full bg-white/5 border border-white/10 rounded-xl pl-10 pr-4 py-3 text-white text-sm placeholder:text-gray-600 focus:outline-none focus:border-purple-500"
                />
              </div>
            </div>

            <div>
              <label className="text-gray-300 text-sm font-medium block mb-1.5">
                Mensaje (opcional)
              </label>
              <textarea
                value={message}
                onChange={e => setMessage(e.target.value)}
                placeholder="Explica tu contraoferta al creador..."
                rows={3}
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white text-sm placeholder:text-gray-600 focus:outline-none focus:border-purple-500 resize-none"
              />
            </div>

            <p className="text-gray-600 text-xs">Solo puedes enviar una contraoferta por aplicacion. El creador podra aceptar o rechazar.</p>
          </div>

          {/* Footer */}
          <div className="border-t border-white/10 px-6 py-4 flex gap-3">
            <button
              onClick={onClose}
              className="flex-1 border border-white/10 text-gray-400 py-3 rounded-xl hover:bg-white/5 transition-colors text-sm font-medium"
            >
              Cancelar
            </button>
            <button
              onClick={handleSubmit}
              disabled={!amount || Number(amount) <= 0}
              className="flex-1 bg-orange-600 hover:bg-orange-500 disabled:opacity-40 disabled:cursor-not-allowed text-white py-3 rounded-xl transition-colors text-sm font-semibold flex items-center justify-center gap-2"
            >
              <Send className="h-4 w-4" />
              Enviar Contraoferta
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
