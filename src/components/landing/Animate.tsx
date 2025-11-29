import React, { useEffect } from "react";
import { motion, useAnimation } from "framer-motion";
import { useInView } from "react-intersection-observer";

const Animate = ({
  children,
  className,
  duration = 0.6,
  delay = 0,
  isUp = true,
}: {
  children: React.ReactNode;
  className?: string;
  duration?: number;
  delay?: number;
  isUp?: boolean;
}) => {
  const controls = useAnimation();
  const [ref, inView] = useInView({
    triggerOnce: false, // false로 설정하면 요소가 다시 뷰포트에 들어올 때마다 애니메이션이 트리거됨
  });

  useEffect(() => {
    if (inView) {
      controls.start("visible");
    } else {
      controls.start("hidden");
    }
  }, [controls, inView]);

  const variants = {
    hidden: { opacity: 0, y: isUp ? 40 : 0 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { duration, delay, ease: "easeInOut" },
    },
  };

  return (
    <motion.div
      ref={ref}
      initial="hidden"
      animate={controls}
      variants={variants}
      className={className}
    >
      {children}
    </motion.div>
  );
};

export default Animate;
