import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import { Search, Vote, Calendar, Users, ExternalLink } from 'lucide-react';
import VoterAuthForm from '../components/VoterAuthForm';
import ElectionCard from '../components/ElectionCard';
import OrganizationCard from '../components/OrganizationCard';

let VoterExperience = () => {
    let { organizations, elections, candidates } = useApp();
    let [searchTerm, setSearchTerm] = useState('');
    let [selectedElection, setSelectedElection] = useState(null);
    let [showVoterAuth, setShowVoterAuth] = useState(false);

    let filteredElections = elections.filter((election) => {
        let org = organizations.find((o) => o.id === election.organizationId);
        return (
            election.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
            election.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
            org?.name.toLowerCase().includes(searchTerm.toLowerCase())
        );
    });

    let activeElections = filteredElections.filter((e) => e.status === 'active');
    let upcomingElections = filteredElections.filter((e) => e.status === 'upcoming');
    let completedElections = filteredElections.filter((e) => e.status === 'completed');

    let handleVoteClick = (election) => {
        setSelectedElection(election);
        setShowVoterAuth(true);
    };

    return (
        <div className="min-h-screen py-8 px-4 sm:px-6 lg:px-8">
            <div className="max-w-7xl mx-auto">
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
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 shadow-sm"
                        />
                    </div>
                </div>

                {activeElections.length > 0 && (
                    <section className="mb-12">
                        <div className="flex items-center space-x-3 mb-6">
                            <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
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
                                />
                            ))}
                        </div>
                    </section>
                )}

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
                                    >
                                        <ExternalLink className="h-4 w-4 text-gray-600" />
                                    </Link>
                                </div>
                            ))}
                        </div>
                    </section>
                )}

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

                {filteredElections.length === 0 && searchTerm && (
                    <div className="text-center py-12">
                        <Search className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                        <h3 className="text-xl font-semibold text-gray-900 mb-2">No elections found</h3>
                        <p className="text-gray-600">
                            Try adjusting your search terms or check back later for new elections.
                        </p>
                    </div>
                )}

                {showVoterAuth && selectedElection && (
                    <VoterAuthForm
                        election={selectedElection}
                        onClose={() => {
                            setShowVoterAuth(false);
                            setSelectedElection(null);
                        }}
                    />
                )}
            </div>
        </div>
    );
};

export default VoterExperience;

