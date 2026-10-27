import { motion, useMotionValue, useSpring } from "framer-motion";
import { springs } from "../../MotionConfig";

export default function NavigationButton({ item, active, onClick }) {
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const springX = useSpring(x, springs.magnetic);
  const springY = useSpring(y, springs.magnetic);

  const handleMove = (event) => {
    const rect = event.currentTarget.getBoundingClientRect();
    x.set((event.clientX - rect.left - rect.width / 2) * 0.16);
    y.set((event.clientY - rect.top - rect.height / 2) * 0.16);
  };

  const reset = () => {
    x.set(0);
    y.set(0);
  };

  return (
    <motion.button
      type="button"
      className={`sidebar-button ${active ? "active" : ""}`}
      onClick={onClick}
      onMouseMove={handleMove}
      onMouseLeave={reset}
      onFocus={reset}
      style={{ x: springX, y: springY }}
      whileHover={{ scale: 1.08 }}
      whileTap={{ scale: 0.96 }}
      transition={springs.cardHover}
      aria-pressed={active}
    >
      <span className="sidebar-icon">{item.icon}</span>
      <span className="sidebar-label">{item.label}</span>
    </motion.button>
  );
}
