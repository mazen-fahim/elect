import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import AdminSidebar from '../components/AdminSidebar';
import { Users, Vote, TrendingUp, Shield, CheckCircle, XCircle, Clock } from 'lucide-react';

let AdminDashboard = () => {
    let { user, organizations, elections, candidates } = useApp();
    let [activeTab, setActiveTab] = useState('overview');

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

    let totalVotes = elections.reduce((sum, election) => sum + election.totalVotes, 0);
    let activeElections = elections.filter((e) => e.status === 'active').length;
    let completedElections = elections.filter((e) => e.status === 'completed').length;

    let renderOverview = () => (
        <div className="space-y-6">
            {/* Stats Grid */}
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

            <div className="bg-white rounded-xl shadow-lg border border-gray-200/50">
                <div className="p-6 border-b border-gray-200">
                    <h3 className="text-lg font-semibold text-gray-900">System Activity</h3>
                </div>
                <div className="p-6">
                    <div className="space-y-4">
                        <div className="flex items-center space-x-3">
                            <CheckCircle className="h-5 w-5 text-green-500" />
                            <span className="text-gray-700">New organization "Democratic Movement" registered</span>
                            <span className="text-sm text-gray-500">2 hours ago</span>
                        </div>
                        <div className="flex items-center space-x-3">
                            <Vote className="h-5 w-5 text-blue-500" />
                            <span className="text-gray-700">Election "Presidential Election 2024" started</span>
                            <span className="text-sm text-gray-500">5 hours ago</span>
                        </div>
                        <div className="flex items-center space-x-3">
                            <TrendingUp className="h-5 w-5 text-purple-500" />
                            <span className="text-gray-700">1,250 votes cast in active elections</span>
                            <span className="text-sm text-gray-500">1 day ago</span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );

    let renderOrganizations = () => (
        <div className="bg-white rounded-xl shadow-lg border border-gray-200/50">
            <div className="p-6 border-b border-gray-200">
                <h3 className="text-lg font-semibold text-gray-900">All Organizations</h3>
            </div>
            <div className="overflow-x-auto">
                <table className="w-full">
                    <thead className="bg-gray-50">
                        <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Organization
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Type
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Elections
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Status
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Actions
                            </th>
                        </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                        {organizations.map((org) => (
                            <tr key={org.id} className="hover:bg-gray-50">
                                <td className="px-6 py-4 whitespace-nowrap">
                                    <div>
                                        <div className="text-sm font-medium text-gray-900">{org.name}</div>
                                        <div className="text-sm text-gray-500">{org.email}</div>
                                    </div>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{org.type}</td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                    {org.elections.length}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap">
                                    {org.verified ? (
                                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                            <CheckCircle className="h-3 w-3 mr-1" />
                                            Verified
                                        </span>
                                    ) : (
                                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                                            <Clock className="h-3 w-3 mr-1" />
                                            Pending
                                        </span>
                                    )}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                                    <button className="text-blue-600 hover:text-blue-900 mr-3">View Details</button>
                                    <button className="text-red-600 hover:text-red-900">Suspend</button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );

    let renderElections = () => (
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
                                        className={`px-3 py-1 rounded-full text-xs font-medium ${
                                            election.status === 'active'
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
                                    <span>
                                        {election.startDate} - {election.endDate}
                                    </span>
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
                {activeTab === 'organizations' && renderOrganizations()}
                {activeTab === 'elections' && renderElections()}
            </div>
        </div>
    );
};

export default AdminDashboard;

