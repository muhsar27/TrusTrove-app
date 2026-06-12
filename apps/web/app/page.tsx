'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { TopStatusBar } from '@/components/shared/TopStatusBar';
import { Navbar } from '@/components/shared/Navbar';
import { InvoiceFeed } from '@/components/shared/InvoiceFeed';
import { DiscountCalculator } from '@/components/shared/DiscountCalculator';
import { useWalletStore } from '@/store/wallet';
import { useWallet } from '@/hooks/useWallet';
import { 
  ShieldCheck, 
  FileCheck2, 
  Layers, 
  ArrowRight, 
  Coins, 
  Compass, 
  HelpCircle, 
  Briefcase, 
  Database,
  ArrowRightLeft,
  ChevronRight,
  Landmark
} from 'lucide-react';
import { motion } from 'framer-motion';

export default function Home() {
  const { connected } = useWalletStore();
  const { connectWallet } = useWallet();

  // Quick Action Panel State
  const [quickAmount, setQuickAmount] = useState('25000');
  const [quickDays, setQuickDays] = useState('60');
  
  const parsedQuickAmt = parseFloat(quickAmount) || 0;
  const quickDiscountFee = parsedQuickAmt * 0.02; // Fixed 2% for quick action
  const quickPayout = parsedQuickAmt - quickDiscountFee;

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col selection:bg-primary selection:text-black">
      {/* Top Status Bar with scrolling ticker */}
      <TopStatusBar />
      
      {/* Main navigation */}
      <Navbar />

      {/* Hero Section */}
      <main className="flex-1 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 space-y-20 relative">
        {/* Subtle grid background pattern */}
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#1a2330_1px,transparent_1px),linear-gradient(to_bottom,#1a2330_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)] -z-10 opacity-20 pointer-events-none" />

        {/* 3-Column Split Hero */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 pt-4 items-start">
          
          {/* LEFT: Live Invoice Financing Feed */}
          <div className="lg:col-span-3 space-y-3">
            <InvoiceFeed />
            <div className="bg-[#0d131a] border border-border rounded-lg p-4 font-mono text-[10px] text-slate-500 leading-normal">
              <span className="text-primary font-bold block mb-1">STELLAR INTEGRATION</span>
              Every entry represents a cryptographically secure, on-chain event emitted by the Soroban network and synced by our indexer.
            </div>
          </div>

          {/* CENTER: Core Stats & Value Prop */}
          <div className="lg:col-span-5 text-center lg:text-left space-y-8 py-4 px-2">
            <div className="space-y-4">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-primary/10 border border-primary/20 text-primary text-[10px] font-bold font-mono tracking-widest uppercase rounded">
                DECENTRALIZED TRADE FINANCE
              </span>
              <h1 className="text-3xl sm:text-5xl font-extrabold tracking-tight text-white leading-tight font-mono uppercase">
                ELIMINATE THE <br className="hidden sm:inline" />
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-emerald-400">
                  $2.5 TRILLION
                </span> <br />
                TRADE FINANCE GAP
              </h1>
              <p className="text-slate-400 text-sm leading-relaxed max-w-xl">
                TrusTrove tokenizes outstanding trade obligations on Stellar. SMEs secure immediate working capital at fair rates, and liquidity providers earn direct yield.
              </p>
            </div>

            {/* Core Stats Row */}
            <div className="grid grid-cols-3 gap-4 border-t border-b border-border/40 py-6">
              <div className="text-center lg:text-left">
                <span className="text-xl sm:text-2xl font-bold font-mono text-white block">
                  12.4M
                </span>
                <span className="text-[10px] font-mono text-slate-500 uppercase font-bold tracking-wider block mt-1">
                  USDC POOL VALUE
                </span>
              </div>
              <div className="text-center lg:text-left">
                <span className="text-xl sm:text-2xl font-bold font-mono text-white block">
                  4,821
                </span>
                <span className="text-[10px] font-mono text-slate-500 uppercase font-bold tracking-wider block mt-1">
                  INVOICES FUNDED
                </span>
              </div>
              <div className="text-center lg:text-left">
                <span className="text-xl sm:text-2xl font-bold font-mono text-white block">
                  245.8K
                </span>
                <span className="text-[10px] font-mono text-slate-500 uppercase font-bold tracking-wider block mt-1">
                  YIELD DISTRIBUTED
                </span>
              </div>
            </div>

            <div className="text-xs font-mono text-slate-400 border-l-2 border-primary pl-3">
              &quot;From invoice to USDC in minutes. Not weeks.&quot;
            </div>
          </div>

          {/* RIGHT: Quick-Action Calculator Panel */}
          <div className="lg:col-span-4 bg-[#0d131a] border border-border rounded-lg p-5 space-y-4 shadow-[0_0_30px_rgba(0,212,170,0.02)]">
            <h3 className="text-xs font-bold font-mono text-white uppercase tracking-wider border-b border-border/40 pb-2 flex items-center justify-between">
              <span>FINANCE YOUR INVOICE</span>
              <span className="text-primary text-[10px]">2% DISC</span>
            </h3>

            <div className="space-y-4">
              <div className="space-y-1.5">
                <label className="block text-[10px] font-bold font-mono text-slate-500 uppercase">
                  Invoice Face Value (USDC)
                </label>
                <div className="relative">
                  <input
                    type="number"
                    value={quickAmount}
                    onChange={(e) => setQuickAmount(e.target.value)}
                    className="w-full bg-[#080c10] border border-border rounded px-3 py-2 text-white font-mono text-xs focus:outline-none focus:border-primary"
                    placeholder="25,000"
                  />
                  <span className="absolute right-3 top-2 text-[10px] font-mono text-slate-500">USDC</span>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="block text-[10px] font-bold font-mono text-slate-500 uppercase">
                  Maturity Term
                </label>
                <select
                  value={quickDays}
                  onChange={(e) => setQuickDays(e.target.value)}
                  className="w-full bg-[#080c10] border border-border rounded px-3 py-2 text-slate-300 font-mono text-xs focus:outline-none focus:border-primary"
                >
                  <option value="30">30 Days</option>
                  <option value="60">60 Days</option>
                  <option value="90">90 Days</option>
                </select>
              </div>

              {/* Real-time preview */}
              <div className="bg-[#080c10] border border-border/60 rounded p-3 text-xs font-mono space-y-2">
                <div className="flex justify-between">
                  <span className="text-slate-500">Financing Fee (2.0%):</span>
                  <span className="text-rose-400">-{quickDiscountFee.toLocaleString()} USDC</span>
                </div>
                <div className="flex justify-between border-t border-border/25 pt-2 font-bold text-emerald-400">
                  <span>Receive Today:</span>
                  <span>{quickPayout.toLocaleString()} USDC</span>
                </div>
              </div>

              {/* Call to Action */}
              {connected ? (
                <Link
                  href="/dashboard"
                  className="w-full bg-primary hover:bg-primary-hover text-black font-bold uppercase tracking-wider text-xs rounded py-2.5 flex items-center justify-center gap-1.5 shadow-[0_0_15px_rgba(0,212,170,0.15)] transition-all"
                >
                  <span>SUBMIT INVOICE DIRECTLY</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              ) : (
                <button
                  onClick={connectWallet}
                  className="w-full bg-primary hover:bg-primary-hover text-black font-bold uppercase tracking-wider text-xs rounded py-2.5 flex items-center justify-center gap-1.5 shadow-[0_0_15px_rgba(0,212,170,0.15)] transition-all"
                >
                  <Coins className="w-3.5 h-3.5" />
                  <span>CONNECT FREIGHTER TO START</span>
                </button>
              )}
            </div>
          </div>
        </div>

        {/* How It Works Timeline */}
        <div className="space-y-8 border-t border-border/30 pt-16">
          <div className="text-center space-y-2">
            <h2 className="text-xs font-bold font-mono text-primary uppercase tracking-widest">
              PROTOCOL WORKFLOW
            </h2>
            <p className="text-xl font-bold font-mono text-white uppercase">
              HOW TRUSTROVE ELIMINATES MIDDLEMEN
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 relative">
            {/* Step 1 */}
            <div className="bg-[#0d131a] border border-border p-5 rounded-lg relative space-y-3">
              <div className="w-8 h-8 rounded bg-primary/10 border border-primary/20 text-primary flex items-center justify-center mb-1">
                <ShieldCheck className="w-4 h-4" />
              </div>
              <h4 className="text-xs font-bold font-mono text-white uppercase tracking-wider">
                1. REGISTER AS SME
              </h4>
              <p className="text-[11px] text-slate-500 leading-relaxed">
                Verify your business identity on-chain via the registry contract to establish trusted credentials.
              </p>
            </div>

            {/* Step 2 */}
            <div className="bg-[#0d131a] border border-border p-5 rounded-lg relative space-y-3">
              <div className="w-8 h-8 rounded bg-primary/10 border border-primary/20 text-primary flex items-center justify-center mb-1">
                <FileCheck2 className="w-4 h-4" />
              </div>
              <h4 className="text-xs font-bold font-mono text-white uppercase tracking-wider">
                2. TOKENIZE INVOICE
              </h4>
              <p className="text-[11px] text-slate-500 leading-relaxed">
                Generate a unique invoice cryptographic hash on-chain representing your commercial shipment.
              </p>
            </div>

            {/* Step 3 */}
            <div className="bg-[#0d131a] border border-border p-5 rounded-lg relative space-y-3">
              <div className="w-8 h-8 rounded bg-primary/10 border border-primary/20 text-primary flex items-center justify-center mb-1">
                <Coins className="w-4 h-4" />
              </div>
              <h4 className="text-xs font-bold font-mono text-white uppercase tracking-wider">
                3. RECEIVE USDC LIQUIDITY
              </h4>
              <p className="text-[11px] text-slate-500 leading-relaxed">
                Pool contract immediately funds the invoice at the agreed discount rate directly into your wallet.
              </p>
            </div>

            {/* Step 4 */}
            <div className="bg-[#0d131a] border border-border p-5 rounded-lg relative space-y-3">
              <div className="w-8 h-8 rounded bg-primary/10 border border-primary/20 text-primary flex items-center justify-center mb-1">
                <Landmark className="w-4 h-4" />
              </div>
              <h4 className="text-xs font-bold font-mono text-white uppercase tracking-wider">
                4. BUYER MATURITY SETTLEMENT
              </h4>
              <p className="text-[11px] text-slate-500 leading-relaxed">
                Buyer pays full invoice face value to the pool upon due date, releasing escrow and yielding LP interest.
              </p>
            </div>
          </div>
        </div>

        {/* Three Protocol Pillars */}
        <div className="space-y-8 pt-8">
          <div className="text-center space-y-2">
            <h2 className="text-xs font-bold font-mono text-primary uppercase tracking-widest">
              SYSTEM ARCHITECTURE
            </h2>
            <p className="text-xl font-bold font-mono text-white uppercase">
              SOROBAN SMART CONTRACT PIPELINE
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 relative">
            {/* Pillar 1 */}
            <div className="bg-[#0d131a] border border-border p-6 rounded-lg space-y-4">
              <div className="flex items-center gap-2 border-b border-border/40 pb-3">
                <Database className="w-4 h-4 text-primary" />
                <h3 className="text-xs font-bold font-mono text-white uppercase tracking-wider">
                  REGISTRY_CONTRACT
                </h3>
              </div>
              <p className="text-xs text-slate-400 leading-relaxed">
                Manages decentralized profiles and KYC verification status for issuers and buyers.
              </p>
              <div className="bg-[#080c10] border border-border/40 p-2.5 rounded text-[10px] font-mono flex justify-between text-slate-500">
                <span>VERIFIED ISSUERS:</span>
                <span className="text-white font-bold">142 registered</span>
              </div>
            </div>

            {/* Pillar 2 */}
            <div className="bg-[#0d131a] border border-border p-6 rounded-lg space-y-4">
              <div className="flex items-center gap-2 border-b border-border/40 pb-3">
                <Layers className="w-4 h-4 text-primary" />
                <h3 className="text-xs font-bold font-mono text-white uppercase tracking-wider">
                  INVOICE_CONTRACT
                </h3>
              </div>
              <p className="text-xs text-slate-400 leading-relaxed">
                Stores tokenized invoices, discount rates, status lifecycle events, and compliance signatures.
              </p>
              <div className="bg-[#080c10] border border-border/40 p-2.5 rounded text-[10px] font-mono flex justify-between text-slate-500">
                <span>TOTAL OBLIGATIONS:</span>
                <span className="text-white font-bold">8,920 invoices</span>
              </div>
            </div>

            {/* Pillar 3 */}
            <div className="bg-[#0d131a] border border-border p-6 rounded-lg space-y-4">
              <div className="flex items-center gap-2 border-b border-border/40 pb-3">
                <ArrowRightLeft className="w-4 h-4 text-primary" />
                <h3 className="text-xs font-bold font-mono text-white uppercase tracking-wider">
                  POOL & ESCROW
                </h3>
              </div>
              <p className="text-xs text-slate-400 leading-relaxed">
                Controls USDC liquidity deposits, share-based yield parameters, and locks obligations securely in escrow.
              </p>
              <div className="bg-[#080c10] border border-border/40 p-2.5 rounded text-[10px] font-mono flex justify-between text-slate-500">
                <span>UTILIZATION RATE:</span>
                <span className="text-white font-bold">78.5% capacity</span>
              </div>
            </div>
          </div>
        </div>

        {/* Economic Calculator Section */}
        <div className="space-y-6 pt-8 pb-16">
          <div className="space-y-1">
            <h2 className="text-xs font-bold font-mono text-primary uppercase tracking-widest">
              FINANCIAL FEASIBILITY
            </h2>
            <p className="text-lg font-bold font-mono text-white uppercase">
              INTERACTIVE ECONOMIC COMPILER
            </p>
          </div>
          <DiscountCalculator />
        </div>
      </main>

      {/* Footer */}
      <footer className="w-full border-t border-border bg-[#080c10] py-8 text-center text-xs font-mono text-slate-600">
        <div className="max-w-7xl mx-auto px-4 flex flex-col md:flex-row items-center justify-between gap-4">
          <span>© 2026 TRUSTROVE PROTOCOL — VERIFIED TRADE FINANCE</span>
          <div className="flex gap-4">
            <a href="#" className="hover:text-primary transition-colors">SPECIFICATION</a>
            <a href="#" className="hover:text-primary transition-colors">STELLAR EXPERT</a>
            <a href="#" className="hover:text-primary transition-colors">DOCUMENTATION</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
