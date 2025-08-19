import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Search, Filter, Calendar, Vote, Users, MapPin, Clock, Eye, ChevronLeft, ChevronRight } from 'lucide-react';
import { publicApi } from '../services/api';

const PublicElections = () => {
  const [elections, setElections] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterOptions, setFilterOptions] = useState({
    countries: [],
    electionTypes: [],
    organizations: []
  });

  // Search and filter state
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [organizationFilter, setOrganizationFilter] = useState('');
  const [countryFilter, setCountryFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState('');

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalElections, setTotalElections] = useState(0);
  const [itemsPerPage] = useState(12);

  // UI state
  const [showFilters, setShowFilters] = useState(false);
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('');
  const [filterOptionsLoading, setFilterOptionsLoading] = useState(true);
  const [filterOptionsError, setFilterOptionsError] = useState(null);

  // Debounce search term
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm);
      setCurrentPage(1); // Reset to first page when searching
    }, 500);

    return () => clearTimeout(timer);
  }, [searchTerm]);

  // Load filter options on component mount
  useEffect(() => {
    const loadFilterOptions = async () => {
      setFilterOptionsLoading(true);
      setFilterOptionsError(null);
      try {
        const options = await publicApi.getFilterOptions();
        // Ensure we have valid arrays even if the API returns unexpected data
        setFilterOptions({
          countries: Array.isArray(options?.countries) ? options.countries : [],
          electionTypes: Array.isArray(options?.electionTypes) ? options.electionTypes : [],
          organizations: Array.isArray(options?.organizations) ? options.organizations : []
        });
      } catch (error) {
        console.error('Failed to load filter options:', error);
        setFilterOptionsError(error);
        // Set empty arrays as fallback
        setFilterOptions({
          countries: [],
          electionTypes: [],
          organizations: []
        });
      } finally {
        setFilterOptionsLoading(false);
      }
    };
    loadFilterOptions();
  }, []);

  // Load elections when filters or page changes
  useEffect(() => {
    const loadElections = async () => {
      setLoading(true);
      try {
        const params = {
          page: currentPage,
          limit: itemsPerPage,
          ...(debouncedSearchTerm && { search: debouncedSearchTerm }),
          ...(statusFilter && { status: statusFilter }),
          ...(organizationFilter && { organization: organizationFilter }),
          ...(countryFilter && { country: countryFilter }),
          ...(typeFilter && { election_type: typeFilter }),
        };

        const response = await publicApi.getPublicElections(params);
        setElections(response.elections);
        setTotalPages(response.total_pages);
        setTotalElections(response.total);
      } catch (error) {
        console.error('Failed to load elections:', error);
      } finally {
        setLoading(false);
      }
    };

    loadElections();
  }, [debouncedSearchTerm, statusFilter, organizationFilter, countryFilter, typeFilter, currentPage, itemsPerPage]);

  const clearFilters = () => {
    setSearchTerm('');
    setStatusFilter('');
    setOrganizationFilter('');
    setCountryFilter('');
    setTypeFilter('');
    setCurrentPage(1);
  };

  const getStatusBadge = (status) => {
    const statusConfig = {
      upcoming: { color: 'bg-blue-100 text-blue-800', icon: Calendar, text: 'Upcoming' },
      running: { color: 'bg-green-100 text-green-800', icon: Vote, text: 'Vote Now' },
      finished: { color: 'bg-gray-100 text-gray-800', icon: Clock, text: 'Finished' }
    };

    const config = statusConfig[status] || statusConfig.finished;
    const Icon = config.icon;

    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${config.color}`}>
        <Icon className="h-3 w-3 mr-1" />
        {config.text}
      </span>
    );
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const renderElectionCard = (election) => (
    <div key={election.id} className="bg-white rounded-xl shadow-lg border border-gray-200/50 overflow-hidden hover:shadow-xl transition-all duration-300">
      <div className="p-6">
        <div className="flex items-start justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900 line-clamp-2">{election.title}</h3>
          {getStatusBadge(election.status)}
        </div>

        <p className="text-gray-600 text-sm mb-4 line-clamp-3">{election.description}</p>

        <div className="space-y-3 mb-4">
          <div className="flex items-center text-sm text-gray-500">
            <Users className="h-4 w-4 mr-2" />
            <span>{election.organization_name}</span>
          </div>

          <div className="flex items-center text-sm text-gray-500">
            <MapPin className="h-4 w-4 mr-2" />
            <span>{election.organization_country}</span>
          </div>

          <div className="flex items-center text-sm text-gray-500">
            <Vote className="h-4 w-4 mr-2" />
            <span>{election.number_of_candidates} candidates</span>
          </div>
          {typeof election.potential_number_of_voters === 'number' && (
            <div className="flex items-center text-sm text-gray-500">
              <Users className="h-4 w-4 mr-2" />
              <span>Potential voters: {election.potential_number_of_voters.toLocaleString()}</span>
            </div>
          )}

          {election.status === 'finished' && (
            <div className="flex items-center text-sm text-gray-500">
              <Vote className="h-4 w-4 mr-2" />
              <span>{election.total_vote_count.toLocaleString()} votes cast</span>
            </div>
          )}
        </div>

        <div className="border-t border-gray-100 pt-4">
          <div className="text-xs text-gray-500 mb-2">Election Period</div>
          <div className="text-sm text-gray-700">
            {formatDate(election.starts_at)} - {formatDate(election.ends_at)}
          </div>
        </div>

        <div className="mt-4 flex justify-between items-center">
          <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">
            {election.types}
          </span>

          {election.status === 'running' ? (
            <Link
              to={`/vote/${election.id}`}
              className="inline-flex items-center px-4 py-2 bg-green-600 text-white text-sm font-medium rounded-lg hover:bg-green-700 transition-colors duration-200"
            >
              <Vote className="h-4 w-4 mr-2" />
              Vote Now
            </Link>
          ) : election.status === 'finished' ? (
            <Link
              to={`/results/${election.id}`}
              className="inline-flex items-center px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors duration-200"
            >
              <Eye className="h-4 w-4 mr-2" />
              View Results
            </Link>
          ) : (
            <span className="text-sm text-gray-500">Coming Soon</span>
          )}
        </div>
      </div>
    </div>
  );

  const renderPagination = () => {
    if (totalPages <= 1) return null;

    const pages = [];
    const maxVisiblePages = 5;
    let startPage = Math.max(1, currentPage - Math.floor(maxVisiblePages / 2));
    let endPage = Math.min(totalPages, startPage + maxVisiblePages - 1);

    if (endPage - startPage + 1 < maxVisiblePages) {
      startPage = Math.max(1, endPage - maxVisiblePages + 1);
    }

    for (let i = startPage; i <= endPage; i++) {
      pages.push(i);
    }

    return (
      <div className="flex items-center justify-center space-x-2 mt-8">
        <button
          onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
          disabled={currentPage === 1}
          className="p-2 rounded-lg border border-gray-300 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>

        {startPage > 1 && (
          <>
            <button
              onClick={() => setCurrentPage(1)}
              className="px-3 py-2 rounded-lg border border-gray-300 hover:bg-gray-50"
            >
              1
            </button>
            {startPage > 2 && <span className="px-2 text-gray-500">...</span>}
          </>
        )}

        {pages.map(page => (
          <button
            key={page}
            onClick={() => setCurrentPage(page)}
            className={`px-3 py-2 rounded-lg border ${page === currentPage
                ? 'bg-blue-600 text-white border-blue-600'
                : 'border-gray-300 hover:bg-gray-50'
              }`}
          >
            {page}
          </button>
        ))}

        {endPage < totalPages && (
          <>
            {endPage < totalPages - 1 && <span className="px-2 text-gray-500">...</span>}
            <button
              onClick={() => setCurrentPage(totalPages)}
              className="px-3 py-2 rounded-lg border border-gray-300 hover:bg-gray-50"
            >
              {totalPages}
            </button>
          </>
        )}

        <button
          onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
          disabled={currentPage === totalPages}
          className="p-2 rounded-lg border border-gray-300 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>
    );
  };

  return (
    <div className="min-h-screen py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            Browse Elections
          </h1>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            Discover and participate in elections from organizations around the world
          </p>
        </div>

        {/* Search and Filters */}
        <div className="mb-8 space-y-4">
          {/* Search Bar */}
          <div className="relative max-w-2xl mx-auto">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
            <input
              type="text"
              placeholder="Search elections by title, description, or organization..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 shadow-sm"
            />
          </div>

          {/* Filter Toggle */}
          <div className="flex justify-center">
            <button
              onClick={() => setShowFilters(!showFilters)}
              className="inline-flex items-center px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors duration-200"
            >
              <Filter className="h-4 w-4 mr-2" />
              {showFilters ? 'Hide' : 'Show'} Filters
              {filterOptionsLoading && (
                <div className="ml-2 animate-spin rounded-full h-4 w-4 border-b-2 border-gray-600"></div>
              )}
            </button>
          </div>

          {/* Filters Panel */}
          {showFilters && (
            <div className="bg-white rounded-xl shadow-lg border border-gray-200/50 p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
                {/* Status Filter */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Status</label>
                  <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="">All Statuses</option>
                    <option value="upcoming">Upcoming</option>
                    <option value="running">Running</option>
                    <option value="finished">Finished</option>
                  </select>
                </div>

                {/* Organization Filter */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Organization</label>
                  <select
                    value={organizationFilter}
                    onChange={(e) => setOrganizationFilter(e.target.value)}
                    disabled={filterOptionsLoading || filterOptionsError}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <option value="">All Organizations</option>
                    {filterOptionsLoading ? (
                      <option value="" disabled>Loading...</option>
                    ) : filterOptionsError ? (
                      <option value="" disabled>Error loading options</option>
                    ) : (
                      (filterOptions.organizations || []).map(org => (
                        <option key={org} value={org}>{org}</option>
                      ))
                    )}
                  </select>
                </div>

                {/* Country Filter */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Country</label>
                  <select
                    value={countryFilter}
                    onChange={(e) => setCountryFilter(e.target.value)}
                    disabled={filterOptionsLoading || filterOptionsError}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <option value="">All Countries</option>
                    {filterOptionsLoading ? (
                      <option value="" disabled>Loading...</option>
                    ) : filterOptionsError ? (
                      <option value="" disabled>Error loading options</option>
                    ) : (
                      (filterOptions.countries || []).map(country => (
                        <option key={country} value={country}>{country}</option>
                      ))
                    )}
                  </select>
                </div>

                {/* Election Type Filter */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Type</label>
                  <select
                    value={typeFilter}
                    onChange={(e) => setTypeFilter(e.target.value)}
                    disabled={filterOptionsLoading || filterOptionsError}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <option value="">All Types</option>
                    {filterOptionsLoading ? (
                      <option value="" disabled>Loading...</option>
                    ) : filterOptionsError ? (
                      <option value="" disabled>Error loading options</option>
                    ) : (
                      (filterOptions.electionTypes || []).map(type => (
                        <option key={type} value={type}>{type}</option>
                      ))
                    )}
                  </select>
                </div>

                {/* Clear Filters */}
                <div className="flex items-end space-x-2">
                  <button
                    onClick={clearFilters}
                    className="flex-1 px-4 py-2 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 transition-colors duration-200"
                  >
                    Clear All
                  </button>
                  {filterOptionsError && (
                    <button
                      onClick={() => {
                        setFilterOptionsError(null);
                        setFilterOptionsLoading(true);
                        // Reload filter options
                        const loadFilterOptions = async () => {
                          try {
                            const options = await publicApi.getFilterOptions();
                            setFilterOptions(options);
                          } catch (error) {
                            console.error('Failed to reload filter options:', error);
                            setFilterOptionsError(error);
                          } finally {
                            setFilterOptionsLoading(false);
                          }
                        };
                        loadFilterOptions();
                      }}
                      className="px-4 py-2 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 transition-colors duration-200"
                    >
                      Retry
                    </button>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Results Summary */}
        <div className="mb-6 text-center">
          <p className="text-gray-600">
            {loading ? 'Loading elections...' : `Showing ${(elections || []).length} of ${(totalElections || 0).toLocaleString()} elections`}
          </p>
        </div>

        {/* Elections Grid */}
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          </div>
        ) : (elections || []).length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {(elections || []).map(renderElectionCard)}
          </div>
        ) : (
          <div className="text-center py-12">
            <Search className="h-16 w-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-900 mb-2">No elections found</h3>
            <p className="text-gray-600 mb-4">
              Try adjusting your search terms or filters.
            </p>
            <button
              onClick={clearFilters}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors duration-200"
            >
              Clear All Filters
            </button>
          </div>
        )}

        {/* Pagination */}
        {renderPagination()}
      </div>
    </div>
  );
};

export default PublicElections;
