import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { voterApi, electionApi, candidateApi } from '../services/api';
import { AlertCircle, Shield, Check, Users } from 'lucide-react';

const VoterLogin = () => {
    const { electionId } = useParams();
    const navigate = useNavigate();
    const location = useLocation();
    const [phoneNumber, setPhoneNumber] = useState('');
    const [nationalId, setNationalId] = useState('');
    const [otpCode, setOtpCode] = useState('');
    // 1: login, 2: verify, 3: select, 4: review, 5: done
    const [step, setStep] = useState(1);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState('');
    const [successMsg, setSuccessMsg] = useState('');
    const [election, setElection] = useState(null);
    const [candidates, setCandidates] = useState([]);
    const [isLoadingElection, setIsLoadingElection] = useState(false);
    const [selectedIds, setSelectedIds] = useState([]);

    const requiredSelections = useMemo(() => {
        if (!election) return 0;
        return election.num_of_votes_per_voter || election.numVotesPerVoter || 1;
    }, [election]);

    const handleRequestOtp = async (e) => {
        e.preventDefault();
        setError('');
        setSuccessMsg('');
        if (!phoneNumber || !nationalId) {
            setError('Both phone number and national ID are required.');
            return;
        }

        try {
            setIsSubmitting(true);
            await voterApi.requestOtp({ electionId, phoneNumber, nationalId });
            setSuccessMsg('Verification code sent via SMS.');
            setStep(2);
        } catch (err) {
            setError(err?.message || 'Failed to request verification code.');
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleVerifyOtp = async (e) => {
        e.preventDefault();
        setError('');
        setSuccessMsg('');
        if (!otpCode) {
            setError('Please enter the verification code.');
            return;
        }

        try {
            setIsSubmitting(true);
            await voterApi.verifyOtp({ electionId, otpCode, nationalId });
            setSuccessMsg('Phone number verified successfully.');
            // Load election details and candidates, then proceed to selection step
            try {
                setIsSubmitting(true);
                setIsLoadingElection(true);
                const [electionData, electionCandidates] = await Promise.all([
                    electionApi.getById(electionId),
                    candidateApi.listByElection(electionId),
                ]);
                setElection(electionData);
                setCandidates(electionCandidates);
                setStep(3);
            } finally {
                setIsSubmitting(false);
                setIsLoadingElection(false);
            }
        } catch (err) {
            setError(err?.message || 'Verification failed.');
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center px-4">
            <div className="w-full max-w-md bg-white rounded-xl shadow-lg p-6">
                <div className="text-center mb-6">
                    {step === 1 ? (
                        <Shield className="h-12 w-12 text-blue-600 mx-auto mb-2" />
                    ) : (
                        <Check className="h-12 w-12 text-green-600 mx-auto mb-2" />
                    )}
                    <h1 className="text-2xl font-semibold text-gray-900">
                        {step === 1 ? 'Voter Login' : 'Enter Verification Code'}
                    </h1>
                    <p className="text-sm text-gray-600 mt-1">Election ID: {electionId}</p>
                </div>

                {error && (
                    <div className="bg-red-50 border border-red-200 rounded-lg p-3 flex items-center space-x-2 mb-4">
                        <AlertCircle className="h-4 w-4 text-red-500" />
                        <span className="text-sm text-red-700">{error}</span>
                    </div>
                )}

                {successMsg && (
                    <div className="bg-green-50 border border-green-200 rounded-lg p-3 text-sm text-green-800 mb-4">
                        {successMsg}
                    </div>
                )}

                {step === 1 && (
                    <form onSubmit={handleRequestOtp} className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Phone Number</label>
                            <input
                                type="tel"
                                value={phoneNumber}
                                onChange={(e) => setPhoneNumber(e.target.value)}
                                placeholder="e.g. +201234567890"
                                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                required
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">National ID</label>
                            <input
                                type="text"
                                value={nationalId}
                                onChange={(e) => setNationalId(e.target.value)}
                                placeholder="Enter your national ID"
                                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                required
                            />
                        </div>
                        <button
                            type="submit"
                            disabled={isSubmitting}
                            className="w-full px-4 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors disabled:opacity-50"
                        >
                            {isSubmitting ? 'Sending Code…' : 'Send Verification Code'}
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
                                placeholder="6-digit code"
                                maxLength={6}
                                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 text-center tracking-widest"
                                required
                            />
                        </div>
                        <button
                            type="submit"
                            disabled={isSubmitting}
                            className="w-full px-4 py-3 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 transition-colors disabled:opacity-50"
                        >
                            {isSubmitting ? 'Verifying…' : 'Verify & Continue'}
                        </button>
                        <button
                            type="button"
                            onClick={() => setStep(1)}
                            className="w-full px-4 py-3 bg-gray-200 text-gray-800 rounded-lg font-medium hover:bg-gray-300 transition-colors"
                        >
                            Back
                        </button>
                    </form>
                )}
                {step === 3 && (
                    <form onSubmit={(e) => {
                        e.preventDefault();
                        if (selectedIds.length !== requiredSelections) {
                            setError(`Please select exactly ${requiredSelections} candidate(s).`);
                            return;
                        }
                        setStep(4);
                    }} className="space-y-4">
                        <div className="max-h-96 overflow-y-auto divide-y">
                            {isLoadingElection && (
                                <div className="text-sm text-gray-500">Loading candidates…</div>
                            )}
                            {!isLoadingElection && candidates.map((c) => {
                                const cid = c.hashed_national_id || c.id;
                                return (
                                    <label key={cid} className="flex items-center p-3 cursor-pointer hover:bg-gray-50">
                                        <input
                                            type="checkbox"
                                            className="mr-3 h-4 w-4"
                                            checked={selectedIds.includes(cid)}
                                            onChange={() => {
                                                setError('');
                                                setSelectedIds((prev) => {
                                                    if (prev.includes(cid)) {
                                                        return prev.filter((x) => x !== cid);
                                                    }
                                                    if (prev.length >= requiredSelections) {
                                                        return prev;
                                                    }
                                                    return [...prev, cid];
                                                });
                                            }}
                                        />
                                        <div>
                                            <div className="text-sm font-medium text-gray-900">{c.name || c.full_name || 'Candidate'}</div>
                                            {c.party && <div className="text-xs text-gray-500">{c.party}</div>}
                                        </div>
                                    </label>
                                );
                            })}
                        </div>
                        <div className="text-sm text-gray-600">
                            Selected {selectedIds.length} / {requiredSelections}
                        </div>
                        <button
                            type="submit"
                            disabled={selectedIds.length !== requiredSelections}
                            className="w-full px-4 py-3 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700 transition-colors disabled:opacity-50"
                        >
                            Review Selection
                        </button>
                        <button
                            type="button"
                            onClick={() => setStep(2)}
                            className="w-full px-4 py-3 bg-gray-200 text-gray-800 rounded-lg font-medium hover:bg-gray-300 transition-colors"
                        >
                            Back
                        </button>
                    </form>
                )}
                {step === 4 && (
                    <div className="space-y-4">
                        <div className="border rounded-lg divide-y">
                            {selectedIds.map((id) => {
                                const c = candidates.find((x) => (x.hashed_national_id || x.id) === id);
                                return (
                                    <div key={id} className="p-3">
                                        <div className="text-sm font-medium text-gray-900">{c?.name || c?.full_name || 'Candidate'}</div>
                                        {c?.party && <div className="text-xs text-gray-500">{c.party}</div>}
                                    </div>
                                );
                            })}
                        </div>
                        <button
                            onClick={() => setStep(5)}
                            className="w-full px-4 py-3 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 transition-colors"
                        >
                            Confirm Vote
                        </button>
                        <button
                            onClick={() => setStep(3)}
                            className="w-full px-4 py-3 bg-gray-200 text-gray-800 rounded-lg font-medium hover:bg-gray-300 transition-colors"
                        >
                            Return to Candidates
                        </button>
                    </div>
                )}
                {step === 5 && (
                    <div className="text-center space-y-4">
                        <Check className="h-16 w-16 text-green-600 mx-auto" />
                        <div className="text-lg font-semibold text-gray-900">Your vote has been prepared</div>
                        <div className="text-sm text-gray-600">Thank you. Your selections were recorded locally for this demo.</div>
                        <button
                            onClick={() => navigate('/elections')}
                            className="w-full px-4 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors"
                        >
                            Back to Elections
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
};

export default VoterLogin;


