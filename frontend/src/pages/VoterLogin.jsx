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
    let [generatedOtp, setGeneratedOtp] = useState('');

    let handleRequestOtp = async (e) => {
        e.preventDefault();
        setSubmitting(true);
        setError('');
        setInfo('');
        setGeneratedOtp('');
        
        console.log('=== STARTING OTP REQUEST FLOW ===');
        console.log('National ID:', nationalId);
        console.log('Election ID:', electionId);
        
        try {
            // First, check if this is an API-based election or CSV-based election
            console.log('Step 1: Checking election type...');
            const electionResponse = await fetch(`/api/home/elections/${electionId}`);
            if (!electionResponse.ok) {
                throw new Error('Failed to fetch election details');
            }
            
            const election = await electionResponse.json();
            console.log('Election details:', election);
            
            if (election.method === 'api' && election.api_endpoint) {
                // API-based election: use dummy service first
                console.log('Step 2: API-based election - checking voter eligibility with dummy service...');
                
                const dummyServiceUrl = 'http://localhost/api/proxy/dummy-service/verify-voter/public';
                const dummyServiceResponse = await fetch(dummyServiceUrl, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        voter_national_id: nationalId,
                        election_id: parseInt(electionId),
                        election_title: election.title
                    })
                });
                
                if (!dummyServiceResponse.ok) {
                    throw new Error(`Dummy service error: ${dummyServiceResponse.status}`);
                }
                
                const dummyServiceData = await dummyServiceResponse.json();
                console.log('Step 2 COMPLETED: Dummy service response:', dummyServiceData);
                
                if (!dummyServiceData.is_eligible) {
                    throw new Error(dummyServiceData.error_message || 'Voter not eligible for this election');
                }
                
                console.log('Step 3: Voter verified by dummy service, requesting OTP from backend...');
                
                // Step 3: Send verification result to backend for OTP generation
                const otpResponse = await voterApi.requestOtp({ 
                    electionId, 
                    nationalId,
                    phoneNumber: dummyServiceData.phone_number // Pass phone number from dummy service
                });
                
                console.log('Step 3 COMPLETED: OTP request successful:', otpResponse);
                setInfo('OTP sent. Please check your phone.');
                setGeneratedOtp(otpResponse.otp_code);
                setStep(2);
            } else {
                // CSV-based election: directly request OTP from backend
                console.log('Step 2: CSV-based election - directly requesting OTP from backend...');
                
                const otpResponse = await voterApi.requestOtp({ 
                    electionId, 
                    nationalId
                    // No phoneNumber needed for CSV elections - backend will use stored phone
                });
                
                console.log('Step 2 COMPLETED: OTP request successful:', otpResponse);
                setInfo('OTP sent. Please check your phone.');
                setGeneratedOtp(otpResponse.otp_code);
                setStep(2);
            }
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
        setGeneratedOtp('');
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
                        {/* Testing: Show OTP prominently */}
                        {generatedOtp && (
                            <div className="bg-yellow-100 border border-yellow-400 text-yellow-800 px-4 py-3 rounded-lg">
                                <div className="font-bold text-lg mb-2">🧪 TESTING MODE</div>
                                <div className="text-2xl font-mono text-center bg-yellow-200 p-3 rounded border-2 border-yellow-500">
                                    {generatedOtp}
                                </div>
                                <div className="text-sm mt-2 text-center mb-3">
                                    ⚠️ This OTP is displayed for testing purposes only
                                </div>
                                <button
                                    type="button"
                                    onClick={() => navigator.clipboard.writeText(generatedOtp)}
                                    className="w-full bg-yellow-500 hover:bg-yellow-600 text-white font-bold py-2 px-4 rounded"
                                >
                                    📋 Copy OTP to Clipboard
                                </button>
                            </div>
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
                            {/* Testing: Auto-fill OTP button */}
                            {generatedOtp && (
                                <button
                                    type="button"
                                    onClick={() => setOtpCode(generatedOtp)}
                                    className="w-full mt-2 bg-green-500 hover:bg-green-600 text-white font-bold py-2 px-4 rounded text-sm"
                                >
                                    🔐 Auto-fill OTP for Testing
                                </button>
                            )}
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


