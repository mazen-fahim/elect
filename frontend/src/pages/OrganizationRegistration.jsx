import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { CheckCircle, AlertCircle, Loader2 } from 'lucide-react';
import { useRegisterOrganization } from '../hooks/useAuth';
import { COUNTRIES } from '../constants/countries';

let OrganizationRegistration = () => {
    let navigate = useNavigate();
    let [errorMessage, setErrorMessage] = useState('');
    let [successMessage, setSuccessMessage] = useState('');

    // React Query mutation for registration
    const registerMutation = useRegisterOrganization();

    // Form data based on backend ERD
    let [formData, setFormData] = useState({
        // User fields
        email: '',
        password: '',
        confirmPassword: '',
        // Organization fields
        name: '',
        country: '',
        address: '',
        description: '',
        api_endpoint: '',
    });

    // Handle input changes
    let handleInputChange = (e) => {
        let { name, value } = e.target;
        setFormData((prev) => ({ ...prev, [name]: value }));
        setErrorMessage('');
        setSuccessMessage('');
    };

    // Validation function
    const validateForm = () => {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        const urlRegex = /^(https?:\/\/)?([\w\d-]+\.)+\w{2,}(\/.+)?$/;

        // Required fields validation
        if (!formData.name || !formData.email || !formData.password || !formData.country) {
            setErrorMessage("Please fill in all required fields.");
            return false;
        }

        // Email validation
        if (!emailRegex.test(formData.email)) {
            setErrorMessage("Please enter a valid email address.");
            return false;
        }

        // Password validation
        if (formData.password.length < 6) {
            setErrorMessage("Password must be at least 6 characters long.");
            return false;
        }

        // Confirm password validation
        if (formData.password !== formData.confirmPassword) {
            setErrorMessage("Passwords do not match.");
            return false;
        }

        // API endpoint validation (optional field)
        if (formData.api_endpoint && !urlRegex.test(formData.api_endpoint)) {
            setErrorMessage("Please enter a valid API endpoint URL.");
            return false;
        }

        return true;
    };

    // Form submit
    let handleSubmit = async (e) => {
        e.preventDefault();
        if (!validateForm()) return;

        try {
            // Prepare data for backend (exclude confirmPassword)
            const { confirmPassword, ...registrationData } = formData;
            
            await registerMutation.mutateAsync(registrationData);
            
            setSuccessMessage("Registration successful! Please check your email to verify your account.");
            setErrorMessage('');
            
            // Redirect to login after 3 seconds
            setTimeout(() => {
                navigate('/login/org');
            }, 3000);
            
        } catch (error) {
            console.error('Registration error:', error);
            
            // Handle specific error responses
            if (error.response?.field) {
                const fieldErrors = {
                    name: "Organization name already exists",
                    email: "Email address already registered",
                    api_endpoint: "API endpoint already in use"
                };
                setErrorMessage(fieldErrors[error.response.field] || error.message);
            } else {
                setErrorMessage(error.message || "Registration failed. Please try again.");
            }
        }
    };

    // Organization registration form
    let renderRegistrationForm = () => (
        <div className="space-y-6">
            <div>
                <h3 className="text-xl font-semibold text-gray-900 mb-4">Organization Registration</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Organization Name - Required */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Organization Name *
                        </label>
                        <input
                            type="text"
                            name="name"
                            value={formData.name}
                            onChange={handleInputChange}
                            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            required
                        />
                    </div>

                    {/* Email - Required */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Email Address *
                        </label>
                        <input
                            type="email"
                            name="email"
                            value={formData.email}
                            onChange={handleInputChange}
                            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            required
                        />
                    </div>

                    {/* Password - Required */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Password *
                        </label>
                        <input
                            type="password"
                            name="password"
                            value={formData.password}
                            onChange={handleInputChange}
                            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            required
                            minLength="6"
                        />
                    </div>

                    {/* Confirm Password - Required */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Confirm Password *
                        </label>
                        <input
                            type="password"
                            name="confirmPassword"
                            value={formData.confirmPassword}
                            onChange={handleInputChange}
                            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            required
                        />
                    </div>

                    {/* Country - Required */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Country *
                        </label>
                        <select
                            name="country"
                            value={formData.country}
                            onChange={handleInputChange}
                            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            required
                        >
                            <option value="">Select Country</option>
                            {COUNTRIES.map((country) => (
                                <option key={country} value={country}>
                                    {country}
                                </option>
                            ))}
                        </select>
                    </div>

                    {/* API Endpoint - Optional */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            API Endpoint (Optional)
                        </label>
                        <input
                            type="url"
                            name="api_endpoint"
                            value={formData.api_endpoint}
                            onChange={handleInputChange}
                            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            placeholder="https://api.yourorganization.com"
                        />
                    </div>

                    {/* Address - Optional */}
                    <div className="md:col-span-2">
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Address (Optional)
                        </label>
                        <input
                            type="text"
                            name="address"
                            value={formData.address}
                            onChange={handleInputChange}
                            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            placeholder="Organization address"
                        />
                    </div>

                    {/* Description - Optional */}
                    <div className="md:col-span-2">
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Description (Optional)
                        </label>
                        <textarea
                            name="description"
                            value={formData.description}
                            onChange={handleInputChange}
                            rows="4"
                            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            placeholder="Brief description of your organization..."
                        />
                    </div>
                </div>
            </div>
        </div>
    );

    return (
        <div className="min-h-screen py-12 px-4 sm:px-6 lg:px-8">
            <div className="max-w-4xl mx-auto">
                <div className="text-center mb-8">
                    <h1 className="text-3xl font-bold text-gray-900 mb-4">Register Your Organization</h1>
                    <p className="text-gray-600">Join our platform and start creating secure digital elections</p>
                </div>

                {/* Form container */}
                <div className="bg-white rounded-2xl shadow-xl border border-gray-200/50 p-8">
                    {/* Success message */}
                    {successMessage && (
                        <div className="mb-6 p-4 bg-green-100 text-green-700 border border-green-300 rounded-lg flex items-center">
                            <CheckCircle className="h-5 w-5 mr-2" />
                            {successMessage}
                        </div>
                    )}

                    {/* Error message */}
                    {errorMessage && (
                        <div className="mb-6 p-4 bg-red-100 text-red-700 border border-red-300 rounded-lg flex items-center">
                            <AlertCircle className="h-5 w-5 mr-2" />
                            {errorMessage}
                        </div>
                    )}

                    <form onSubmit={handleSubmit}>
                        {renderRegistrationForm()}

                        <div className="flex justify-end mt-8">
                            <button
                                type="submit"
                                disabled={registerMutation.isPending}
                                className="px-8 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg font-medium hover:from-blue-700 hover:to-purple-700 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
                            >
                                {registerMutation.isPending ? (
                                    <>
                                        <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                                        Registering...
                                    </>
                                ) : (
                                    'Complete Registration'
                                )}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
};

export default OrganizationRegistration;