import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { X, Shield, Check, AlertCircle, Loader2 } from 'lucide-react';
import CandidateCard from './CandidateCard';
import { webSocketService } from '../services/websocket';

const VoterAuthForm = ({ election, onClose, onError }) => {
    const { organizations, candidates } = useApp();
    const [step, setStep] = useState(1);
    const [voterId, setVoterId] = useState('');
    const [verificationCode, setVerificationCode] = useState('');
    const [selectedCandidate, setSelectedCandidate] = useState(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');
    const [voteResult, setVoteResult] = useState(null);
    const [connectionStatus, setConnectionStatus] = useState(false);

    const organization = organizations.find((org) => org.id === election.organizationId);
    const electionCandidates = candidates.filter((c) => election.candidates.includes(c.id));

    // Handle connection status changes
    useEffect(() => {
        webSocketService.addConnectionStatusListener(setConnectionStatus);
        return () => {
            webSocketService.removeConnectionStatusListener(setConnectionStatus);
        };
    }, []);

    // Handle OTP verification response
    useEffect(() => {
        const handleOtpVerified = (data) => {
            setIsLoading(false);
            if (data.success) {
                setStep(3);
                setError('');
            } else {
                setError(data.message || 'Invalid verification code. Please try again.');
            }
        };

        webSocketService.registerCallback('OTP_VERIFIED', handleOtpVerified);

        return () => {
            webSocketService.unregisterCallback('OTP_VERIFIED');
        };
    }, []);

    const handleIdSubmit = async (e) => {
        e.preventDefault();
        setIsLoading(true);
        setError('');

        try {
            // In a real app, this would call your backend API
            await new Promise(resolve => setTimeout(resolve, 1500));

            if (voterId.length >= 10) {
                setStep(2);
                // Simulate sending verification code
                console.log(`Verification code sent to voter ID: ${voterId}`);
            } else {
                throw new Error('Invalid National ID. Must be at least 10 characters.');
            }
        } catch (err) {
            setError(err.message);
            if (onError) onError(err.message);
        } finally {
            setIsLoading(false);
        }
    };

    const handleCodeSubmit = async (e) => {
        e.preventDefault();
        setIsLoading(true);
        setError('');

        try {
            if (!connectionStatus) {
                throw new Error('No internet connection. Please check your network and try again.');
            }

            webSocketService.sendMessage('VERIFY_OTP', {
                electionId: election.id,
                voterId,
                otp: verificationCode
            });
        } catch (err) {
            setError(err.message);
            setIsLoading(false);
            if (onError) onError(err.message);
        }
    };

    const handleVoteSubmit = async () => {
        if (!selectedCandidate) {
            setError('Please select a candidate to vote for.');
            return;
        }

        setIsLoading(true);
        setError('');

        try {
            if (!connectionStatus) {
                throw new Error('No internet connection. Voting requires an active connection.');
            }

            webSocketService.sendMessage('SUBMIT_VOTE', {
                electionId: election.id,
                candidateId: selectedCandidate.id,
                voterId: voterId
            });

            setVoteResult({ success: true });
            setStep(4);
        } catch (err) {
            setVoteResult({
                success: false,
                message: err.message || 'Failed to submit vote. Please try again.'
            });
            if (onError) onError(err.message);
        } finally {
            setIsLoading(false);
        }
    };

    const renderIdEntry = () => (
        <div>
            <div className="text-center mb-6">
                <Shield className="h-12 w-12 text-blue-500 mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-gray-900 mb-2">Voter Verification</h3>
                <p className="text-gray-600">Enter your National ID to verify eligibility</p>
            </div>

            <form onSubmit={handleIdSubmit} className="space-y-4">
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                        National ID Number
                    </label>
                    <input
                        type="text"
                        value={voterId}
                        onChange={(e) => setVoterId(e.target.value)}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        placeholder="Enter your National ID"
                        required
                        minLength="10"
                        pattern="[0-9]*"
                        inputMode="numeric"
                    />
                </div>

                {error && (
                    <div className="bg-red-50 border border-red-200 rounded-lg p-3 flex items-center space-x-2">
                        <AlertCircle className="h-4 w-4 text-red-500" />
                        <span className="text-sm text-red-700">{error}</span>
                    </div>
                )}

                <button
                    type="submit"
                    disabled={isLoading}
                    className="w-full px-4 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors duration-200 disabled:opacity-50 flex justify-center items-center"
                >
                    {isLoading ? (
                        <>
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                            Verifying...
                        </>
                    ) : (
                        'Verify ID'
                    )}
                </button>
            </form>
        </div>
    );

    const renderCodeEntry = () => (
        <div>
            <div className="text-center mb-6">
                <Shield className="h-12 w-12 text-green-500 mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-gray-900 mb-2">Enter Verification Code</h3>
                <p className="text-gray-600">
                    We've sent a 6-digit verification code to your registered contact method
                </p>
            </div>

            <form onSubmit={handleCodeSubmit} className="space-y-4">
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                        Verification Code
                    </label>
                    <input
                        type="text"
                        value={verificationCode}
                        onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-center text-lg tracking-widest font-mono"
                        placeholder="------"
                        maxLength="6"
                        required
                        pattern="\d{6}"
                        inputMode="numeric"
                    />
                </div>

                {error && (
                    <div className="bg-red-50 border border-red-200 rounded-lg p-3 flex items-center space-x-2">
                        <AlertCircle className="h-4 w-4 text-red-500" />
                        <span className="text-sm text-red-700">{error}</span>
                    </div>
                )}

                <button
                    type="submit"
                    disabled={isLoading}
                    className="w-full px-4 py-3 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 transition-colors duration-200 disabled:opacity-50 flex justify-center items-center"
                >
                    {isLoading ? (
                        <>
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                            Verifying...
                        </>
                    ) : (
                        'Verify Code'
                    )}
                </button>

                <button
                    type="button"
                    onClick={() => {
                        setStep(1);
                        setError('');
                    }}
                    className="w-full px-4 py-3 bg-gray-200 text-gray-800 rounded-lg font-medium hover:bg-gray-300 transition-colors duration-200"
                >
                    Back to ID Entry
                </button>
            </form>

            <div className="mt-4 text-center text-sm text-gray-600">
                Demo code: <span className="font-mono font-semibold">123456</span>
            </div>
        </div>
    );

    const renderVoting = () => (
        <div>
            <div className="text-center mb-6">
                <h3 className="text-xl font-semibold text-gray-900 mb-2">Cast Your Vote</h3>
                <p className="text-gray-600">Select your preferred candidate</p>
            </div>

            <div className="space-y-4 mb-6 max-h-96 overflow-y-auto">
                {electionCandidates.map((candidate) => (
                    <div
                        key={candidate.id}
                        onClick={() => {
                            setSelectedCandidate(candidate);
                            setError('');
                        }}
                        className={`cursor-pointer transition-all duration-200 ${selectedCandidate?.id === candidate.id
                                ? 'ring-2 ring-blue-500 bg-blue-50'
                                : 'hover:bg-gray-50'
                            }`}
                        aria-selected={selectedCandidate?.id === candidate.id}
                        role="option"
                    >
                        <CandidateCard candidate={candidate} />
                    </div>
                ))}
            </div>

            {error && (
                <div className="mb-4 bg-red-50 border border-red-200 rounded-lg p-3 flex items-center space-x-2">
                    <AlertCircle className="h-4 w-4 text-red-500" />
                    <span className="text-sm text-red-700">{error}</span>
                </div>
            )}

            <div className="flex space-x-4">
                <button
                    onClick={handleVoteSubmit}
                    disabled={isLoading || !selectedCandidate}
                    className="flex-1 px-4 py-3 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 transition-colors duration-200 disabled:opacity-50 flex justify-center items-center"
                >
                    {isLoading ? (
                        <>
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                            Processing...
                        </>
                    ) : (
                        'Cast Vote'
                    )}
                </button>
                <button
                    type="button"
                    onClick={() => setStep(2)}
                    className="px-4 py-3 bg-gray-200 text-gray-800 rounded-lg font-medium hover:bg-gray-300 transition-colors duration-200"
                >
                    Back
                </button>
            </div>
        </div>
    );

    const renderConfirmation = () => (
        <div className="text-center">
            {voteResult?.success ? (
                <>
                    <Check className="h-16 w-16 text-green-500 mx-auto mb-6" />
                    <h3 className="text-2xl font-semibold text-gray-900 mb-4">Vote Cast Successfully!</h3>
                    <p className="text-gray-600 mb-6">
                        Thank you for participating in {election.title}. Your vote has been recorded securely.
                    </p>
                    {selectedCandidate && (
                        <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
                            <p className="text-sm text-green-800">
                                You voted for: <span className="font-semibold">{selectedCandidate.name}</span>
                            </p>
                        </div>
                    )}
                </>
            ) : (
                <>
                    <AlertCircle className="h-16 w-16 text-red-500 mx-auto mb-6" />
                    <h3 className="text-2xl font-semibold text-gray-900 mb-4">Vote Failed</h3>
                    <p className="text-red-600 mb-6">{voteResult?.message}</p>
                </>
            )}

            <button
                onClick={onClose}
                className="px-6 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors duration-200"
            >
                Close
            </button>
        </div>
    );

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
                <div className="flex items-center justify-between p-6 border-b border-gray-200 sticky top-0 bg-white z-10">
                    <div>
                        <h2 className="text-xl font-semibold text-gray-900">{election.title}</h2>
                        <p className="text-sm text-gray-600">{organization?.name}</p>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-gray-100 rounded-lg transition-colors duration-200"
                        aria-label="Close voting form"
                    >
                        <X className="h-5 w-5 text-gray-500" />
                    </button>
                </div>

                <div className="p-6">
                    {step === 1 && renderIdEntry()}
                    {step === 2 && renderCodeEntry()}
                    {step === 3 && renderVoting()}
                    {step === 4 && renderConfirmation()}
                </div>
            </div>
        </div>
    );
};

export default VoterAuthForm;

