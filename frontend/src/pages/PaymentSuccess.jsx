import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { authApi } from '../services/api';

const PaymentSuccess = () => {
  const navigate = useNavigate();

  useEffect(() => {
    // If the user intended to create an election, set a flag so the dashboard opens the modal
    try {
      if (localStorage.getItem('afterPaymentOpenCreate') === '1') {
        localStorage.removeItem('afterPaymentOpenCreate');
        // Mark paid on the client to avoid re-checks
        localStorage.setItem('orgIsPaid', '1');
        // Redirect to organization dashboard (determine org id from current user)
        (async () => {
          try {
            const me = await authApi.getCurrentUser();
            const orgId = me?.organization_id ?? me?.id;
            if (orgId) {
              navigate(`/org/${orgId}/dashboard?openCreate=1`, { replace: true });
              return;
            }
          } catch {}
          // Fallback: go to root dashboard path if org id is unavailable
          navigate('/org/payment', { replace: true });
        })();
        return;
      }
    } catch {}
  }, [navigate]);

  return (
    <div className="max-w-xl mx-auto bg-white rounded-xl shadow p-6 text-center">
      <h2 className="text-2xl font-bold mb-2">Payment Successful</h2>
      <p className="text-gray-600">Your wallet has been topped up. You can now create elections or continue managing your dashboard.</p>
    </div>
  );
};

export default PaymentSuccess;
