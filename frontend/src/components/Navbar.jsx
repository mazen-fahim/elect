import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Vote, Home, Users, LogIn, UserPlus, Shield, User } from 'lucide-react';
import { useApp } from '../context/AppContext';
import OrganizationProfileModal from './OrganizationProfileModal';

let Navbar = () => {
    let { user, isLoading, logout } = useApp();
    let location = useLocation();
    let navigate = useNavigate();
    let [showProfileModal, setShowProfileModal] = useState(false);

    let isActive = (path) => {
        return location.pathname === path
            ? 'text-blue-600 bg-blue-50'
            : 'text-gray-700 hover:text-blue-600 hover:bg-gray-50';
    };

    let handleLogout = () => {
        logout();
        navigate('/');
    };

    return (
        <nav className="bg-white/80 backdrop-blur-md shadow-lg border-b border-gray-200/50 sticky top-0 z-50">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex justify-between items-center h-16">
                    <Link to="/" className="flex items-center space-x-2 text-xl font-bold text-gray-900">
                        <Vote className="h-8 w-8 text-blue-600" />
                        <span className="bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                            VoteSecure
                        </span>
                    </Link>

                    <div className="hidden md:flex items-center space-x-1">
                        {/* Show different navigation based on user role */}
                        {user?.role === 'organization' ? (
                            <Link
                                to={`/org/${user.organizationId}/dashboard`}
                                className={`px-4 py-2 rounded-lg font-medium transition-all duration-200 flex items-center space-x-2 ${isActive(`/org/${user.organizationId}/dashboard`)}`}
                            >
                                <Shield className="h-4 w-4" />
                                <span>Dashboard</span>
                            </Link>
                        ) : user?.role === 'admin' ? (
                            <Link
                                to="/SystemAdmin"
                                className={`px-4 py-2 rounded-lg font-medium transition-all duration-200 flex items-center space-x-2 ${isActive('/SystemAdmin')}`}
                            >
                                <Shield className="h-4 w-4" />
                                <span>Dashboard</span>
                            </Link>
                        ) : (
                            <>
                                <Link
                                    to="/"
                                    className={`px-4 py-2 rounded-lg font-medium transition-all duration-200 flex items-center space-x-2 ${isActive('/')}`}
                                >
                                    <Home className="h-4 w-4" />
                                    <span>Home</span>
                                </Link>
                                <Link
                                    to="/elections"
                                    className={`px-4 py-2 rounded-lg font-medium transition-all duration-200 flex items-center space-x-2 ${isActive('/elections')}`}
                                >
                                    <Vote className="h-4 w-4" />
                                    <span>Elections</span>
                                </Link>
                            </>
                        )}
                    </div>

                    <div className="flex items-center space-x-2">
                        {isLoading ? (
                            <div className="flex items-center space-x-2">
                                <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                                <span className="text-sm text-gray-600">Loading...</span>
                            </div>
                        ) : user ? (
                            <div className="flex items-center space-x-3">
                                <span className="text-sm font-medium text-gray-700">
                                    Welcome,{' '}
                                    {user.role === 'organization'
                                        ? user.organizationName || user.name || 'Organization'
                                        : user.role === 'admin'
                                        ? 'Admin'
                                        : user.name || 'User'}
                                </span>
                                {user.role === 'organization' && (
                                    <>
                                        <Link
                                            to={`/org/${user.organizationId}/dashboard`}
                                            className="px-4 py-2 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg font-medium hover:from-blue-700 hover:to-purple-700 transition-all duration-200 shadow-md hover:shadow-lg"
                                        >
                                            Dashboard
                                        </Link>
                                        <button
                                            onClick={() => setShowProfileModal(true)}
                                            className="p-2 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition-all duration-200"
                                            title="Organization Profile"
                                        >
                                            <User className="h-5 w-5" />
                                        </button>
                                    </>
                                )}
                                {user.role === 'admin' && (
                                    <Link
                                        to="/SystemAdmin"
                                        className="px-4 py-2 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg font-medium hover:from-blue-700 hover:to-purple-700 transition-all duration-200 shadow-md hover:shadow-lg"
                                    >
                                        Dashboard
                                    </Link>
                                )}
                                <button
                                    onClick={handleLogout}
                                    className="px-4 py-2 text-gray-600 hover:text-gray-800 font-medium transition-colors duration-200"
                                >
                                    Logout
                                </button>
                            </div>
                        ) : (
                            <div className="flex items-center space-x-2">
                                <Link
                                    to="/login/org"
                                    className="px-4 py-2 text-gray-700 hover:text-blue-600 font-medium transition-colors duration-200 flex items-center space-x-2"
                                >
                                    <LogIn className="h-4 w-4" />
                                    <span className="hidden sm:inline">Login</span>
                                </Link>
                                <Link
                                    to="/register"
                                    className="px-4 py-2 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg font-medium hover:from-blue-700 hover:to-purple-700 transition-all duration-200 shadow-md hover:shadow-lg flex items-center space-x-2"
                                >
                                    <UserPlus className="h-4 w-4" />
                                    <span className="hidden sm:inline">Register Org</span>
                                </Link>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Organization Profile Modal */}
            {user?.role === 'organization' && (
                <OrganizationProfileModal
                    isOpen={showProfileModal}
                    onClose={() => setShowProfileModal(false)}
                    organization={{
                        name: user.organizationName,
                        email: user.email,
                        country: user.country || 'EG',
                        address: user.address,
                        description: user.description,
                        api_endpoint: user.api_endpoint,
                        status: user.status || 'active',
                        created_at: user.created_at,
                    }}
                    onUpdated={(updatedOrg) => {
                        // TODO: Update user context with new organization data
                        console.log('Organization updated:', updatedOrg);
                    }}
                />
            )}
        </nav>
    );
};

export default Navbar;
