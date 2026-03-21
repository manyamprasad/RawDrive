import { useState } from 'react';
import { Button } from './ui/Button';
import { Input } from './ui/Input';
import { motion } from 'motion/react';

interface PaymentDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (details: { referenceId: string, mobileNumber: string, email: string, expiryTime: string }) => void;
}

export function PaymentDialog({ isOpen, onClose, onConfirm }: PaymentDialogProps) {
  const [details, setDetails] = useState({ referenceId: '', mobileNumber: '', email: '', expiryTime: '' });

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-full max-w-md bg-white dark:bg-zinc-900 rounded-2xl shadow-xl overflow-hidden"
      >
        <div className="p-6">
          <h2 className="text-xl font-semibold mb-4">Enter Payment Details</h2>
          <div className="space-y-4">
            <Input placeholder="Reference ID" value={details.referenceId} onChange={(e) => setDetails({...details, referenceId: e.target.value})} />
            <Input placeholder="Mobile Number" value={details.mobileNumber} onChange={(e) => setDetails({...details, mobileNumber: e.target.value})} />
            <Input placeholder="Email" value={details.email} onChange={(e) => setDetails({...details, email: e.target.value})} />
            <Input type="datetime-local" placeholder="Expiry Time" value={details.expiryTime} onChange={(e) => setDetails({...details, expiryTime: e.target.value})} />
          </div>
          <div className="flex justify-end gap-3 mt-6">
            <Button variant="ghost" onClick={onClose}>Cancel</Button>
            <Button onClick={() => onConfirm(details)}>Create Payment Link</Button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
