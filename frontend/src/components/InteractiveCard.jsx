import { motion } from "framer-motion";
import { cardItem, springs } from "../MotionConfig";

export default function InteractiveCard({
  children,
  className = "",
  glow = true,
  layoutId,
  variants = cardItem,
  ...props
}) {
  return (
    <motion.section
      layout
      layoutId={layoutId}
      variants={variants}
      initial="hidden"
      animate="visible"
      whileHover={{
        y: -10,
        scale: 1.02,
        borderColor: "rgba(220, 38, 38, 0.85)",
        boxShadow: glow
          ? "0 28px 70px rgba(80, 31, 24, 0.22), 0 0 0 1px rgba(220, 38, 38, 0.2), 0 0 28px rgba(249, 115, 22, 0.14)"
          : "0 28px 70px rgba(4, 20, 28, 0.42)",
        backgroundColor: "var(--button-active)"
      }}
      transition={springs.cardHover}
      className={`interactive-card ${className}`.trim()}
      {...props}
    >
      {children}
    </motion.section>
  );
}
