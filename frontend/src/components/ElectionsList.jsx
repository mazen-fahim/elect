import React, { useState, useEffect } from 'react';
import { Search, Filter, Calendar, Users, Vote, Eye, Plus, Edit, Trash2, AlertCircle } from 'lucide-react';
import api from '../services/api';
import ElectionDetails from './ElectionDetails';
import DeleteConfirmationModal from './DeleteConfirmationModal';
import ElectionEditModal from './ElectionEditModal';
import Toast from './Toast';

const ElectionsList = ({ onCreateElection }) => {
    const [elections, setElections] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState('');
    const [typeFilter, setTypeFilter] = useState('');
    const [activeTab, setActiveTab] = useState('all');
    const [selectedElection, setSelectedElection] = useState(null);
    const [showDetails, setShowDetails] = useState(false);
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [electionToDelete, setElectionToDelete] = useState(null);
    const [showEditModal, setShowEditModal] = useState(false);
    const [electionToEdit, setElectionToEdit] = useState(null);
    const [toast, setToast] = useState({ isVisible: false, type: '', message: '' });

    useEffect(() => {
        fetchElections();
    }, []);

    const fetchElections = async () => {
        try {
            setLoading(true);
            const params = new URLSearchParams();
            if (searchTerm) params.append('search', searchTerm);
            if (statusFilter) params.append('status_filter', statusFilter);
            if (typeFilter) params.append('election_type', typeFilter);
            
            const response = await api.get(`/election/organization?${params.toString()}`);
            setElections(response);
            setError(null);
        } catch (err) {
            setError('Failed to fetch elections');
            console.error('Error fetching elections:', err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        const debounceTimer = setTimeout(() => {
            fetchElections();
        }, 300);

        return () => clearTimeout(debounceTimer);
    }, [searchTerm, statusFilter, typeFilter]);

    const getStatusColor = (status) => {
        switch (status) {
            case 'upcoming':
                return 'bg-blue-100 text-blue-800';
            case 'running':
                return 'bg-green-100 text-green-800';
            case 'finished':
                return 'bg-gray-100 text-gray-800';
            default:
                return 'bg-yellow-100 text-yellow-800';
        }
    };

    const handleElectionClick = (election) => {
        setSelectedElection(election);
        setShowDetails(true);
    };

    const showToast = (type, message) => {
        setToast({ isVisible: true, type, message });
    };

    const hideToast = () => {
        setToast({ isVisible: false, type: '', message: '' });
    };

    const handleEditElection = (election) => {
        setElectionToEdit(election);
        setShowEditModal(true);
        setShowDetails(false);
    };

    const handleEditSuccess = async () => {
        await fetchElections(); // Refresh the list to show updated data
        setShowEditModal(false);
        setElectionToEdit(null);
        showToast('success', 'Election updated successfully!');
    };

    const closeEditModal = () => {
        setShowEditModal(false);
        setElectionToEdit(null);
    };

    const handleDeleteElection = (election) => {
        setElectionToDelete(election);
        setShowDeleteModal(true);
    };

    const confirmDeleteElection = async () => {
        if (!electionToDelete) return;
        
        try {
            await api.delete(`/election/${electionToDelete.id}`);
            await fetchElections(); // Refresh the list
            setShowDetails(false);
            setShowDeleteModal(false);
            setElectionToDelete(null);
            showToast('success', 'Election deleted successfully');
        } catch (error) {
            console.error('Error deleting election:', error);
            if (error.response?.status === 400) {
                showToast('error', 'Cannot delete this election. Only upcoming elections can be deleted.');
            } else {
                showToast('error', 'Failed to delete election. Please try again.');
            }
        }
    };

    const cancelDeleteElection = () => {
        setShowDeleteModal(false);
        setElectionToDelete(null);
    };

    const closeDetails = () => {
        setShowDetails(false);
        setSelectedElection(null);
    };

    const getElectionTypeDisplay = (type) => {
        switch (type) {
            case 'simple':
                return 'Simple';
            case 'district_based':
                return 'District-Based';
            case 'governorate_based':
                return 'Governorate-Based';
            default:
                return type;
        }
    };

    const formatDate = (dateString) => {
        return new Date(dateString).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    const filteredElections = (elections || []).filter(election => {
        if (activeTab === 'all') return true;
        return election.computed_status === activeTab;
    });

    const getTabCount = (status) => {
        if (status === 'all') return (elections || []).length;
        return (elections || []).filter(e => e.computed_status === status).length;
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                <span className="ml-2 text-gray-600">Loading elections...</span>
            </div>
        );
    }

    if (error) {
        return (
            <div className="text-center py-12">
                <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">Error Loading Elections</h3>
                <p className="text-gray-600 mb-4">{error}</p>
                <button
                    onClick={fetchElections}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                    Try Again
                </button>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex justify-between items-center">
                <h2 className="text-2xl font-bold text-gray-900">Elections</h2>
                <button
                    onClick={onCreateElection}
                    className="px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg font-medium hover:from-blue-700 hover:to-purple-700 transition-all duration-200 flex items-center space-x-2"
                >
                    <Plus className="h-4 w-4" />
                    <span>Create Election</span>
                </button>
            </div>

            {/* Search and Filters */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
                <div className="flex flex-col sm:flex-row gap-4">
                    {/* Search */}
                    <div className="flex-1 relative">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                        <input
                            type="text"
                            placeholder="Search elections by title..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        />
                    </div>

                    {/* Type Filter */}
                    <select
                        value={typeFilter}
                        onChange={(e) => setTypeFilter(e.target.value)}
                        className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    >
                        <option value="">All Types</option>
                        <option value="simple">Simple</option>
                        <option value="district_based">District-Based</option>
                        <option value="governorate_based">Governorate-Based</option>
                    </select>

                    {/* Status Filter for non-tab view */}
                    {activeTab === 'all' && (
                        <select
                            value={statusFilter}
                            onChange={(e) => setStatusFilter(e.target.value)}
                            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        >
                            <option value="">All Statuses</option>
                            <option value="upcoming">Upcoming</option>
                            <option value="running">Running</option>
                            <option value="finished">Finished</option>
                        </select>
                    )}
                </div>
            </div>

            {/* Status Tabs */}
            <div className="border-b border-gray-200">
                <nav className="-mb-px flex space-x-8">
                    {[
                        { key: 'all', label: 'All Elections', count: getTabCount('all') },
                        { key: 'upcoming', label: 'Upcoming', count: getTabCount('upcoming') },
                        { key: 'running', label: 'Running', count: getTabCount('running') },
                        { key: 'finished', label: 'Finished', count: getTabCount('finished') }
                    ].map((tab) => (
                        <button
                            key={tab.key}
                            onClick={() => setActiveTab(tab.key)}
                            className={`py-2 px-1 border-b-2 font-medium text-sm ${
                                activeTab === tab.key
                                    ? 'border-blue-500 text-blue-600'
                                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                            }`}
                        >
                            {tab.label}
                            <span className={`ml-2 px-2 py-0.5 rounded-full text-xs ${
                                activeTab === tab.key ? 'bg-blue-100 text-blue-600' : 'bg-gray-100 text-gray-600'
                            }`}>
                                {tab.count}
                            </span>
                        </button>
                    ))}
                </nav>
            </div>

            {/* Elections List */}
            {filteredElections.length === 0 ? (
                <div className="text-center py-12">
                    <Vote className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">No Elections Found</h3>
                    <p className="text-gray-600 mb-4">
                        {searchTerm || statusFilter || typeFilter
                            ? 'No elections match your current search criteria.'
                            : 'You haven\'t created any elections yet.'}
                    </p>
                    {!searchTerm && !statusFilter && !typeFilter && (
                        <button
                            onClick={onCreateElection}
                            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                        >
                            Create Your First Election
                        </button>
                    )}
                </div>
            ) : (
                <div className="grid gap-6">
                    {filteredElections.map((election) => (
                        <div
                            key={election.id}
                            className="bg-white rounded-xl shadow-lg border border-gray-200/50 p-6 hover:shadow-xl transition-shadow duration-200"
                        >
                            <div className="flex justify-between items-start mb-4">
                                <div className="flex-1 cursor-pointer" onClick={() => handleElectionClick(election)}>
                                    <div className="flex items-center gap-3 mb-2">
                                        <h3 className="text-xl font-semibold text-gray-900">{election.title}</h3>
                                        <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(election.computed_status)}`}>
                                            {election.computed_status.charAt(0).toUpperCase() + election.computed_status.slice(1)}
                                        </span>
                                    </div>
                                    <p className="text-gray-600">Type: {getElectionTypeDisplay(election.types)}</p>
                                </div>
                                <div className="flex space-x-2">
                                    {election.computed_status === 'finished' && (
                                        <button 
                                            className="p-2 text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                                            title="View Results"
                                        >
                                            <Eye className="h-4 w-4" />
                                        </button>
                                    )}
                                    <button 
                                        className={`p-2 rounded-lg transition-colors ${
                                            election.computed_status === 'upcoming'
                                                ? 'text-blue-600 hover:bg-blue-50 cursor-pointer' 
                                                : 'text-gray-400 cursor-not-allowed'
                                        }`}
                                        title={election.computed_status === 'upcoming' 
                                            ? "Edit Election" 
                                            : "Only upcoming elections can be edited"
                                        }
                                        disabled={election.computed_status !== 'upcoming'}
                                        onClick={() => election.computed_status === 'upcoming' && handleEditElection(election)}
                                    >
                                        <Edit className="h-4 w-4" />
                                    </button>
                                    <button 
                                        className={`p-2 rounded-lg transition-colors ${
                                            election.computed_status === 'upcoming'
                                                ? 'text-red-600 hover:bg-red-50 cursor-pointer' 
                                                : 'text-gray-400 cursor-not-allowed'
                                        }`}
                                        title={election.computed_status === 'upcoming' 
                                            ? "Delete Election" 
                                            : "Only upcoming elections can be deleted"
                                        }
                                        disabled={election.computed_status !== 'upcoming'}
                                        onClick={() => election.computed_status === 'upcoming' && handleDeleteElection(election)}
                                    >
                                        <Trash2 className="h-4 w-4" />
                                    </button>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                                <div className="flex items-center space-x-2 text-gray-600">
                                    <Calendar className="h-4 w-4" />
                                    <div>
                                        <p className="font-medium">Start Date</p>
                                        <p>{formatDate(election.starts_at)}</p>
                                    </div>
                                </div>
                                <div className="flex items-center space-x-2 text-gray-600">
                                    <Calendar className="h-4 w-4" />
                                    <div>
                                        <p className="font-medium">End Date</p>
                                        <p>{formatDate(election.ends_at)}</p>
                                    </div>
                                </div>
                                <div className="flex items-center space-x-2 text-gray-600">
                                    <Users className="h-4 w-4" />
                                    <div>
                                        <p className="font-medium">Candidates</p>
                                        <p>{election.number_of_candidates}</p>
                                    </div>
                                </div>
                                <div className="flex items-center space-x-2 text-gray-600">
                                    <Vote className="h-4 w-4" />
                                    <div>
                                        <p className="font-medium">Total Votes</p>
                                        <p>{election.total_vote_count}</p>
                                    </div>
                                </div>
                            </div>

                            <div className="mt-4 pt-4 border-t border-gray-200 flex justify-between items-center text-sm text-gray-500">
                                <span>Created: {formatDate(election.created_at)}</span>
                                <span>Method: {election.method.toUpperCase()}</span>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Details Modal */}
            <ElectionDetails
                election={selectedElection}
                isOpen={showDetails}
                onClose={closeDetails}
                onEdit={handleEditElection}
                onDelete={handleDeleteElection}
            />

            {/* Edit Modal */}
            <ElectionEditModal
                election={electionToEdit}
                isOpen={showEditModal}
                onClose={closeEditModal}
                onSuccess={handleEditSuccess}
            />

            {/* Delete Confirmation Modal */}
            <DeleteConfirmationModal
                isOpen={showDeleteModal}
                onClose={cancelDeleteElection}
                onConfirm={confirmDeleteElection}
                election={electionToDelete}
            />

            {/* Toast Notifications */}
            <Toast
                type={toast.type}
                message={toast.message}
                isVisible={toast.isVisible}
                onClose={hideToast}
            />
        </div>
    );
};

export default ElectionsList;
