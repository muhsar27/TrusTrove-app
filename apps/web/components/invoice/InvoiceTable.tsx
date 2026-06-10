import React from 'react';
import { Invoice } from '@/types';
import { InvoiceStatus } from './InvoiceStatus';

interface InvoiceTableProps {
  invoices: Invoice[];
  onSelectInvoice?: (invoice: Invoice) => void;
}

export function InvoiceTable({ invoices, onSelectInvoice }: InvoiceTableProps) {
  const formatUSDC = (amount: bigint) => {
    return (Number(amount) / 10_000_000).toLocaleString('en-US', {
      style: 'currency',
      currency: 'USD',
    });
  };

  const truncateAddr = (addr: string) => {
    if (!addr) return '';
    return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
  };

  return (
    <div className="bg-slate-900/40 border border-slate-800/80 backdrop-blur-md rounded-2xl overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-slate-800 bg-slate-950/20 text-xs font-semibold text-slate-400 uppercase tracking-wider">
              <th className="px-6 py-4">Invoice ID</th>
              <th className="px-6 py-4">Buyer</th>
              <th className="px-6 py-4">Face Value</th>
              <th className="px-6 py-4">Discount</th>
              <th className="px-6 py-4">Due Date</th>
              <th className="px-6 py-4">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/40 text-sm text-slate-300">
            {invoices.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-6 py-8 text-center text-slate-500">
                  No invoices found.
                </td>
              </tr>
            ) : (
              invoices.map((invoice) => (
                <tr
                  key={invoice.id}
                  onClick={() => onSelectInvoice?.(invoice)}
                  className={`hover:bg-slate-800/20 transition-all ${
                    onSelectInvoice ? 'cursor-pointer' : ''
                  }`}
                >
                  <td className="px-6 py-4 font-mono text-xs text-blue-400">
                    {truncateAddr(invoice.id)}
                  </td>
                  <td className="px-6 py-4 font-mono text-xs">
                    {truncateAddr(invoice.buyer)}
                  </td>
                  <td className="px-6 py-4 font-bold text-white">
                    {formatUSDC(invoice.faceValue)}
                  </td>
                  <td className="px-6 py-4">
                    {invoice.discountBps > 0
                      ? `${(invoice.discountBps / 100).toFixed(2)}%`
                      : '—'}
                  </td>
                  <td className="px-6 py-4">
                    {new Date(invoice.dueDate * 1000).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4">
                    <InvoiceStatus status={invoice.status} />
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
