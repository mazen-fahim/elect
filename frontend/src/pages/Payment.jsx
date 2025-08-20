import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { paymentApi, ApiError } from '../services/api';

// Convert EGP to piasters for Stripe
const toPiasters = (egp) => Math.round(Number(egp) * 100);
const DEFAULT_MIN_EGP = 30;

const Payment = () => {
  const navigate = useNavigate();
  const [amountEgp, setAmountEgp] = useState('100');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [mode, setMode] = useState('test');
  const [currency, setCurrency] = useState('EGP');
  const [productName, setProductName] = useState('Wallet Top-up');
  const [purpose, setPurpose] = useState('');
  const [isLocked, setIsLocked] = useState(false);
  const [maxAmount, setMaxAmount] = useState(null);
  const [minEgp, setMinEgp] = useState(DEFAULT_MIN_EGP);
  const [autoTriggered, setAutoTriggered] = useState(false);
  const [hasToken, setHasToken] = useState(false);

  // Load minimal payment config
  useEffect(() => {
    (async () => {
      try {
        const cfg = await paymentApi.getConfig();
        setMode(cfg?.mode || 'test');
        setCurrency(cfg?.currency || 'EGP');
        setProductName(cfg?.product_name || 'Wallet Top-up');
        if (cfg?.min_egp && !Number.isNaN(Number(cfg.min_egp))) {
          setMinEgp(Number(cfg.min_egp));
        }
      } catch {}
    })();
  }, []);

  // Prefill amount/purpose when coming from Create Election flow
  useEffect(() => {
    try {
      const params = new URLSearchParams(window.location.search);
      const a = params.get('amount');
      const purp = params.get('purpose');
      const voters = params.get('voters');
      const locked = params.get('locked');
      if (purp) setPurpose(purp);

  let initAmount = null;
  if (purp === 'election-voters' || locked === '1') {
        setIsLocked(true);
        let voterNum = 0;
        if (voters && !Number.isNaN(Number(voters))) {
          voterNum = Math.max(1, Number(voters));
        } else {
          try {
            const saved = localStorage.getItem('plannedVoters');
            if (saved && !Number.isNaN(Number(saved))) voterNum = Math.max(1, Number(saved));
          } catch {}
        }
        if (voterNum > 0) {
          const amt = voterNum * 0.001;
          initAmount = Number(amt.toFixed(3));
          if (initAmount < minEgp) initAmount = minEgp;
          setAmountEgp(String(initAmount));
          setProductName(`Election voter capacity for ${voterNum} voters`);
        } else if (a && !Number.isNaN(Number(a))) {
          const normalized = Math.max(Number(a), minEgp);
          initAmount = Number(normalized.toFixed(3));
          setAmountEgp(String(initAmount));
          setProductName('Election voter capacity');
        }
      } else if (a && !Number.isNaN(Number(a))) {
        const normalized = Math.max(Number(a), minEgp);
        initAmount = Number(normalized.toFixed(3));
        setAmountEgp(String(initAmount));
      }

      if (initAmount === null) {
        initAmount = Math.max(Number(amountEgp) || 100, minEgp);
      }
      // Set a maximum only in locked mode to prevent editing above precomputed value
      if (isLocked) setMaxAmount(initAmount);
    } catch {}
  }, [minEgp]);

  // Track auth token availability
  useEffect(() => {
    try {
      const t = localStorage.getItem('authToken');
      setHasToken(!!t);
    } catch {
      setHasToken(false);
    }
  }, []);

  // If coming from locked flow, auto-create session and redirect
  useEffect(() => {
    const run = async () => {
      if (!isLocked || autoTriggered) return;
      if (!hasToken) {
        const next = encodeURIComponent(window.location.pathname + window.location.search);
        navigate(`/login/org?next=${next}`, { replace: true });
        return;
      }
  const amt = Number(amountEgp);
  if (!amt || Number.isNaN(amt) || amt < minEgp) return;
      try {
        setAutoTriggered(true);
        setIsLoading(true);
        const { url } = await paymentApi.createCheckoutSession(toPiasters(amt));
        if (url) window.location.href = url;
        else setError('Failed to start checkout session.');
      } catch (err) {
        if (err instanceof ApiError) setError(err.message);
        else setError('Something went wrong.');
      } finally {
        setIsLoading(false);
      }
    };
    run();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLocked, amountEgp, autoTriggered, hasToken]);

  const handleTopUp = async (e) => {
    if (e && e.preventDefault) e.preventDefault();
    setIsLoading(true);
    setError('');
    try {
      if (!hasToken) {
        const next = encodeURIComponent(window.location.pathname + window.location.search);
        navigate(`/login/org?next=${next}`, { replace: true });
        return;
      }
      const amt = Number(amountEgp);
  if (!amt || Number.isNaN(amt) || amt < minEgp) {
        setError(`Enter at least EGP ${minEgp}.`);
        setIsLoading(false);
        return;
      }
      const { url } = await paymentApi.createCheckoutSession(toPiasters(amt));
      if (url) window.location.href = url;
      else setError('Failed to start checkout session.');
    } catch (err) {
      if (err instanceof ApiError) setError(err.message);
      else setError('Something went wrong.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto p-6">
      {mode !== 'live' && (
        <div className="mb-4 text-xs font-semibold text-amber-700 bg-amber-100 border border-amber-200 px-3 py-1 rounded inline-block">
          TEST MODE
        </div>
      )}

      <div className="bg-white rounded-2xl shadow border border-gray-200 p-6 md:p-8">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">{productName}</h2>
        <div className="space-y-4">
          <div>
            <label className="block text-sm text-gray-600 mb-1">Amount ({currency}) {isLocked ? <span className="ml-1 text-xs text-gray-500">(locked)</span> : <span className="ml-1 text-xs text-gray-500">(min {currency} {minEgp}{maxAmount !== null ? `, max ${currency} ${Number(maxAmount).toFixed(2)}` : ''})</span>}</label>
            <input
              type="number"
              min={minEgp}
              step="0.01"
              value={amountEgp}
              onChange={(e) => {
                if (!isLocked) {
                  const raw = e.target.value;
                  let num = Number(raw);
                  if (Number.isNaN(num)) num = minEgp;
                  if (num < minEgp) num = minEgp;
                  if (maxAmount !== null && num > Number(maxAmount)) num = Number(maxAmount);
                  setAmountEgp(String(num));
                }
              }}
              className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
              disabled={isLocked}
              readOnly={isLocked}
              max={maxAmount !== null ? Number(maxAmount) : undefined}
            />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-bold text-gray-900">{currency} {Number(amountEgp || 0).toFixed(2)}</span>
          </div>
          <p className="text-sm text-gray-500">
            {purpose === 'election-voters'
              ? 'This payment will cover the voter capacity for your upcoming election.'
              : 'Top up your wallet to create and manage elections.'}
          </p>

          {error && <p className="text-sm text-red-600">{error}</p>}

          <button
            onClick={handleTopUp}
            disabled={isLoading}
            className="w-full py-3 bg-blue-600 text-white rounded-lg font-medium disabled:opacity-60"
          >
            {isLoading ? 'Processing…' : `Proceed to Stripe Checkout`}
          </button>

          <p className="text-xs text-gray-500 text-center mt-2">
            Powered by <span className="font-semibold">Stripe</span> ·
            <a className="underline ml-1" href="https://stripe.com/legal" target="_blank" rel="noreferrer">Terms</a>
            <span> · </span>
            <a className="underline" href="https://stripe.com/privacy" target="_blank" rel="noreferrer">Privacy</a>
          </p>
        </div>
      </div>
    </div>
  );
};

export default Payment;
