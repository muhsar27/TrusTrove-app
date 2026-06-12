'use client';

import React, { useState } from 'react';
import { useInvoices } from '@/hooks/useInvoices';
import { Button } from '@/components/ui/button';
import { ShieldAlert, PlusCircle, Sparkles, Check, ArrowRight } from 'lucide-react';

interface InvoiceFormProps {
  onSuccess?: () => void;
}

export function InvoiceForm({ onSuccess }: InvoiceFormProps) {
  const { createInvoice, isCreating, listInvoice } = useInvoices();
  const [buyer, setBuyer] = useState('');
  const [faceValue, setFaceValue] = useState('');
  const [dueDays, setDueDays] = useState('60');
  const [discountBps, setDiscountBps] = useState(200); // default 2% (200 bps)
  const [immediateList, setImmediateList] = useState(true);
  
  const [error, setError] = useState<string | null>(null);
  const [step, setStep] = useState<1 | 2>(1); // Step 1: Input, Step 2: Sign Summary
  const [createdInvoiceId, setCreatedInvoiceId] = useState<string | null>(null);
  const [isListing, setIsListing] = useState(false);

  const parsedValue = parseFloat(faceValue.replace(/,/g, '')) || 0;
  
  // Calculations
  const discountPaid = parsedValue * (discountBps / 10000);
  const payoutAmount = parsedValue - discountPaid;

  const handleNextStep = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!buyer || buyer.length !== 56 || !buyer.startsWith('G')) {
      setError('Buyer must be a valid Stellar public key (56 characters, starting with G)');
      return;
    }

    if (parsedValue <= 0) {
      setError('Face value must be a positive number');
      return;
    }

    const days = parseInt(dueDays, 10);
    if (isNaN(days) || days <= 0) {
      setError('Due days must be at least 1 day in the future');
      return;
    }

    setStep(2);
  };

  const handleCreate = async () => {
    setError(null);
    try {
      const faceValueStroops = BigInt(Math.floor(parsedValue * 10_000_000)).toString();
      const dueDateTimestamp = Math.floor(Date.now() / 1000) + parseInt(dueDays, 10) * 24 * 60 * 60;

      // Transaction 1: Create
      const res = await createInvoice({
        buyer,
        faceValue: faceValueStroops,
        dueDate: dueDateTimestamp,
      });

      const invoiceId = res.invoice_id;
      setCreatedInvoiceId(invoiceId);

      // Transaction 2: Immediate List
      if (immediateList && invoiceId) {
        setIsListing(true);
        await listInvoice({
          invoiceId,
          discountBps,
        });
      }

      // Reset Form
      setBuyer('');
      setFaceValue('');
      setDueDays('60');
      setStep(1);
      
      if (onSuccess) {
        onSuccess();
      }
    } catch (err: any) {
      setError(err.message || 'Transaction failed');
    } finally {
      setIsListing(false);
    }
  };

  return (
    <div className="bg-card border border-border rounded-lg p-5">
      <div className="flex items-center gap-2 mb-4 border-b border-border/40 pb-3">
        <PlusCircle className="w-4 h-4 text-primary" />
        <h2 className="text-sm font-bold font-mono tracking-wider uppercase text-white">Create trade Invoice</h2>
      </div>

      {step === 1 ? (
        <form onSubmit={handleNextStep} className="space-y-4">
          {/* Buyer input */}
          <div className="space-y-1">
            <label className="block text-[10px] font-bold font-mono text-slate-500 uppercase tracking-wider">
              Buyer Wallet Address
            </label>
            <input
              type="text"
              placeholder="e.g. GBBD47IF6L... (Stellar Public Key)"
              className="w-full bg-[#080c10] border border-border rounded px-3 py-2 text-white text-xs font-mono focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all"
              value={buyer}
              onChange={(e) => setBuyer(e.target.value)}
              required
            />
          </div>

          {/* Value and Days */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="block text-[10px] font-bold font-mono text-slate-500 uppercase tracking-wider">
                Face Value (USDC)
              </label>
              <input
                type="number"
                step="0.01"
                placeholder="50,000.00"
                className="w-full bg-[#080c10] border border-border rounded px-3 py-2 text-white text-xs font-mono focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all"
                value={faceValue}
                onChange={(e) => setFaceValue(e.target.value)}
                required
              />
              {parsedValue > 0 && (
                <span className="text-[10px] font-mono text-slate-400 block mt-1">
                  = {parsedValue.toLocaleString('en-US', { minimumFractionDigits: 2 })} USDC
                </span>
              )}
            </div>

            <div className="space-y-1">
              <label className="block text-[10px] font-bold font-mono text-slate-500 uppercase tracking-wider">
                Due Days
              </label>
              <input
                type="number"
                placeholder="60"
                className="w-full bg-[#080c10] border border-border rounded px-3 py-2 text-white text-xs font-mono focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all"
                value={dueDays}
                onChange={(e) => setDueDays(e.target.value)}
                required
              />
              <span className="text-[10px] font-mono text-slate-500 block mt-1">
                Days until payment maturity
              </span>
            </div>
          </div>

          {/* Discount slider */}
          <div className="space-y-2 pt-2 border-t border-border/30">
            <div className="flex justify-between text-[10px] font-mono">
              <span className="text-slate-500 font-bold uppercase tracking-wider">Financing Discount Rate</span>
              <span className="text-primary font-bold">{(discountBps / 100).toFixed(2)}% ({discountBps} bps)</span>
            </div>
            <input
              type="range"
              min="50"
              max="500"
              step="10"
              value={discountBps}
              onChange={(e) => setDiscountBps(parseInt(e.target.value))}
              className="w-full accent-primary bg-slate-900 h-1.5 rounded"
            />
            <div className="flex justify-between text-[9px] text-slate-600 font-mono">
              <span>0.5% (50 bps)</span>
              <span>5.0% (500 bps)</span>
            </div>
          </div>

          {/* Immediate Listing option */}
          <div className="flex items-center gap-2 pt-2">
            <input
              type="checkbox"
              id="immediateList"
              className="rounded bg-[#080c10] border-border text-primary focus:ring-primary focus:ring-offset-0"
              checked={immediateList}
              onChange={(e) => setImmediateList(e.target.checked)}
            />
            <label htmlFor="immediateList" className="text-xs font-mono text-slate-400 cursor-pointer select-none">
              List for immediate LP financing at creation
            </label>
          </div>

          {error && (
            <div className="p-3 rounded bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs flex items-start gap-2">
              <ShieldAlert className="w-4 h-4 shrink-0 mt-0.5" />
              <span className="font-mono">{error}</span>
            </div>
          )}

          <Button
            type="submit"
            className="w-full bg-primary hover:bg-primary-hover text-black font-bold uppercase tracking-wider text-xs rounded py-2.5 shadow-[0_0_15px_rgba(0,212,170,0.1)]"
          >
            REVIEW FINANCING TERMS
          </Button>
        </form>
      ) : (
        // Step 2: Sign summary
        <div className="space-y-4 font-mono text-xs">
          <div className="bg-[#080c10] border border-border p-4 rounded-lg space-y-2">
            <div className="flex justify-between">
              <span className="text-slate-500">Invoice Face Value:</span>
              <span className="text-white font-bold">{parsedValue.toLocaleString()} USDC</span>
            </div>
            
            {immediateList ? (
              <>
                <div className="flex justify-between text-rose-400">
                  <span>Discount ({(discountBps / 100).toFixed(2)}%):</span>
                  <span>-{discountPaid.toLocaleString()} USDC</span>
                </div>
                <div className="border-t border-border/40 my-2 pt-2 flex justify-between text-emerald-400 font-bold">
                  <span>Net Payout Today:</span>
                  <span>{payoutAmount.toLocaleString()} USDC</span>
                </div>
                <div className="flex justify-between text-slate-400 text-[10px]">
                  <span>Buyer Repayment (due in {dueDays}d):</span>
                  <span>{parsedValue.toLocaleString()} USDC</span>
                </div>
              </>
            ) : (
              <div className="text-[10px] text-slate-400 pt-2 border-t border-border/20">
                Created with zero discount list terms. (Can configure financing later).
              </div>
            )}
          </div>

          <div className="bg-[#080c10] border border-amber-500/20 p-3 rounded text-[10px] text-amber-500 leading-normal">
            <span className="font-bold block uppercase mb-1">On-chain privacy note</span>
            Your invoice ID is generated on-chain. No commercial documents are stored on-chain — only invoice terms and addresses.
          </div>

          {error && (
            <div className="p-3 rounded bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs flex items-start gap-2">
              <ShieldAlert className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          <div className="flex gap-2">
            <Button
              className="flex-1 border border-border bg-transparent hover:bg-slate-900 text-slate-400 font-bold uppercase py-2"
              onClick={() => setStep(1)}
              disabled={isCreating || isListing}
            >
              EDIT
            </Button>
            <Button
              className="flex-1 bg-primary hover:bg-primary-hover text-black font-bold uppercase py-2 flex items-center justify-center gap-1.5 shadow-[0_0_15px_rgba(0,212,170,0.15)]"
              onClick={handleCreate}
              disabled={isCreating || isListing}
            >
              {isCreating || isListing ? 'SIGNING...' : 'SIGN & LIST'}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
