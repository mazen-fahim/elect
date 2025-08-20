import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { CheckCircle, XCircle, AlertCircle, Loader2, Vote } from 'lucide-react';
import { votingApi } from '../services/api';

const VotingPage = () => {
    const { electionId } = useParams();
    const navigate = useNavigate();
    const location = useLocation();
    
    const [candidates, setCandidates] = useState([]);
    const [selectedCandidates, setSelectedCandidates] = useState([]);
    const [electionInfo, setElectionInfo] = useState(null);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState('');
    const [showSuccess, setShowSuccess] = useState(false);
    const [showErrorModal, setShowErrorModal] = useState(false);
    
    // Get voter info from location state (passed from VoterLogin)
    const voterInfo = location.state?.voterInfo;

    useEffect(() => {
        if (!voterInfo) {
            navigate('/elections');
            return;
        }
        
        loadElectionCandidates();
    }, [electionId, voterInfo, navigate]);

    const loadElectionCandidates = async () => {
        try {
            setLoading(true);
            const response = await votingApi.getElectionCandidates(electionId);
            setCandidates(response.candidates);
            setElectionInfo(response.election_info);
        } catch (error) {
            console.error('Failed to load candidates:', error);
            setError('Failed to load candidates. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    const handleCandidateSelection = (candidateId) => {
        setSelectedCandidates(prev => {
            if (prev.includes(candidateId)) {
                return prev.filter(id => id !== candidateId);
            } else {
                // Check if we can add more candidates
                if (prev.length < (electionInfo?.num_of_votes_per_voter || 1)) {
                    return [...prev, candidateId];
                }
                return prev;
            }
        });
    };

    const handleVoteSubmission = async () => {
        if (!voterInfo) {
            setError('Voter information not found. Please login again.');
            return;
        }

        const requiredVotes = electionInfo?.num_of_votes_per_voter || 1;
        
        if (selectedCandidates.length !== requiredVotes) {
            setError(`Please select exactly ${requiredVotes} candidate(s)`);
            setShowErrorModal(true);
            return;
        }

        try {
            setSubmitting(true);
            setError('');
            
            const voteRequest = {
                voter_hashed_national_id: voterInfo.voter_hashed_national_id,
                candidate_hashed_national_ids: selectedCandidates
            };
            
            await votingApi.castVote(electionId, voteRequest);
            setShowSuccess(true);
            
            // Redirect to home after 3 seconds
            setTimeout(() => {
                navigate('/');
            }, 3000);
            
        } catch (error) {
            console.error('Failed to cast vote:', error);
            setError(error.message || 'Failed to cast vote. Please try again.');
            setShowErrorModal(true);
        } finally {
            setSubmitting(false);
        }
    };

    const getSelectedCount = () => selectedCandidates.length;
    const getRequiredCount = () => electionInfo?.num_of_votes_per_voter || 1;
    const canSubmit = () => selectedCandidates.length === getRequiredCount();

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="text-center">
                    <Loader2 className="h-12 w-12 animate-spin text-blue-600 mx-auto mb-4" />
                    <p className="text-gray-600">Loading election candidates...</p>
                </div>
            </div>
        );
    }

    if (!voterInfo) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="text-center">
                    <XCircle className="h-16 w-16 text-red-500 mx-auto mb-4" />
                    <h1 className="text-2xl font-bold text-gray-900 mb-2">Access Denied</h1>
                    <p className="text-gray-600">Please login as a voter first.</p>
                    <button 
                        onClick={() => navigate('/elections')}
                        className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                    >
                        Go to Elections
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 py-8">
            <div className="max-w-4xl mx-auto px-4">
                {/* Header */}
                <div className="text-center mb-8">
                    <div className="flex items-center justify-center mb-4">
                        <Vote className="h-12 w-12 text-blue-600 mr-3" />
                        <h1 className="text-3xl font-bold text-gray-900">Cast Your Vote</h1>
                    </div>
                    <p className="text-lg text-gray-600">
                        {electionInfo?.title || `Election #${electionId}`} • Select {getRequiredCount()} candidate(s)
                    </p>
                    <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg inline-block">
                        <p className="text-sm text-blue-700">
                            <span className="font-medium">Voter:</span> {voterInfo.voter_hashed_national_id.slice(0, 8)}...
                        </p>
                    </div>
                </div>

                {/* Vote Counter */}
                <div className="bg-white rounded-xl shadow-lg border border-gray-200/50 p-6 mb-6">
                    <div className="flex items-center justify-between">
                        <div>
                            <h3 className="text-lg font-semibold text-gray-900">Your Selection</h3>
                            <p className="text-sm text-gray-600">
                                Select exactly {getRequiredCount()} candidate(s)
                            </p>
                        </div>
                        <div className="text-right">
                            <div className="text-2xl font-bold text-blue-600">
                                {getSelectedCount()}/{getRequiredCount()}
                            </div>
                            <div className="text-sm text-gray-500">candidates selected</div>
                        </div>
                    </div>
                </div>

                {/* Candidates Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
                    {candidates.map((candidate) => {
                        const isSelected = selectedCandidates.includes(candidate.hashed_national_id);
                        const canSelect = getSelectedCount() < getRequiredCount() || isSelected;
                        
                        return (
                            <div
                                key={candidate.hashed_national_id}
                                className={`bg-white rounded-xl shadow-lg border-2 transition-all duration-200 cursor-pointer ${
                                    isSelected 
                                        ? 'border-blue-500 bg-blue-50' 
                                        : canSelect 
                                            ? 'border-gray-200 hover:border-blue-300 hover:shadow-xl' 
                                            : 'border-gray-200 opacity-50 cursor-not-allowed'
                                }`}
                                onClick={() => canSelect && handleCandidateSelection(candidate.hashed_national_id)}
                            >
                                <div className="p-6">
                                    {/* Candidate Photo */}
                                    <div className="flex justify-center mb-4">
                                        {candidate.photo_url ? (
                                            <img
                                                src={candidate.photo_url}
                                                alt={candidate.name}
                                                className="h-24 w-24 rounded-full object-cover border-4 border-white shadow-lg"
                                            />
                                        ) : (
                                            <div className="h-24 w-24 rounded-full bg-gray-200 flex items-center justify-center">
                                                <span className="text-2xl font-bold text-gray-500">
                                                    {candidate.name.charAt(0).toUpperCase()}
                                                </span>
                                            </div>
                                        )}
                                    </div>

                                    {/* Selection Indicator */}
                                    <div className="flex justify-center mb-4">
                                        {isSelected ? (
                                            <CheckCircle className="h-8 w-8 text-blue-600" />
                                        ) : (
                                            <div className="h-8 w-8 rounded-full border-2 border-gray-300" />
                                        )}
                                    </div>

                                    {/* Candidate Info */}
                                    <div className="text-center">
                                        <h3 className="text-lg font-semibold text-gray-900 mb-2">
                                            {candidate.name}
                                        </h3>
                                        {candidate.party && (
                                            <p className="text-sm text-gray-600 mb-2">
                                                {candidate.party}
                                            </p>
                                        )}
                                        {candidate.symbol_name && (
                                            <p className="text-xs text-gray-500 mb-2">
                                                Symbol: {candidate.symbol_name}
                                            </p>
                                        )}
                                        <div className="text-xs text-gray-400">
                                            Current votes: {candidate.current_vote_count}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>

                {/* Submit Button */}
                <div className="text-center">
                    <button
                        onClick={handleVoteSubmission}
                        disabled={!canSubmit() || submitting}
                        className={`px-8 py-4 text-lg font-semibold rounded-xl transition-all duration-200 ${
                            canSubmit()
                                ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white hover:from-blue-700 hover:to-purple-700 shadow-lg hover:shadow-xl'
                                : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                        }`}
                    >
                        {submitting ? (
                            <div className="flex items-center">
                                <Loader2 className="h-5 w-5 animate-spin mr-2" />
                                Casting Vote...
                            </div>
                        ) : (
                            `Cast Vote (${getSelectedCount()}/${getRequiredCount()})`
                        )}
                    </button>
                </div>

                {/* Success Message */}
                {showSuccess && (
                    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                        <div className="bg-white rounded-xl p-8 max-w-md mx-4 text-center">
                            <CheckCircle className="h-16 w-16 text-green-500 mx-auto mb-4" />
                            <h3 className="text-xl font-semibold text-gray-900 mb-2">Vote Cast Successfully!</h3>
                            <p className="text-gray-600 mb-4">
                                Your vote has been recorded. You will be redirected to the home page shortly.
                            </p>
                            <div className="text-sm text-gray-500">
                                Redirecting in 3 seconds...
                            </div>
                        </div>
                    </div>
                )}

                {/* Error Modal */}
                {showErrorModal && (
                    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                        <div className="bg-white rounded-xl p-8 max-w-md mx-4 text-center">
                            <AlertCircle className="h-16 w-16 text-red-500 mx-auto mb-4" />
                            <h3 className="text-xl font-semibold text-gray-900 mb-2">Voting Error</h3>
                            <p className="text-gray-600 mb-6">{error}</p>
                            <button
                                onClick={() => setShowErrorModal(false)}
                                className="px-6 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300"
                            >
                                Close
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default VotingPage;
