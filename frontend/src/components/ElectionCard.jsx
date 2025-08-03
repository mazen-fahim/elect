import React from 'react';
import { useApp } from '../context/AppContext';
import { Calendar, Users, Vote, Clock } from 'lucide-react';

let ElectionCard = ({ election, onVote }) => {
    let { organizations, candidates } = useApp();

    let organization = organizations.find((org) => org.id === election.organizationId);
    let electionCandidates = candidates.filter((c) => election.candidates.includes(c.id));

    let getStatusColor = (status) => {
        switch (status) {
            case 'active':
                return 'bg-green-100 text-green-800 border-green-200';
            case 'upcoming':
                return 'bg-blue-100 text-blue-800 border-blue-200';
            case 'completed':
                return 'bg-gray-100 text-gray-800 border-gray-200';
            default:
                return 'bg-gray-100 text-gray-800 border-gray-200';
        }
    };

    let getTypeLabel = (type) => {
        switch (type) {
            case 'simple':
                return 'Simple Election';
            case 'district-based':
                return 'District-Based';
            case 'governorate-based':
                return 'Governorate-Based';
            default:
                return type;
        }
    };

    return (
        <div className="bg-white rounded-xl shadow-lg border border-gray-200/50 overflow-hidden hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1">
            <div className="p-6">
                <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                        <h3 className="text-xl font-semibold text-gray-900 mb-2 line-clamp-2">{election.title}</h3>
                        <p className="text-sm text-gray-600 mb-2">{organization?.name}</p>
                        <span
                            className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium border ${getStatusColor(election.status)}`}
                        >
                            {election.status === 'active' && (
                                <div className="w-2 h-2 bg-green-500 rounded-full mr-2 animate-pulse"></div>
                            )}
                            {election.status.charAt(0).toUpperCase() + election.status.slice(1)}
                        </span>
                    </div>
                </div>

                <p className="text-gray-600 mb-4 line-clamp-2">{election.description}</p>

                <div className="space-y-3 mb-6">
                    <div className="flex items-center text-sm text-gray-600">
                        <Calendar className="h-4 w-4 mr-2" />
                        <span>
                            {election.startDate} - {election.endDate}
                        </span>
                    </div>
                    <div className="flex items-center text-sm text-gray-600">
                        <Users className="h-4 w-4 mr-2" />
                        <span>{electionCandidates.length} candidates</span>
                    </div>
                    <div className="flex items-center text-sm text-gray-600">
                        <Vote className="h-4 w-4 mr-2" />
                        <span>{election.totalVotes.toLocaleString()} votes cast</span>
                    </div>
                    <div className="flex items-center text-sm text-gray-600">
                        <Clock className="h-4 w-4 mr-2" />
                        <span>{getTypeLabel(election.type)}</span>
                    </div>
                </div>

                {election.status === 'active' && onVote && (
                    <button
                        onClick={onVote}
                        className="w-full px-4 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg font-medium hover:from-blue-700 hover:to-purple-700 transition-all duration-200 shadow-md hover:shadow-lg"
                    >
                        Vote Now
                    </button>
                )}

                {election.status === 'upcoming' && (
                    <div className="w-full px-4 py-3 bg-gray-100 text-gray-600 rounded-lg font-medium text-center">
                        Voting Starts Soon
                    </div>
                )}

                {election.status === 'completed' && (
                    <div className="w-full px-4 py-3 bg-green-50 text-green-700 rounded-lg font-medium text-center border border-green-200">
                        View Results
                    </div>
                )}
            </div>
        </div>
    );
};

export default ElectionCard;

