import { motion } from 'framer-motion';
import type { ReactNode } from 'react';

/** Entrada suave hacia arriba, con retraso opcional para escalonar secciones. */
export function Reveal({ children, delay = 0, y = 16, className, style }: {
  children: ReactNode; delay?: number; y?: number; className?: string; style?: React.CSSProperties;
}) {
  return (
    <motion.div
      className={className}
      style={style}
      initial={{ opacity: 0, y }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay, ease: [0.16, 1, 0.3, 1] }}
    >
      {children}
    </motion.div>
  );
}

/** Contenedor que escalona a sus hijos <RevealItem>. */
export function RevealGroup({ children, gap = 0.07, className, style }: {
  children: ReactNode; gap?: number; className?: string; style?: React.CSSProperties;
}) {
  return (
    <motion.div
      className={className}
      style={style}
      initial="hidden"
      animate="show"
      variants={{ show: { transition: { staggerChildren: gap } } }}
    >
      {children}
    </motion.div>
  );
}

export function RevealItem({ children, y = 16, className, style }: {
  children: ReactNode; y?: number; className?: string; style?: React.CSSProperties;
}) {
  return (
    <motion.div
      className={className}
      style={style}
      variants={{
        hidden: { opacity: 0, y },
        show: { opacity: 1, y: 0, transition: { duration: 0.5, ease: [0.16, 1, 0.3, 1] } },
      }}
    >
      {children}
    </motion.div>
  );
}
