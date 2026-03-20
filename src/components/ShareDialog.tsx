import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Copy, Check, QrCode, Link as LinkIcon } from 'lucide-react';
import QRCode from 'react-qr-code';
import { Button } from '@/components/ui/Button';

interface ShareDialogProps {
  isOpen: boolean;
  onClose: () => void;
  url: string;
  title: string;
}

export function ShareDialog({ isOpen, onClose, url, title }: ShareDialogProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy text: ', err);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50"
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-md bg-white dark:bg-zinc-900 rounded-2xl shadow-2xl z-50 overflow-hidden border border-zinc-200 dark:border-zinc-800"
          >
            <div className="flex items-center justify-between p-4 border-b border-zinc-100 dark:border-zinc-800">
              <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
                <QrCode className="w-5 h-5" />
                Share Album
              </h3>
              <button
                onClick={onClose}
                className="p-2 text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100 transition-colors rounded-full hover:bg-zinc-100 dark:hover:bg-zinc-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 flex flex-col items-center">
              <div className="bg-white p-4 rounded-xl shadow-sm border border-zinc-200 mb-6">
                <QRCode value={url} size={200} />
              </div>
              
              <p className="text-center text-zinc-600 dark:text-zinc-400 mb-6 font-medium">
                {title}
              </p>

              <div className="w-full">
                <label className="text-xs font-medium text-zinc-500 dark:text-zinc-400 uppercase tracking-wider mb-2 block">
                  Share Link
                </label>
                <div className="flex items-center gap-2 bg-zinc-50 dark:bg-zinc-950 p-1 pl-3 rounded-lg border border-zinc-200 dark:border-zinc-800">
                  <LinkIcon className="w-4 h-4 text-zinc-400 shrink-0" />
                  <input
                    type="text"
                    readOnly
                    value={url}
                    className="bg-transparent border-none outline-none text-sm text-zinc-700 dark:text-zinc-300 w-full truncate"
                  />
                  <Button
                    variant={copied ? "primary" : "secondary"}
                    size="sm"
                    onClick={handleCopy}
                    className="shrink-0"
                  >
                    {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                  </Button>
                </div>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
