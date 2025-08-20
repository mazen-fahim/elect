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
  const [transactions, setTransactions] = useState([]);

  const fetchTransactions = async () => {
    try {
      const txs = await paymentApi.getTransactions();
      setTransactions(txs || []);
    } catch (e) {
      // Ignore silently for now
    }
  };

  useEffect(() => {
    fetchTransactions();
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
        window.location.href = url; // Redirect to Stripe Checkout
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
    <div className="max-w-2xl mx-auto bg-white rounded-xl shadow p-6">
      <h2 className="text-2xl font-bold mb-4">Wallet Top-up</h2>

      <form onSubmit={handleTopUp} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Amount (EGP)</label>
          <input
            type="number"
            min="1"
            step="1"
            value={amountEgp}
            onChange={(e) => setAmountEgp(e.target.value)}
            className="w-full px-4 py-2 border rounded-lg"
          />
        </div>
        {error && <p className="text-sm text-red-600">{error}</p>}
        <button
          type="submit"
          disabled={isLoading}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg disabled:opacity-60"
        >
          {isLoading ? 'Redirecting…' : 'Top up via Stripe'}
        </button>
      </form>

      <div className="mt-8">
        <h3 className="text-lg font-semibold mb-2">Recent Transactions</h3>
        {transactions.length === 0 ? (
          <p className="text-gray-500">No transactions yet.</p>
        ) : (
          <ul className="divide-y">
            {transactions.map((t) => (
              <li key={t.id} className="py-2 flex justify-between text-sm">
                <span>{t.description || 'Transaction'}</span>
                <span className="font-medium">EGP {Number(t.amount).toFixed(2)}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
};

export default Payment;
