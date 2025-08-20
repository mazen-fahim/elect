import React, { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { voterApi } from '../services/api';

let VoterLogin = () => {
    let { electionId } = useParams();
    let navigate = useNavigate();

    let [step, setStep] = useState(1);
    let [nationalId, setNationalId] = useState('');
    let [otpCode, setOtpCode] = useState('');
    let [submitting, setSubmitting] = useState(false);
    let [error, setError] = useState('');
    let [info, setInfo] = useState('');

    let handleRequestOtp = async (e) => {
        e.preventDefault();
        setSubmitting(true);
        setError('');
        setInfo('');
        try {
            // Only send national ID, phone number will be retrieved from database
            await voterApi.requestOtp({ electionId, nationalId });
            setInfo('OTP sent. Please check your phone.');
            setStep(2);
        } catch (err) {
            setError(err?.message || 'Failed to request OTP');
        } finally {
            setSubmitting(false);
        }
    };

    let handleVerifyOtp = async (e) => {
        e.preventDefault();
        setSubmitting(true);
        setError('');
        setInfo('');
        try {
            const response = await voterApi.verifyOtp({ electionId, code: otpCode, nationalId });
            
            // Redirect to voting page with voter information
            navigate(`/vote/${electionId}/voting`, { 
                replace: true,
                state: { 
                    voterInfo: {
                        voter_hashed_national_id: response.voter_hashed_national_id,
                        election_id: response.election_id
                    }
                }
            });
        } catch (err) {
            setError(err?.message || 'Invalid or expired OTP');
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center px-4">
            <div className="w-full max-w-md bg-white rounded-xl shadow-lg p-6">
                <h1 className="text-2xl font-semibold text-gray-900 mb-1">Voter Login</h1>
                <p className="text-sm text-gray-600 mb-6">Election #{electionId}</p>

                {step === 1 && (
                    <form onSubmit={handleRequestOtp} className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">National ID</label>
                            <input
                                type="text"
                                value={nationalId}
                                onChange={(e) => setNationalId(e.target.value)}
                                required
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                placeholder="Enter your national ID"
                            />
                            <p className="text-xs text-gray-500 mt-1">
                                Enter your national ID to receive an OTP on your registered phone number
                            </p>
                        </div>
                        {error && (
                            <div className="text-sm text-red-600">{error}</div>
                        )}
                        {info && (
                            <div className="text-sm text-green-600">{info}</div>
                        )}
                        <button
                            type="submit"
                            disabled={submitting}
                            className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                        >
                            {submitting ? 'Sending OTP...' : 'Send OTP'}
                        </button>
                    </form>
                )}

                {step === 2 && (
                    <form onSubmit={handleVerifyOtp} className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Verification Code</label>
                            <input
                                type="text"
                                value={otpCode}
                                onChange={(e) => setOtpCode(e.target.value)}
                                required
                                maxLength={6}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 tracking-widest text-center"
                                placeholder="123456"
                            />
                            <p className="text-xs text-gray-500 mt-1">
                                Enter the 6-digit code sent to your phone
                            </p>
                        </div>
                        {error && (
                            <div className="text-sm text-red-600">{error}</div>
                        )}
                        <div className="flex gap-2">
                            <button
                                type="button"
                                onClick={() => setStep(1)}
                                className="px-4 py-2 bg-gray-200 rounded-lg hover:bg-gray-300"
                            >
                                Back
                            </button>
                            <button
                                type="submit"
                                disabled={submitting}
                                className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
                            >
                                {submitting ? 'Verifying...' : 'Verify'}
                            </button>
                        </div>
                    </form>
                )}
            </div>
        </div>
    );
};

export default VoterLogin;


