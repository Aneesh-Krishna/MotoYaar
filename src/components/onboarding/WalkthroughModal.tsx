"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Home, Car, Map, Users, User } from "lucide-react";

const CARDS = [
  {
    section: "Dashboard",
    icon: Home,
    copy: "Your garage, organized.",
  },
  {
    section: "Garage",
    icon: Car,
    copy: "Every rupee, accounted for.",
  },
  {
    section: "Trips",
    icon: Map,
    copy: "Log every journey.",
  },
  {
    section: "Community",
    icon: Users,
    copy: "Connect with your tribe.",
  },
  {
    section: "Profile",
    icon: User,
    copy: "All of it, in your pocket.",
  },
] as const;

interface WalkthroughModalProps {
  onComplete?: () => void;
  onSkip?: () => void;
  disabled?: boolean;
  /** When true, callbacks are invoked directly without DB save or redirect (re-opened from Settings). */
  skipSave?: boolean;
}

export default function WalkthroughModal({ onComplete, onSkip, disabled = false, skipSave = false }: WalkthroughModalProps) {
  const [current, setCurrent] = useState(0);
  const [direction, setDirection] = useState(1);

  const isFirst = current === 0;
  const isLast = current === CARDS.length - 1;

  const goNext = () => {
    setDirection(1);
    setCurrent((c) => c + 1);
  };

  const goBack = () => {
    setDirection(-1);
    setCurrent((c) => c - 1);
  };

  const card = CARDS[current];
  const Icon = card.icon;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="relative w-full max-w-sm mx-4 bg-white rounded-2xl shadow-xl overflow-hidden">
        {/* Card content */}
        <div className="h-64 relative overflow-hidden bg-surface-alt flex items-center justify-center">
          <AnimatePresence mode="wait">
            <motion.div
              key={current}
              initial={{ x: direction * 300, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: direction * -300, opacity: 0 }}
              transition={{ type: "tween", duration: 0.25 }}
              className="absolute inset-0 flex items-center justify-center"
            >
              <Icon className="w-24 h-24 text-primary" strokeWidth={1.5} />
            </motion.div>
          </AnimatePresence>
        </div>

        <div className="px-6 pt-5 pb-6">
          {/* Text */}
          <AnimatePresence mode="wait">
            <motion.div
              key={current}
              initial={{ x: direction * 60, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: direction * -60, opacity: 0 }}
              transition={{ type: "tween", duration: 0.2 }}
            >
              <h2 className="text-xl font-bold text-text-primary mb-1">{card.section}</h2>
              <p className="text-sm text-text-secondary">{card.copy}</p>
            </motion.div>
          </AnimatePresence>

          {/* Progress dots */}
          <div className="flex justify-center gap-2 mt-5">
            {CARDS.map((_, i) => (
              <div
                key={i}
                className={`h-2 rounded-full transition-all duration-200 ${
                  i === current ? "w-6 bg-primary" : "w-2 bg-border"
                }`}
              />
            ))}
          </div>

          {/* Navigation */}
          <div className="flex items-center gap-2 mt-5">
            {!isFirst && (
              <button
                onClick={goBack}
                className="flex-1 py-2.5 border border-border rounded-lg text-sm font-medium text-text-primary hover:bg-surface-alt transition-colors"
              >
                Back
              </button>
            )}

            {!isLast && (
              <button
                onClick={onSkip}
                disabled={disabled}
                className={`${isFirst ? "flex-1" : ""} py-2.5 px-4 text-sm font-medium text-text-secondary hover:text-text-primary transition-colors disabled:opacity-50 disabled:cursor-not-allowed`}
              >
                Skip
              </button>
            )}

            {isLast ? (
              <button
                onClick={onComplete}
                disabled={disabled}
                className="flex-1 py-2.5 bg-primary text-white font-semibold rounded-lg text-sm hover:bg-primary-dark transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {disabled ? "Saving..." : "Get started"}
              </button>
            ) : (
              <button
                onClick={goNext}
                disabled={disabled}
                className="flex-1 py-2.5 bg-primary text-white font-semibold rounded-lg text-sm hover:bg-primary-dark transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Next
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
