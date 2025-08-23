import React, { useState, useEffect } from 'react';
import { X, AlertTriangle, Upload, FileText, Users } from 'lucide-react';
import api from '../services/api';
import Toast from './Toast';

const ElectionEditModal = ({ election, isOpen, onClose, onSuccess }) => {
    const [formData, setFormData] = useState({
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
        replaceFiles: false
    });
    
    const [originalTypes, setOriginalTypes] = useState('');
    
    const [loading, setLoading] = useState(false);
    const [toast, setToast] = useState({ isVisible: false, type: '', message: '' });

    // Initialize form data when election changes
    useEffect(() => {
        if (election && isOpen) {
            // Convert ISO strings to datetime-local format
            const startDate = election.starts_at ? new Date(election.starts_at).toISOString().slice(0, 16) : '';
            const endDate = election.ends_at ? new Date(election.ends_at).toISOString().slice(0, 16) : '';
            
            // Determine the method based on election data
            let method = 'api';
            if (election.method === 'csv') {
                method = 'csv';
            } else if (election.method === 'api' || election.types === 'api_managed') {
                method = 'api';
            }
            
            // If we have an API endpoint, it's definitely an API method
            if (election.api_endpoint && election.api_endpoint.trim() !== '') {
                method = 'api';
            }
            
            // Additional check: if types is api_managed, force method to be api
            if (election.types === 'api_managed') {
                method = 'api';
            }
            
            const formDataToSet = {
                title: election.title || '',
                description: election.description || '',
                type: election.types || 'simple',
                startDate: startDate,
                endDate: endDate,
                method: method,
                voterEligibilityUrl: election.api_endpoint || '',
                numVotesPerVoter: election.num_of_votes_per_voter || 1,
                potentialVoters: election.potential_number_of_voters || 100,
                candidatesFile: null,
                votersFile: null,
                replaceFiles: false
            };
            
            setFormData(formDataToSet);
            setOriginalTypes(election.types || '');
        }
    }, [election, isOpen]);

    // Check if election type has changed and requires CSV replacement
    const typeHasChanged = formData.type !== originalTypes;
    const requiresCsvReplacement = typeHasChanged && 
        formData.method === 'csv' && 
        ((originalTypes === 'simple' && (formData.type === 'district_based' || formData.type === 'governorate_based')) ||
         (originalTypes === 'district_based' && formData.type === 'governorate_based') ||
         (originalTypes === 'governorate_based' && formData.type === 'district_based'));

    // Automatically enable CSV replacement when type change requires it
    useEffect(() => {
        if (requiresCsvReplacement && !formData.replaceFiles) {
            setFormData(prev => ({ ...prev, replaceFiles: true }));
        }
    }, [requiresCsvReplacement, formData.replaceFiles]);

    const showToast = (type, message) => {
        setToast({ isVisible: true, type, message });
    };

    const hideToast = () => {
        setToast({ isVisible: false, type: '', message: '' });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        
        // Client-side validation
        const now = new Date();
        const startDateTime = new Date(formData.startDate);
        const endDateTime = new Date(formData.endDate);
        
        if (startDateTime < now) {
            showToast('error', 'Start date and time cannot be in the past.');
            return;
        }
        
        if (endDateTime <= startDateTime) {
            showToast('error', 'End date and time must be after start date and time.');
            return;
        }

        // Validate CSV replacement if required
        if (requiresCsvReplacement && formData.replaceFiles) {
            if (!formData.candidatesFile || !formData.votersFile) {
                showToast('error', 'Both candidates and voters CSV files are required when changing election type.');
                return;
            }
        }

        setLoading(true);
        
        try {
            // Update basic election data
            const updateData = {
                title: formData.title,
                types: formData.type,
                starts_at: new Date(formData.startDate).toISOString(),
                ends_at: new Date(formData.endDate).toISOString(),
                num_of_votes_per_voter: formData.numVotesPerVoter,
                potential_number_of_voters: formData.potentialVoters
            };

            // Add method-specific fields
            if (formData.method === 'api') {
                updateData.api_endpoint = formData.voterEligibilityUrl;
            }

            // Update election
            await api.put(`/election/${election.id}`, updateData);

            // Handle CSV file replacement if requested
            if (formData.replaceFiles && formData.method === 'csv') {
                if (formData.candidatesFile && formData.votersFile) {
                    await handleCsvFileReplacement();
                } else if (formData.candidatesFile || formData.votersFile) {
                    showToast('error', 'Both candidates and voters files must be provided when replacing CSV files.');
                    setLoading(false);
                    return;
                }
            }

            showToast('success', 'Election updated successfully!');
            setTimeout(() => {
                onSuccess && onSuccess();
                onClose();
            }, 1500);
            
        } catch (error) {
            console.error('Error updating election:', error);
            if (error.response?.status === 400) {
                const errorData = error.response.data;
                
                // Handle CSV compatibility errors
                if (typeof errorData === 'object' && errorData.detail?.error === 'csv_compatibility_error') {
                    showToast('error', errorData.detail.message);
                    // Automatically enable CSV replacement when this error occurs
                    setFormData(prev => ({ ...prev, replaceFiles: true }));
                } else {
                    const message = typeof errorData === 'string' ? errorData : 
                                  errorData.detail || 'Invalid election data. Please check your inputs.';
                    showToast('error', message);
                }
            } else {
                showToast('error', 'Failed to update election. Please try again.');
            }
        } finally {
            setLoading(false);
        }
    };

    const handleCsvFileReplacement = async () => {
        try {
            // Create FormData for CSV upload
            const csvFormData = new FormData();
            csvFormData.append('title', formData.title);
            csvFormData.append('types', formData.type);
            csvFormData.append('starts_at', new Date(formData.startDate).toISOString());
            csvFormData.append('ends_at', new Date(formData.endDate).toISOString());
            csvFormData.append('potential_number_of_voters', formData.potentialVoters);
            csvFormData.append('candidates_file', formData.candidatesFile);
            csvFormData.append('voters_file', formData.votersFile);
            csvFormData.append('num_of_votes_per_voter', formData.numVotesPerVoter);

            // Call the CSV replacement endpoint (we'll implement this)
            await api.put(`/election/${election.id}/replace-csv`, csvFormData, {
                headers: {
                    'Content-Type': 'multipart/form-data'
                }
            });
            
        } catch (error) {
            console.error('Error replacing CSV files:', error);
            throw new Error('Failed to replace CSV files');
        }
    };

    const formatDate = (dateString) => {
        if (!dateString) return '';
        return new Date(dateString).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    if (!isOpen || !election) return null;

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
                {/* Header */}
                <div className="sticky top-0 bg-white border-b px-6 py-4 flex items-center justify-between rounded-t-xl">
                    <div>
                        <h2 className="text-2xl font-bold text-gray-900">Edit Election</h2>
                        <p className="text-sm text-gray-600">Modify election details and settings</p>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                    >
                        <X className="h-5 w-5" />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-6">
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

                    {/* Election Description */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Election Description</label>
                        <textarea
                            value={formData.description}
                            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            rows="3"
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
                            <p className="text-xs text-gray-500 mt-1">Must be after start time</p>
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
                            {/* Type change warning */}
                            {requiresCsvReplacement && (
                                <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
                                    <div className="flex items-center space-x-2 text-orange-800">
                                        <AlertTriangle className="h-5 w-5" />
                                        <span className="font-medium">CSV Files Must Be Updated</span>
                                    </div>
                                    <p className="text-sm text-orange-700 mt-2">
                                        Changing from "{originalTypes.replace('_', ' ')}" to "{formData.type.replace('_', ' ')}" type requires updated CSV files 
                                        with additional columns. You must upload new CSV files to proceed.
                                    </p>
                                </div>
                            )}

                            <div className="flex items-center space-x-3">
                                <input
                                    type="checkbox"
                                    id="replaceFiles"
                                    checked={formData.replaceFiles}
                                    onChange={(e) => setFormData({ ...formData, replaceFiles: e.target.checked })}
                                    disabled={requiresCsvReplacement}
                                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded disabled:opacity-50"
                                />
                                <label htmlFor="replaceFiles" className="text-sm font-medium text-gray-700">
                                    Replace candidates and voters CSV files
                                    {requiresCsvReplacement && <span className="text-orange-600 ml-1">(Required for type change)</span>}
                                </label>
                            </div>

                            {formData.replaceFiles && (
                                <div className="space-y-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                                    <div className="flex items-center space-x-2 text-yellow-800">
                                        <AlertTriangle className="h-4 w-4" />
                                        <span className="text-sm font-medium">
                                            Warning: This will replace ALL existing candidates and voters
                                        </span>
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">
                                            <FileText className="inline h-4 w-4 mr-2" />
                                            New Candidates CSV File
                                        </label>
                                        <input
                                            type="file"
                                            accept=".csv"
                                            onChange={(e) => setFormData({ ...formData, candidatesFile: e.target.files[0] })}
                                            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
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
                                            <Users className="inline h-4 w-4 mr-2" />
                                            New Voters CSV File
                                        </label>
                                        <input
                                            type="file"
                                            accept=".csv"
                                            onChange={(e) => setFormData({ ...formData, votersFile: e.target.files[0] })}
                                            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
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
                        </div>
                    )}

                    {/* Action Buttons */}
                    <div className="flex space-x-4 pt-4 border-t">
                        <button
                            type="submit"
                            disabled={loading}
                            className="flex-1 px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg font-medium hover:from-blue-700 hover:to-purple-700 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
                        >
                            {loading ? (
                                <>
                                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                                    Updating...
                                </>
                            ) : (
                                'Update Election'
                            )}
                        </button>
                        <button
                            type="button"
                            onClick={onClose}
                            disabled={loading}
                            className="px-6 py-3 bg-gray-200 text-gray-800 rounded-lg font-medium hover:bg-gray-300 transition-colors duration-200 disabled:opacity-50"
                        >
                            Cancel
                        </button>
                    </div>
                </form>

                {/* Toast Notifications */}
                <Toast
                    type={toast.type}
                    message={toast.message}
                    isVisible={toast.isVisible}
                    onClose={hideToast}
                />
            </div>
        </div>
    );
};

export default ElectionEditModal;
