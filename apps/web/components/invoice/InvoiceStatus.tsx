'use client';

import React from 'react';
import { InvoiceStatus as StatusType } from '@/types';

interface InvoiceStatusProps {
  status: StatusType;
}

const statusColors: Record<StatusType, { bg: string; border: string; text: string; dot: string }> = {
  Created: {
    bg: 'bg-slate-500/5',
    border: 'border-slate-500/20',
    text: 'text-slate-400',
    dot: 'bg-slate-500',
  },
  Listed: {
    bg: 'bg-teal-500/5',
    border: 'border-teal-500/25',
    text: 'text-teal-400',
    dot: 'bg-teal-400',
  },
  Funded: {
    bg: 'bg-blue-500/5',
    border: 'border-blue-500/25',
    text: 'text-blue-400',
    dot: 'bg-blue-400',
  },
  Active: {
    bg: 'bg-indigo-500/5',
    border: 'border-indigo-500/25',
    text: 'text-indigo-400',
    dot: 'bg-indigo-400',
  },
  Confirmed: {
    bg: 'bg-sky-500/5',
    border: 'border-sky-500/25',
    text: 'text-sky-400',
    dot: 'bg-sky-400',
  },
  Repaid: {
    bg: 'bg-emerald-500/5',
    border: 'border-emerald-500/25',
    text: 'text-emerald-400',
    dot: 'bg-emerald-400',
  },
  Defaulted: {
    bg: 'bg-amber-500/5',
    border: 'border-amber-500/25',
    text: 'text-amber-400',
    dot: 'bg-amber-500',
  },
};

export function InvoiceStatus({ status }: InvoiceStatusProps) {
  const config = statusColors[status] || statusColors.Created;
  
  const isPulsing = status === 'Active' || status === 'Funded' || status === 'Listed';

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[10px] font-bold font-mono tracking-wider uppercase border ${config.bg} ${config.border} ${config.text}`}
    >
      <span className={`w-1.5 h-1.5 rounded-full ${config.dot} ${isPulsing ? 'animate-pulse' : ''}`} />
      {status}
    </span>
  );
}
