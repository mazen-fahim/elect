import React, { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { voterApi, dummyServiceApi } from '../services/api';

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
        
        console.log('=== STARTING OTP REQUEST FLOW ===');
        console.log('National ID:', nationalId);
        console.log('Election ID:', electionId);
        console.log('About to call dummy service API...');
        
        try {
            // Step 1: Call dummy service API directly to check voter eligibility
            console.log('Step 1: Calling dummy service API for voter verification...');
            console.log('API endpoint: /api/dummy-service/verify-voter/public');
            console.log('Request payload:', {
                voter_national_id: nationalId,
                election_id: parseInt(electionId),
                election_title: "Test Election"
            });
            
            // Make direct fetch call to dummy service to ensure it shows in network tab
            const dummyServiceUrl = 'http://localhost/api/proxy/dummy-service/verify-voter/public';
            const dummyServiceResponse = await fetch(dummyServiceUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    voter_national_id: nationalId,
                    election_id: parseInt(electionId),
                    election_title: "Test Election"
                })
            });
            
            if (!dummyServiceResponse.ok) {
                throw new Error(`Dummy service error: ${dummyServiceResponse.status}`);
            }
            
            const dummyServiceData = await dummyServiceResponse.json();
            console.log('Step 1 COMPLETED: Dummy service response:', dummyServiceData);
            
            if (!dummyServiceData.is_eligible) {
                throw new Error(dummyServiceData.error_message || 'Voter not eligible for this election');
            }
            
            console.log('Step 2: Voter verified by dummy service, requesting OTP from backend...');
            
            // Step 2: Send verification result to backend for OTP generation
            const otpResponse = await voterApi.requestOtp({ 
                electionId, 
                nationalId,
                phoneNumber: dummyServiceData.phone_number // Pass phone number from dummy service
            });
            
            console.log('Step 2 COMPLETED: OTP request successful:', otpResponse);
            setInfo('OTP sent. Please check your phone.');
            setStep(2);
        } catch (err) {
            console.error('ERROR in OTP request flow:', err);
            console.error('Error details:', {
                message: err?.message,
                response: err?.response,
                stack: err?.stack
            });
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


