import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Trophy, Award, BarChart3, Users, Clock, TrendingUp, Loader2, ArrowLeft } from 'lucide-react';
import { resultsApi } from '../services/api';

const ElectionResults = () => {
    const { electionId } = useParams();
    const navigate = useNavigate();
    
    const [results, setResults] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    
    useEffect(() => {
        loadElectionResults();
    }, [electionId]);
    
    const loadElectionResults = async () => {
        try {
            setLoading(true);
            setError('');
            const resultsData = await resultsApi.getElectionResults(electionId);
            setResults(resultsData);
        } catch (error) {
            console.error('Failed to load election results:', error);
            setError(error.message || 'Failed to load election results');
        } finally {
            setLoading(false);
        }
    };
    
    const formatDate = (dateString) => {
        return new Date(dateString).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };
    
    const getPositionBadge = (position) => {
        const badges = {
            1: { color: 'bg-yellow-500', text: '🥇 1st Place' },
            2: { color: 'bg-gray-400', text: '🥈 2nd Place' },
            3: { color: 'bg-amber-600', text: '🥉 3rd Place' }
        };
        
        if (badges[position]) {
            return (
                <span className={`${badges[position].color} text-white px-3 py-1 rounded-full text-sm font-semibold`}>
                    {badges[position].text}
                </span>
            );
        }
        
        return (
            <span className="bg-gray-200 text-gray-700 px-3 py-1 rounded-full text-sm font-semibold">
                #{position}
            </span>
        );
    };
    
    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="text-center">
                    <Loader2 className="h-12 w-12 animate-spin text-blue-600 mx-auto mb-4" />
                    <p className="text-gray-600">Loading election results...</p>
                </div>
            </div>
        );
    }
    
    if (error) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="text-center max-w-md mx-4">
                    <div className="bg-red-50 border border-red-200 rounded-xl p-8">
                        <div className="text-red-500 mb-4">
                            <BarChart3 className="h-16 w-16 mx-auto" />
                        </div>
                        <h2 className="text-xl font-semibold text-gray-900 mb-2">Unable to Load Results</h2>
                        <p className="text-gray-600 mb-6">{error}</p>
                        <button
                            onClick={() => navigate('/elections')}
                            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                        >
                            Back to Elections
                        </button>
                    </div>
                </div>
            </div>
        );
    }
    
    if (!results) {
        return null;
    }
    
    const { election_info, results: electionResults } = results;
    const { candidates, winners, statistics } = electionResults;
    
    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 py-8">
            <div className="max-w-6xl mx-auto px-4">
                {/* Header */}
                <div className="text-center mb-8">
                    <button
                        onClick={() => navigate('/elections')}
                        className="inline-flex items-center text-blue-600 hover:text-blue-700 mb-4"
                    >
                        <ArrowLeft className="h-4 w-4 mr-2" />
                        Back to Elections
                    </button>
                    
                    <div className="flex items-center justify-center mb-4">
                        <Trophy className="h-12 w-12 text-yellow-500 mr-3" />
                        <h1 className="text-3xl font-bold text-gray-900">Election Results</h1>
                    </div>
                    
                    <h2 className="text-2xl font-semibold text-gray-700 mb-2">
                        {election_info.title}
                    </h2>
                    
                    <div className="text-gray-600">
                        <p>Started: {formatDate(election_info.starts_at)}</p>
                        <p>Ended: {formatDate(election_info.ends_at)}</p>
                    </div>
                </div>
                
                {/* Winners Section */}
                {winners.length > 0 && (
                    <div className="bg-gradient-to-r from-yellow-400 to-orange-500 rounded-xl p-6 mb-8 text-white text-center">
                        <h3 className="text-2xl font-bold mb-4">
                            🎉 {winners.length === 1 ? 'Winner' : 'Winners'} 🎉
                        </h3>
                        <div className="flex flex-wrap justify-center gap-4">
                            {winners.map((winner, index) => (
                                <div key={winner.hashed_national_id} className="bg-white/20 rounded-lg p-4 backdrop-blur-sm">
                                    <h4 className="text-xl font-semibold mb-2">{winner.name}</h4>
                                    {winner.party && <p className="text-sm opacity-90">{winner.party}</p>}
                                    <p className="text-2xl font-bold">{winner.vote_count} votes</p>
                                    <p className="text-sm opacity-90">{winner.vote_percentage}%</p>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
                
                {/* Statistics Cards */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                    <div className="bg-white rounded-xl shadow-lg p-6 text-center">
                        <div className="text-blue-600 mb-2">
                            <Users className="h-8 w-8 mx-auto" />
                        </div>
                        <h3 className="text-lg font-semibold text-gray-900 mb-2">Total Votes</h3>
                        <p className="text-3xl font-bold text-blue-600">{statistics.total_votes_cast}</p>
                    </div>
                    
                    <div className="bg-white rounded-xl shadow-lg p-6 text-center">
                        <div className="text-green-600 mb-2">
                            <TrendingUp className="h-8 w-8 mx-auto" />
                        </div>
                        <h3 className="text-lg font-semibold text-gray-900 mb-2">Voter Turnout</h3>
                        <p className="text-3xl font-bold text-green-600">{statistics.voter_turnout_percentage}%</p>
                    </div>
                    
                    <div className="bg-white rounded-xl shadow-lg p-6 text-center">
                        <div className="text-purple-600 mb-2">
                            <Award className="h-8 w-8 mx-auto" />
                        </div>
                        <h3 className="text-lg font-semibold text-gray-900 mb-2">Candidates</h3>
                        <p className="text-3xl font-bold text-purple-600">{statistics.number_of_candidates}</p>
                    </div>
                    
                    <div className="bg-white rounded-xl shadow-lg p-6 text-center">
                        <div className="text-orange-600 mb-2">
                            <Clock className="h-8 w-8 mx-auto" />
                        </div>
                        <h3 className="text-lg font-semibold text-gray-900 mb-2">Duration</h3>
                        <p className="text-3xl font-bold text-orange-600">{statistics.election_duration_hours}h</p>
                    </div>
                </div>
                
                {/* Leaderboard */}
                <div className="bg-white rounded-xl shadow-lg overflow-hidden">
                    <div className="bg-gray-50 px-6 py-4 border-b">
                        <h3 className="text-xl font-semibold text-gray-900">Final Results Leaderboard</h3>
                        <p className="text-gray-600">Candidates ranked by total votes received</p>
                    </div>
                    
                    <div className="divide-y divide-gray-200">
                        {candidates.map((candidate, index) => (
                            <div 
                                key={candidate.hashed_national_id}
                                className={`p-6 hover:bg-gray-50 transition-colors ${
                                    candidate.is_winner ? 'bg-yellow-50 border-l-4 border-yellow-500' : ''
                                }`}
                            >
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center space-x-4">
                                        <div className="flex-shrink-0">
                                            {candidate.photo_url ? (
                                                <img
                                                    src={candidate.photo_url}
                                                    alt={candidate.name}
                                                    className="h-16 w-16 rounded-full object-cover border-4 border-white shadow-lg"
                                                />
                                            ) : (
                                                <div className="h-16 w-16 rounded-full bg-gray-200 flex items-center justify-center border-4 border-white shadow-lg">
                                                    <span className="text-2xl font-bold text-gray-500">
                                                        {candidate.name.charAt(0).toUpperCase()}
                                                    </span>
                                                </div>
                                            )}
                                        </div>
                                        
                                        <div>
                                            <div className="flex items-center space-x-3 mb-2">
                                                <h4 className="text-xl font-semibold text-gray-900">
                                                    {candidate.name}
                                                </h4>
                                                {getPositionBadge(candidate.position)}
                                                {candidate.is_winner && (
                                                    <span className="bg-yellow-500 text-white px-2 py-1 rounded text-xs font-semibold">
                                                        🏆 Winner
                                                    </span>
                                                )}
                                            </div>
                                            
                                            {candidate.party && (
                                                <p className="text-gray-600 mb-1">{candidate.party}</p>
                                            )}
                                            
                                            {candidate.symbol_name && (
                                                <p className="text-sm text-gray-500">
                                                    Symbol: {candidate.symbol_name}
                                                </p>
                                            )}
                                        </div>
                                    </div>
                                    
                                    <div className="text-right">
                                        <div className="text-3xl font-bold text-blue-600 mb-1">
                                            {candidate.vote_count}
                                        </div>
                                        <div className="text-sm text-gray-500 mb-2">votes</div>
                                        <div className="text-lg font-semibold text-green-600">
                                            {candidate.vote_percentage}%
                                        </div>
                                    </div>
                                </div>
                                
                                {/* Progress Bar */}
                                <div className="mt-4">
                                    <div className="flex justify-between text-sm text-gray-600 mb-1">
                                        <span>Vote Share</span>
                                        <span>{candidate.vote_percentage}%</span>
                                    </div>
                                    <div className="w-full bg-gray-200 rounded-full h-3">
                                        <div
                                            className="bg-gradient-to-r from-blue-500 to-purple-600 h-3 rounded-full transition-all duration-500"
                                            style={{ width: `${candidate.vote_percentage}%` }}
                                        ></div>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
                
                {/* Additional Info */}
                <div className="mt-8 bg-white rounded-xl shadow-lg p-6">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">Election Details</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-gray-600">
                        <div>
                            <p><strong>Election Type:</strong> {election_info.types}</p>
                            <p><strong>Votes per Voter:</strong> {election_info.num_of_votes_per_voter}</p>
                            <p><strong>Potential Voters:</strong> {election_info.potential_number_of_voters}</p>
                        </div>
                        <div>
                            <p><strong>Created:</strong> {formatDate(election_info.created_at)}</p>
                            <p><strong>Status:</strong> <span className="text-green-600 font-semibold">Finished</span></p>
                            <p><strong>Results Finalized:</strong> <span className="text-green-600 font-semibold">Yes</span></p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ElectionResults;
