import React from 'react';
import { useApp } from '../context/AppContext';
import { MapPin, Mail, Phone, CheckCircle, Globe } from 'lucide-react';

let OrganizationCard = ({ organization }) => {
    let { elections } = useApp();

    let orgElections = elections.filter((e) => e.organizationId === organization.id);
    let activeElections = orgElections.filter((e) => e.status === 'active').length;
    let totalVotes = orgElections.reduce((sum, e) => sum + e.totalVotes, 0);

    return (
        <div className="bg-white rounded-xl shadow-lg border border-gray-200/50 overflow-hidden hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1">
            <div className="p-6">
                <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                        <div className="flex items-center space-x-2 mb-2">
                            <h3 className="text-xl font-semibold text-gray-900">{organization.name}</h3>
                            {organization.verified && <CheckCircle className="h-5 w-5 text-blue-500" />}
                        </div>
                        <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                            {organization.type}
                        </span>
                    </div>
                </div>

                <div className="space-y-3 mb-6">
                    <div className="flex items-center text-sm text-gray-600">
                        <MapPin className="h-4 w-4 mr-2 flex-shrink-0" />
                        <span className="line-clamp-1">{organization.address}</span>
                    </div>
                    <div className="flex items-center text-sm text-gray-600">
                        <Mail className="h-4 w-4 mr-2 flex-shrink-0" />
                        <span className="line-clamp-1">{organization.email}</span>
                    </div>
                    <div className="flex items-center text-sm text-gray-600">
                        <Phone className="h-4 w-4 mr-2 flex-shrink-0" />
                        <span>{organization.phone}</span>
                    </div>
                    {organization.website && (
                        <div className="flex items-center text-sm text-gray-600">
                            <Globe className="h-4 w-4 mr-2 flex-shrink-0" />
                            <a
                                href={organization.website}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-blue-600 hover:text-blue-800 line-clamp-1"
                            >
                                Visit Website
                            </a>
                        </div>
                    )}
                </div>

                <div className="grid grid-cols-3 gap-4 pt-4 border-t border-gray-200">
                    <div className="text-center">
                        <div className="text-2xl font-bold text-gray-900">{orgElections.length}</div>
                        <div className="text-xs text-gray-600">Elections</div>
                    </div>
                    <div className="text-center">
                        <div className="text-2xl font-bold text-green-600">{activeElections}</div>
                        <div className="text-xs text-gray-600">Active</div>
                    </div>
                    <div className="text-center">
                        <div className="text-2xl font-bold text-blue-600">{totalVotes.toLocaleString()}</div>
                        <div className="text-xs text-gray-600">Votes</div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default OrganizationCard;

