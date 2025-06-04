"use client"

import { useState } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, X, CalendarDays, Search, Bell, PlusSquare } from "lucide-react";
import { cn } from "@/lib/utils";

interface ActionButton {
  id: string;
  label: string;
  icon: React.ElementType;
  href: string;
  bgColor: string;
  textColor: string;
}

const FloatingActionButtonMenu: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);

  const toggleMenu = () => setIsOpen(!isOpen);

  const buttons: ActionButton[] = [
    { id: "add-location", label: "Add Location", icon: PlusSquare, href: "/add-location", bgColor: "bg-green-500", textColor: "text-white" },
    { id: "notifications", label: "Notifications", icon: Bell, href: "/notifications", bgColor: "bg-yellow-500", textColor: "text-white" },
    { id: "search", label: "Search", icon: Search, href: "/search", bgColor: "bg-blue-500", textColor: "text-white" },
    { id: "plans", label: "Hangout Plans", icon: CalendarDays, href: "/planner", bgColor: "bg-purple-500", textColor: "text-white" }, // Placeholder link
  ];

  const menuVariants = {
    closed: {
      scale: 0,
      opacity: 0,
      transition: {
        staggerChildren: 0.05,
        staggerDirection: -1,
        when: "afterChildren",
      },
    },
    open: {
      scale: 1,
      opacity: 1,
      transition: {
        staggerChildren: 0.07,
        delayChildren: 0.1,
      },
    },
  };

  const itemVariants = {
    closed: { x: 20, opacity: 0 },
    open: { x: 0, opacity: 1 },
  };

  return (
    <div className="fixed bottom-20 right-6 z-50 flex flex-col items-end">
      <AnimatePresence>
        {isOpen && (
          <motion.div
            variants={menuVariants}
            initial="closed"
            animate="open"
            exit="closed"
            className="flex flex-col items-end space-y-3 mb-3"
          >
            {buttons.map((button) => (
              <motion.div
                key={button.id}
                variants={itemVariants}
                className="flex items-center space-x-2"
                whileHover={{ scale: 1.1 }}
              >
                <span className="bg-gray-700 text-white text-xs px-2 py-1 rounded-md shadow-lg order-1">
                  {button.label}
                </span>
                <Link href={button.href} passHref legacyBehavior>
                  <a
                    onClick={() => setIsOpen(false)}
                    className={cn(
                      "w-12 h-12 rounded-full flex items-center justify-center shadow-lg hover:opacity-90 transition-opacity order-2",
                      button.bgColor,
                      button.textColor
                    )}
                  >
                    <button.icon className="w-6 h-6" />
                  </a>
                </Link>
              </motion.div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      <motion.button
        onClick={toggleMenu}
        className="w-16 h-16 rounded-full bg-pink-600 text-white flex items-center justify-center shadow-xl hover:bg-pink-700 transition-colors focus:outline-none focus:ring-2 focus:ring-pink-500 focus:ring-opacity-50"
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.9 }}
        aria-label={isOpen ? "Close menu" : "Open menu"}
        aria-expanded={isOpen}
      >
        <AnimatePresence initial={false} mode="wait">
          <motion.div
            key={isOpen ? "x" : "plus"}
            initial={{ rotate: isOpen ? -90 : 90, opacity: 0, scale: 0.5 }}
            animate={{ rotate: 0, opacity: 1, scale: 1 }}
            exit={{ rotate: isOpen ? 90 : -90, opacity: 0, scale: 0.5 }}
            transition={{ duration: 0.2 }}
          >
            {isOpen ? <X size={30} /> : <Plus size={30} />}
          </motion.div>
        </AnimatePresence>
      </motion.button>
    </div>
  );
};

export default FloatingActionButtonMenu; 