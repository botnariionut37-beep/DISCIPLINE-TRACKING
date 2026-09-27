/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect } from 'react';
import { Quote } from '../types';
import { getRandomQuote } from '../utils/quotes';
import { Quote as QuoteIcon, RefreshCw } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface StoicQuoteViewerProps {
  currentWeekKey: string;
}

export default function StoicQuoteViewer({ currentWeekKey }: StoicQuoteViewerProps) {
  const [quote, setQuote] = useState<Quote>(() => getRandomQuote(currentWeekKey));

  useEffect(() => {
    // Sync quote to week selected (stable per week/key)
    setQuote(getRandomQuote(currentWeekKey));
  }, [currentWeekKey]);

  const handleRefresh = () => {
    let newQuote = getRandomQuote();
    while (newQuote.text === quote.text) {
      newQuote = getRandomQuote();
    }
    setQuote(newQuote);
  };

  return (
    <div 
      className="p-6 rounded-3xl border border-white/5 bg-[#0C0E12] flex flex-col justify-between relative overflow-hidden h-full"
      id="stoic-quote-card"
    >
      <div className="absolute top-4 right-4 text-white pointer-events-none">
        <QuoteIcon size={56} className="opacity-[0.03]" />
      </div>

      <div>
        <div className="flex items-center gap-2 mb-4">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
          <h4 className="text-gray-500 font-mono text-[10px] uppercase tracking-[0.2em] font-semibold">
            Daily Reflection
          </h4>
        </div>

        <AnimatePresence mode="wait">
          <motion.div
            key={quote.text}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.3 }}
            className="pr-6"
          >
            <p className="text-gray-300 font-serif text-base italic leading-relaxed">
              "{quote.text}"
            </p>
            <p className="text-gray-500 font-mono text-[10px] uppercase tracking-wider mt-3">
              — {quote.author}
            </p>
          </motion.div>
        </AnimatePresence>
      </div>

      <div className="mt-6 flex justify-end">
        <button
          onClick={handleRefresh}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-white/10 text-gray-400 hover:text-white hover:bg-white/5 hover:border-white/20 text-xs font-mono font-medium transition-all cursor-pointer"
          id="refresh-quote-btn"
          title="Gather new motivation"
        >
          <RefreshCw size={11} />
          <span>Contemplate</span>
        </button>
      </div>
    </div>
  );
}
