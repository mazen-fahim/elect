import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import { Search, Vote, Calendar, Users, ExternalLink, AlertCircle } from 'lucide-react';
import VoterAuthForm from '../components/VoterAuthForm';
import ElectionCard from '../components/ElectionCard';
import OrganizationCard from '../components/OrganizationCard';
import { webSocketService } from '../services/websocket';
import ConnectionStatusIndicator from '../components/ConnectionStatusIndicator';

const VoterExperience = () => {
    const { organizations, elections, candidates, updateElection } = useApp();
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedElection, setSelectedElection] = useState(null);
    const [showVoterAuth, setShowVoterAuth] = useState(false);
    const [connectionStatus, setConnectionStatus] = useState(false);
    const [error, setError] = useState(null);

    // Filter elections based on search term
    const filteredElections = elections.filter((election) => {
        const org = organizations.find((o) => o.id === election.organizationId);
        return (
            election.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
            election.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
            org?.name.toLowerCase().includes(searchTerm.toLowerCase())
        );
    });

    // Handle WebSocket connections for active elections
    useEffect(() => {
        const handleVoteUpdate = (data) => {
            try {
                updateElection(data.electionId, {
                    totalVotes: data.totalVotes,
                    updatedAt: new Date().toISOString()
                });
            } catch (err) {
                console.error('Error updating election:', err);
                setError('Failed to update election results. Please refresh the page.');
            }
        };

        // Subscribe to connection status changes
        webSocketService.addConnectionStatusListener(setConnectionStatus);

        // Connect to active elections
        const activeElectionIds = elections
            .filter(e => e.status === 'active')
            .map(e => e.id);

        activeElectionIds.forEach(id => {
            try {
                webSocketService.connect(id);
                webSocketService.registerCallback('VOTE_UPDATE', handleVoteUpdate);
            } catch (err) {
                console.error('Error connecting to WebSocket:', err);
                setError('Connection issues - live updates may be delayed');
            }
        });

        return () => {
            webSocketService.removeConnectionStatusListener(setConnectionStatus);
            webSocketService.disconnect();
        };
    }, [elections, updateElection]);

    // Categorize elections
    const activeElections = filteredElections.filter((e) => e.status === 'active');
    const upcomingElections = filteredElections.filter((e) => e.status === 'upcoming');
    const completedElections = filteredElections.filter((e) => e.status === 'completed');

    const handleVoteClick = (election) => {
        if (!connectionStatus && election.status === 'active') {
            setError('Please check your internet connection. Voting requires an active connection.');
            return;
        }
        setSelectedElection(election);
        setShowVoterAuth(true);
    };

    return (
        <div className="min-h-screen py-8 px-4 sm:px-6 lg:px-8">
            <div className="max-w-7xl mx-auto">
                {/* Connection status and error display */}
                <ConnectionStatusIndicator isConnected={connectionStatus} />
                {error && (
                    <div className="mb-6 bg-red-50 border-l-4 border-red-500 p-4">
                        <div className="flex items-center">
                            <AlertCircle className="h-5 w-5 text-red-500 mr-2" />
                            <p className="text-red-700">{error}</p>
                        </div>
                    </div>
                )}

                {/* Header */}
                <div className="text-center mb-12">
                    <h1 className="text-4xl font-bold text-gray-900 mb-4">Find & Vote in Elections</h1>
                    <p className="text-xl text-gray-600 max-w-3xl mx-auto">
                        Discover elections from organizations you trust and make your voice heard in democracy
                    </p>
                </div>

                {/* Search */}
                <div className="mb-8">
                    <div className="relative max-w-lg mx-auto">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
                        <input
                            type="text"
                            placeholder="Search elections or organizations..."
                            value={searchTerm}
                            onChange={(e) => {
                                setSearchTerm(e.target.value);
                                setError(null);
                            }}
                            className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 shadow-sm"
                        />
                    </div>
                </div>

                {/* Active Elections */}
                {activeElections.length > 0 && (
                    <section className="mb-12">
                        <div className="flex items-center space-x-3 mb-6">
                            <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse" />
                            <h2 className="text-2xl font-bold text-gray-900">Active Elections</h2>
                            <span className="px-3 py-1 bg-green-100 text-green-800 text-sm font-medium rounded-full">
                                Vote Now
                            </span>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {activeElections.map((election) => (
                                <ElectionCard
                                    key={election.id}
                                    election={election}
                                    onVote={() => handleVoteClick(election)}
                                    isConnected={connectionStatus}
                                />
                            ))}
                        </div>
                    </section>
                )}

                {/* Upcoming Elections */}
                {upcomingElections.length > 0 && (
                    <section className="mb-12">
                        <div className="flex items-center space-x-3 mb-6">
                            <Calendar className="h-6 w-6 text-blue-500" />
                            <h2 className="text-2xl font-bold text-gray-900">Upcoming Elections</h2>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {upcomingElections.map((election) => (
                                <ElectionCard key={election.id} election={election} />
                            ))}
                        </div>
                    </section>
                )}

                {/* Completed Elections */}
                {completedElections.length > 0 && (
                    <section className="mb-12">
                        <div className="flex items-center space-x-3 mb-6">
                            <Vote className="h-6 w-6 text-gray-500" />
                            <h2 className="text-2xl font-bold text-gray-900">Recent Results</h2>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {completedElections.map((election) => (
                                <div key={election.id} className="relative">
                                    <ElectionCard election={election} />
                                    <Link
                                        to={`/results/${election.id}`}
                                        className="absolute top-4 right-4 p-2 bg-white/90 backdrop-blur-sm rounded-lg shadow-md hover:bg-white transition-all duration-200"
                                        aria-label={`View results for ${election.title}`}
                                    >
                                        <ExternalLink className="h-4 w-4 text-gray-600" />
                                    </Link>
                                </div>
                            ))}
                        </div>
                    </section>
                )}

                {/* Organizations */}
                <section className="mb-12">
                    <div className="flex items-center space-x-3 mb-6">
                        <Users className="h-6 w-6 text-purple-500" />
                        <h2 className="text-2xl font-bold text-gray-900">Participating Organizations</h2>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {organizations.map((org) => (
                            <OrganizationCard key={org.id} organization={org} />
                        ))}
                    </div>
                </section>

                {/* No Results */}
                {filteredElections.length === 0 && searchTerm && (
                    <div className="text-center py-12">
                        <Search className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                        <h3 className="text-xl font-semibold text-gray-900 mb-2">No elections found</h3>
                        <p className="text-gray-600">
                            Try adjusting your search terms or check back later for new elections.
                        </p>
                    </div>
                )}

                {/* Voter Auth Modal */}
                {showVoterAuth && selectedElection && (
                    <VoterAuthForm
                        election={selectedElection}
                        onClose={() => {
                            setShowVoterAuth(false);
                            setSelectedElection(null);
                            setError(null);
                        }}
                        onError={(message) => setError(message)}
                    />
                )}
            </div>
        </div>
    );
};

export default VoterExperience;

