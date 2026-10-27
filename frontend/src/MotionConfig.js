export const springs = {
  cardHover: {
    type: "spring",
    stiffness: 320,
    damping: 22,
    mass: 0.8
  },
  entrance: {
    type: "spring",
    stiffness: 180,
    damping: 20
  },
  gauge: {
    type: "spring",
    stiffness: 140,
    damping: 16,
    mass: 0.9
  },
  magnetic: {
    type: "spring",
    stiffness: 260,
    damping: 18,
    mass: 0.7
  },
  heartPulse: {
    type: "spring",
    stiffness: 150,
    damping: 14,
    repeat: Infinity,
    repeatType: "loop"
  },
  haptic: {
    type: "spring",
    stiffness: 420,
    damping: 12
  },
  layout: {
    type: "spring",
    stiffness: 165,
    damping: 20
  }
};

export const cardStagger = {
  hidden: {},
  visible: {
    transition: {
      staggerChildren: 0.1,
      delayChildren: 0.08
    }
  }
};

export const cardItem = {
  hidden: { opacity: 0, y: 22, scale: 0.98 },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: springs.entrance
  }
};
