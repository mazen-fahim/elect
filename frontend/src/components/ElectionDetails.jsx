import React, { useState, useEffect } from 'react';
import { X, Calendar, Users, Vote, MapPin, Globe, Clock, User, Settings, Trash2, Edit3 } from 'lucide-react';
import api from '../services/api';
import CandidateDetails from './CandidateDetails';

const ElectionDetails = ({ election, isOpen, onClose, onEdit, onDelete }) => {
    const [candidates, setCandidates] = useState([]);
    const [electionData, setElectionData] = useState(null);
    const [loadingCandidates, setLoadingCandidates] = useState(false);
    const [loadingElection, setLoadingElection] = useState(false);
    
    // Candidate details modal state
    const [selectedCandidate, setSelectedCandidate] = useState(null);
    const [showCandidateDetails, setShowCandidateDetails] = useState(false);

    useEffect(() => {
        if (isOpen && election) {
            fetchElectionData();
            fetchCandidates();
        }
    }, [isOpen, election]);

    const fetchElectionData = async () => {
        try {
            setLoadingElection(true);
            const response = await api.get(`/election/${election.id}`);
            setElectionData(response);
        } catch (error) {
            console.error('Error fetching election data:', error);
            setElectionData(election); // fallback to passed election data
        } finally {
            setLoadingElection(false);
        }
    };

    const fetchCandidates = async () => {
        try {
            setLoadingCandidates(true);
            const response = await api.get(`/candidates/election/${election.id}`);
            setCandidates(response || []);
        } catch (error) {
            console.error('Error fetching candidates:', error);
            setCandidates([]);
        } finally {
            setLoadingCandidates(false);
        }
    };



    const formatDate = (dateString) => {
        return new Date(dateString).toLocaleString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
            timeZoneName: 'short'
        });
    };

    const getStatusBadge = (status) => {
        const colors = {
            upcoming: 'bg-blue-100 text-blue-800',
            running: 'bg-green-100 text-green-800',
            finished: 'bg-gray-100 text-gray-800'
        };
        return (
            <span className={`px-3 py-1 rounded-full text-sm font-medium ${colors[status] || 'bg-gray-100 text-gray-800'}`}>
                {status.charAt(0).toUpperCase() + status.slice(1)}
            </span>
        );
    };

    const getTypeBadge = (type) => {
        const typeLabels = {
            simple: 'Simple Election',
            district_based: 'District-Based',
            governorate_based: 'Governorate-Based',
            api_managed: 'API-Managed'
        };
        return (
            <span className="px-3 py-1 bg-purple-100 text-purple-800 rounded-full text-sm font-medium">
                {typeLabels[type] || type}
            </span>
        );
    };

    // Use fresh election data if available, fallback to passed election
    const currentElectionData = electionData || election;
    const canEdit = currentElectionData?.computed_status === 'upcoming';

    // Candidate interaction handlers
    const handleCandidateClick = (candidate) => {
        setSelectedCandidate(candidate);
        setShowCandidateDetails(true);
    };

    const handleCandidateUpdated = (updatedCandidate) => {
        setCandidates(prev => prev.map(c => 
            c.hashed_national_id === updatedCandidate.hashed_national_id ? updatedCandidate : c
        ));
    };

    const handleCandidateDeleted = (deletedCandidate) => {
        setCandidates(prev => prev.filter(c => 
            c.hashed_national_id !== deletedCandidate.hashed_national_id
        ));
    };

    if (!isOpen || !election) return null;

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
                {/* Header */}
                <div className="sticky top-0 bg-white border-b px-6 py-4 flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                        <h2 className="text-2xl font-bold text-gray-900">{election.title}</h2>
                        {getStatusBadge(election.computed_status)}
                        {getTypeBadge(election.types)}
                    </div>
                    <div className="flex items-center space-x-2">
                        {canEdit && (
                            <>
                                <button
                                    onClick={() => onEdit(election)}
                                    className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                                    title="Edit Election"
                                >
                                    <Edit3 className="h-5 w-5" />
                                </button>
                                <button
                                    onClick={() => onDelete(election)}
                                    className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                    title="Delete Election"
                                >
                                    <Trash2 className="h-5 w-5" />
                                </button>
                            </>
                        )}
                        <button
                            onClick={onClose}
                            className="p-2 text-gray-400 hover:bg-gray-100 rounded-lg transition-colors"
                        >
                            <X className="h-6 w-6" />
                        </button>
                    </div>
                </div>

                {/* Content */}
                <div className="p-6 space-y-6">
                    {/* Election Details Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {/* Schedule */}
                        <div className="bg-blue-50 rounded-lg p-4">
                            <div className="flex items-center space-x-2 mb-3">
                                <Calendar className="h-5 w-5 text-blue-600" />
                                <h3 className="font-semibold text-blue-900">Schedule</h3>
                            </div>
                            <div className="space-y-2 text-sm">
                                <div>
                                    <span className="text-blue-700 font-medium">Starts:</span>
                                    <div className="text-blue-600">{formatDate(election.starts_at)}</div>
                                </div>
                                <div>
                                    <span className="text-blue-700 font-medium">Ends:</span>
                                    <div className="text-blue-600">{formatDate(election.ends_at)}</div>
                                </div>
                            </div>
                        </div>

                        {/* Voting Details */}
                        <div className="bg-green-50 rounded-lg p-4">
                            <div className="flex items-center space-x-2 mb-3">
                                <Vote className="h-5 w-5 text-green-600" />
                                <h3 className="font-semibold text-green-900">Voting Details</h3>
                            </div>
                            <div className="space-y-2 text-sm">
                                <div className="flex justify-between">
                                    <span className="text-green-700">Votes per voter:</span>
                                    <span className="text-green-600 font-medium">{election.num_of_votes_per_voter}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-green-700">Expected voters:</span>
                                    <span className="text-green-600 font-medium">{election.potential_number_of_voters?.toLocaleString()}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-green-700">Total votes:</span>
                                    <span className="text-green-600 font-medium">{election.total_vote_count}</span>
                                </div>
                            </div>
                        </div>

                        {/* Method & Setup */}
                        <div className="bg-purple-50 rounded-lg p-4">
                            <div className="flex items-center space-x-2 mb-3">
                                <Settings className="h-5 w-5 text-purple-600" />
                                <h3 className="font-semibold text-purple-900">Setup Method</h3>
                            </div>
                            <div className="space-y-2 text-sm">
                                <div className="flex justify-between">
                                    <span className="text-purple-700">Method:</span>
                                    <span className="text-purple-600 font-medium capitalize">{election.method}</span>
                                </div>
                                {election.api_endpoint && (
                                    <div>
                                        <span className="text-purple-700">API Endpoint:</span>
                                        <div className="text-purple-600 break-all text-xs mt-1">
                                            {election.api_endpoint}
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Candidates Section */}
                    <div className="border-t pt-6">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-xl font-semibold text-gray-900 flex items-center space-x-2">
                                <User className="h-5 w-5" />
                                <span>Candidates ({loadingCandidates ? '...' : candidates.length})</span>
                            </h3>
                        </div>

                        {loadingCandidates ? (
                            <div className="flex items-center justify-center py-8">
                                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                                <span className="ml-3 text-gray-600">Loading candidates...</span>
                            </div>
                        ) : candidates.length > 0 ? (
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                {candidates.map((candidate, index) => (
                                    <div 
                                        key={candidate.hashed_national_id || index} 
                                        className="border rounded-lg p-4 hover:shadow-md hover:border-blue-300 transition-all cursor-pointer group"
                                        onClick={() => handleCandidateClick(candidate)}
                                    >
                                        <div className="flex items-start space-x-3">
                                            {candidate.photo_url ? (
                                                <img 
                                                    src={candidate.photo_url} 
                                                    alt={candidate.name}
                                                    className="w-12 h-12 rounded-full object-cover"
                                                />
                                            ) : (
                                                <div className="w-12 h-12 bg-gray-200 rounded-full flex items-center justify-center group-hover:bg-blue-100 transition-colors">
                                                    <User className="h-6 w-6 text-gray-400 group-hover:text-blue-500" />
                                                </div>
                                            )}
                                            <div className="flex-1 min-w-0">
                                                <h4 className="font-medium text-gray-900 truncate group-hover:text-blue-600 transition-colors">{candidate.name}</h4>
                                                {candidate.party && (
                                                    <p className="text-sm text-blue-600">{candidate.party}</p>
                                                )}
                                                {candidate.country && (
                                                    <div className="flex items-center space-x-1 mt-1">
                                                        <Globe className="h-3 w-3 text-gray-400" />
                                                        <span className="text-xs text-gray-500">{candidate.country}</span>
                                                    </div>
                                                )}
                                                {(candidate.district || candidate.governorate) && (
                                                    <div className="flex items-center space-x-1 mt-1">
                                                        <MapPin className="h-3 w-3 text-gray-400" />
                                                        <span className="text-xs text-gray-500">
                                                            {candidate.district || candidate.governorate}
                                                        </span>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                        {candidate.description && (
                                            <p className="text-xs text-gray-600 mt-2 line-clamp-2">{candidate.description}</p>
                                        )}
                                        <div className="mt-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <p className="text-xs text-blue-500 font-medium">Click to view details →</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="text-center py-8 text-gray-500">
                                <User className="h-12 w-12 mx-auto mb-3 text-gray-300" />
                                <p>No candidates added yet</p>
                                {election.method === 'csv' && (
                                    <p className="text-sm mt-1">Candidates will be loaded from CSV file</p>
                                )}
                            </div>
                        )}
                    </div>

                    {/* Additional Info */}
                    <div className="border-t pt-6 bg-gray-50 -mx-6 px-6 pb-6">
                        <div className="flex items-center justify-between text-sm text-gray-600">
                            <div className="flex items-center space-x-1">
                                <Clock className="h-4 w-4" />
                                <span>Created: {formatDate(election.created_at)}</span>
                            </div>
                            <div>
                                Election ID: #{election.id}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
            
            {/* Candidate Details Modal */}
            <CandidateDetails
                candidate={selectedCandidate}
                isOpen={showCandidateDetails}
                onClose={() => {
                    setShowCandidateDetails(false);
                    setSelectedCandidate(null);
                }}
                onUpdated={handleCandidateUpdated}
                onDeleted={handleCandidateDeleted}
            />
        </div>
    );
};

export default ElectionDetails;
