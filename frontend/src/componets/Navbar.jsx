import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Vote, Home, Users, LogIn, UserPlus, Shield } from 'lucide-react';
import { useApp } from '../context/AppContext';

let Navbar = () => {
  let { user, logout } = useApp();
  let location = useLocation();

  let isActive = (path) => {
    return location.pathname === path ? 'text-blue-600 bg-blue-50' : 'text-gray-700 hover:text-blue-600 hover:bg-gray-50';
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
            {user?.role === 'admin' && (
              <Link
                to="/admin"
                className={`px-4 py-2 rounded-lg font-medium transition-all duration-200 flex items-center space-x-2 ${isActive('/admin')}`}
              >
                <Shield className="h-4 w-4" />
                <span>Admin</span>
              </Link>
            )}
          </div>

          <div className="flex items-center space-x-2">
            {user ? (
              <div className="flex items-center space-x-3">
                <span className="text-sm font-medium text-gray-700">
                  Welcome, {user.name}
                </span>
                {user.role === 'organization' && (
                  <Link
                    to={`/org/${user.organizationId}/dashboard`}
                    className="px-4 py-2 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg font-medium hover:from-blue-700 hover:to-purple-700 transition-all duration-200 shadow-md hover:shadow-lg"
                  >
                    Dashboard
                  </Link>
                )}
                <button
                  onClick={logout}
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
    </nav>
  );
};

export default Navbar;