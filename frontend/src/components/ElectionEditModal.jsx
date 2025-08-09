import React, { useState, useEffect } from 'react';
import { X, AlertTriangle, Upload, FileText, Users } from 'lucide-react';
import api from '../services/api';
import Toast from './Toast';

const ElectionEditModal = ({ election, isOpen, onClose, onSuccess }) => {
    const [formData, setFormData] = useState({
        title: '',
        starts_at: '',
        ends_at: '',
        types: '',
        method: '',
        api_endpoint: '',
        num_of_votes_per_voter: 1,
        potential_number_of_voters: 100,
        candidatesFile: null,
        votersFile: null,
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
            
            setFormData({
                title: election.title || '',
                starts_at: startDate,
                ends_at: endDate,
                types: election.types || '',
                method: election.method || '',
                api_endpoint: election.api_endpoint || '',
                num_of_votes_per_voter: election.num_of_votes_per_voter || 1,
                potential_number_of_voters: election.potential_number_of_voters || 100,
                candidatesFile: null,
                votersFile: null,
                replaceFiles: false
            });
            
            setOriginalTypes(election.types || '');
        }
    }, [election, isOpen]);

    // Check if election type has changed and requires CSV replacement
    const typeHasChanged = formData.types !== originalTypes;
    const requiresCsvReplacement = typeHasChanged && 
        formData.method === 'csv' && 
        ((originalTypes === 'simple' && (formData.types === 'district_based' || formData.types === 'governorate_based')) ||
         (originalTypes === 'district_based' && formData.types === 'governorate_based') ||
         (originalTypes === 'governorate_based' && formData.types === 'district_based'));

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
        const startDateTime = new Date(formData.starts_at);
        const endDateTime = new Date(formData.ends_at);
        
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
                types: formData.types,
                starts_at: new Date(formData.starts_at).toISOString(),
                ends_at: new Date(formData.ends_at).toISOString(),
                num_of_votes_per_voter: formData.num_of_votes_per_voter,
                potential_number_of_voters: formData.potential_number_of_voters
            };

            // Add method-specific fields
            if (formData.method === 'api') {
                updateData.api_endpoint = formData.api_endpoint;
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
            csvFormData.append('types', formData.types);
            csvFormData.append('starts_at', new Date(formData.starts_at).toISOString());
            csvFormData.append('ends_at', new Date(formData.ends_at).toISOString());
            csvFormData.append('potential_number_of_voters', formData.potential_number_of_voters);
            csvFormData.append('candidates_file', formData.candidatesFile);
            csvFormData.append('voters_file', formData.votersFile);
            csvFormData.append('num_of_votes_per_voter', formData.num_of_votes_per_voter);

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
            <div className="bg-white rounded-xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
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
                    {/* Current Election Info */}
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                        <h3 className="font-medium text-blue-900 mb-2">Current Election Details</h3>
                        <div className="grid grid-cols-2 gap-4 text-sm">
                            <div>
                                <span className="text-blue-700 font-medium">Type:</span>
                                <span className="ml-2 text-blue-600">{election.types}</span>
                            </div>
                            <div>
                                <span className="text-blue-700 font-medium">Method:</span>
                                <span className="ml-2 text-blue-600">{election.method}</span>
                            </div>
                            <div>
                                <span className="text-blue-700 font-medium">Candidates:</span>
                                <span className="ml-2 text-blue-600">{election.number_of_candidates}</span>
                            </div>
                            <div>
                                <span className="text-blue-700 font-medium">Voters:</span>
                                <span className="ml-2 text-blue-600">{election.potential_number_of_voters}</span>
                            </div>
                        </div>
                    </div>

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
                                value={formData.starts_at}
                                onChange={(e) => setFormData({ ...formData, starts_at: e.target.value })}
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
                                value={formData.ends_at}
                                onChange={(e) => setFormData({ ...formData, ends_at: e.target.value })}
                                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                min={formData.starts_at || new Date().toISOString().slice(0, 16)}
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
                                value={formData.num_of_votes_per_voter}
                                onChange={(e) => setFormData({ ...formData, num_of_votes_per_voter: parseInt(e.target.value) })}
                                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                required
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">Expected Voters</label>
                            <input
                                type="number"
                                min="1"
                                value={formData.potential_number_of_voters}
                                onChange={(e) => setFormData({ ...formData, potential_number_of_voters: parseInt(e.target.value) })}
                                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                required
                            />
                        </div>
                    </div>

                    {/* Election Type (read-only for now, shows current value) */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Election Type</label>
                        <select
                            value={formData.types}
                            onChange={(e) => setFormData({ ...formData, types: e.target.value })}
                            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        >
                            <option value="simple">Simple Election</option>
                            <option value="district_based">District-Based</option>
                            <option value="governorate_based">Governorate-Based</option>
                            <option value="api_managed">API Managed</option>
                        </select>
                        <p className="text-sm text-gray-500 mt-1">
                            Changing election type may affect voting constraints
                        </p>
                    </div>

                    {/* API Endpoint (if method is API) */}
                    {formData.method === 'api' && (
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Voter Eligibility API URL
                            </label>
                            <input
                                type="url"
                                value={formData.api_endpoint}
                                onChange={(e) => setFormData({ ...formData, api_endpoint: e.target.value })}
                                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                placeholder="https://api.your-system.com/verify-voter"
                            />
                            <p className="text-sm text-gray-500 mt-1">
                                API should return voter eligibility and candidate-voter mapping information
                            </p>
                        </div>
                    )}

                    {/* CSV File Replacement (if method is CSV) */}
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
                                        Changing from "{originalTypes.replace('_', ' ')}" to "{formData.types.replace('_', ' ')}" type requires updated CSV files 
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
                                            Required columns: hashed_national_id, name, country, birth_date
                                            {formData.types === 'district_based' && ', district'}
                                            {formData.types === 'governorate_based' && ', governorate'}
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
                                            Required columns: voter_hashed_national_id, phone_number
                                            {formData.types === 'district_based' && ', district'}
                                            {formData.types === 'governorate_based' && ', governorate'}
                                        </p>
                                    </div>
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
