import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { paymentApi, ApiError } from '../services/api';

// Amount helper: 1 EGP = 100 piasters
const toPiasters = (egp) => Math.round(Number(egp) * 100);

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
  const [cardNumber, setCardNumber] = useState('');
  const [exp, setExp] = useState('');
  const [cvc, setCvc] = useState('');
  const [zip, setZip] = useState('');

  const formatCardNumber = (val) => {
    const digits = String(val || '').replace(/\D/g, '').slice(0, 16); // max 16 digits
    const groups = digits.match(/.{1,4}/g) || [];
    return groups.join(' ');
  };

  const handleCardNumberChange = (e) => {
    setCardNumber(formatCardNumber(e.target.value));
  };

  const formatExp = (val) => {
    let digits = String(val || '').replace(/\D/g, '').slice(0, 4);
    if (!digits) return '';
    let mm = digits.slice(0, 2);
    let yy = digits.slice(2, 4);
    // Normalize month while typing
    if (mm.length === 1) {
      const d = Number(mm);
      if (d > 1) mm = `0${d}`; // e.g., 3 -> 03
    } else if (mm.length === 2) {
      let m = Number(mm);
      if (m <= 0) mm = '01';
      else if (m > 12) mm = '12';
    }
    return yy ? `${mm}/${yy}` : mm;
  };

  const handleExpChange = (e) => {
    setExp(formatExp(e.target.value));
  };

  const handleCvcChange = (e) => {
    const digits = String(e.target.value || '').replace(/\D/g, '').slice(0, 3);
    setCvc(digits);
  };

  const handleZipChange = (e) => {
    const letters = String(e.target.value || '').replace(/[^a-zA-Z]/g, '').slice(0, 3).toUpperCase();
    setZip(letters);
  };

  useEffect(() => {
    (async () => {
      try {
        const cfg = await paymentApi.getConfig();
        setMode(cfg?.mode || 'test');
        setCurrency(cfg?.currency || 'EGP');
        setProductName(cfg?.product_name || 'Wallet Top-up');
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
      if (purp) setPurpose(purp);

      if (purp === 'election-voters') {
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
          const amt = voterNum * 0.001; // price per voter
          const fixed = amt.toFixed(3);
          setAmountEgp(String(Number(fixed)));
          setProductName(`Election voter capacity (${voterNum} voters)`);
        } else if (a && !Number.isNaN(Number(a))) {
          const normalized = Math.max(Number(a), 0.01);
          const fixed = normalized.toFixed(3);
          setAmountEgp(String(Number(fixed)));
          setProductName('Election voter capacity');
        }
      } else if (a && !Number.isNaN(Number(a))) {
        // Non-locked top-ups can still be prefilled
        const normalized = Math.max(Number(a), 0.01);
        const fixed = normalized.toFixed(3);
        setAmountEgp(String(Number(fixed)));
      }
    } catch {}
  }, []);

  const handleTopUp = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');
    try {
      const amount = toPiasters(amountEgp);
      if (!amount || amount <= 0) {
        setError('Enter a valid amount in EGP.');
        setIsLoading(false);
        return;
      }
      const { url } = await paymentApi.createCheckoutSession(amount);
      if (url) {
        window.location.href = url; // Redirect to Stripe Checkout or dev success
      } else {
        setError('Failed to start checkout session.');
      }
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message);
      } else {
        setError('Something went wrong.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-6">
      {/* TEST MODE banner */}
      {mode !== 'live' && (
        <div className="mb-4 text-xs font-semibold text-amber-700 bg-amber-100 border border-amber-200 px-3 py-1 rounded inline-block">
          TEST MODE
        </div>
      )}

      <div className="bg-white rounded-2xl shadow border border-gray-200 overflow-hidden grid grid-cols-1 md:grid-cols-2">
        {/* Left: Product */}
        <div className="p-6 md:p-8 bg-gradient-to-br from-slate-50 to-white">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">{productName}</h2>
          <div className="space-y-4">
            <div>
              <label className="block text-sm text-gray-600 mb-1">Amount ({currency}) {isLocked && <span className="ml-1 text-xs text-gray-500">(locked)</span>}</label>
              <input
                type="number"
                min="0.01"
                step="0.01"
                value={amountEgp}
                onChange={(e) => {
                  if (!isLocked) setAmountEgp(e.target.value);
                }}
                className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                disabled={isLocked}
                readOnly={isLocked}
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
          </div>
        </div>

        {/* Right: Payment form (Stripe-like) */}
        <div className="p-6 md:p-8">
          <form onSubmit={handleTopUp} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Card information</label>
              <div className="space-y-2">
                <div className="flex items-center border rounded-lg overflow-hidden">
                  <input
                    type="text"
                    inputMode="numeric"
                    autoComplete="cc-number"
                    placeholder="1234 1234 1234 1234"
                    value={cardNumber}
                    onChange={handleCardNumberChange}
                    className="flex-1 px-4 py-2 outline-none"
                    aria-label="Card number"
                    maxLength={19}
                  />
                  <div className="px-3 flex items-center gap-2 text-gray-400">
                    {/* Visa icon */}
                    <svg width="28" height="18" viewBox="0 0 48 32" xmlns="http://www.w3.org/2000/svg">
                      <rect width="48" height="32" rx="4" fill="#1A1F71"/>
                      <text x="50%" y="55%" dominantBaseline="middle" textAnchor="middle" fontSize="12" fill="#fff" fontFamily="Arial, sans-serif">VISA</text>
                    </svg>
                    {/* MasterCard icon */}
                    <svg width="28" height="18" viewBox="0 0 48 32" xmlns="http://www.w3.org/2000/svg">
                      <rect width="48" height="32" rx="4" fill="#fff" stroke="#e5e7eb"/>
                      <circle cx="20" cy="16" r="8" fill="#EB001B"/>
                      <circle cx="28" cy="16" r="8" fill="#F79E1B"/>
                    </svg>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <input
                    type="text"
                    inputMode="numeric"
                    autoComplete="cc-exp"
                    placeholder="MM/YY"
                    className="px-4 py-2 border rounded-lg"
                    aria-label="Expiration date"
                    value={exp}
                    onChange={handleExpChange}
                    maxLength={5}
                    pattern="^(0[1-9]|1[0-2])\/[0-9]{2}$"
                  />
                  <input
                    type="text"
                    inputMode="numeric"
                    autoComplete="cc-csc"
                    placeholder="CVC"
                    className="px-4 py-2 border rounded-lg"
                    aria-label="CVC"
                    value={cvc}
                    onChange={handleCvcChange}
                    maxLength={3}
                    pattern="^[0-9]{3}$"
                  />
                </div>
              </div>
              {mode !== 'live' && (
                <p className="mt-2 text-xs text-gray-500">Test mode: use card 4242 4242 4242 4242, any future date, any CVC, any ZIP.</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Cardholder name</label>
              <input type="text" required className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500" placeholder="Full name on card" />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">ZIP</label>
              <input
                type="text"
                inputMode="text"
                className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                placeholder="ZIP"
                aria-label="ZIP"
                value={zip}
                onChange={handleZipChange}
                maxLength={3}
                pattern="^[A-Za-z]{3}$"
                title="Enter 3 letters"
              />
            </div>

            {error && <p className="text-sm text-red-600">{error}</p>}

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-3 bg-blue-600 text-white rounded-lg font-medium disabled:opacity-60"
            >
              {isLoading ? 'Processing…' : `Pay ${currency} ${Number(amountEgp || 0).toFixed(0)}`}
            </button>

            <p className="text-xs text-gray-500 text-center mt-2">
              Powered by <span className="font-semibold">Stripe</span> ·
              <a className="underline ml-1" href="https://stripe.com/legal" target="_blank" rel="noreferrer">Terms</a>
              <span> · </span>
              <a className="underline" href="https://stripe.com/privacy" target="_blank" rel="noreferrer">Privacy</a>
            </p>
          </form>
        </div>
      </div>
    </div>
  );
};

export default Payment;
