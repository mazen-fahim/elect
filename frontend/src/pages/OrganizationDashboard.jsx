import React, { useState } from 'react';
import { useParams } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import { Plus, Edit, Trash2, Users, Vote, Settings, Bell, Upload, AlertTriangle } from 'lucide-react';

let OrganizationDashboard = () => {
    let { id } = useParams();
    let { user, organizations, elections, candidates, addElection, addCandidate, notifications } = useApp();
    let [activeTab, setActiveTab] = useState('overview');
    let [showCreateElection, setShowCreateElection] = useState(false);
    let [showUploadWarning, setShowUploadWarning] = useState(false);
    let [showCreateCandidate, setShowCreateCandidate] = useState(false);

    let organization = organizations.find((org) => org.id === id);
    let orgElections = elections.filter((e) => e.organizationId === id);
    let orgCandidates = candidates.filter((c) => orgElections.some((e) => e.candidates.includes(c.id)));

    if (!organization) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="text-center">
                    <h1 className="text-2xl font-bold text-gray-900 mb-2">Organization Not Found</h1>
                    <p className="text-gray-600">The requested organization does not exist.</p>
                </div>
            </div>
        );
    }

    let CreateElectionModal = () => {
        let [formData, setFormData] = useState({
            title: '',
            description: '',
            type: 'simple',
            startDate: '',
            endDate: '',
            voterEligibilityUrl: '',
        });

        let handleSubmit = (e) => {
            e.preventDefault();
            let election = {
                ...formData,
                organizationId: id,
                status: 'upcoming',
                candidates: [],
                totalVotes: 0,
            };
            addElection(election);
            setShowCreateElection(false);
            setFormData({
                title: '',
                description: '',
                type: 'simple',
                startDate: '',
                endDate: '',
                voterEligibilityUrl: '',
            });
        };

        return (
            <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                <div className="bg-white rounded-xl p-8 max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
                    <h3 className="text-2xl font-bold text-gray-900 mb-6">Create New Election</h3>
                    <form onSubmit={handleSubmit} className="space-y-6">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">Election Title</label>
                            <input
                                type="text"
                                value={formData.title}
                                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                required
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">Description</label>
                            <textarea
                                value={formData.description}
                                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                rows="3"
                                required
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">Election Type</label>
                            <select
                                value={formData.type}
                                onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            >
                                <option value="simple">Simple Election</option>
                                <option value="district-based">District-Based</option>
                                <option value="governorate-based">Governorate-Based</option>
                            </select>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">Start Date</label>
                                <input
                                    type="date"
                                    value={formData.startDate}
                                    onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                    required
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">End Date</label>
                                <input
                                    type="date"
                                    value={formData.endDate}
                                    onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                    required
                                />
                            </div>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Voter Eligibility API URL
                            </label>
                            <input
                                type="url"
                                value={formData.voterEligibilityUrl}
                                onChange={(e) => setFormData({ ...formData, voterEligibilityUrl: e.target.value })}
                                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                placeholder="https://api.your-system.com/verify-voter"
                                required
                            />
                        </div>
                        <div className="flex space-x-4">
                            <button
                                type="submit"
                                className="flex-1 px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg font-medium hover:from-blue-700 hover:to-purple-700 transition-all duration-200"
                            >
                                Create Election
                            </button>
                            <button
                                type="button"
                                onClick={() => setShowCreateElection(false)}
                                className="px-6 py-3 bg-gray-200 text-gray-800 rounded-lg font-medium hover:bg-gray-300 transition-colors duration-200"
                            >
                                Cancel
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        );
    };

    let FileUploadWithSecurityWarning = () => {
        return (
            <div className="bg-white rounded-xl shadow-lg border border-gray-200/50 p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Upload Voter List (CSV)</h3>

                {showUploadWarning && (
                    <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
                        <div className="flex items-start space-x-3">
                            <AlertTriangle className="h-5 w-5 text-yellow-500 mt-0.5" />
                            <div>
                                <h4 className="text-sm font-medium text-yellow-800">Security Warning</h4>
                                <p className="text-sm text-yellow-700 mt-1">
                                    Uploading CSV files for voter verification is less secure than using API
                                    integration. This method is recommended only for small organizations with limited
                                    technical resources. Ensure your CSV file contains only necessary data and is
                                    properly secured.
                                </p>
                            </div>
                        </div>
                    </div>
                )}

                <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
                    <Upload className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-600 mb-4">Drop your CSV file here or click to browse</p>
                    <input
                        type="file"
                        accept=".csv"
                        className="hidden"
                        id="csv-upload"
                        onChange={() => setShowUploadWarning(true)}
                    />
                    <label
                        htmlFor="csv-upload"
                        className="px-6 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors duration-200 cursor-pointer"
                    >
                        Choose File
                    </label>
                </div>

                <div className="mt-4 text-sm text-gray-600">
                    <p className="font-medium mb-2">CSV Format Requirements:</p>
                    <ul className="list-disc list-inside space-y-1">
                        <li>Columns: National ID, Full Name, Email (optional)</li>
                        <li>Maximum file size: 10MB</li>
                        <li>Encoding: UTF-8</li>
                    </ul>
                </div>
            </div>
        );
    };

    let renderOverview = () => (
        <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-white rounded-xl p-6 shadow-lg border border-gray-200/50">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm font-medium text-gray-600">Total Elections</p>
                            <p className="text-3xl font-bold text-gray-900">{orgElections.length}</p>
                        </div>
                        <Vote className="h-12 w-12 text-blue-500" />
                    </div>
                </div>
                <div className="bg-white rounded-xl p-6 shadow-lg border border-gray-200/50">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm font-medium text-gray-600">Total Candidates</p>
                            <p className="text-3xl font-bold text-gray-900">{orgCandidates.length}</p>
                        </div>
                        <Users className="h-12 w-12 text-purple-500" />
                    </div>
                </div>
                <div className="bg-white rounded-xl p-6 shadow-lg border border-gray-200/50">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm font-medium text-gray-600">Total Votes</p>
                            <p className="text-3xl font-bold text-gray-900">
                                {orgElections.reduce((sum, e) => sum + e.totalVotes, 0)}
                            </p>
                        </div>
                        <Vote className="h-12 w-12 text-green-500" />
                    </div>
                </div>
            </div>

            <div className="bg-white rounded-xl shadow-lg border border-gray-200/50 p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Recent Elections</h3>
                <div className="space-y-4">
                    {orgElections.slice(0, 3).map((election) => (
                        <div key={election.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                            <div>
                                <h4 className="font-medium text-gray-900">{election.title}</h4>
                                <p className="text-sm text-gray-600">{election.totalVotes} votes cast</p>
                            </div>
                            <span
                                className={`px-3 py-1 rounded-full text-xs font-medium ${
                                    election.status === 'active'
                                        ? 'bg-green-100 text-green-800'
                                        : election.status === 'upcoming'
                                          ? 'bg-blue-100 text-blue-800'
                                          : 'bg-gray-100 text-gray-800'
                                }`}
                            >
                                {election.status}
                            </span>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );

    return (
        <div className="min-h-screen p-8">
            <div className="max-w-7xl mx-auto">
                <div className="mb-8">
                    <h1 className="text-3xl font-bold text-gray-900">{organization.name}</h1>
                    <p className="text-gray-600">Organization Dashboard</p>
                </div>

                <div className="flex space-x-1 mb-8 bg-white rounded-lg p-1 shadow-sm border border-gray-200">
                    {[
                        { id: 'overview', label: 'Overview', icon: Vote },
                        { id: 'elections', label: 'Elections', icon: Vote },
                        { id: 'candidates', label: 'Candidates', icon: Users },
                        { id: 'voters', label: 'Voter Management', icon: Upload },
                        { id: 'notifications', label: 'Notifications', icon: Bell },
                    ].map((tab) => {
                        const Icon = tab.icon;
                        return (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id)}
                                className={`flex items-center space-x-2 px-4 py-2 rounded-lg font-medium transition-all duration-200 ${
                                    activeTab === tab.id
                                        ? 'bg-blue-600 text-white shadow-md'
                                        : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                                }`}
                            >
                                <Icon className="h-4 w-4" />
                                <span>{tab.label}</span>
                            </button>
                        );
                    })}
                </div>

                {activeTab === 'overview' && renderOverview()}

                {activeTab === 'elections' && (
                    <div className="space-y-6">
                        <div className="flex justify-between items-center">
                            <h2 className="text-2xl font-bold text-gray-900">Elections</h2>
                            <button
                                onClick={() => setShowCreateElection(true)}
                                className="px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg font-medium hover:from-blue-700 hover:to-purple-700 transition-all duration-200 flex items-center space-x-2"
                            >
                                <Plus className="h-4 w-4" />
                                <span>Create Election</span>
                            </button>
                        </div>

                        <div className="grid gap-6">
                            {orgElections.map((election) => (
                                <div
                                    key={election.id}
                                    className="bg-white rounded-xl shadow-lg border border-gray-200/50 p-6"
                                >
                                    <div className="flex justify-between items-start mb-4">
                                        <div>
                                            <h3 className="text-xl font-semibold text-gray-900">{election.title}</h3>
                                            <p className="text-gray-600 mt-1">{election.description}</p>
                                        </div>
                                        <span
                                            className={`px-3 py-1 rounded-full text-xs font-medium ${
                                                election.status === 'active'
                                                    ? 'bg-green-100 text-green-800'
                                                    : election.status === 'upcoming'
                                                      ? 'bg-blue-100 text-blue-800'
                                                      : 'bg-gray-100 text-gray-800'
                                            }`}
                                        >
                                            {election.status}
                                        </span>
                                    </div>
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center space-x-6 text-sm text-gray-600">
                                            <span>Type: {election.type}</span>
                                            <span>Votes: {election.totalVotes}</span>
                                            <span>
                                                {election.startDate} - {election.endDate}
                                            </span>
                                        </div>
                                        <div className="flex space-x-2">
                                            <button className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg">
                                                <Edit className="h-4 w-4" />
                                            </button>
                                            <button className="p-2 text-red-600 hover:bg-red-50 rounded-lg">
                                                <Trash2 className="h-4 w-4" />
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {activeTab === 'voters' && <FileUploadWithSecurityWarning />}

                {showCreateElection && <CreateElectionModal />}
            </div>
        </div>
    );
};

export default OrganizationDashboard;

