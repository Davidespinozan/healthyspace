import { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Check } from 'lucide-react';
import { useStore } from '../state/store';

/** Toast global de confirmación. Se dispara con showToast(msg). */
export function Toast() {
  const toast = useStore((s) => s.toast);
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (!toast) return;
    setShow(true);
    const t = setTimeout(() => setShow(false), 1900);
    return () => clearTimeout(t);
  }, [toast?.id]);

  return (
    <div className="toast-anchor">
      <AnimatePresence>
        {show && toast && (
          <motion.div
            className="toast"
            initial={{ y: 18, opacity: 0, scale: 0.96 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            exit={{ y: 12, opacity: 0 }}
            transition={{ duration: 0.26, ease: [0.22, 1, 0.36, 1] }}
          >
            <span className="toast-ic"><Check size={13} strokeWidth={3.2} /></span>
            {toast.msg}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
