import React, { useState, useEffect } from 'react';
import { Plus, Users, Vote, Trash2, Loader2, X, Edit, Save, Shield } from 'lucide-react';
import api, { dummyServiceApi } from '../services/api';
import ConfirmModal from '../components/ConfirmModal';
import { COUNTRIES } from '../constants/countries';
import { useApp } from '../context/AppContext';

const DummyServiceManagement = () => {
    const { user } = useApp();
    
    // Check access control - only admins can access this page
    if (!user || user.role !== 'admin') {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="text-center">
                    <Shield className="h-16 w-16 text-red-500 mx-auto mb-4" />
                    <h1 className="text-2xl font-bold text-gray-900 mb-2">Access Denied</h1>
                    <p className="text-gray-600">This page is restricted to administrators only.</p>
                </div>
            </div>
        );
    }

    const [activeTab, setActiveTab] = useState('candidates');
    const [candidates, setCandidates] = useState([]);
    const [voters, setVoters] = useState([]);
    const [elections, setElections] = useState([]);  // New state for elections
    const [loading, setLoading] = useState(false);
    
    // Form states
    const [showCandidateForm, setShowCandidateForm] = useState(false);
    const [showVoterForm, setShowVoterForm] = useState(false);
    const [editingCandidate, setEditingCandidate] = useState(null);
    const [editingVoter, setEditingVoter] = useState(null);
    
    // Confirmation modal states
    const [deleteCandidateModal, setDeleteCandidateModal] = useState({ isOpen: false, candidateId: null });
    const [deleteVoterModal, setDeleteVoterModal] = useState({ isOpen: false, voterId: null });
    
    // Form data
    const [candidateForm, setCandidateForm] = useState({
        hashed_national_id: '',
        name: '',
        district: '',
        governorate: '',
        country: 'United_States',
        party: '',
        symbol_icon_url: '',
        symbol_name: '',
        photo_url: '',
        birth_date: '',  // Now optional
        description: '',
        election_id: ''  // New field for election selection
    });
    
    const [voterForm, setVoterForm] = useState({
        voter_hashed_national_id: '',
        phone_number: '',
        governerate: '',
        district: '',
        eligible_candidates: [],  // Now an array of candidate IDs
        election_id: ''  // New field for election selection
    });
    
    useEffect(() => {
        fetchCandidates();
        fetchVoters();
        fetchElections();  // New function call
    }, []);

    const fetchCandidates = async () => {
        try {
            const response = await dummyServiceApi.listCandidates();
            setCandidates(response);
        } catch (error) {
            console.error('Error fetching candidates:', error);
        }
    };

    const fetchVoters = async () => {
        try {
            const response = await dummyServiceApi.listVoters();
            setVoters(response);
        } catch (error) {
            console.error('Error fetching voters:', error);
        }
    };

    const fetchElections = async () => {
        try {
            const response = await api.get('/home/elections');
            setElections(response.elections || response);
        } catch (error) {
            console.error('Error fetching elections:', error);
        }
    };

    const handleCreateCandidate = async (e) => {
        e.preventDefault();
        try {
            await dummyServiceApi.createCandidate(candidateForm);
            setShowCandidateForm(false);
            resetCandidateForm();
            await fetchCandidates();
        } catch (error) {
            console.error('Failed to create candidate:', error);
        }
    };

    const handleCreateVoter = async (e) => {
        e.preventDefault();
        try {
            const voterData = {
                ...voterForm,
                eligible_candidates: voterForm.eligible_candidates.filter(id => id.trim() !== '')
            };
            await dummyServiceApi.createVoter(voterData);
            setShowVoterForm(false);
            resetVoterForm();
            await fetchVoters();
        } catch (error) {
            console.error('Failed to create voter:', error);
        }
    };

    const handleDeleteCandidate = async (candidateId) => {
        setDeleteCandidateModal({ isOpen: true, candidateId });
    };

    const confirmDeleteCandidate = async () => {
        try {
            await dummyServiceApi.deleteCandidate(deleteCandidateModal.candidateId);
            await fetchCandidates();
            setDeleteCandidateModal({ isOpen: false, candidateId: null });
        } catch (error) {
            console.error('Failed to delete candidate:', error);
        }
    };

    const handleDeleteVoter = async (voterId) => {
        setDeleteVoterModal({ isOpen: true, voterId });
    };

    const confirmDeleteVoter = async () => {
        try {
            await dummyServiceApi.deleteVoter(deleteVoterModal.voterId);
            await fetchVoters();
            setDeleteVoterModal({ isOpen: false, voterId: null });
        } catch (error) {
            console.error('Failed to delete voter:', error);
        }
    };

    const resetCandidateForm = () => {
        setCandidateForm({
            hashed_national_id: '',
            name: '',
            district: '',
            governorate: '',
            country: 'United_States',
            party: '',
            symbol_icon_url: '',
            symbol_name: '',
            photo_url: '',
            birth_date: '',  // Now optional
            description: '',
            election_id: ''  // New field for election selection
        });
        setEditingCandidate(null);
    };

    const resetVoterForm = () => {
        setVoterForm({
            voter_hashed_national_id: '',
            phone_number: '',
            governerate: '',
            district: '',
            eligible_candidates: [],
            election_id: ''
        });
        setEditingVoter(null);
    };

    const handleCandidateSubmit = async (e) => {
        e.preventDefault();
        try {
            if (editingCandidate) {
                await dummyServiceApi.updateCandidate(editingCandidate.hashed_national_id, candidateForm);
                showToast('success', 'Candidate updated successfully!');
            } else {
                await dummyServiceApi.createCandidate(candidateForm);
                showToast('success', 'Candidate created successfully!');
            }
            setShowCandidateForm(false);
            resetCandidateForm();
            fetchCandidates();
        } catch (error) {
            console.error('Error saving candidate:', error);
            showToast('error', 'Failed to save candidate. Please try again.');
        }
    };

    const renderCandidatesTab = () => (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h2 className="text-2xl font-bold text-gray-900">Dummy Candidates</h2>
                <button
                    onClick={() => setShowCandidateForm(true)}
                    className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700"
                >
                    <Plus className="h-4 w-4 mr-2" />
                    Add Candidate
                </button>
            </div>

            {loading ? (
                <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
                    <span className="ml-2 text-gray-600">Loading candidates...</span>
                </div>
            ) : (
                <div className="bg-white shadow overflow-hidden sm:rounded-md">
                    <ul className="divide-y divide-gray-200">
                        {candidates.map((candidate) => (
                            <li key={candidate.hashed_national_id}>
                                <div className="px-4 py-4 sm:px-6">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center space-x-3">
                                            <div className="flex-shrink-0">
                                                <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center">
                                                    <Users className="h-5 w-5 text-blue-600" />
                                                </div>
                                            </div>
                                            <div>
                                                <div className="text-sm font-medium text-gray-900">
                                                    {candidate.name}
                                                </div>
                                                <div className="text-sm text-gray-500">
                                                    National ID: {candidate.hashed_national_id.substring(0, 8)}...
                                                </div>
                                                <div className="text-xs text-gray-400">
                                                    {candidate.party && `Party: ${candidate.party}`}
                                                    {candidate.district && ` • District: ${candidate.district}`}
                                                    {candidate.governorate && ` • Governorate: ${candidate.governorate}`}
                                                </div>
                                            </div>
                                        </div>
                                        <div className="flex items-center space-x-2">
                                            <button
                                                onClick={() => handleDeleteCandidate(candidate.hashed_national_id)}
                                                className="inline-flex items-center px-3 py-1 border border-transparent text-sm leading-4 font-medium rounded-md text-red-700 bg-red-100 hover:bg-red-200"
                                            >
                                                <Trash2 className="h-4 w-4 mr-1" />
                                                Delete
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </li>
                        ))}
                        {candidates.length === 0 && (
                            <li className="px-4 py-8 text-center text-gray-500">
                                No candidates found. Create your first candidate to get started.
                            </li>
                        )}
                    </ul>
                </div>
            )}
        </div>
    );

    const renderVotersTab = () => (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h2 className="text-2xl font-bold text-gray-900">Dummy Voters</h2>
                <button
                    onClick={() => setShowVoterForm(true)}
                    className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700"
                >
                    <Plus className="h-4 w-4 mr-2" />
                    Add Voter
                </button>
            </div>

            {loading ? (
                <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
                    <span className="ml-2 text-gray-600">Loading voters...</span>
                </div>
            ) : (
                <div className="bg-white shadow overflow-hidden sm:rounded-md">
                    <ul className="divide-y divide-gray-200">
                        {voters.map((voter) => (
                            <li key={voter.voter_hashed_national_id}>
                                <div className="px-4 py-4 sm:px-6">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center space-x-3">
                                            <div className="flex-shrink-0">
                                                <div className="h-10 w-10 rounded-full bg-green-100 flex items-center justify-center">
                                                    <Vote className="h-5 w-5 text-green-600" />
                                                </div>
                                            </div>
                                            <div>
                                                <div className="text-sm font-medium text-gray-900">
                                                    Phone: {voter.phone_number}
                                                </div>
                                                <div className="text-sm text-gray-500">
                                                    National ID: {voter.voter_hashed_national_id.substring(0, 8)}...
                                                </div>
                                                <div className="text-xs text-gray-400">
                                                    {voter.district && `District: ${voter.district}`}
                                                    {voter.governerate && ` • Governorate: ${voter.governerate}`}
                                                    {voter.eligible_candidates && ` • ${voter.eligible_candidates.length} eligible candidates`}
                                                </div>
                                            </div>
                                        </div>
                                        <div className="flex items-center space-x-2">
                                            <button
                                                onClick={() => handleDeleteVoter(voter.voter_hashed_national_id)}
                                                className="inline-flex items-center px-3 py-1 border border-transparent text-sm leading-4 font-medium rounded-md text-red-700 bg-red-100 hover:bg-red-200"
                                            >
                                                <Trash2 className="h-4 w-4 mr-1" />
                                                Delete
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </li>
                        ))}
                        {voters.length === 0 && (
                            <li className="px-4 py-8 text-center text-gray-500">
                                No voters found. Create your first voter to get started.
                            </li>
                        )}
                    </ul>
                </div>
            )}
        </div>
    );

    return (
        <div className="min-h-screen p-8">
            <div className="max-w-7xl mx-auto">
                <div className="mb-8">
                    <h1 className="text-3xl font-bold text-gray-900">Dummy Service Management</h1>
                    <p className="text-gray-600">Manage test data for API-based elections</p>
                </div>

                <div className="flex space-x-1 mb-8 bg-white rounded-lg p-1 shadow-sm border border-gray-200">
                    {[
                        { id: 'candidates', label: 'Candidates', icon: Users },
                        { id: 'voters', label: 'Voters', icon: Vote },
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

                {activeTab === 'candidates' && renderCandidatesTab()}
                {activeTab === 'voters' && renderVotersTab()}

                {/* Candidate Form Modal */}
                {showCandidateForm && (
                    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                        <div className="bg-white rounded-xl p-8 max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
                            <div className="flex items-center justify-between mb-6">
                                <h3 className="text-2xl font-bold text-gray-900">
                                    {editingCandidate ? 'Edit Candidate' : 'Add New Candidate'}
                                </h3>
                                <button
                                    onClick={() => {
                                        setShowCandidateForm(false);
                                        resetCandidateForm();
                                    }}
                                    className="text-gray-400 hover:text-gray-600"
                                >
                                    <X className="h-6 w-6" />
                                </button>
                            </div>

                            <form onSubmit={handleCreateCandidate} className="space-y-6">
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">
                                            National ID
                                        </label>
                                        <input
                                            type="text"
                                            value={candidateForm.hashed_national_id}
                                            onChange={(e) => setCandidateForm({ ...candidateForm, hashed_national_id: e.target.value })}
                                            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                            required
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">
                                            Name
                                        </label>
                                        <input
                                            type="text"
                                            value={candidateForm.name}
                                            onChange={(e) => setCandidateForm({ ...candidateForm, name: e.target.value })}
                                            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                            required
                                        />
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">
                                            District
                                        </label>
                                        <input
                                            type="text"
                                            value={candidateForm.district}
                                            onChange={(e) => setCandidateForm({ ...candidateForm, district: e.target.value })}
                                            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">
                                            Governorate
                                        </label>
                                        <input
                                            type="text"
                                            value={candidateForm.governorate}
                                            onChange={(e) => setCandidateForm({ ...candidateForm, governorate: e.target.value })}
                                            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                        />
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">
                                            Country
                                        </label>
                                        <select
                                            value={candidateForm.country}
                                            onChange={(e) => setCandidateForm({ ...candidateForm, country: e.target.value })}
                                            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                            required
                                        >
                                            {COUNTRIES.map(country => (
                                                <option key={country} value={country}>
                                                    {country.replace('_', ' ')}
                                                </option>
                                            ))}
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">
                                            Party
                                        </label>
                                        <input
                                            type="text"
                                            value={candidateForm.party}
                                            onChange={(e) => setCandidateForm({ ...candidateForm, party: e.target.value })}
                                            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                        />
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">
                                            Symbol Name
                                        </label>
                                        <input
                                            type="text"
                                            value={candidateForm.symbol_name}
                                            onChange={(e) => setCandidateForm({ ...candidateForm, symbol_name: e.target.value })}
                                            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">
                                            Birth Date
                                        </label>
                                        <input
                                            type="date"
                                            value={candidateForm.birth_date}
                                            onChange={(e) => setCandidateForm({ ...candidateForm, birth_date: e.target.value })}
                                            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                        />
                                        <p className="text-xs text-gray-500 mt-1">Optional</p>
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        Description
                                    </label>
                                    <textarea
                                        value={candidateForm.description}
                                        onChange={(e) => setCandidateForm({ ...candidateForm, description: e.target.value })}
                                        rows={3}
                                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                    />
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">
                                            Election *
                                        </label>
                                        <select
                                            value={candidateForm.election_id}
                                            onChange={(e) => setCandidateForm({ ...candidateForm, election_id: e.target.value })}
                                            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                            required
                                        >
                                            <option value="">Select an election</option>
                                            {elections.map(election => (
                                                <option key={election.id} value={election.id}>
                                                    {election.title} (ID: {election.id})
                                                </option>
                                            ))}
                                        </select>
                                        <p className="text-xs text-gray-500 mt-1">Select which election this candidate belongs to</p>
                                    </div>
                                </div>

                                <div className="flex space-x-4">
                                    <button
                                        type="submit"
                                        className="flex-1 px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg font-medium hover:from-blue-700 hover:to-purple-700 transition-all duration-200"
                                    >
                                        <Save className="h-4 w-4 mr-2 inline" />
                                        {editingCandidate ? 'Update Candidate' : 'Create Candidate'}
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setShowCandidateForm(false);
                                            resetCandidateForm();
                                        }}
                                        className="px-6 py-3 bg-gray-200 text-gray-800 rounded-lg font-medium hover:bg-gray-300 transition-colors duration-200"
                                    >
                                        Cancel
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                )}

                {/* Voter Form Modal */}
                {showVoterForm && (
                    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                        <div className="bg-white rounded-xl p-8 max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
                            <div className="flex items-center justify-between mb-6">
                                <h3 className="text-2xl font-bold text-gray-900">
                                    {editingVoter ? 'Edit Voter' : 'Add New Voter'}
                                </h3>
                                <button
                                    onClick={() => {
                                        setShowVoterForm(false);
                                        resetVoterForm();
                                    }}
                                    className="text-gray-400 hover:text-gray-600"
                                >
                                    <X className="h-6 w-6" />
                                </button>
                            </div>

                            <form onSubmit={handleCreateVoter} className="space-y-6">
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">
                                            National ID
                                        </label>
                                        <input
                                            type="text"
                                            value={voterForm.voter_hashed_national_id}
                                            onChange={(e) => setVoterForm({ ...voterForm, voter_hashed_national_id: e.target.value })}
                                            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                            required
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">
                                            Phone Number
                                        </label>
                                        <input
                                            type="tel"
                                            value={voterForm.phone_number}
                                            onChange={(e) => setVoterForm({ ...voterForm, phone_number: e.target.value })}
                                            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                            required
                                        />
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">
                                            District
                                        </label>
                                        <input
                                            type="text"
                                            value={voterForm.district}
                                            onChange={(e) => setVoterForm({ ...voterForm, district: e.target.value })}
                                            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">
                                            Governorate
                                        </label>
                                        <input
                                            type="text"
                                            value={voterForm.governerate}
                                            onChange={(e) => setVoterForm({ ...voterForm, governorate: e.target.value })}
                                            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                        />
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        Eligible Candidates
                                    </label>
                                    <select
                                        multiple
                                        value={voterForm.eligible_candidates}
                                        onChange={(e) => {
                                            const selectedOptions = Array.from(e.target.selectedOptions, option => option.value);
                                            setVoterForm({ ...voterForm, eligible_candidates: selectedOptions });
                                        }}
                                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 min-h-[100px]"
                                        disabled={!voterForm.election_id}
                                    >
                                        {voterForm.election_id && candidates
                                            .filter(candidate => candidate.election_id === parseInt(voterForm.election_id))
                                            .map(candidate => (
                                                <option key={candidate.hashed_national_id} value={candidate.hashed_national_id}>
                                                    {candidate.name} ({candidate.hashed_national_id.substring(0, 8)}...)
                                                </option>
                                            ))
                                        }
                                    </select>
                                    <p className="text-xs text-gray-500 mt-1">
                                        Hold Ctrl/Cmd to select multiple candidates. Only shows candidates from the selected election.
                                        {!voterForm.election_id && ' Please select an election first.'}
                                    </p>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">
                                            Election *
                                        </label>
                                        <select
                                            value={voterForm.election_id}
                                            onChange={(e) => setVoterForm({ ...voterForm, election_id: e.target.value })}
                                            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                            required
                                        >
                                            <option value="">Select an election</option>
                                            {elections.map(election => (
                                                <option key={election.id} value={election.id}>
                                                    {election.title} (ID: {election.id})
                                                </option>
                                            ))}
                                        </select>
                                        <p className="text-xs text-gray-500 mt-1">Select which election this voter belongs to</p>
                                    </div>
                                </div>

                                <div className="flex space-x-4">
                                    <button
                                        type="submit"
                                        className="flex-1 px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg font-medium hover:from-blue-700 hover:to-purple-700 transition-all duration-200"
                                    >
                                        <Save className="h-4 w-4 mr-2 inline" />
                                        {editingVoter ? 'Update Voter' : 'Create Voter'}
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setShowVoterForm(false);
                                            resetVoterForm();
                                        }}
                                        className="px-6 py-3 bg-gray-200 text-gray-800 rounded-lg font-medium hover:bg-gray-300 transition-colors duration-200"
                                    >
                                        Cancel
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                )}
            </div>

            {/* Confirmation Modals */}
            <ConfirmModal
                isOpen={deleteCandidateModal.isOpen}
                onClose={() => setDeleteCandidateModal({ isOpen: false, candidateId: null })}
                onConfirm={confirmDeleteCandidate}
                title="Delete Candidate"
                message="Are you sure you want to delete this candidate? This action cannot be undone."
                confirmText="Delete"
                cancelText="Cancel"
                type="danger"
            />

            <ConfirmModal
                isOpen={deleteVoterModal.isOpen}
                onClose={() => setDeleteVoterModal({ isOpen: false, voterId: null })}
                onConfirm={confirmDeleteVoter}
                title="Delete Voter"
                message="Are you sure you want to delete this voter? This action cannot be undone."
                confirmText="Delete"
                cancelText="Cancel"
                type="danger"
            />
        </div>
    );
};

export default DummyServiceManagement;
