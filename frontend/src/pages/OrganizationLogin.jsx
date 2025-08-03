import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import { LogIn, Eye, EyeOff } from 'lucide-react';

let OrganizationLogin = () => {
    let { login, organizations } = useApp();
    let navigate = useNavigate();
    let [formData, setFormData] = useState({
        email: '',
        password: '',
    });
    let [showPassword, setShowPassword] = useState(false);
    let [error, setError] = useState('');

    let handleChange = (e) => {
        let { name, value } = e.target;
        setFormData((prev) => ({ ...prev, [name]: value }));
        setError('');
    };

    let handleSubmit = (e) => {
        e.preventDefault();

        let org = organizations.find((o) => o.email === formData.email);

        if (org && formData.password === 'password') {
            // Mock password check
            let userData = {
                id: org.id,
                name: org.name,
                email: org.email,
                role: 'organization',
                organizationId: org.id,
            };
            login(userData);
            navigate(`/org/${org.id}/dashboard`);
        } else {
            setError('Invalid email or password');
        }
    };

    let handleDemoLogin = (orgEmail) => {
        let org = organizations.find((o) => o.email === orgEmail);
        if (org) {
            const userData = {
                id: org.id,
                name: org.name,
                email: org.email,
                role: 'organization',
                organizationId: org.id,
            };
            login(userData);
            navigate(`/org/${org.id}/dashboard`);
        }
    };

    let handleAdminLogin = () => {
        let adminUser = {
            id: 'admin1',
            name: 'System Administrator',
            email: 'admin@votesecure.com',
            role: 'admin',
        };
        login(adminUser);
        navigate('/admin');
    };

    return (
        <div className="min-h-screen flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
            <div className="max-w-md w-full space-y-8">
                <div className="text-center">
                    <LogIn className="mx-auto h-12 w-12 text-blue-600" />
                    <h2 className="mt-6 text-3xl font-bold text-gray-900">Organization Login</h2>
                    <p className="mt-2 text-sm text-gray-600">Sign in to manage your elections</p>
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
                                placeholder="your-org@example.com"
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
                            className="w-full flex justify-center py-3 px-4 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-all duration-200"
                        >
                            Sign In
                        </button>
                    </form>

                    <div className="mt-6">
                        <div className="relative">
                            <div className="absolute inset-0 flex items-center">
                                <div className="w-full border-t border-gray-300" />
                            </div>
                            <div className="relative flex justify-center text-sm">
                                <span className="px-2 bg-white text-gray-500">Or try demo accounts</span>
                            </div>
                        </div>

                        <div className="mt-6 space-y-3">
                            <button
                                onClick={() => handleDemoLogin('admin@democratic-movement.org')}
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 transition-colors duration-200"
                            >
                                Demo: Democratic Movement
                            </button>
                            <button
                                onClick={() => handleDemoLogin('president@studentunion.edu')}
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 transition-colors duration-200"
                            >
                                Demo: Student Union
                            </button>
                            <button
                                onClick={handleAdminLogin}
                                className="w-full px-4 py-2 border border-red-300 rounded-lg text-sm font-medium text-red-700 bg-red-50 hover:bg-red-100 transition-colors duration-200"
                            >
                                Demo: System Admin
                            </button>
                        </div>
                    </div>

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

