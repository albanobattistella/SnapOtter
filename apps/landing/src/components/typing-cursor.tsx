"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useCallback, useEffect, useState } from "react";

const phrases = [
  "Your images never leave your server. Novel concept, right?",
  "One Docker pull. That's the install guide.",
  "Runs offline. Even works during the apocalypse.",
  "Remove backgrounds. Upscale photos. No Photoshop required.",
  "Open source. Read every line if you'd like.",
  "No watermarks. No 'upgrade to unlock'. Just tools.",
  "We don't know what your images look like. And we'd like to keep it that way.",
  "Process a thousand images at once. Nobody's counting.",
  "Built by people who got tired of uploading images to strangers.",
  "Compress, resize, convert. Right from your browser.",
  "50 tools in a trenchcoat pretending to be one Docker container.",
  "Free forever. Not 'free trial' forever.",
  "No accounts. No tracking. No 'we value your privacy' banner.",
  "Works on a server. Works on a laptop. Works on a Raspberry Pi.",
  "Install once. Use forever. No subscription required.",
];

export function TypingCursor() {
  const [index, setIndex] = useState(0);

  const advance = useCallback(() => {
    setIndex((i) => (i + 1) % phrases.length);
  }, []);

  useEffect(() => {
    const timer = setInterval(advance, 3000);
    return () => clearInterval(timer);
  }, [advance]);

  return (
    <AnimatePresence mode="wait">
      <motion.span
        key={phrases[index]}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -10 }}
        transition={{ duration: 0.3 }}
        className="text-accent"
      >
        {phrases[index]}
      </motion.span>
    </AnimatePresence>
  );
}
