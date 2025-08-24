import React, { useEffect, useState } from 'react';
import { useApp } from '../context/AppContext';
import AdminSidebar from '../components/AdminSidebar';
import ConfirmModal from '../components/ConfirmModal';
import {
  Users, Vote, TrendingUp, Shield, CheckCircle, XCircle, Clock, Search, Trash2, SortAsc, SortDesc, Eye,
  X, Plus, Edit, User, Loader2
} from 'lucide-react';
import { systemAdminApi } from '../services/api';

const AdminDashboard = () => {
  const { user, organizations, elections, setOrganizations } = useApp();
  const [activeTab, setActiveTab] = useState('overview');
  const [selectedOrg, setSelectedOrg] = useState(null);

  // System Admin data state
  const [activeElectionsData, setActiveElectionsData] = useState([]);
  const [electionDetails, setElectionDetails] = useState(null);
  const [orgSearch, setOrgSearch] = useState('');
  const [orgSortBy, setOrgSortBy] = useState('created_at');
  const [orgOrder, setOrgOrder] = useState('desc');
  const [adminOrganizations, setAdminOrganizations] = useState([]);
  const [activity, setActivity] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showOrgElectionsModal, setShowOrgElectionsModal] = useState(false);
  const [selectedOrgForElections, setSelectedOrgForElections] = useState(null);
  const [groupedElections, setGroupedElections] = useState({ upcoming: [], running: [], finished: [] });
  
  // Confirmation modal state
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [statusAction, setStatusAction] = useState({ orgId: null, action: '', orgName: '' });
  
  // Delete confirmation modal state
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteAction, setDeleteAction] = useState({ orgId: null, orgName: '' });

  // Organization Admin Management state
  const [showManageAdminsModal, setShowManageAdminsModal] = useState(false);
  const [selectedOrgForAdmins, setSelectedOrgForAdmins] = useState(null);
  const [organizationAdmins, setOrganizationAdmins] = useState([]);
  const [adminsLoading, setAdminsLoading] = useState(false);
  const [showCreateAdminModal, setShowCreateAdminModal] = useState(false);
  const [showEditAdminModal, setShowEditAdminModal] = useState(false);
  const [editingAdmin, setEditingAdmin] = useState(null);
  const [adminFormData, setAdminFormData] = useState({
    email: '',
    password: '',
    first_name: '',
    last_name: ''
  });
  
  // Dashboard stats state
  const [dashboardStats, setDashboardStats] = useState({
    total_organizations: 0,
    total_elections: 0,
    total_votes: 0,
    active_elections: 0
  });
  const [statsLoading, setStatsLoading] = useState(false);
  
  // Error state for admin operations
  const [adminError, setAdminError] = useState(null);

  // Loaders for SystemAdmin tabs
  const loadDashboardStats = async () => {
    setStatsLoading(true);
    try {
      const data = await systemAdminApi.getDashboardStats();
      setDashboardStats(data);
    } catch (error) {
      console.error('Failed to load dashboard stats:', error);
    } finally {
      setStatsLoading(false);
    }
  };

  const loadActiveElections = async () => {
    setLoading(true);
    try {
      const data = await systemAdminApi.listActiveElections();
      setActiveElectionsData(data);
    } finally {
      setLoading(false);
    }
  };

  const loadOrganizations = async () => {
    const data = await systemAdminApi.listOrganizations({ search: orgSearch, sort_by: orgSortBy, order: orgOrder });
    setAdminOrganizations(data);
  };

  const loadActivity = async () => {
    const data = await systemAdminApi.organizationsActivity();
    setActivity(data);
  };

  const openOrgElections = async (orgId, orgName) => {
    const grouped = await systemAdminApi.getOrgElectionsGrouped(orgId);
    setSelectedOrgForElections({ id: orgId, name: orgName });
    setGroupedElections(grouped.elections || { upcoming: [], running: [], finished: [] });
    setShowOrgElectionsModal(true);
  };

  const confirmAndDeleteOrg = async (orgId) => {
    const org = adminOrganizations.find(org => org.id === orgId);
    setDeleteAction({ orgId, orgName: org?.name || '' });
    setShowDeleteModal(true);
  };

  const executeDeleteOrg = async () => {
    try {
      await systemAdminApi.deleteOrganization(deleteAction.orgId);
      await loadOrganizations();
    } catch (error) {
      console.error('Failed to delete organization:', error);
      // You can add a toast notification here instead of alert
    }
  };

  // Organization Admin Management Functions
  const openManageAdmins = async (orgId, orgName) => {
    setSelectedOrgForAdmins({ id: orgId, name: orgName });
    setShowManageAdminsModal(true);
    await loadOrganizationAdmins(orgId);
  };

  const loadOrganizationAdmins = async (orgId) => {
    try {
      setAdminsLoading(true);
      const admins = await systemAdminApi.getOrganizationAdmins(orgId);
      setOrganizationAdmins(admins);
    } catch (error) {
      console.error('Failed to load organization admins:', error);
    } finally {
      setAdminsLoading(false);
    }
  };

  const handleCreateAdmin = async (e) => {
    e.preventDefault();
    try {
      await systemAdminApi.createOrganizationAdmin(selectedOrgForAdmins.id, adminFormData);
      await loadOrganizationAdmins(selectedOrgForAdmins.id);
      setShowCreateAdminModal(false);
      resetAdminForm();
      setAdminError(null);
    } catch (error) {
      console.error('Failed to create admin:', error);
      setAdminError(`Failed to create admin: ${error.message || 'Unknown error occurred'}`);
      // Clear error after 5 seconds
      setTimeout(() => setAdminError(null), 5000);
    }
  };

  const handleUpdateAdmin = async (e) => {
    e.preventDefault();
    try {
      // Filter out empty values to avoid sending unnecessary data
      const updateData = {};
      if (adminFormData.email && adminFormData.email.trim() !== '') {
        updateData.email = adminFormData.email.trim();
      }
      if (adminFormData.first_name && adminFormData.first_name.trim() !== '') {
        updateData.first_name = adminFormData.first_name.trim();
      }
      if (adminFormData.last_name && adminFormData.last_name.trim() !== '') {
        updateData.last_name = adminFormData.last_name.trim();
      }
      if (adminFormData.password && adminFormData.password.trim() !== '') {
        updateData.password = adminFormData.password.trim();
      }
      
      await systemAdminApi.updateOrganizationAdmin(selectedOrgForAdmins.id, editingAdmin.user_id, updateData);
      await loadOrganizationAdmins(selectedOrgForAdmins.id);
      setShowEditAdminModal(false);
      setEditingAdmin(null);
      resetAdminForm();
      setAdminError(null);
    } catch (error) {
      console.error('Failed to update admin:', error);
      setAdminError(`Failed to update admin: ${error.message || 'Unknown error occurred'}`);
      // Clear error after 5 seconds
      setTimeout(() => setAdminError(null), 5000);
    }
  };

  const handleDeleteAdmin = async (adminUserId) => {
    try {
      await systemAdminApi.deleteOrganizationAdmin(selectedOrgForAdmins.id, adminUserId);
      await loadOrganizationAdmins(selectedOrgForAdmins.id);
      setAdminError(null);
    } catch (error) {
      console.error('Failed to delete admin:', error);
      setAdminError(`Failed to delete admin: ${error.message || 'Unknown error occurred'}`);
      // Clear error after 5 seconds
      setTimeout(() => setAdminError(null), 5000);
    }
  };

  const openEditAdminModal = (admin) => {
    setEditingAdmin(admin);
    setAdminFormData({
      email: admin.email,
      password: '',
      first_name: admin.first_name,
      last_name: admin.last_name
    });
    setShowEditAdminModal(true);
    setAdminError(null);
  };

  const resetAdminForm = () => {
    setAdminFormData({
      email: '',
      password: '',
      first_name: '',
      last_name: ''
    });
  };

  const updateOrganizationStatus = async (orgId, newStatus) => {
    const action = newStatus === 'accepted' ? 'accept' : 'reject';
    setStatusAction({ orgId, action, orgName: adminOrganizations.find(org => org.id === orgId)?.name || '' });
    setShowStatusModal(true);
  };

  const confirmStatusUpdate = async () => {
    try {
      await systemAdminApi.updateOrganizationStatus(statusAction.orgId, statusAction.action === 'accept' ? 'accepted' : 'rejected');
      await loadOrganizations();
    } catch (error) {
      console.error(`Failed to ${statusAction.action} organization:`, error);
      // You can add a toast notification here instead of alert
    }
  };

  const showElectionDetails = async (electionId) => {
    const details = await systemAdminApi.getElectionDetails(electionId);
    setElectionDetails(details);
  };

  const handleSyncAllElectionStatuses = async () => {
    try {
      setLoading(true);
      await systemAdminApi.syncAllElectionStatuses();
      // Refresh data to show updated statuses
      await loadActiveElections();
      await loadDashboardStats();
    } catch (error) {
      console.error('Failed to sync election statuses:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'overview') {
      loadDashboardStats();
      loadActiveElections();
    } else if (activeTab === 'organizations') {
      loadOrganizations();
    } else if (activeTab === 'notifications') {
      loadActivity();
    }
  }, [activeTab]);

  // Load dashboard stats on component mount
  useEffect(() => {
    loadDashboardStats();
  }, []);

  useEffect(() => {
    if (activeTab === 'organizations') {
      const t = setTimeout(loadOrganizations, 300);
      return () => clearTimeout(t);
    }
  }, [orgSearch, orgSortBy, orgOrder]);

  // Check access control after all hooks are called
  if (!user || user.role !== 'admin') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <Shield className="h-16 w-16 text-red-500 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Access Denied</h1>
          <p className="text-gray-600">This page is restricted to administrators only.</p>
        </div>
      </div>
    );
  }

  const renderOverview = () => (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-900">Dashboard Overview</h3>
        <button 
          onClick={loadDashboardStats} 
          disabled={statsLoading}
          className="px-3 py-2 text-sm bg-gray-100 hover:bg-gray-200 rounded-lg disabled:opacity-50"
        >
          {statsLoading ? 'Refreshing...' : 'Refresh'}
        </button>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white rounded-xl p-6 shadow-lg border border-gray-200/50">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Organizations</p>
              <p className="text-3xl font-bold text-gray-900">
                {statsLoading ? '...' : dashboardStats.total_organizations}
              </p>
            </div>
            <Users className="h-12 w-12 text-blue-500" />
          </div>
        </div>
        <div className="bg-white rounded-xl p-6 shadow-lg border border-gray-200/50">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Elections</p>
              <p className="text-3xl font-bold text-gray-900">
                {statsLoading ? '...' : dashboardStats.total_elections}
              </p>
            </div>
            <Vote className="h-12 w-12 text-purple-500" />
          </div>
        </div>
        <div className="bg-white rounded-xl p-6 shadow-lg border border-gray-200/50">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Votes</p>
              <p className="text-3xl font-bold text-gray-900">
                {statsLoading ? '...' : dashboardStats.total_votes.toLocaleString()}
              </p>
            </div>
            <TrendingUp className="h-12 w-12 text-green-500" />
          </div>
        </div>
        <div className="bg-white rounded-xl p-6 shadow-lg border border-gray-200/50">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Active Elections</p>
              <p className="text-3xl font-bold text-gray-900">
                {statsLoading ? '...' : dashboardStats.active_elections}
              </p>
            </div>
            <Clock className="h-12 w-12 text-orange-500" />
          </div>
        </div>
      </div>
    </div>
  );

  const renderHome = () => (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-900">Active Elections</h3>
        <div className="flex items-center space-x-2">
          <button 
            onClick={handleSyncAllElectionStatuses}
            className="px-3 py-2 text-sm bg-green-100 text-green-700 rounded-lg hover:bg-green-200"
            title="Sync all election statuses across the system"
          >
            Sync Statuses
          </button>
          <button onClick={loadActiveElections} className="px-3 py-2 text-sm bg-gray-100 rounded-lg">Refresh</button>
        </div>
      </div>
      {loading ? (
        <div className="flex items-center justify-center py-8"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div></div>
      ) : (
        <div className="grid gap-6">
          {activeElectionsData.length === 0 ? (
            <div className="text-gray-500">No active elections.</div>
          ) : activeElectionsData.map((e) => (
            <div key={e.id} className="border border-gray-200 rounded-lg p-6 flex justify-between items-start">
              <div>
                <div className="flex items-center gap-2">
                  <h4 className="text-lg font-semibold">{e.title}</h4>
                  <span className="text-xs px-2 py-1 rounded-full bg-green-100 text-green-700">Running</span>
                </div>
                <div className="text-sm text-gray-600">{e.organization_name}</div>
                <div className="text-xs text-gray-500">{new Date(e.starts_at).toLocaleString()} - {new Date(e.ends_at).toLocaleString()}</div>
              </div>
              <div className="flex items-center gap-2">
                <button className="p-2 text-blue-600 hover:bg-blue-50 rounded" onClick={() => showElectionDetails(e.id)} title="Details"><Eye className="h-4 w-4" /></button>
              </div>
            </div>
          ))}
        </div>
      )}

      {electionDetails && (
        <div className="bg-white rounded-xl shadow border border-gray-200 p-6">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-semibold">Election Details: {electionDetails.election.title}</h3>
            <button onClick={() => setElectionDetails(null)} className="text-gray-500">Close</button>
          </div>
          <div className="grid md:grid-cols-3 gap-4 text-sm">
            <div>
              <div className="text-gray-500">Organization</div>
              <div className="font-medium">{electionDetails.organization.name}</div>
            </div>
            <div>
              <div className="text-gray-500">Period</div>
              <div className="font-medium">{new Date(electionDetails.election.starts_at).toLocaleString()} - {new Date(electionDetails.election.ends_at).toLocaleString()}</div>
            </div>
            <div>
              <div className="text-gray-500">Total Votes</div>
              <div className="font-medium">{electionDetails.election.total_vote_count}</div>
            </div>
          </div>
          <div className="mt-4">
            <h4 className="font-semibold mb-2">Candidates</h4>
            <div className="grid gap-2">
              {electionDetails.candidates.map(c => (
                <div key={c.hashed_national_id} className="flex justify-between text-sm border rounded p-2">
                  <div>{c.name} {c.party ? `- ${c.party}` : ''}</div>
                  <div className="font-semibold">{c.vote_count}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );

  const renderOrganizations = () => (
    <div className="bg-white rounded-xl shadow-lg border border-gray-200/50">
      <div className="p-6 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-900">All Organizations</h3>
          <div className="flex items-center gap-2">
            <button 
              onClick={loadOrganizations} 
              className="px-3 py-2 text-sm bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors duration-200"
            >
              Refresh
            </button>
            <div className="relative">
              <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input value={orgSearch} onChange={e => setOrgSearch(e.target.value)} placeholder="Search by name" className="pl-8 pr-3 py-2 border rounded-lg text-sm" />
            </div>
            <select value={orgSortBy} onChange={e => setOrgSortBy(e.target.value)} className="px-2 py-2 border rounded-lg text-sm">
              <option value="created_at">Date</option>
              <option value="name">Name</option>
            </select>
            <button onClick={() => setOrgOrder(orgOrder === 'asc' ? 'desc' : 'asc')} className="p-2 border rounded-lg text-sm" title="Toggle order">
              {orgOrder === 'asc' ? <SortAsc className="h-4 w-4" /> : <SortDesc className="h-4 w-4" />}
            </button>
          </div>
        </div>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[1000px]">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Organization</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Country</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Created</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Admins</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-80">Actions</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {adminOrganizations.map((org) => (
              <tr key={org.id} className="hover:bg-gray-50">
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm font-medium text-gray-900">{org.name}</div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{org.country}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{new Date(org.created_at).toLocaleString()}</td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                    org.status === 'pending' 
                      ? 'bg-yellow-100 text-yellow-800' 
                      : org.status === 'accepted' 
                        ? 'bg-green-100 text-green-800' 
                        : 'bg-red-100 text-red-800'
                  }`}>
                    {org.status}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  <button 
                    className="inline-flex items-center px-3 py-1.5 text-xs font-medium text-blue-700 bg-blue-100 border border-blue-300 rounded-md hover:bg-blue-200 hover:border-blue-400 transition-colors duration-200" 
                    onClick={() => openManageAdmins(org.id, org.name)}
                  >
                    Manage Admins
                  </button>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                  <div className="flex flex-wrap items-center gap-2">
                    {org.status === 'pending' && (
                      <>
                        <button 
                          className="inline-flex items-center px-3 py-1.5 text-xs font-medium text-green-700 bg-green-100 border border-green-300 rounded-md hover:bg-green-200 hover:border-green-400 transition-colors duration-200" 
                          onClick={() => updateOrganizationStatus(org.id, 'accepted')}
                        >
                          Accept
                        </button>
                        <button 
                          className="inline-flex items-center px-3 py-1.5 text-xs font-medium text-red-700 bg-red-100 border border-red-300 rounded-md hover:bg-red-200 hover:border-red-400 transition-colors duration-200" 
                          onClick={() => updateOrganizationStatus(org.id, 'rejected')}
                        >
                          Reject
                        </button>
                      </>
                    )}
                    <button 
                      className="inline-flex items-center px-3 py-1.5 text-xs font-medium text-blue-700 bg-blue-100 border border-blue-300 rounded-md hover:bg-blue-200 hover:border-blue-400 transition-colors duration-200" 
                      onClick={() => openOrgElections(org.id, org.name)}
                    >
                      View Elections
                    </button>
                    <button 
                      className="inline-flex items-center px-3 py-1.5 text-xs font-medium text-red-700 bg-red-100 border border-red-300 rounded-md hover:bg-red-200 hover:border-red-400 transition-colors duration-200" 
                      onClick={() => confirmAndDeleteOrg(org.id)}
                    >
                      <Trash2 className="h-4 w-4 mr-1" /> 
                      Delete
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );

  const renderElections = () => (
    <div className="bg-white rounded-xl shadow-lg border border-gray-200/50">
      <div className="p-6 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-900">All Elections</h3>
          <button 
            onClick={() => window.location.reload()} 
            className="px-3 py-2 text-sm bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors duration-200"
          >
            Refresh
          </button>
        </div>
      </div>
      <div className="p-6">
        <div className="grid gap-6">
          {elections.map((election) => {
            const org = organizations.find((o) => o.id === election.organizationId);
            return (
              <div key={election.id} className="border border-gray-200 rounded-lg p-6">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h4 className="text-lg font-semibold text-gray-900">{election.title}</h4>
                    <p className="text-sm text-gray-600">{org?.name}</p>
                  </div>
                  <span
                    className={`px-3 py-1 rounded-full text-xs font-medium ${election.status === 'active'
                      ? 'bg-green-100 text-green-800'
                      : election.status === 'upcoming'
                        ? 'bg-blue-100 text-blue-800'
                        : 'bg-gray-100 text-gray-800'
                      }`}
                  >
                    {election.status}
                  </span>
                </div>
                <p className="text-gray-600 mb-4">{election.description}</p>
                <div className="flex items-center justify-between text-sm text-gray-500">
                  <span>Votes: {election.totalVotes.toLocaleString()}</span>
                  <span>{election.startDate} - {election.endDate}</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );



  return (
    <div className="min-h-screen flex">
      <AdminSidebar activeTab={activeTab} setActiveTab={setActiveTab} />
      <div className="flex-1 p-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Admin Dashboard</h1>
          <p className="text-gray-600">Manage organizations, elections, and system settings</p>
        </div>
        {activeTab === 'overview' && renderOverview()}
        {activeTab === 'home' && renderHome()}
        {activeTab === 'organizations' && renderOrganizations()}
        {activeTab === 'elections' && renderElections()}
        {activeTab === 'notifications' && (
          <div className="bg-white rounded-xl shadow-lg border border-gray-200/50 p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Organizations Activity</h3>
              <button 
                onClick={loadActivity} 
                className="px-3 py-2 text-sm bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors duration-200"
              >
                Refresh
              </button>
            </div>
            <div className="space-y-2">
              {activity.map((item, idx) => (
                <div key={idx} className="flex justify-between text-sm border rounded p-2">
                  <div>
                    <span className="font-medium">{item.organization_name}</span>
                    <span className="text-gray-500"> — {item.event.replace('_', ' ')}</span>
                  </div>
                  <div className="text-gray-500">{new Date(item.created_at).toLocaleString()}</div>
                </div>
              ))}
              {activity.length === 0 && <div className="text-gray-500">No activity.</div>}
            </div>
          </div>
        )}
      </div>

      {showOrgElectionsModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 max-w-3xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">Elections for {selectedOrgForElections?.name}</h3>
              <button onClick={() => setShowOrgElectionsModal(false)} className="text-gray-500">Close</button>
            </div>
            {['upcoming', 'running', 'finished'].map(group => (
              <div key={group} className="mb-4">
                <h4 className="font-medium capitalize mb-2">{group}</h4>
                {groupedElections[group]?.length ? (
                  <div className="space-y-2">
                    {groupedElections[group].map(e => (
                      <div key={e.id} className="flex justify-between text-sm border rounded p-2">
                        <div>
                          <div className="font-medium">{e.title}</div>
                          <div className="text-gray-500">{new Date(e.starts_at).toLocaleString()} - {new Date(e.ends_at).toLocaleString()}</div>
                        </div>
                        <div className="text-gray-600">Votes: {e.total_vote_count} · Candidates: {e.number_of_candidates}</div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-gray-500 text-sm">No {group} elections.</div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Confirmation Modal for Organization Status Updates */}
      <ConfirmModal
        isOpen={showStatusModal}
        onClose={() => setShowStatusModal(false)}
        onConfirm={confirmStatusUpdate}
        title={`${statusAction.action === 'accept' ? 'Accept' : 'Reject'} Organization`}
        message={`Are you sure you want to ${statusAction.action} the organization "${statusAction.orgName}"?`}
        confirmText={statusAction.action === 'accept' ? 'Accept' : 'Reject'}
        cancelText="Cancel"
        type={statusAction.action === 'accept' ? 'warning' : 'danger'}
      />

              {/* Delete Confirmation Modal */}
        <ConfirmModal
          isOpen={showDeleteModal}
          onClose={() => setShowDeleteModal(false)}
          onConfirm={executeDeleteOrg}
          title="Delete Organization"
          message={`Are you sure you want to delete the organization "${deleteAction.orgName}"? This action cannot be undone and will permanently remove all associated data.`}
          confirmText="Delete"
          cancelText="Cancel"
          type="danger"
        />

        {/* Manage Organization Admins Modal */}
        {showManageAdminsModal && selectedOrgForAdmins && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between p-6 border-b border-gray-200">
                <h3 className="text-xl font-semibold text-gray-900">Manage Admins for {selectedOrgForAdmins.name}</h3>
                <button
                  onClick={() => {
                    setShowManageAdminsModal(false);
                    setSelectedOrgForAdmins(null);
                    setOrganizationAdmins([]);
                    setAdminError(null);
                  }}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="h-6 w-6" />
                </button>
              </div>
              
              <div className="p-6">
                {/* Error Message Display */}
                {adminError && (
                  <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                    <div className="flex items-center">
                      <XCircle className="h-5 w-5 text-red-400 mr-2" />
                      <p className="text-sm text-red-700">{adminError}</p>
                    </div>
                  </div>
                )}
                
                <div className="flex justify-between items-center mb-6">
                  <h4 className="text-lg font-medium text-gray-900">Organization Administrators</h4>
                  <button
                    onClick={() => setShowCreateAdminModal(true)}
                    className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Add Admin
                  </button>
                </div>

                {adminsLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
                    <span className="ml-2 text-gray-600">Loading admins...</span>
                  </div>
                ) : (
                  <div className="bg-white shadow overflow-hidden sm:rounded-md">
                    <ul className="divide-y divide-gray-200">
                      {organizationAdmins.map((admin) => (
                        <li key={admin.user_id}>
                          <div className="px-4 py-4 sm:px-6">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center space-x-3">
                                <div className="flex-shrink-0">
                                  <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center">
                                    <User className="h-5 w-5 text-blue-600" />
                                  </div>
                                </div>
                                <div>
                                  <div className="text-sm font-medium text-gray-900">
                                    {admin.first_name} {admin.last_name}
                                  </div>
                                  <div className="text-sm text-gray-500">{admin.email}</div>
                                  <div className="text-xs text-gray-400">
                                    Created: {new Date(admin.created_at).toLocaleDateString()}
                                  </div>
                                </div>
                              </div>
                              <div className="flex items-center space-x-2">
                                <button
                                  onClick={() => openEditAdminModal(admin)}
                                  className="inline-flex items-center px-3 py-1 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
                                >
                                  <Edit className="h-4 w-4 mr-1" />
                                  Edit
                                </button>
                                <button
                                  onClick={() => handleDeleteAdmin(admin.user_id)}
                                  className="inline-flex items-center px-3 py-1 border border-transparent text-sm leading-4 font-medium rounded-md text-red-700 bg-red-100 hover:bg-red-200"
                                >
                                  <Trash2 className="h-4 w-4 mr-1" />
                                  Delete
                                </button>
                              </div>
                            </div>
                          </div>
                        </li>
                      ))}
                      {organizationAdmins.length === 0 && (
                        <li className="px-4 py-8 text-center text-gray-500">
                          No organization admins found.
                        </li>
                      )}
                    </ul>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Create Admin Modal */}
        {showCreateAdminModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between p-6 border-b border-gray-200">
                <h3 className="text-xl font-semibold text-gray-900">Add Organization Admin</h3>
                <button
                  onClick={() => {
                    setShowCreateAdminModal(false);
                    resetAdminForm();
                  }}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="h-6 w-6" />
                </button>
              </div>
              
              <form onSubmit={handleCreateAdmin} className="p-6 space-y-6">
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Email</label>
                    <input
                      type="email"
                      value={adminFormData.email}
                      onChange={(e) => setAdminFormData({ ...adminFormData, email: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="admin@example.com"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">First Name</label>
                    <input
                      type="text"
                      value={adminFormData.first_name}
                      onChange={(e) => setAdminFormData({ ...adminFormData, first_name: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="John"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Last Name</label>
                    <input
                      type="text"
                      value={adminFormData.last_name}
                      onChange={(e) => setAdminFormData({ ...adminFormData, last_name: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="Doe"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Password</label>
                    <input
                      type="password"
                      value={adminFormData.password}
                      onChange={(e) => setAdminFormData({ ...adminFormData, password: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                      placeholder="Enter password"
                      required
                    />
                  </div>
                </div>

                <div className="flex justify-end space-x-3 pt-4 border-t">
                  <button
                    type="button"
                    onClick={() => {
                      setShowCreateAdminModal(false);
                      resetAdminForm();
                    }}
                    className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                  >
                    Create Admin
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Edit Admin Modal */}
        {showEditAdminModal && editingAdmin && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between p-6 border-b border-gray-200">
                <h3 className="text-xl font-semibold text-gray-900">Edit Organization Admin</h3>
                <button
                  onClick={() => {
                    setShowEditAdminModal(false);
                    setEditingAdmin(null);
                    resetAdminForm();
                  }}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="h-6 w-6" />
                </button>
              </div>
              
              <form onSubmit={handleUpdateAdmin} className="p-6 space-y-6">
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Email</label>
                    <input
                      type="email"
                      value={adminFormData.email}
                      onChange={(e) => setAdminFormData({ ...adminFormData, email: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="admin@example.com"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">First Name</label>
                    <input
                      type="text"
                      value={adminFormData.first_name}
                      onChange={(e) => setAdminFormData({ ...adminFormData, first_name: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="John"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Last Name</label>
                    <input
                      type="text"
                      value={adminFormData.last_name}
                      onChange={(e) => setAdminFormData({ ...adminFormData, last_name: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="Doe"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">New Password (Optional)</label>
                    <input
                      type="password"
                      value={adminFormData.password}
                      onChange={(e) => setAdminFormData({ ...adminFormData, password: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                      placeholder="Leave blank to keep current password"
                    />
                  </div>
                </div>

                <div className="flex justify-end space-x-3 pt-4 border-t">
                  <button
                    type="button"
                    onClick={() => {
                      setShowEditAdminModal(false);
                      setEditingAdmin(null);
                      resetAdminForm();
                    }}
                    className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                  >
                    Update Admin
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    );
  };

export default AdminDashboard;
