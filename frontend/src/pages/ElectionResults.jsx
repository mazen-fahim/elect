import React from 'react';
import { useParams, Link } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import { ArrowLeft, Trophy, Users, Calendar, BarChart3 } from 'lucide-react';
import CandidateCard from '../components/CandidateCard';
import SummaryGenerator from '../components/SummaryGenerator';

let ElectionResults = () => {
    let { electionId } = useParams();
    let { elections, organizations, candidates } = useApp();

    let election = elections.find((e) => e.id === electionId);
    let organization = organizations.find((org) => org.id === election?.organizationId);
    let electionCandidates = candidates.filter((c) => election?.candidates.includes(c.id));

    if (!election) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="text-center">
                    <h1 className="text-2xl font-bold text-gray-900 mb-2">Election Not Found</h1>
                    <p className="text-gray-600 mb-4">The requested election results could not be found.</p>
                    <Link
                        to="/elections"
                        className="px-6 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors duration-200"
                    >
                        Back to Elections
                    </Link>
                </div>
            </div>
        );
    }

    let sortedCandidates = [...electionCandidates].sort((a, b) => b.votes - a.votes);
    let winner = sortedCandidates[0];
    let totalVotes = election.totalVotes;

    let getVotePercentage = (votes) => {
        return totalVotes > 0 ? ((votes / totalVotes) * 100).toFixed(1) : 0;
    };

    return (
        <div className="min-h-screen py-8 px-4 sm:px-6 lg:px-8">
            <div className="max-w-4xl mx-auto">
                {/* Header */}
                <div className="mb-8">
                    <Link
                        to="/elections"
                        className="inline-flex items-center space-x-2 text-blue-600 hover:text-blue-800 mb-4"
                    >
                        <ArrowLeft className="h-4 w-4" />
                        <span>Back to Elections</span>
                    </Link>

                    <div className="bg-white rounded-2xl shadow-xl border border-gray-200/50 p-8">
                        <div className="text-center mb-6">
                            <h1 className="text-3xl font-bold text-gray-900 mb-2">{election.title}</h1>
                            <p className="text-gray-600 mb-4">{organization?.name}</p>
                            <span className="inline-flex items-center px-4 py-2 rounded-full text-sm font-medium bg-green-100 text-green-800 border border-green-200">
                                Election Completed
                            </span>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            <div className="text-center">
                                <div className="flex items-center justify-center mb-2">
                                    <Users className="h-5 w-5 text-blue-500 mr-2" />
                                    <span className="text-sm font-medium text-gray-600">Total Votes</span>
                                </div>
                                <div className="text-2xl font-bold text-gray-900">{totalVotes.toLocaleString()}</div>
                            </div>
                            <div className="text-center">
                                <div className="flex items-center justify-center mb-2">
                                    <Calendar className="h-5 w-5 text-purple-500 mr-2" />
                                    <span className="text-sm font-medium text-gray-600">Election Period</span>
                                </div>
                                <div className="text-sm text-gray-900">
                                    {election.startDate} - {election.endDate}
                                </div>
                            </div>
                            <div className="text-center">
                                <div className="flex items-center justify-center mb-2">
                                    <BarChart3 className="h-5 w-5 text-green-500 mr-2" />
                                    <span className="text-sm font-medium text-gray-600">Candidates</span>
                                </div>
                                <div className="text-2xl font-bold text-gray-900">{electionCandidates.length}</div>
                            </div>
                        </div>
                    </div>
                </div>

                {winner && totalVotes > 0 && (
                    <div className="bg-gradient-to-r from-yellow-50 to-orange-50 rounded-2xl border border-yellow-200 p-8 mb-8">
                        <div className="text-center">
                            <Trophy className="h-12 w-12 text-yellow-500 mx-auto mb-4" />
                            <h2 className="text-2xl font-bold text-gray-900 mb-2">Winner</h2>
                            <h3 className="text-3xl font-bold text-yellow-600 mb-2">{winner.name}</h3>
                            <p className="text-lg text-gray-700 mb-2">{winner.party}</p>
                            <div className="text-xl font-semibold text-gray-900">
                                {winner.votes.toLocaleString()} votes ({getVotePercentage(winner.votes)}%)
                            </div>
                        </div>
                    </div>
                )}

                <SummaryGenerator election={election} winner={winner} />

                <div className="bg-white rounded-2xl shadow-xl border border-gray-200/50 p-8 mb-8">
                    <h2 className="text-2xl font-bold text-gray-900 mb-6">Detailed Results</h2>

                    <div className="space-y-4">
                        {sortedCandidates.map((candidate, index) => (
                            <div key={candidate.id} className="border border-gray-200 rounded-lg p-6">
                                <div className="flex items-center justify-between mb-4">
                                    <div className="flex items-center space-x-3">
                                        <div
                                            className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-white ${
                                                index === 0
                                                    ? 'bg-yellow-500'
                                                    : index === 1
                                                      ? 'bg-gray-400'
                                                      : index === 2
                                                        ? 'bg-orange-400'
                                                        : 'bg-gray-300'
                                            }`}
                                        >
                                            {index + 1}
                                        </div>
                                        <h3 className="text-lg font-semibold text-gray-900">Position {index + 1}</h3>
                                    </div>
                                    <div className="text-right">
                                        <div className="text-lg font-bold text-gray-900">
                                            {candidate.votes.toLocaleString()} votes
                                        </div>
                                        <div className="text-sm text-gray-600">
                                            {getVotePercentage(candidate.votes)}% of total
                                        </div>
                                    </div>
                                </div>

                                <CandidateCard candidate={candidate} showVotes={false} />

                                <div className="mt-4">
                                    <div className="w-full bg-gray-200 rounded-full h-3">
                                        <div
                                            className={`h-3 rounded-full transition-all duration-1000 ${
                                                index === 0
                                                    ? 'bg-gradient-to-r from-yellow-400 to-yellow-500'
                                                    : index === 1
                                                      ? 'bg-gradient-to-r from-gray-400 to-gray-500'
                                                      : index === 2
                                                        ? 'bg-gradient-to-r from-orange-400 to-orange-500'
                                                        : 'bg-gradient-to-r from-gray-300 to-gray-400'
                                            }`}
                                            style={{
                                                width: `${getVotePercentage(candidate.votes)}%`,
                                            }}
                                        />
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                <div className="bg-white rounded-2xl shadow-xl border border-gray-200/50 p-8">
                    <h2 className="text-2xl font-bold text-gray-900 mb-6">Election Information</h2>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                            <h3 className="text-lg font-semibold text-gray-900 mb-3">Details</h3>
                            <dl className="space-y-2">
                                <div>
                                    <dt className="text-sm font-medium text-gray-600">Election Type</dt>
                                    <dd className="text-sm text-gray-900">{election.type}</dd>
                                </div>
                                <div>
                                    <dt className="text-sm font-medium text-gray-600">Start Date</dt>
                                    <dd className="text-sm text-gray-900">{election.startDate}</dd>
                                </div>
                                <div>
                                    <dt className="text-sm font-medium text-gray-600">End Date</dt>
                                    <dd className="text-sm text-gray-900">{election.endDate}</dd>
                                </div>
                            </dl>
                        </div>

                        <div>
                            <h3 className="text-lg font-semibold text-gray-900 mb-3">Organization</h3>
                            <dl className="space-y-2">
                                <div>
                                    <dt className="text-sm font-medium text-gray-600">Name</dt>
                                    <dd className="text-sm text-gray-900">{organization?.name}</dd>
                                </div>
                                <div>
                                    <dt className="text-sm font-medium text-gray-600">Type</dt>
                                    <dd className="text-sm text-gray-900">{organization?.type}</dd>
                                </div>
                                <div>
                                    <dt className="text-sm font-medium text-gray-600">Contact</dt>
                                    <dd className="text-sm text-gray-900">{organization?.email}</dd>
                                </div>
                            </dl>
                        </div>
                    </div>

                    <div className="mt-6 pt-6 border-t border-gray-200">
                        <h3 className="text-lg font-semibold text-gray-900 mb-3">Description</h3>
                        <p className="text-gray-600">{election.description}</p>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ElectionResults;
