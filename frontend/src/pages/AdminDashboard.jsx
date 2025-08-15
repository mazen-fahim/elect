import React, { useEffect, useState } from 'react';
import { useApp } from '../context/AppContext';
import AdminSidebar from '../components/AdminSidebar';
import {
  Users, Vote, TrendingUp, Shield, CheckCircle, XCircle, Clock, Search, Trash2, SortAsc, SortDesc, Eye,
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

  const totalVotes = elections.reduce((sum, election) => sum + election.totalVotes, 0);
  const completedElections = elections.filter(e => e.status === 'completed').length;
  const activeElections = elections.filter(e => e.status === 'active').length;

  // Loaders for SystemAdmin tabs
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

  useEffect(() => {
    if (activeTab === 'home') {
      loadActiveElections();
    } else if (activeTab === 'organizations') {
      loadOrganizations();
    } else if (activeTab === 'notifications') {
      loadActivity();
    }
  }, [activeTab]);

  useEffect(() => {
    if (activeTab === 'organizations') {
      const t = setTimeout(loadOrganizations, 300);
      return () => clearTimeout(t);
    }
  }, [orgSearch, orgSortBy, orgOrder]);

  const confirmAndDeleteOrg = async (orgId) => {
    if (!window.confirm('Delete this organization? This cannot be undone.')) return;
    await systemAdminApi.deleteOrganization(orgId);
    await loadOrganizations();
  };

  const showElectionDetails = async (electionId) => {
    const details = await systemAdminApi.getElectionDetails(electionId);
    setElectionDetails(details);
  };

  const renderOverview = () => (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white rounded-xl p-6 shadow-lg border border-gray-200/50">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Organizations</p>
              <p className="text-3xl font-bold text-gray-900">{organizations.length}</p>
            </div>
            <Users className="h-12 w-12 text-blue-500" />
          </div>
        </div>
        <div className="bg-white rounded-xl p-6 shadow-lg border border-gray-200/50">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Elections</p>
              <p className="text-3xl font-bold text-gray-900">{elections.length}</p>
            </div>
            <Vote className="h-12 w-12 text-purple-500" />
          </div>
        </div>
        <div className="bg-white rounded-xl p-6 shadow-lg border border-gray-200/50">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Votes</p>
              <p className="text-3xl font-bold text-gray-900">{totalVotes.toLocaleString()}</p>
            </div>
            <TrendingUp className="h-12 w-12 text-green-500" />
          </div>
        </div>
        <div className="bg-white rounded-xl p-6 shadow-lg border border-gray-200/50">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Active Elections</p>
              <p className="text-3xl font-bold text-gray-900">{activeElections}</p>
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
        <button onClick={loadActiveElections} className="px-3 py-2 text-sm bg-gray-100 rounded-lg">Refresh</button>
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
        <table className="w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Organization</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Country</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Created</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
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
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">{org.status}</span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                  <button className="text-blue-600 hover:text-blue-900 mr-4" onClick={() => openOrgElections(org.id, org.name)}>View Elections</button>
                  <button className="text-red-600 hover:text-red-900 flex items-center gap-1" onClick={() => confirmAndDeleteOrg(org.id)}>
                    <Trash2 className="h-4 w-4" /> Delete
                  </button>
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
        <h3 className="text-lg font-semibold text-gray-900">All Elections</h3>
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
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Organizations Activity</h3>
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
    </div>
  );
};

export default AdminDashboard;
