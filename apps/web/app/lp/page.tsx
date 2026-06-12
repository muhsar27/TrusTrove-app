'use client';

import React, { useState } from 'react';
import { PageLayout } from '@/components/shared/PageLayout';
import { usePool } from '@/hooks/usePool';
import { useWalletStore } from '@/store/wallet';
import { WalletConnect } from '@/components/shared/WalletConnect';
import { Button } from '@/components/ui/button';
import { TransactionPending } from '@/components/shared/TransactionPending';
import { TrendingUp, Coins, Unlock, Percent, Landmark, Wallet, ShieldAlert, Sparkles, Activity } from 'lucide-react';
import { motion } from 'framer-motion';

export default function LPDashboard() {
  const { address, connected } = useWalletStore();
  const {
    stats,
    isStatsLoading,
    position,
    isPositionLoading,
    deposit,
    isDepositing,
    depositError,
    withdraw,
    isWithdrawing,
    withdrawError,
  } = usePool();

  const [depositAmount, setDepositAmount] = useState('');
  const [withdrawShares, setWithdrawShares] = useState('');
  const [localError, setLocalError] = useState<string | null>(null);
  
  // Pending Modal states
  const [showPending, setShowPending] = useState(false);
  const [pendingHash, setPendingHash] = useState<string | null>(null);
  const [pendingText, setPendingText] = useState('Waiting for confirmation...');

  const formatUSDC = (amount: bigint | undefined) => {
    if (amount === undefined) return '0.00 USDC';
    return (Number(amount) / 10_000_000).toLocaleString('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }) + ' USDC';
  };

  const handleDeposit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLocalError(null);
    const amountNum = Number(depositAmount);
    if (isNaN(amountNum) || amountNum <= 0) {
      setLocalError('Please enter a valid deposit amount');
      return;
    }
    
    setPendingText('Depositing USDC into pool...');
    setPendingHash(null);
    setShowPending(true);

    try {
      const amountStroops = BigInt(Math.floor(amountNum * 10_000_000));
      const res = await deposit({ amount: amountStroops });
      if (typeof res === 'string') {
        setPendingHash(res);
      }
      setDepositAmount('');
    } catch (err: any) {
      setLocalError(err.message || 'Deposit failed');
      setShowPending(false);
    }
  };

  const handleWithdraw = async (e: React.FormEvent) => {
    e.preventDefault();
    setLocalError(null);
    const sharesNum = Number(withdrawShares);
    if (isNaN(sharesNum) || sharesNum <= 0) {
      setLocalError('Please enter a valid shares amount to withdraw');
      return;
    }

    setPendingText('Redeeming LP shares for USDC...');
    setPendingHash(null);
    setShowPending(true);

    try {
      const sharesStroops = BigInt(Math.floor(sharesNum * 10_000_000));
      const res = await withdraw({ shares: sharesStroops });
      if (typeof res === 'string') {
        setPendingHash(res);
      }
      setWithdrawShares('');
    } catch (err: any) {
      setLocalError(err.message || 'Withdrawal failed');
      setShowPending(false);
    }
  };

  // Compute utilization colors
  const utilizationRate = stats ? Number(stats.utilizationRateBps) / 100 : 0;
  
  const getGaugeColor = (rate: number) => {
    if (rate < 50) return '#00d4aa'; // Teal
    if (rate < 80) return '#3b82f6'; // Blue
    if (rate < 95) return '#f59e0b'; // Amber
    return '#ef4444'; // Red
  };

  const gaugeColor = getGaugeColor(utilizationRate);

  if (!connected) {
    return (
      <PageLayout>
        <div className="flex flex-col items-center justify-center text-center py-20 max-w-md mx-auto min-h-[70vh]">
          <div className="bg-primary/10 border border-primary/20 p-4 rounded-lg mb-6 shadow-[0_0_20px_rgba(0,212,170,0.15)]">
            <Landmark className="w-12 h-12 text-primary" />
          </div>
          <h1 className="text-2xl font-bold font-mono tracking-wider text-white uppercase mb-2">Connect Your Wallet</h1>
          <p className="text-slate-400 text-xs font-mono mb-8 leading-relaxed">
            Connect your Freighter wallet to access the Liquidity Pool Portal, supply USDC, and earn yield.
          </p>
          <WalletConnect />
        </div>
      </PageLayout>
    );
  }

  // Previews
  const parsedDep = parseFloat(depositAmount) || 0;
  const depSharesPreview = parsedDep * 1.0; // Assumes 1:1 share price
  
  const parsedWith = parseFloat(withdrawShares) || 0;
  const withUsdcPreview = parsedWith * 1.0;

  return (
    <PageLayout>
      <div className="space-y-8 py-4">
        {/* Header */}
        <div className="border-b border-border/40 pb-5">
          <h1 className="text-xl font-bold font-mono tracking-wider uppercase text-white">Liquidity Provider Portal</h1>
          <p className="text-slate-500 text-xs font-mono mt-1">
            Supply USDC liquidity to automate invoice discounting and capture trade yield.
          </p>
        </div>

        {/* 2-Panel Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          
          {/* LEFT PANEL: Pool Overview */}
          <div className="lg:col-span-7 space-y-6">
            <div className="bg-card border border-border rounded-lg p-6 flex flex-col md:flex-row items-center gap-8 shadow-[0_0_20px_rgba(0,212,170,0.01)]">
              {/* Circular Gauge */}
              <div className="relative w-36 h-36 shrink-0 flex items-center justify-center">
                <svg className="w-full h-full -rotate-90">
                  <circle
                    cx="72"
                    cy="72"
                    r="58"
                    className="stroke-[#080c10] fill-transparent"
                    strokeWidth="8"
                  />
                  <motion.circle
                    cx="72"
                    cy="72"
                    r="58"
                    className="fill-transparent"
                    stroke={gaugeColor}
                    strokeWidth="8"
                    strokeDasharray={2 * Math.PI * 58}
                    initial={{ strokeDashoffset: 2 * Math.PI * 58 }}
                    animate={{ strokeDashoffset: 2 * Math.PI * 58 * (1 - utilizationRate / 100) }}
                    transition={{ duration: 1.2, ease: 'easeOut' }}
                    strokeLinecap="round"
                  />
                </svg>
                <div className="absolute flex flex-col items-center justify-center text-center font-mono">
                  <span className="text-2xl font-extrabold text-white">
                    {isStatsLoading ? '—' : `${utilizationRate.toFixed(1)}%`}
                  </span>
                  <span className="text-[8px] text-slate-500 font-bold uppercase tracking-wider">
                    UTILIZATION
                  </span>
                </div>
              </div>

              {/* Pool Details */}
              <div className="grid grid-cols-2 gap-6 w-full font-mono text-xs">
                <div>
                  <span className="text-[10px] text-slate-500 font-bold uppercase block">Total Deposits</span>
                  <span className="text-md font-bold text-white block mt-1">
                    {isStatsLoading ? 'Syncing...' : formatUSDC(stats?.totalDeposits)}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-500 font-bold uppercase block">Available Liquidity</span>
                  <span className="text-md font-bold text-primary block mt-1">
                    {isStatsLoading ? 'Syncing...' : formatUSDC(stats?.availableLiquidity)}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-500 font-bold uppercase block">Yield Distributed</span>
                  <span className="text-md font-bold text-emerald-400 block mt-1">
                    {isStatsLoading ? 'Syncing...' : formatUSDC(stats?.totalYieldDistributed)}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-500 font-bold uppercase block">Active Invoices</span>
                  <span className="text-md font-bold text-slate-300 block mt-1">
                    {isStatsLoading ? 'Syncing...' : `${stats?.activeInvoiceCount || 0} active`}
                  </span>
                </div>
              </div>
            </div>

            {/* Historical Yield Line Chart (SVG based) */}
            <div className="bg-card border border-border rounded-lg p-5 space-y-4">
              <h3 className="text-xs font-bold font-mono text-white uppercase tracking-wider flex items-center gap-1.5">
                <Activity className="w-3.5 h-3.5 text-primary" />
                Yield Performance Ledger
              </h3>
              
              <div className="h-44 w-full relative">
                {/* SVG Line Chart */}
                <svg className="w-full h-full" viewBox="0 0 500 150">
                  <defs>
                    <linearGradient id="chartGlow" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#00d4aa" stopOpacity="0.15" />
                      <stop offset="100%" stopColor="#00d4aa" stopOpacity="0" />
                    </linearGradient>
                  </defs>
                  {/* Grid Lines */}
                  <line x1="0" y1="30" x2="500" y2="30" stroke="#1a2330" strokeWidth="0.5" strokeDasharray="3 3" />
                  <line x1="0" y1="75" x2="500" y2="75" stroke="#1a2330" strokeWidth="0.5" strokeDasharray="3 3" />
                  <line x1="0" y1="120" x2="500" y2="120" stroke="#1a2330" strokeWidth="0.5" strokeDasharray="3 3" />
                  
                  {/* Area fill */}
                  <path
                    d="M 0 150 L 0 120 L 100 100 L 200 110 L 300 70 L 400 45 L 500 20 L 500 150 Z"
                    fill="url(#chartGlow)"
                  />
                  
                  {/* Line path */}
                  <motion.path
                    d="M 0 120 L 100 100 L 200 110 L 300 70 L 400 45 L 500 20"
                    fill="transparent"
                    stroke="#00d4aa"
                    strokeWidth="2"
                    initial={{ pathLength: 0 }}
                    animate={{ pathLength: 1 }}
                    transition={{ duration: 1.5, ease: 'easeInOut' }}
                  />
                </svg>

                {/* X Axis Labels */}
                <div className="flex justify-between mt-1 text-[9px] font-mono text-slate-500 uppercase tracking-widest px-2">
                  <span>Epoch 1 (Start)</span>
                  <span>Epoch 2</span>
                  <span>Epoch 3</span>
                  <span>Epoch 4</span>
                  <span>Current Epoch</span>
                </div>
              </div>
            </div>
          </div>

          {/* RIGHT PANEL: My Position */}
          <div className="lg:col-span-5 space-y-6">
            <div className="bg-[#0d131a] border border-border rounded-lg p-5 space-y-4">
              <h3 className="text-xs font-bold font-mono text-white uppercase tracking-wider border-b border-border/40 pb-2 flex items-center gap-1.5">
                <Wallet className="w-3.5 h-3.5 text-primary" />
                Active LP Position
              </h3>

              <div className="space-y-4 font-mono text-xs">
                <div>
                  <span className="text-[10px] text-slate-500 font-bold uppercase block">Current USDC Value</span>
                  <span className="text-xl font-bold text-white block mt-1">
                    {isPositionLoading ? 'Syncing...' : formatUSDC(position?.usdcValue)}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-4 border-t border-border/30 pt-3">
                  <div>
                    <span className="text-[10px] text-slate-500 font-bold uppercase block">Redeemable Shares</span>
                    <span className="text-sm font-bold text-slate-300 block mt-0.5">
                      {isPositionLoading ? '...' : (Number(position?.shares || 0n) / 10_000_000).toLocaleString(undefined, { minimumFractionDigits: 4 })}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-500 font-bold uppercase block">Yield Earned</span>
                    <span className="text-sm font-bold text-emerald-400 block mt-0.5">
                      {isPositionLoading ? '...' : formatUSDC(position?.yieldEarned)}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Deposit & Withdraw forms */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-1 gap-6">
              {/* Deposit Form */}
              <div className="bg-[#0d131a] border border-border rounded-lg p-5 space-y-4">
                <h4 className="text-xs font-bold font-mono text-white uppercase tracking-wider flex items-center gap-1.5">
                  <Coins className="w-4 h-4 text-emerald-400" />
                  Deposit USDC
                </h4>
                <form onSubmit={handleDeposit} className="space-y-3">
                  <div>
                    <label className="block text-[10px] font-bold font-mono text-slate-500 uppercase mb-1">
                      Supply Amount
                    </label>
                    <input
                      type="number"
                      step="1"
                      placeholder="10,000"
                      className="w-full bg-[#080c10] border border-border rounded px-3 py-1.5 text-white font-mono text-xs focus:outline-none focus:border-primary"
                      value={depositAmount}
                      onChange={(e) => setDepositAmount(e.target.value)}
                      disabled={isDepositing}
                      required
                    />
                    {parsedDep > 0 && (
                      <span className="text-[10px] font-mono text-slate-400 block mt-1.5 leading-tight">
                        Depositing {parsedDep.toLocaleString()} USDC → receive ~{depSharesPreview.toLocaleString()} LP Shares
                      </span>
                    )}
                  </div>
                  <Button
                    type="submit"
                    disabled={isDepositing}
                    className="w-full bg-primary hover:bg-primary-hover text-black font-bold uppercase text-xs tracking-wider rounded py-2 shadow-[0_0_15px_rgba(0,212,170,0.1)]"
                  >
                    {isDepositing ? 'DEPOSITING...' : 'DEPOSIT USDC'}
                  </Button>
                </form>
              </div>

              {/* Withdraw Form */}
              <div className="bg-[#0d131a] border border-border rounded-lg p-5 space-y-4">
                <h4 className="text-xs font-bold font-mono text-white uppercase tracking-wider flex items-center gap-1.5">
                  <Unlock className="w-4 h-4 text-indigo-400" />
                  Redeem Shares
                </h4>
                <form onSubmit={handleWithdraw} className="space-y-3">
                  <div>
                    <label className="block text-[10px] font-bold font-mono text-slate-500 uppercase mb-1">
                      Redeem Shares Count
                    </label>
                    <input
                      type="number"
                      step="0.0001"
                      placeholder="10,000"
                      className="w-full bg-[#080c10] border border-border rounded px-3 py-1.5 text-white font-mono text-xs focus:outline-none focus:border-primary"
                      value={withdrawShares}
                      onChange={(e) => setWithdrawShares(e.target.value)}
                      disabled={isWithdrawing}
                      required
                    />
                    {parsedWith > 0 && (
                      <span className="text-[10px] font-mono text-slate-400 block mt-1.5 leading-tight">
                        Redeeming {parsedWith.toLocaleString()} Shares → receive ~{withUsdcPreview.toLocaleString()} USDC
                      </span>
                    )}
                  </div>
                  <Button
                    type="submit"
                    disabled={isWithdrawing}
                    className="w-full bg-slate-900 border border-border hover:bg-slate-800 text-slate-300 font-bold uppercase text-xs tracking-wider rounded py-2"
                  >
                    {isWithdrawing ? 'REDEEMING...' : 'REDEEM SHARES'}
                  </Button>
                </form>
              </div>
            </div>

            {/* Error alerts */}
            {(localError || depositError || withdrawError) && (
              <div className="p-3 rounded bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs flex items-start gap-2 font-mono">
                <ShieldAlert className="w-4 h-4 shrink-0 mt-0.5" />
                <span>
                  {localError || depositError?.message || withdrawError?.message}
                </span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Transaction Pending Modal */}
      <TransactionPending
        isOpen={showPending}
        txHash={pendingHash}
        statusText={pendingText}
        onClose={pendingHash ? () => setShowPending(false) : undefined}
      />
    </PageLayout>
  );
}
