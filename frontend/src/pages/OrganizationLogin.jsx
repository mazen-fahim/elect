import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import { LogIn, Eye, EyeOff, Loader2 } from 'lucide-react';
import { useLogin } from '../hooks/useAuth';

let OrganizationLogin = () => {
    let { login } = useApp();
    let navigate = useNavigate();
    let [formData, setFormData] = useState({
        email: '',
        password: '',
    });
    let [showPassword, setShowPassword] = useState(false);
    let [error, setError] = useState('');
    
    // React Query mutation for login
    const loginMutation = useLogin();

    let handleChange = (e) => {
        let { name, value } = e.target;
        setFormData((prev) => ({ ...prev, [name]: value }));
        setError('');
    };

    let handleSubmit = async (e) => {
        e.preventDefault();
        setError('');

        try {
            const response = await loginMutation.mutateAsync({
                email: formData.email,
                password: formData.password,
            });

            // Store the token
            localStorage.setItem('authToken', response.access_token);
            
            // Fetch current user information
            const { authApi } = await import('../services/api');
            const userInfo = await authApi.getCurrentUser();
            
            // Create complete user data for the context
            let userData = {
                id: userInfo.id,
                email: userInfo.email,
                role: userInfo.role,
                isActive: userInfo.is_active,
                organizationId: userInfo.organization_id,
                organizationName: userInfo.organization_name,
            };
            
            login(userData);
            
            // Navigate to appropriate dashboard based on role and organization
            if (userInfo.role === 'organization' && userInfo.organization_id) {
                navigate(`/org/${userInfo.organization_id}/dashboard`);
            } else if (userInfo.role === 'organization_admin' && userInfo.organization_id) {
                navigate(`/org/${userInfo.organization_id}/dashboard`);
            } else if (userInfo.role === 'admin') {
                navigate('/SystemAdmin');
            } else {
                navigate('/dashboard'); // fallback
            }
            
        } catch (error) {
            console.error('Login error:', error);
            console.log('Error message:', error.message);
            console.log('Full error object:', JSON.stringify(error, null, 2));
            
            // Handle specific errors for organization status
            if (error.message && error.message.includes('Please verify your email address')) {
                setError('Please check your email for the verification link. You need to verify your email address before you can log in.');
            } else if (error.message && error.message.includes('pending approval')) {
                setError('Your organization registration is pending approval. Please wait for admin acceptance before logging in.');
            } else if (error.message && error.message.includes('Please wait for admin acceptance')) {
                setError('Your organization registration is pending approval. Please wait for admin acceptance before logging in.');
            } else if (error.message && error.message.includes('has been rejected')) {
                setError('Your organization has been rejected by the admin. Please contact support for assistance.');
            } else if (error.message && error.message.includes('rejected by the admin')) {
                setError('Your organization has been rejected by the admin. Please contact support for assistance.');
            } else if (error.message && error.message.includes('currently pending approval')) {
                setError('Your organization registration is pending approval. Please wait for admin acceptance before logging in.');
            } else {
                setError(error.message || 'Login failed. Please check your credentials.');
            }
        }
    };



    return (
        <div className="min-h-screen flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
            <div className="max-w-md w-full space-y-8">
                <div className="text-center">
                    <LogIn className="mx-auto h-12 w-12 text-blue-600" />
                    <h2 className="mt-6 text-3xl font-bold text-gray-900">Login</h2>
                    <p className="mt-2 text-sm text-gray-600">Sign in to access your account</p>
                </div>

                <div className="bg-white rounded-2xl shadow-xl border border-gray-200/50 p-8">
                    <form onSubmit={handleSubmit} className="space-y-6">
                        {error && (
                            <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                                <p className="text-sm text-red-700">{error}</p>
                            </div>
                        )}

                        <div>
                            <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                                Email Address
                            </label>
                            <input
                                id="email"
                                name="email"
                                type="email"
                                autoComplete="email"
                                required
                                value={formData.email}
                                onChange={handleChange}
                                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                placeholder="your-email@example.com"
                            />
                        </div>

                        <div>
                            <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
                                Password
                            </label>
                            <div className="relative">
                                <input
                                    id="password"
                                    name="password"
                                    type={showPassword ? 'text' : 'password'}
                                    autoComplete="current-password"
                                    required
                                    value={formData.password}
                                    onChange={handleChange}
                                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 pr-12"
                                    placeholder="Enter your password"
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="absolute inset-y-0 right-0 pr-3 flex items-center"
                                >
                                    {showPassword ? (
                                        <EyeOff className="h-5 w-5 text-gray-400" />
                                    ) : (
                                        <Eye className="h-5 w-5 text-gray-400" />
                                    )}
                                </button>
                            </div>
                        </div>

                        <div className="flex items-center justify-between">
                            <div className="flex items-center">
                                <input
                                    id="remember-me"
                                    name="remember-me"
                                    type="checkbox"
                                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                                />
                                <label htmlFor="remember-me" className="ml-2 block text-sm text-gray-900">
                                    Remember me
                                </label>
                            </div>

                            <div className="text-sm">
                                <a href="#" className="font-medium text-blue-600 hover:text-blue-500">
                                    Forgot your password?
                                </a>
                            </div>
                        </div>

                        <button
                            type="submit"
                            disabled={loginMutation.isPending}
                            className="w-full flex justify-center py-3 px-4 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {loginMutation.isPending ? (
                                <>
                                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                    Signing In...
                                </>
                            ) : (
                                'Sign In'
                            )}
                        </button>
                    </form>

                    <div className="mt-6 text-center">
                        <p className="text-sm text-gray-600">
                            Don't have an account?{' '}
                            <Link to="/register" className="font-medium text-blue-600 hover:text-blue-500">
                                Register your organization
                            </Link>
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default OrganizationLogin;

