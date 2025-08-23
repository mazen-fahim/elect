import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import { Plus, Edit, Trash2, Users, Vote, Settings, Bell, Loader2, Shield, X } from 'lucide-react';
import CandidatesList from "../components/CandidatesList";
import ElectionsList from "../components/ElectionsList";
import NotificationList from "../components/NotificationList";
import Modal from "../components/Modal";
import OrganizationAdminsTab from "../components/OrganizationAdminsTab";
import { useOrganizationDashboardStats } from '../hooks/useOrganization';
import { electionApi } from '../services/api';

let OrganizationDashboard = () => {
    let { id } = useParams();
    let { user, isLoading, organizations, elections, candidates, addElection, addCandidate, notifications } = useApp();
    let [activeTab, setActiveTab] = useState('overview');
    let [showCreateElection, setShowCreateElection] = useState(false);
    let [showCreateCandidate, setShowCreateCandidate] = useState(false);
    let [isCreatingElection, setIsCreatingElection] = useState(false);
    let [orgElections, setOrgElections] = useState([]);
    let [electionsRefreshTrigger, setElectionsRefreshTrigger] = useState(0);
    
    // Modal state
    let [modalConfig, setModalConfig] = useState({ isOpen: false, title: '', message: '', type: 'info' });
    let [apiSetupModal, setApiSetupModal] = useState({ isOpen: false, election: null });

    // Fetch dashboard stats from API
    const { data: dashboardStats, isLoading: statsLoading, error: statsError, refetch: refetchStats } = useOrganizationDashboardStats();

    // Refresh stats when component mounts to ensure we have the latest data
    useEffect(() => {
        if (user && user.organizationId) {
            refetchStats();
        }
    }, [user, refetchStats]);

    // Debug: Log when stats change
    useEffect(() => {
        if (dashboardStats) {
            console.log('Dashboard Stats API Response:', dashboardStats);
        }
    }, [dashboardStats]);

    // Debug: Log user object changes
    useEffect(() => {
        console.log('User object updated:', {
            id: user?.id,
            role: user?.role,
            organizationId: user?.organizationId,
            organizationName: user?.organizationName,
            email: user?.email
        });
    }, [user]);

    // Debug: Log elections data
    useEffect(() => {
        console.log('Elections data updated:', {
            totalElections: elections.length,
            electionsWithOrgId: elections.filter(e => e.organizationId).length,
            sampleElections: elections.slice(0, 3).map(e => ({
                id: e.id,
                title: e.title,
                organizationId: e.organizationId
            }))
        });
    }, [elections]);

    // Fetch elections for this organization
    useEffect(() => {
        if (user) {
            // Get all elections for the organization, regardless of who created them
            let targetOrgId = user.organizationId?.toString();
            
            // If we're an organization admin and don't have organizationId, try to find it from elections
            if (!targetOrgId && user.role === 'organization_admin' && elections.length > 0) {
                const firstElection = elections.find(e => e.organizationId);
                if (firstElection) {
                    targetOrgId = firstElection.organizationId;
                }
            }
            
            // If still no organization ID, try to get it from the URL or find any organization
            if (!targetOrgId) {
                targetOrgId = id;
            }
            
            if (targetOrgId) {
                const filteredElections = elections.filter((e) => e.organizationId === targetOrgId);
                setOrgElections(filteredElections);
                console.log('Organization elections loaded:', {
                    targetOrgId,
                    totalElections: elections.length,
                    orgElections: filteredElections.length
                });
            }
        }
    }, [elections, user, id]);

    // Helper function to show modals
    let showModal = (title, message, type = 'info') => {
        setModalConfig({ isOpen: true, title, message, type });
    };

    let closeModal = () => {
        setModalConfig({ isOpen: false, title: '', message: '', type: 'info' });
    };

    // Helper function to show API setup modal
    let showApiSetupModal = (election) => {
        setApiSetupModal({ isOpen: true, election });
    };

    let closeApiSetupModal = () => {
        setApiSetupModal({ isOpen: false, election: null });
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

    // Check if user is logged in and is an organization OR organization_admin
    if (!user || (user.role !== 'organization' && user.role !== 'organization_admin')) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="text-center">
                    <h1 className="text-2xl font-bold text-gray-900 mb-2">Access Denied</h1>
                    <p className="text-gray-600">You must be logged in as an organization or organization admin to access this page.</p>
                </div>
            </div>
        );
    }

    // Use the logged-in user's organization data instead of URL params
    let userOrgId = user.organizationId?.toString();
    const urlOrgId = id;

    // If we're an organization admin and don't have organizationId, try to find it from elections
    if (!userOrgId && user.role === 'organization_admin' && elections.length > 0) {
        const firstElection = elections.find(e => e.organizationId);
        if (firstElection) {
            userOrgId = firstElection.organizationId;
            console.log('Using organization ID from elections for admin:', userOrgId);
        }
    }

    // If still no organization ID, use the URL param
    if (!userOrgId) {
        userOrgId = urlOrgId;
        console.log('Using organization ID from URL for admin:', userOrgId);
    }

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
    };

    let CreateElectionModal = () => {
        let [formData, setFormData] = useState({
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

        let handleSubmit = async (e) => {
            e.preventDefault();
            setIsCreatingElection(true);
            
            // Client-side validation
            const now = new Date();
            const startDateTime = new Date(formData.startDate);
            const endDateTime = new Date(formData.endDate);
            
            if (startDateTime < now) {
                showModal('Invalid Date', 'Start date and time cannot be in the past.', 'error');
                setIsCreatingElection(false);
                return;
            }
            
            if (endDateTime < startDateTime) {
                showModal('Invalid Date', 'End date and time must be after or equal to start date and time.', 'error');
                setIsCreatingElection(false);
                return;
            }
            
            try {
                let newElection;
                
                if (formData.method === 'csv') {
                    // Handle CSV upload
                    if (!formData.candidatesFile || !formData.votersFile) {
                        showModal('Missing Files', 'Please select both candidates and voters CSV files.', 'warning');
                        setIsCreatingElection(false);
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
                    newElection = await electionApi.createWithCsv(formDataObj);
                    console.log('CSV election creation response:', newElection);
                } else {
                    // Handle API method
                    const electionData = {
                        title: formData.title,
                        types: 'api_managed',
                        starts_at: new Date(formData.startDate).toISOString(),
                        ends_at: new Date(formData.endDate).toISOString(),
                        num_of_votes_per_voter: formData.numVotesPerVoter,
                        potential_number_of_voters: formData.potentialVoters,
                        method: 'api',
                        api_endpoint: formData.voterEligibilityUrl,
                    };

                                    // Call API endpoint for election creation
                newElection = await electionApi.create(electionData);
                console.log('Election creation response:', newElection);
                }
                
                // Add to local state
                addElection(newElection);
                setShowCreateElection(false);
                resetForm();
                
                // Show appropriate success message based on method
                if (formData.method === 'csv') {
                    showModal('Success', `Election "${newElection.title}" created successfully with ${newElection.number_of_candidates || 0} candidates and ${newElection.potential_number_of_voters || 0} voters.`, 'success');
                } else {
                    // Show API setup modal for API elections
                    showApiSetupModal(newElection);
                }
                
                // Refresh stats and elections list
                refetchStats();
                setElectionsRefreshTrigger(prev => prev + 1);
                
            } catch (error) {
                console.error('Error creating election:', error);
                
                let errorMessage = 'Failed to create election. Please try again.';
                if (error.message && error.message !== 'Server error. Please try again later.') {
                    errorMessage = error.message;
                } else if (error.response && error.response.detail) {
                    errorMessage = error.response.detail;
                }
                
                showModal('Error', errorMessage, 'error');
            } finally {
                setIsCreatingElection(false);
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
                        {/* Election Title */}
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

                        {/* Start Date & Time - End Date & Time */}
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

                        {/* Votes per Voter - Expected Voters */}
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

                        {/* Method Selection */}
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

                        {/* Election Type (only show for CSV method) */}
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
                                        Required columns: national_id, name, country, birth_date
                                        {formData.type === 'district_based' && ', district'}
                                        {formData.type === 'governorate_based' && ', governorate'}
                                        <br />
                                        <span className="text-blue-600">Note: Upload raw national IDs - our system will hash them automatically</span>
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
                                        Required columns: national_id, phone_number
                                        {formData.type === 'district_based' && ', district'}
                                        {formData.type === 'governorate_based' && ', governorate'}
                                        <br />
                                        <span className="text-blue-600">Note: Upload raw national IDs - our system will hash them automatically</span>
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
                                disabled={isCreatingElection}
                                className={`flex-1 px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg font-medium transition-all duration-200 ${
                                    isCreatingElection ? 'opacity-50 cursor-not-allowed' : 'hover:from-blue-700 hover:to-purple-700'
                                }`}
                            >
                                {isCreatingElection ? (
                                    <>
                                        <Loader2 className="h-5 w-5 animate-spin inline mr-2" />
                                        Creating...
                                    </>
                                ) : (
                                    'Create Election'
                                )}
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
                    <button 
                        onClick={refetchStats}
                        className="mt-2 px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700"
                    >
                        Retry
                    </button>
                </div>
            );
        }

        // For organization admins, always try to use API stats first, then fallback to organization-wide data
        let stats = dashboardStats;
        
        // Debug logging
        console.log('Dashboard Stats Debug:', {
            dashboardStats,
            userRole: user.role,
            organizationId: user.organizationId,
            urlOrgId: id,
            totalElections: elections.length,
            orgElections: orgElections.length,
            candidates: candidates.length,
            statsError,
            statsLoading
        });
        
        if (!stats) {
            // Fallback: Calculate stats from all organization data
            // For organization admins, we need to get all elections from their organization
            let targetOrgId = user.organizationId?.toString();
            
            // If we're an organization admin and don't have organizationId, try to find it from elections
            if (!targetOrgId && user.role === 'organization_admin' && elections.length > 0) {
                // Find the first election and use its organizationId as a fallback
                const firstElection = elections.find(e => e.organizationId);
                if (firstElection) {
                    targetOrgId = firstElection.organizationId;
                    console.log('Using fallback organization ID from elections:', targetOrgId);
                }
            }
            
            // If still no organization ID, try to get it from the URL or find any organization
            if (!targetOrgId) {
                // Try to get from URL params
                targetOrgId = id;
                console.log('Using organization ID from URL params:', targetOrgId);
            }
            
            // For organization admin users, prioritize using the URL parameter (which is working for other tabs)
            if (user.role === 'organization_admin' && id) {
                targetOrgId = id;
                console.log('Organization admin: Using organization ID from URL:', targetOrgId);
            }
            
            if (targetOrgId) {
                const allOrgElections = elections.filter(e => e.organizationId === targetOrgId);
                const allOrgCandidates = candidates.filter(c => 
                    allOrgElections.some(e => e.candidates && e.candidates.includes(c.id))
                );
                
                stats = {
                    total_elections: allOrgElections.length,
                    total_candidates: allOrgCandidates.length,
                    total_votes: allOrgElections.reduce((sum, e) => sum + (e.total_vote_count || 0), 0),
                    recent_elections: allOrgElections
                        .sort((a, b) => new Date(b.created_at || b.starts_at) - new Date(a.created_at || a.starts_at))
                        .slice(0, 5)
                };
                
                console.log('Fallback Stats Calculated:', {
                    targetOrgId,
                    allOrgElections: allOrgElections.length,
                    stats
                });
            } else {
                // If we still can't find the organization, show zeros
                stats = {
                    total_elections: 0,
                    total_candidates: 0,
                    total_votes: 0,
                    recent_elections: []
                };
                console.log('Could not determine organization ID for fallback stats');
            }
        }

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
                                        <p className="text-sm text-gray-600">{election.total_vote_count || 0} votes cast</p>
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
                                            {election.status || 'unknown'}
                                        </span>
                                        <p className="text-xs text-gray-500 mt-1">{election.number_of_candidates || 0} candidates</p>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            </div>
        );
    };

    // Filter tabs based on user role
    const tabs = [
        { id: 'overview', label: 'Overview', icon: Vote },
        { id: 'elections', label: 'Elections', icon: Vote },
        { id: 'candidates', label: 'Candidates', icon: Users },
        ...(user.role === 'organization' ? [{ id: 'admins', label: 'Admins', icon: Shield }] : []),
        // إخفاء تبويب Notifications من Organization Admin فقط
        ...(user.role !== 'organization_admin' ? [{ id: 'notifications', label: 'Notifications', icon: Bell }] : []),
    ];

    // Display user role correctly
    const userRoleDisplay = user.role === 'organization_admin' ? 'Organization Admin' : 'Organization';

    return (
        <div className="min-h-screen p-8">
            <div className="max-w-7xl mx-auto">
                <div className="mb-8">
                    <h1 className="text-3xl font-bold text-gray-900">{organization.name}</h1>
                    <p className="text-gray-600">
                        {userRoleDisplay} Dashboard
                        {user.role === 'organization_admin' && (
                            <span className="ml-2 text-sm bg-blue-100 text-blue-800 px-2 py-1 rounded-full">
                                Admin
                            </span>
                        )}
                    </p>
                </div>

                <div className="flex space-x-1 mb-8 bg-white rounded-lg p-1 shadow-sm border border-gray-200">
                    {tabs.map((tab) => {
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
                    <ElectionsList 
                        onCreateElection={() => setShowCreateElection(true)}
                        organizationId={organization.id}
                        refreshTrigger={electionsRefreshTrigger}
                    />
                )}

                {activeTab === 'candidates' && (
                   <div className="space-y-6">
                     <h2 className="text-2xl font-bold text-gray-900">Candidates</h2>
                     <CandidatesList organizationId={organization.id} />
                   </div>
                )}

                {activeTab === 'admins' && user.role === 'organization' && (
                   <div className="space-y-6">
                     <h2 className="text-2xl font-bold text-gray-900">Organization Admins</h2>
                     <OrganizationAdminsTab organizationId={organization.id} />
                   </div>
                )}

                {activeTab === 'notifications' && user.role !== 'organization_admin' && (
                   <div className="space-y-6">
                     <h2 className="text-2xl font-bold text-gray-900">Notifications</h2>
                     <NotificationList organizationId={organization.id} />
                   </div>
                )}

                {showCreateElection && <CreateElectionModal />}
                
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

                {/* API Setup Modal */}
                {apiSetupModal.isOpen && apiSetupModal.election && (
                    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                        <div className="bg-white rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
                            {/* Header */}
                            <div className="sticky top-0 bg-white border-b px-6 py-4 flex items-center justify-between rounded-t-xl">
                                <div>
                                    <h2 className="text-2xl font-bold text-green-600">🎉 Election Created Successfully!</h2>
                                    <p className="text-sm text-gray-600">Set up your API endpoint with these details</p>
                                </div>
                                <button
                                    onClick={closeApiSetupModal}
                                    className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                                >
                                    <X className="h-5 w-5" />
                                </button>
                            </div>

                            <div className="p-6 space-y-6">
                                {/* Election Details */}
                                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                                    <h3 className="font-medium text-green-900 mb-3">Election Information</h3>
                                    <div className="grid grid-cols-2 gap-4 text-sm">
                                        <div>
                                            <span className="text-green-700 font-medium">Election ID:</span>
                                            <span className="ml-2 text-green-600 font-mono bg-green-100 px-2 py-1 rounded">
                                                {apiSetupModal.election.id}
                                            </span>
                                        </div>
                                        <div>
                                            <span className="text-green-700 font-medium">Title:</span>
                                            <span className="ml-2 text-green-600">{apiSetupModal.election.title}</span>
                                        </div>
                                        <div>
                                            <span className="text-green-700 font-medium">Method:</span>
                                            <span className="ml-2 text-green-600">{apiSetupModal.election.method}</span>
                                        </div>
                                        <div>
                                            <span className="text-green-700 font-medium">Type:</span>
                                            <span className="ml-2 text-green-600">{apiSetupModal.election.types}</span>
                                        </div>
                                    </div>
                                </div>

                                {/* API Setup Instructions */}
                                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                                    <h3 className="font-medium text-blue-900 mb-3">🔧 API Setup Instructions</h3>
                                    <div className="space-y-3 text-sm text-blue-800">
                                        <p>Your API endpoint will receive POST requests with this structure:</p>
                                        
                                        <div className="bg-white border border-blue-300 rounded p-3 font-mono text-xs">
                                            <div className="text-blue-600 mb-2">Request Body:</div>
                                            <pre className="text-blue-800">
{`{
  "voter_national_id": "string",
  "election_id": ${apiSetupModal.election.id},
  "election_title": "${apiSetupModal.election.title}"
}`}
                                            </pre>
                                        </div>

                                        <p>Your API should respond with:</p>
                                        
                                        <div className="bg-white border border-blue-300 rounded p-3 font-mono text-xs">
                                            <div className="text-blue-600 mb-2">Response Body:</div>
                                            <pre className="text-blue-800">
{`{
  "is_eligible": true,
  "phone_number": "+1234567890",
  "eligible_candidates": [
    {
      "hashed_national_id": "abc123...",
      "name": "Candidate Name",
      "country": "United_States",
      "birth_date": "1990-01-01T00:00:00Z"
    }
  ]
}`}
                                            </pre>
                                        </div>
                                    </div>
                                </div>

                                {/* Important Notes */}
                                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                                    <h3 className="font-medium text-yellow-900 mb-2">⚠️ Important Notes</h3>
                                    <ul className="text-sm text-yellow-800 space-y-1">
                                        <li>• Store the <strong>Election ID: {apiSetupModal.election.id}</strong> in your system</li>
                                        <li>• Your API must respond within 30 seconds</li>
                                        <li>• Return <code>is_eligible: false</code> for ineligible voters</li>
                                        <li>• <code>phone_number</code> is required for eligible voters</li>
                                        <li>• <code>eligible_candidates</code> should contain all candidate details</li>
                                    </ul>
                                </div>

                                {/* Action Buttons */}
                                <div className="flex space-x-4 pt-4 border-t">
                                    <button
                                        onClick={closeApiSetupModal}
                                        className="flex-1 px-6 py-3 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 transition-colors duration-200"
                                    >
                                        Got it, I'll set up my API
                                    </button>
                                    <button
                                        onClick={closeApiSetupModal}
                                        className="px-6 py-3 bg-gray-200 text-gray-800 rounded-lg font-medium hover:bg-gray-300 transition-colors duration-200"
                                    >
                                        Close
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default OrganizationDashboard;