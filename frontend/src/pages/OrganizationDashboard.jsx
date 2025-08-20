import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import { Plus, Edit, Trash2, Users, Vote, Settings, Bell, Loader2, Shield } from 'lucide-react';
import CandidatesList from "../components/CandidatesList";
import ElectionsList from "../components/ElectionsList";
import NotificationList from "../components/NotificationList";
import Modal from "../components/Modal";
import OrganizationAdminsTab from "../components/OrganizationAdminsTab";

import { useOrganizationDashboardStats } from '../hooks/useOrganization';
import { paymentApi } from '../services/api';


let OrganizationDashboard = () => {
    let { id } = useParams();
    let { user, isLoading, organizations, elections, candidates, addElection, addCandidate, notifications } = useApp();
    const navigate = useNavigate();
    let [activeTab, setActiveTab] = useState('overview');
    let [showCreateElection, setShowCreateElection] = useState(false);
    // Voter pricing modal state (shown before payment when creating election)
    const [showVoterPricing, setShowVoterPricing] = useState(false);
    const [voterCount, setVoterCount] = useState(1000);
    const PRICE_PER_VOTER = 0.1; // EGP per voter (kept in sync with Payment.jsx)

    let [showCreateCandidate, setShowCreateCandidate] = useState(false);
    const [wallet, setWallet] = useState(0);
    const [walletLoading, setWalletLoading] = useState(true);
    const [walletError, setWalletError] = useState(null);
    const [recentTx, setRecentTx] = useState([]);
    const [txLoading, setTxLoading] = useState(true);
    const [txError, setTxError] = useState(null);
    
    // Modal state
    let [modalConfig, setModalConfig] = useState({ isOpen: false, title: '', message: '', type: 'info' });

    // Fetch dashboard stats from API
    const { data: dashboardStats, isLoading: statsLoading, error: statsError } = useOrganizationDashboardStats();

    // Helper function to show modals
    let showModal = (title, message, type = 'info') => {
        setModalConfig({ isOpen: true, title, message, type });
    };
    const loadWalletAndTx = async () => {
        setWalletLoading(true);
        setWalletError(null);
        setTxLoading(true);
        setTxError(null);
        try {
            const w = await paymentApi.getWallet();
            setWallet(w?.balance ?? 0);
        } catch (e) {
            setWalletError(e?.message || 'Failed to load wallet');
        } finally {
            setWalletLoading(false);
        }

        try {
            const tx = await paymentApi.getTransactions();
            setRecentTx((tx || []).slice(0, 5));
        } catch (e) {
            setTxError(e?.message || 'Failed to load transactions');
        } finally {
            setTxLoading(false);
        }
    };

    useEffect(() => {
        loadWalletAndTx();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // If redirected from payment success with a flag, open the create election modal
    useEffect(() => {
        try {
            const params = new URLSearchParams(window.location.search);
            if (params.get('openCreate') === '1') {
                setShowCreateElection(true);
                // Clean up the URL param without reloading
                const url = new URL(window.location.href);
                url.searchParams.delete('openCreate');
                window.history.replaceState({}, '', url.toString());
            }
        } catch {}
    }, []);

    // Handle Create Election click: ask for voter count, then go to payment and reopen create after success
    const handleCreateElectionClick = async () => {
        // Prefill with last planned voters if available to keep it consistent end-to-end
        try {
            const saved = localStorage.getItem('plannedVoters');
            if (saved && !Number.isNaN(Number(saved))) {
                const n = Math.max(1, Number(saved));
                setVoterCount(n);
            }
        } catch {}
        setShowVoterPricing(true);
    };


    let closeModal = () => {
        setModalConfig({ isOpen: false, title: '', message: '', type: 'info' });
    };

    const proceedToPaymentForVoters = () => {
        const n = Number(voterCount) || 0;
        if (n <= 0) {
            showModal('Invalid number', 'Please enter a positive number of voters.', 'warning');
            return;
        }
        // Compute total in current platform currency (EGP by default) and pass to payment page.
    const totalAmount = (n * PRICE_PER_VOTER).toFixed(2); // align with Stripe rounding (piasters in Payment.jsx)
        try {
            localStorage.setItem('afterPaymentOpenCreate', '1');
            localStorage.setItem('plannedVoters', String(n));
        } catch {}
        const params = new URLSearchParams({
            amount: totalAmount,
            purpose: 'election-voters',
            voters: String(n),
            locked: '1',
        }).toString();
        setShowVoterPricing(false);
        navigate(`/org/payment?${params}`);
    };

    // Show loading while checking authentication
    if (isLoading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="text-center">
                    <Loader2 className="h-8 w-8 animate-spin text-blue-600 mx-auto mb-4" />
                    <p className="text-gray-600">Loading...</p>
                </div>
            </div>
        );
    }

    // Check if user is logged in and is an organization
    if (!user || user.role !== 'organization') {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="text-center">
                    <h1 className="text-2xl font-bold text-gray-900 mb-2">Access Denied</h1>
                    <p className="text-gray-600">You must be logged in as an organization to access this page.</p>
                </div>
            </div>
        );
    }

    // Use the logged-in user's organization data instead of URL params
    const userOrgId = user.organizationId?.toString();
    const urlOrgId = id;

    // Check if the URL organization ID matches the user's organization
    if (userOrgId && urlOrgId && userOrgId !== urlOrgId) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="text-center">
                    <h1 className="text-2xl font-bold text-gray-900 mb-2">Access Denied</h1>
                    <p className="text-gray-600">You can only access your own organization's dashboard.</p>
                </div>
            </div>
        );
    }

    // Create organization object from user data
    let organization = {
        id: userOrgId || urlOrgId,
        name: user.organizationName || 'Your Organization',
        email: user.email,
        // Add other organization fields as needed
    };

    let orgElections = elections.filter((e) => e.organizationId === (userOrgId || urlOrgId));
    let orgCandidates = candidates.filter((c) => orgElections.some((e) => e.candidates.includes(c.id)));
    const currentOrgId = (userOrgId || urlOrgId)?.toString();

    let CreateElectionModal = () => {
        // Prefill potential voters from pricing modal (stored in localStorage)
        let initialPlannedVoters = 100;
        try {
            const saved = localStorage.getItem('plannedVoters');
            if (saved) initialPlannedVoters = Math.max(1, Number(saved) || 100);
        } catch {}

        let [formData, setFormData] = useState({
            title: '',
            description: '',
            type: 'simple',
            startDate: '',
            endDate: '',
            method: 'api', // 'api' or 'csv'
            voterEligibilityUrl: '',
            candidatesFile: null,
            votersFile: null,
            numVotesPerVoter: 1,
            potentialVoters: initialPlannedVoters,
        });

        let handleSubmit = async (e) => {
            e.preventDefault();
            
            // Client-side validation
            const now = new Date();
            const startDateTime = new Date(formData.startDate);
            const endDateTime = new Date(formData.endDate);
            
            if (startDateTime < now) {
                showModal('Invalid Date', 'Start date and time cannot be in the past.', 'error');
                return;
            }
            
            if (endDateTime < startDateTime) {
                showModal('Invalid Date', 'End date and time must be after or equal to start date and time.', 'error');
                return;
            }
            
            if (formData.method === 'csv') {
                // Handle CSV upload
                await handleCsvElectionCreation();
            } else {
                // Handle API method
                await handleApiElectionCreation();
            }
        };

        let handleApiElectionCreation = async () => {
            try {
                const electionData = {
                    title: formData.title,
                    types: 'api_managed', // API will handle voting constraints
                    starts_at: new Date(formData.startDate).toISOString(),
                    ends_at: new Date(formData.endDate).toISOString(),
                    num_of_votes_per_voter: formData.numVotesPerVoter,
                    potential_number_of_voters: formData.potentialVoters,
                    method: 'api',
                    api_endpoint: formData.voterEligibilityUrl,
                };

                // Call API endpoint for election creation
                const { electionApi } = await import('../services/api');
                const newElection = await electionApi.create(electionData);
                
                // Add to local state (this will be replaced with react-query later)
                addElection(newElection);
                setShowCreateElection(false);
                try { localStorage.removeItem('plannedVoters'); } catch {}
                resetForm();
                
            } catch (error) {
                console.error('Error creating election:', error);
                console.error('Full error object:', error);
                console.error('Error response:', error.response);
                console.error('Error message:', error.message);
                
                let errorMessage = 'Failed to create election. Please try again.';
                if (error.message && error.message !== 'Server error. Please try again later.') {
                    errorMessage = error.message;
                } else if (error.response && error.response.detail) {
                    errorMessage = error.response.detail;
                }
                
                showModal('Error', errorMessage, 'error');
            }
        };

        let handleCsvElectionCreation = async () => {
            try {
                if (!formData.candidatesFile || !formData.votersFile) {
                    showModal('Missing Files', 'Please select both candidates and voters CSV files.', 'warning');
                    return;
                }

                const formDataObj = new FormData();
                formDataObj.append('title', formData.title);
                formDataObj.append('types', formData.type);
                formDataObj.append('starts_at', new Date(formData.startDate).toISOString());
                formDataObj.append('ends_at', new Date(formData.endDate).toISOString());
                formDataObj.append('num_of_votes_per_voter', formData.numVotesPerVoter);
                formDataObj.append('potential_number_of_voters', formData.potentialVoters);
                formDataObj.append('candidates_file', formData.candidatesFile);
                formDataObj.append('voters_file', formData.votersFile);

                // Call CSV upload endpoint
                const { electionApi } = await import('../services/api');
                const newElection = await electionApi.createWithCsv(formDataObj);
                
                // Add to local state
                addElection(newElection);
                setShowCreateElection(false);
                try { localStorage.removeItem('plannedVoters'); } catch {}
                resetForm();
                
            } catch (error) {
                console.error('Error creating election with CSV:', error);
                console.error('Full error object:', error);
                console.error('Error response:', error.response);
                console.error('Error message:', error.message);
                
                let errorMessage = 'Failed to create election. Please check your CSV files and try again.';
                if (error.message && error.message !== 'Server error. Please try again later.') {
                    errorMessage = error.message;
                } else if (error.response && error.response.detail) {
                    errorMessage = error.response.detail;
                }
                
                showModal('Error', errorMessage, 'error');
            }
        };

        let resetForm = () => {
            setFormData({
                title: '',
                description: '',
                type: 'simple',
                startDate: '',
                endDate: '',
                method: 'api',
                voterEligibilityUrl: '',
                candidatesFile: null,
                votersFile: null,
                numVotesPerVoter: 1,
                potentialVoters: 100,
            });
        };

        return (
            <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                <div className="bg-white rounded-xl p-8 max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
                    <h3 className="text-2xl font-bold text-gray-900 mb-6">Create New Election</h3>
                    <form onSubmit={handleSubmit} className="space-y-6">
                        {/* 1. Election Title */}
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

                        {/* 2. Start Date & Time - End Date & Time */}
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">Start Date & Time</label>
                                <input
                                    type="datetime-local"
                                    value={formData.startDate}
                                    onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                    min={new Date().toISOString().slice(0, 16)}
                                    required
                                />
                                <p className="text-xs text-gray-500 mt-1">Start time cannot be in the past</p>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">End Date & Time</label>
                                <input
                                    type="datetime-local"
                                    value={formData.endDate}
                                    onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                    min={formData.startDate || new Date().toISOString().slice(0, 16)}
                                    required
                                />
                                <p className="text-xs text-gray-500 mt-1">Must be after or equal to start time</p>
                            </div>
                        </div>

                        {/* 3. Votes per Voter - Expected Voters */}
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">Votes per Voter</label>
                                <input
                                    type="number"
                                    min="1"
                                    value={formData.numVotesPerVoter}
                                    onChange={(e) => setFormData({ ...formData, numVotesPerVoter: parseInt(e.target.value) })}
                                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                    required
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">Expected Voters</label>
                                <input
                                    type="number"
                                    min="1"
                                    value={formData.potentialVoters}
                                    onChange={(e) => setFormData({ ...formData, potentialVoters: parseInt(e.target.value) })}
                                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                    required
                                />
                            </div>
                        </div>

                        {/* 4. How do you want to set up voters and candidates? */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-3">How do you want to set up voters and candidates?</label>
                            <div className="space-y-3">
                                <div 
                                    className={`p-4 border-2 rounded-lg cursor-pointer transition-colors ${
                                        formData.method === 'api' 
                                            ? 'border-blue-500 bg-blue-50' 
                                            : 'border-gray-300 hover:border-gray-400'
                                    }`}
                                    onClick={() => setFormData({ ...formData, method: 'api', type: 'api_managed' })}
                                >
                                    <div className="flex items-center">
                                        <input
                                            type="radio"
                                            name="method"
                                            value="api"
                                            checked={formData.method === 'api'}
                                            onChange={(e) => setFormData({ ...formData, method: e.target.value, type: 'api_managed' })}
                                            className="h-4 w-4 text-blue-600"
                                        />
                                        <div className="ml-3">
                                            <h4 className="font-medium text-gray-900">API Integration</h4>
                                            <p className="text-sm text-gray-600">Provide an API endpoint for voter eligibility and candidate mapping</p>
                                        </div>
                                    </div>
                                </div>
                                
                                <div 
                                    className={`p-4 border-2 rounded-lg cursor-pointer transition-colors ${
                                        formData.method === 'csv' 
                                            ? 'border-blue-500 bg-blue-50' 
                                            : 'border-gray-300 hover:border-gray-400'
                                    }`}
                                    onClick={() => setFormData({ ...formData, method: 'csv', type: 'simple' })}
                                >
                                    <div className="flex items-center">
                                        <input
                                            type="radio"
                                            name="method"
                                            value="csv"
                                            checked={formData.method === 'csv'}
                                            onChange={(e) => setFormData({ ...formData, method: e.target.value, type: 'simple' })}
                                            className="h-4 w-4 text-blue-600"
                                        />
                                        <div className="ml-3">
                                            <h4 className="font-medium text-gray-900">CSV File Upload</h4>
                                            <p className="text-sm text-gray-600">Upload CSV files for candidates and eligible voters</p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* 5. Election Type (only show for CSV method) */}
                        {formData.method === 'csv' && (
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">Election Type</label>
                                <select
                                    value={formData.type}
                                    onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                >
                                    <option value="simple">Simple Election</option>
                                    <option value="district_based">District-Based</option>
                                    <option value="governorate_based">Governorate-Based</option>
                                </select>
                                <p className="text-sm text-gray-500 mt-1">
                                    Election type determines voting constraints. Simple allows anyone to vote for anyone, while district/governorate-based elections restrict voting to matching geographical areas.
                                </p>
                            </div>
                        )}

                        {/* Conditional fields based on method */}
                        {formData.method === 'api' && (
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
                                <p className="text-sm text-gray-500 mt-1">
                                    API should return voter eligibility and candidate-voter mapping information
                                </p>
                            </div>
                        )}

                        {formData.method === 'csv' && (
                            <div className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        Candidates CSV File
                                    </label>
                                    <input
                                        type="file"
                                        accept=".csv"
                                        onChange={(e) => setFormData({ ...formData, candidatesFile: e.target.files[0] })}
                                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                        required
                                    />
                                    <p className="text-sm text-gray-500 mt-1">
                                        Required columns: hashed_national_id, name, country, birth_date
                                        {formData.type === 'district_based' && ', district'}
                                        {formData.type === 'governorate_based' && ', governorate'}
                                    </p>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        Voters CSV File
                                    </label>
                                    <input
                                        type="file"
                                        accept=".csv"
                                        onChange={(e) => setFormData({ ...formData, votersFile: e.target.files[0] })}
                                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                        required
                                    />
                                    <p className="text-sm text-gray-500 mt-1">
                                        Required columns: voter_hashed_national_id, phone_number
                                        {formData.type === 'district_based' && ', district'}
                                        {formData.type === 'governorate_based' && ', governorate'}
                                    </p>
                                </div>

                                {formData.type !== 'simple' && (
                                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                                        <h4 className="font-medium text-blue-900 mb-2">Election Type: {formData.type.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}</h4>
                                        <p className="text-sm text-blue-700">
                                            {formData.type === 'district_based' 
                                                ? 'Voters can only vote for candidates in their district. Make sure both CSV files include district information.'
                                                : 'Voters can only vote for candidates in their governorate. Make sure both CSV files include governorate information.'
                                            }
                                        </p>
                                    </div>
                                )}
                            </div>
                        )}

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



    let renderOverview = () => {
        if (statsLoading) {
            return (
                <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
                    <span className="ml-2 text-gray-600">Loading dashboard statistics...</span>
                </div>
            );
        }

        if (statsError) {
            return (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                    <p className="text-red-700">Failed to load dashboard statistics. Please try again later.</p>
                </div>
            );
        }

        const stats = dashboardStats || {
            total_elections: 0,
            total_candidates: 0,
            total_votes: 0,
            recent_elections: []
        };

        return (
            <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="bg-white rounded-xl p-6 shadow-lg border border-gray-200/50">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm font-medium text-gray-600">Total Elections</p>
                                <p className="text-3xl font-bold text-gray-900">{stats.total_elections}</p>
                            </div>
                            <Vote className="h-12 w-12 text-blue-500" />
                        </div>
                    </div>
                    <div className="bg-white rounded-xl p-6 shadow-lg border border-gray-200/50">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm font-medium text-gray-600">Total Candidates</p>
                                <p className="text-3xl font-bold text-gray-900">{stats.total_candidates}</p>
                            </div>
                            <Users className="h-12 w-12 text-purple-500" />
                        </div>
                    </div>
                    <div className="bg-white rounded-xl p-6 shadow-lg border border-gray-200/50">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm font-medium text-gray-600">Total Votes</p>
                                <p className="text-3xl font-bold text-gray-900">{stats.total_votes}</p>
                            </div>
                            <Vote className="h-12 w-12 text-green-500" />
                        </div>
                    </div>
                </div>

                <div className="bg-white rounded-xl shadow-lg border border-gray-200/50 p-6">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">Recent Elections</h3>
                    <div className="space-y-4">
                        {stats.recent_elections.length === 0 ? (
                            <p className="text-gray-500 text-center py-4">No elections created yet</p>
                        ) : (
                            stats.recent_elections.map((election) => (
                                <div key={election.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                                    <div>
                                        <h4 className="font-medium text-gray-900">{election.title}</h4>
                                        <p className="text-sm text-gray-600">{election.total_vote_count} votes cast</p>
                                        <p className="text-xs text-gray-500">
                                            {new Date(election.starts_at).toLocaleDateString()} - {new Date(election.ends_at).toLocaleDateString()}
                                        </p>
                                    </div>
                                    <div className="text-right">
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
                                        <p className="text-xs text-gray-500 mt-1">{election.number_of_candidates} candidates</p>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>

                {/* Recent transactions */}
                <div className="bg-white rounded-xl shadow-lg border border-gray-200/50 p-6">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">Recent Transactions</h3>
                    {txLoading ? (
                        <div className="flex items-center space-x-2 text-gray-500">
                            <Loader2 className="h-4 w-4 animate-spin" />
                            <span>Loading…</span>
                        </div>
                    ) : txError ? (
                        <p className="text-sm text-rose-600">{txError}</p>
                    ) : recentTx.length === 0 ? (
                        <p className="text-gray-500">No transactions yet.</p>
                    ) : (
                        <ul className="divide-y">
                            {recentTx.map((t) => {
                                const isAdd = (t.transaction_type || '').toUpperCase() === 'ADDING';
                                const rawAmount = Number(t.amount) || 0;
                                const amountAbs = Math.abs(rawAmount).toFixed(2);
                                const amountClass = isAdd ? 'text-emerald-600' : 'text-rose-600';
                                // Credits: "+ 120.00 EGP"; Debits: "(-120.00EGP)" as requested
                                const formatted = isAdd
                                    ? `+ ${amountAbs} EGP`
                                    : `(-${amountAbs}EGP)`;
                                return (
                                    <li key={t.id} className="py-2 flex justify-between text-sm">
                                        <span className="text-gray-700">{t.description || 'Transaction'}</span>
                                        <span className={`font-semibold ${amountClass}`}>
                                            {formatted}
                                        </span>
                                    </li>
                                );
                            })}
                        </ul>
                    )}
                </div>
            </div>
        );
    };

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
                        { id: 'admins', label: 'Admins', icon: Shield },
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
                                        <div className="space-y-4">
                                            <div className="flex justify-end">
                                                {currentOrgId !== '2' && (
                                                    <button
                                                        onClick={() => navigate('/org/payment')}
                                                        className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700"
                                                    >
                                                        Add Wallet Balance
                                                    </button>
                                                )}
                                            </div>
                                            <ElectionsList onCreateElection={handleCreateElectionClick} />
                                        </div>
                                )}

                {activeTab === 'candidates' && (
                   <div className="space-y-6">
                     <h2 className="text-2xl font-bold text-gray-900">Candidates</h2>
                     <CandidatesList />
                   </div>
                )}

                {activeTab === 'admins' && (
                   <div className="space-y-6">
                     <h2 className="text-2xl font-bold text-gray-900">Organization Admins</h2>
                     <OrganizationAdminsTab />
                   </div>
                )}

                {activeTab === 'notifications' && (
                   <div className="space-y-6">
                     <h2 className="text-2xl font-bold text-gray-900">Notifications</h2>
                     <NotificationList />
                   </div>
                )}



                {showCreateElection && <CreateElectionModal />}
                {showVoterPricing && (
                    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                        <div className="bg-white rounded-xl p-6 w-full max-w-md mx-4">
                            <h3 className="text-xl font-semibold text-gray-900 mb-4">Plan your election</h3>
                            <p className="text-sm text-gray-600 mb-4">Enter how many voters you expect. You'll be redirected to payment to add the required balance.</p>
                            <div className="space-y-3">
                                <label className="block text-sm font-medium text-gray-700">Number of voters</label>
                                <input
                                    type="number"
                                    min="1"
                                    step="1"
                                    value={voterCount}
                                    onChange={(e) => setVoterCount(Math.max(1, Number(e.target.value) || 1))}
                                    className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                                />
                                <div className="text-lg font-semibold text-gray-900">
                                    Total: <span> {(Number(voterCount || 0) * PRICE_PER_VOTER).toFixed(2)}</span>
                                </div>
                                <p className="text-xs text-gray-500">Amounts are charged in your configured currency.</p>
                            </div>
                            <div className="mt-6 flex gap-3">
                                <button
                                    onClick={() => setShowVoterPricing(false)}
                                    className="flex-1 px-4 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={proceedToPaymentForVoters}
                                    className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                                >
                                    Continue to Payment
                                </button>
                            </div>
                        </div>
                    </div>
                )}
                
                {/* Modal for notifications */}
                <Modal
                    isOpen={modalConfig.isOpen}
                    onClose={closeModal}
                    title={modalConfig.title}
                    type={modalConfig.type}
                >
                    <div className="text-center">
                        <p className="text-sm text-gray-600">{modalConfig.message}</p>
                    </div>
                </Modal>
            </div>
        </div>
    );
};

export default OrganizationDashboard;

