import { CheckCircle2, Info, AlertTriangle, XCircle, X } from 'lucide-react';
import { useStore } from '../lib/store';
import { AnimatePresence, motion } from 'framer-motion';

export default function Toasts() {
  const { toasts, dismissToast } = useStore();
  const icons = {
    success: <CheckCircle2 size={17} className="text-emerald-400" />,
    info: <Info size={17} className="text-sky-400" />,
    warning: <AlertTriangle size={17} className="text-maize-400" />,
    error: <XCircle size={17} className="text-red-400" />,
  };
  return (
    <div className="fixed bottom-4 right-4 z-[60] flex flex-col gap-2 w-[min(92vw,360px)] print-hidden">
      <AnimatePresence>
        {toasts.map((t) => (
          <motion.div
            key={t.id}
            layout
            initial={{ opacity: 0, x: 60, scale: 0.95 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0, x: 40 }}
            className="bg-pine-950 text-pine-50 rounded-xl border border-white/10 shadow-2xl px-3.5 py-3 flex items-start gap-2.5"
          >
            <span className="mt-0.5">{icons[t.kind]}</span>
            <div className="min-w-0 flex-1">
              <div className="text-[12px] font-semibold text-maize-300">{t.title}</div>
              {t.body && <div className="text-[11px] text-pine-100/85 leading-snug mt-0.5">{t.body}</div>}
            </div>
            <button onClick={() => dismissToast(t.id)} className="text-pine-400 hover:text-white p-1"><X size={13} /></button>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
