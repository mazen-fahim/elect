import React from 'react';
import { BarChart3, Users, Vote, Settings, Shield } from 'lucide-react';

let AdminSidebar = ({ activeTab, setActiveTab }) => {
    let menuItems = [
        { id: 'overview', label: 'Overview', icon: BarChart3 },
        { id: 'home', label: 'Home', icon: Vote },
        { id: 'organizations', label: 'Organizations', icon: Users },
        { id: 'notifications', label: 'Notifications', icon: Settings },
    ];

    return (
        <div className="w-64 bg-white shadow-lg border-r border-gray-200">
            <div className="p-6 border-b border-gray-200">
                <div className="flex items-center space-x-2">
                    <Shield className="h-8 w-8 text-blue-600" />
                    <div>
                        <h2 className="text-lg font-semibold text-gray-900">Admin Panel</h2>
                        <p className="text-sm text-gray-600">System Management</p>
                    </div>
                </div>
            </div>

            <nav className="p-4">
                <ul className="space-y-2">
                    {menuItems.map((item) => {
                        const Icon = item.icon;
                        return (
                            <li key={item.id}>
                                <button
                                    onClick={() => setActiveTab(item.id)}
                                    className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg transition-colors duration-200 ${activeTab === item.id
                                            ? 'bg-blue-50 text-blue-700 border border-blue-200'
                                            : 'text-gray-700 hover:bg-gray-100'
                                        }`}
                                >
                                    <Icon className="h-5 w-5" />
                                    <span className="font-medium">{item.label}</span>
                                </button>
                            </li>
                        );
                    })}
                </ul>
            </nav>
        </div>
    );
};

export default AdminSidebar;

