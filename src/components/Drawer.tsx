"use client";

import React, { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Menu, X, ChevronRight } from "lucide-react";
import Link from "next/link";

export type DrawerItem = {
  label: string;
  href?: string;
  onClick?: () => void;
  icon?: React.ReactNode;
};

export default function MobileRightDrawer({
  title = "Menu",
  items = [],
  className = "",
}: {
  title?: string;
  items?: DrawerItem[];
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const firstFocusableRef = useRef<HTMLAnchorElement | HTMLButtonElement>(null);

  // Close on ESC
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  // Lock body scroll when open
  useEffect(() => {
    if (typeof document === "undefined") return;
    const prev = document.body.style.overflow;
    if (open) document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  // Focus the first interactive element when opening
  useEffect(() => {
    if (open) {
      setTimeout(() => firstFocusableRef.current?.focus(), 0);
    }
  }, [open]);

  return (
    <div className={`relative ${className}`}>
      {/* Trigger */}
      <button
        type="button"
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-controls="mobile-right-drawer"
        onClick={() => setOpen(true)}
        className="md:hidden inline-flex items-center gap-2 dark:border-neutral-800 px-2 py-2 text-sm font-medium shadow-sm hover:bg-neutral-50 dark:hover:bg-neutral-900 active:scale-[0.98]"
      >
        <Menu className="h-5 w-5" />
      </button>

      {/* Drawer + Backdrop */}
      <AnimatePresence>
        {open && (
          <>
            {/* Backdrop */}
            <motion.button
              aria-label="Close menu"
              onClick={() => setOpen(false)}
              className="fixed inset-0 z-40 bg-xmain/40 backdrop-blur-sm md:hidden"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            />

            {/* Drawer Panel */}
            <motion.aside
              id="mobile-right-drawer"
              role="dialog"
              aria-modal="true"
              aria-labelledby="mobile-right-drawer-title"
              className="fixed right-0 top-0 z-50 h-[100dvh] w-[80%] max-w-sm md:hidden"
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "spring", stiffness: 380, damping: 36 }}
            >
              {/* Draggable surface for swipe-to-close */}
              <motion.div
                className="h-full bg-xopp text-neutral-900 dark:bg-neutral-950 dark:text-neutral-50 shadow-2xl border-l border-neutral-200/70 dark:border-neutral-800/60 flex flex-col"
                drag="x"
                dragConstraints={{ left: 0, right: 0 }}
                dragElastic={0.06}
                onDragEnd={(_, info) => {
                  if (info.offset.x > 80) setOpen(false);
                }}
              >
                {/* Header */}
                <div className="flex items-center justify-between px-4 py-2 border-b border-neutral-200/70 dark:border-neutral-800/60">
                  <h2
                    id="mobile-right-drawer-title"
                    className="text-base font-semibold"
                  >
                    {title}
                  </h2>
                  <button
                    type="button"
                    onClick={() => setOpen(false)}
                    aria-label="Close menu"
                    ref={
                      firstFocusableRef as React.MutableRefObject<HTMLButtonElement>
                    }
                    className="inline-flex items-center justify-center rounded-xl p-2 hover:bg-neutral-100 dark:hover:bg-neutral-900"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>

                {/* Content */}
                <nav className="flex-1 overflow-y-auto px-2 py-2">
                  <ul className="space-y-1">
                    {items.map((item, i) => {
                      const content = (
                        <div className="flex items-center gap-3 px-2 py-2 rounded-xl hover:bg-neutral-100 dark:hover:bg-neutral-900">
                          {item.icon}
                          <span className="flex-1 font-medium">
                            {item.label}
                          </span>
                        </div>
                      );

                      return (
                        <li key={i}>
                          {item.href ? (
                            <Link
                              href={item.href}
                              onClick={() => setOpen(false)}
                              className="block focus:outline-none focus-visible:ring-2 focus-visible:ring-neutral-400 rounded-xl"
                            >
                              {content}
                            </Link>
                          ) : (
                            <button
                              type="button"
                              onClick={() => {
                                item.onClick?.();
                                setOpen(false);
                              }}
                              className="w-full text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-neutral-400 rounded-xl"
                            >
                              {content}
                            </button>
                          )}
                        </li>
                      );
                    })}
                  </ul>
                </nav>

                {/* Footer (optional) */}
                <div className="px-4 py-4 border-t border-neutral-200/70 dark:border-neutral-800/60">
                  <button
                    onClick={() => setOpen(false)}
                    className="w-full rounded-xl bg-neutral-900 text-opp dark:bg-xopp dark:text-neutral-900 px-4 py-2 text-sm font-semibold shadow hover:opacity-95 active:scale-[0.99]"
                  >
                    Close
                  </button>
                </div>
              </motion.div>
            </motion.aside>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
