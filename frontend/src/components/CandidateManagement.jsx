import React, { useState } from 'react';
import { Plus, User, Mail, Award, FileText } from 'lucide-react';
import { useApp } from '../context/AppContext';
import CandidateForm from './CandidateForm';

export default function CandidateManagement({ elections }) {
  const { candidates } = useApp();
  const [showForm, setShowForm] = useState(false);
  const [selectedElection, setSelectedElection] = useState('');

  const activeCandidates = candidates.filter(c => 
    elections.some(e => e.id === c.electionId)
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">Manage Candidates</h3>
          <p className="text-sm text-gray-600">Add and manage candidates for your elections</p>
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          <Plus className="w-4 h-4 mr-2" />
          Add Candidate
        </button>
      </div>

      {/* Election Filter */}
      <div className="bg-white rounded-lg border border-gray-200 p-4">
        <label className="block text-sm font-medium text-gray-700 mb-2">Filter by Election</label>
        <select
          value={selectedElection}
          onChange={(e) => setSelectedElection(e.target.value)}
          className="w-full md:w-64 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        >
          <option value="">All Elections</option>
          {elections.map((election) => (
            <option key={election.id} value={election.id}>
              {election.title}
            </option>
          ))}
        </select>
      </div>

      {/* Candidates Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {activeCandidates
          .filter(candidate => !selectedElection || candidate.electionId === selectedElection)
          .map((candidate) => {
            const election = elections.find(e => e.id === candidate.electionId);
            
            return (
              <div key={candidate.id} className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                    {/* To Show image */}
                    <div className="w-16 h-16 rounded-full overflow-hidden bg-gray-200 flex items-center justify-center">
                       {candidate.imageUrl ? (
                      <img src={candidate.imageUrl} alt={candidate.name} className="w-full h-full object-cover" />
                        ) : (
                    <span className="text-xl font-bold text-white bg-gradient-to-r from-blue-500 to-purple-500 w-full h-full flex items-center justify-center">
                    {candidate.name.charAt(0)}
                    </span>
                   )}
                   </div>

                <div className="flex items-center space-x-4 mb-4">
                  <div className="w-16 h-16 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full flex items-center justify-center">
                    <span className="text-xl font-bold text-white">
                      {candidate.name.charAt(0)}
                    </span>
                  </div>
                  <div className="flex-1">
                    <h4 className="text-lg font-semibold text-gray-900">{candidate.name}</h4>
                    <p className="text-gray-600">{candidate.party}</p>
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="flex items-center text-sm text-gray-600">
                    <Mail className="w-4 h-4 mr-2" />
                    {candidate.email}
                  </div>
                  
                  <div className="flex items-center text-sm text-gray-600">
                    <Award className="w-4 h-4 mr-2" />
                    Symbol: <span className="text-2xl ml-2">{candidate.symbol}</span>
                  </div>
                  
                  <div className="flex items-start text-sm text-gray-600">
                    <FileText className="w-4 h-4 mr-2 mt-0.5" />
                    <p className="line-clamp-2">{candidate.biography}</p>
                  </div>

                  {election && (
                    <div className="pt-2 border-t border-gray-200">
                      <p className="text-sm text-blue-600">Election: {election.title}</p>
                      <p className="text-sm text-gray-500">Votes: {candidate.votes}</p>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
      </div>

      {activeCandidates.length === 0 && (
        <div className="text-center py-12 bg-white rounded-lg border border-gray-200">
          <User className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <p className="text-gray-500">No candidates found</p>
        </div>
      )}

      {/* Add Candidate Form */}
      {showForm && (
        <CandidateForm 
          elections={elections}
          onClose={() => setShowForm(false)} 
        />
      )}
    </div>
  );
}