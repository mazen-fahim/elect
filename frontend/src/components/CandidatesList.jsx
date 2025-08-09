import React, { useEffect, useMemo, useState } from 'react';
import { Search, User, Plus } from 'lucide-react';
import { candidateApi, electionApi } from '../services/api';
import CandidateDetails from './CandidateDetails';
import { COUNTRIES } from '../constants/countries.js';

// Modal to create a new candidate (manual creation)
const CreateCandidateModal = ({ open, onClose, elections, onCreated }) => {
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState({});
  const [form, setForm] = useState({
    hashed_national_id: '',
    name: '',
    country: '',
    birth_date: '',
    party: '',
    symbol_name: '',
    description: '',
    district: '',
    governorate: '',
    photo: null,
    symbol_icon: null,
    election_ids: []
  });

  useEffect(() => {
    if (!open) {
      setForm({
        hashed_national_id: '', name: '', country: '', birth_date: '', party: '', symbol_name: '', description: '',
        district: '', governorate: '', photo: null, symbol_icon: null, election_ids: []
      });
      setErrors({});
    }
  }, [open]);

  if (!open) return null;

  const addElection = (electionId) => {
    if (!form.election_ids.includes(electionId)) {
      setForm({...form, election_ids: [...form.election_ids, electionId]});
      if (errors.election_ids) setErrors({...errors, election_ids: ''});
    }
  };

  const removeElection = (electionId) => {
    if (form.election_ids.length > 1) {
      setForm({...form, election_ids: form.election_ids.filter(id => id !== electionId)});
    }
  };

  const availableElections = elections.filter(e => !form.election_ids.includes(e.id.toString()));
  const selectedElections = elections.filter(e => form.election_ids.includes(e.id.toString()));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setErrors({});
    
    try {
      const fd = new FormData();
      fd.append('hashed_national_id', form.hashed_national_id.trim());
      fd.append('name', form.name.trim());
      fd.append('country', form.country);
      const bd = form.birth_date ? (form.birth_date.includes('T') ? form.birth_date : `${form.birth_date}T00:00:00Z`) : '';
      if (!bd) {
        setErrors({ birth_date: 'Birth date is required' });
        return;
      }
      fd.append('birth_date', bd);
      if (form.party) fd.append('party', form.party);
      if (form.symbol_name) fd.append('symbol_name', form.symbol_name);
      if (form.description) fd.append('description', form.description);
      if (form.district) fd.append('district', form.district);
      if (form.governorate) fd.append('governorate', form.governorate);
      if (form.photo) fd.append('photo', form.photo);
      if (form.symbol_icon) fd.append('symbol_icon', form.symbol_icon);
      if (!form.election_ids || form.election_ids.length === 0) {
        setErrors({ election_ids: 'Please select at least one election' });
        return;
      }
      for (const id of form.election_ids) fd.append('election_ids', String(id));

      const url = import.meta.env.VITE_API_URL || 'http://localhost/api';
      const token = localStorage.getItem('authToken');
      const resp = await fetch(`${url}/candidates/`, {
        method: 'POST',
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
        body: fd,
      });
      
      if (!resp.ok) {
        const data = await resp.json().catch(() => ({}));
        
        // Handle specific API errors and map them to form fields
        if (resp.status === 400 && data.detail) {
          if (data.detail.includes('national ID already exists')) {
            setErrors({ hashed_national_id: 'A candidate with this national ID already exists' });
            return;
          }
          if (data.detail.includes('election')) {
            setErrors({ election_ids: data.detail });
            return;
          }
        }
        
        // General error
        setErrors({ general: data.detail || 'Failed to create candidate' });
        return;
      }
      
      const created = await resp.json();
      onCreated && onCreated(created);
      onClose();
    } catch (err) {
      setErrors({ general: err.message || 'Failed to create candidate' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto shadow-2xl">
        <div className="sticky top-0 bg-gradient-to-r from-blue-600 to-blue-700 text-white px-6 py-4 flex items-center justify-between rounded-t-xl">
          <h2 className="text-xl font-semibold flex items-center gap-2">
            <User className="h-5 w-5" />
            Create New Candidate
          </h2>
          <button className="text-blue-100 hover:text-white hover:bg-blue-500 rounded-full p-2 transition-colors" onClick={onClose}>
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* General Error Display */}
          {errors.general && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <p className="text-sm text-red-800">{errors.general}</p>
            </div>
          )}
          
          {/* Required Information Section */}
          <div className="bg-gray-50 rounded-lg p-4">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Required Information</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">National ID</label>
                <input 
                  className={`w-full border rounded-lg px-3 py-2 focus:ring-2 ${
                    errors.hashed_national_id 
                      ? 'border-red-300 focus:ring-red-500 focus:border-red-500' 
                      : 'border-gray-300 focus:ring-blue-500 focus:border-blue-500'
                  }`}
                  placeholder="Enter national ID" 
                  value={form.hashed_national_id} 
                  onChange={e=>{
                    setForm({...form, hashed_national_id:e.target.value});
                    if (errors.hashed_national_id) setErrors({...errors, hashed_national_id: ''});
                  }} 
                  required 
                />
                {errors.hashed_national_id && (
                  <p className="mt-1 text-sm text-red-600">{errors.hashed_national_id}</p>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Full Name</label>
                <input 
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500" 
                  placeholder="Enter full name" 
                  value={form.name} 
                  onChange={e=>setForm({...form, name:e.target.value})} 
                  required 
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Country</label>
                <select 
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500" 
                  value={form.country} 
                  onChange={e=>setForm({...form, country:e.target.value})} 
                  required
                >
                  <option value="">Select country</option>
                  {COUNTRIES.map(c => (<option key={c} value={c}>{c}</option>))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Birth Date</label>
                <input 
                  type="date" 
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500" 
                  value={form.birth_date} 
                  onChange={e=>setForm({...form, birth_date:e.target.value})} 
                  required 
                />
              </div>
            </div>
          </div>

          {/* Elections Selection */}
          <div className="bg-blue-50 rounded-lg p-4">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Election Participation</h3>
            <p className="text-sm text-gray-600 mb-4">Select the elections this candidate will participate in (at least one required)</p>
            
            {/* Selected Elections */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">Selected Elections</label>
              <div className="space-y-2">
                {selectedElections.length === 0 ? (
                  <p className="text-gray-500 text-sm italic">No elections selected yet</p>
                ) : (
                  selectedElections.map(election => (
                    <div key={election.id} className="flex items-center justify-between bg-white border border-blue-200 rounded-lg px-3 py-2">
                      <span className="font-medium text-gray-900">{election.title}</span>
                      <button
                        type="button"
                        onClick={() => removeElection(election.id.toString())}
                        disabled={form.election_ids.length === 1}
                        className={`text-sm px-2 py-1 rounded ${
                          form.election_ids.length === 1 
                            ? 'text-gray-400 cursor-not-allowed' 
                            : 'text-red-600 hover:bg-red-50'
                        }`}
                      >
                        Remove
                      </button>
                    </div>
                  ))
                )}
              </div>
              {errors.election_ids && (
                <p className="mt-1 text-sm text-red-600">{errors.election_ids}</p>
              )}
            </div>

            {/* Add Election */}
            {availableElections.length > 0 && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Add Election</label>
                <select 
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  value=""
                  onChange={e => e.target.value && addElection(e.target.value)}
                >
                  <option value="">Choose an election to add...</option>
                  {availableElections.map(e => (
                    <option key={e.id} value={e.id}>{e.title}</option>
                  ))}
                </select>
              </div>
            )}
          </div>

          {/* Optional Information Section */}
          <div className="bg-gray-50 rounded-lg p-4">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Optional Information</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Political Party</label>
                <input 
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500" 
                  placeholder="Enter party name (optional)" 
                  value={form.party} 
                  onChange={e=>setForm({...form, party:e.target.value})} 
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Symbol Name</label>
                <input 
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500" 
                  placeholder="Enter symbol name (optional)" 
                  value={form.symbol_name} 
                  onChange={e=>setForm({...form, symbol_name:e.target.value})} 
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">District</label>
                <input 
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500" 
                  placeholder="Enter district (optional)" 
                  value={form.district} 
                  onChange={e=>setForm({...form, district:e.target.value})} 
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Governorate</label>
                <input 
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500" 
                  placeholder="Enter governorate (optional)" 
                  value={form.governorate} 
                  onChange={e=>setForm({...form, governorate:e.target.value})} 
                />
              </div>
            </div>
            
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
              <textarea 
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500" 
                rows={3} 
                placeholder="Enter candidate description (optional)" 
                value={form.description} 
                onChange={e=>setForm({...form, description:e.target.value})} 
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Photo</label>
                <input 
                  type="file" 
                  accept="image/*" 
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  onChange={e=>setForm({...form, photo:e.target.files?.[0]||null})} 
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Symbol Icon</label>
                <input 
                  type="file" 
                  accept="image/*" 
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  onChange={e=>setForm({...form, symbol_icon:e.target.files?.[0]||null})} 
                />
              </div>
            </div>
          </div>

          {/* Form Actions */}
          <div className="flex justify-end gap-3 pt-4 border-t">
            <button 
              type="button" 
              className="px-6 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors" 
              onClick={onClose}
            >
              Cancel
            </button>
            <button 
              type="submit" 
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors" 
              disabled={saving || form.election_ids.length === 0}
            >
              {saving ? 'Creating...' : 'Create Candidate'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

const CandidatesList = () => {
  const [candidates, setCandidates] = useState([]);
  const [elections, setElections] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState('');
  const [electionId, setElectionId] = useState('');
  const [selected, setSelected] = useState(null);
  const [showDetails, setShowDetails] = useState(false);
  const [showCreate, setShowCreate] = useState(false);

  const fetchAll = async () => {
    try {
      setLoading(true);
      const [elist, clist] = await Promise.all([
        electionApi.getOrganizationElections(),
        candidateApi.list({ search: search || undefined, election_id: electionId || undefined })
      ]);
      setElections(elist || []);
      setCandidates(clist || []);
      setError(null);
    } catch (e) {
      setError('Failed to load candidates');
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchAll(); }, []);

  useEffect(() => {
    const t = setTimeout(() => fetchAll(), 300);
    return () => clearTimeout(t);
  }, [search, electionId]);

  const onUpdated = (updated) => {
    setCandidates(prev => prev.map(c => c.hashed_national_id === updated.hashed_national_id ? updated : c));
  };

  const onDeleted = (deleted) => {
    setCandidates(prev => prev.filter(c => c.hashed_national_id !== deleted.hashed_national_id));
  };

  if (loading) return <div className="py-8 text-center">Loading...</div>;
  if (error) return <div className="py-8 text-center text-red-600">{error}</div>;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 to-purple-600 rounded-xl p-6 text-white">
        <h2 className="text-2xl font-bold mb-2">Candidate Management</h2>
        <p className="text-blue-100">Manage your election candidates and their information</p>
      </div>

      {/* Filter & Search Controls */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <div className="flex flex-col lg:flex-row gap-4 items-center">
          <div className="flex-1 relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
            <input 
              className="w-full pl-12 pr-4 py-3 border border-gray-300 rounded-lg text-gray-900 placeholder-gray-500 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors" 
              placeholder="Search candidates by name..." 
              value={search} 
              onChange={e=>setSearch(e.target.value)} 
            />
          </div>
          <div className="flex gap-3">
            <select 
              className="px-4 py-3 border border-gray-300 rounded-lg text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors min-w-[200px]" 
              value={electionId} 
              onChange={e=>setElectionId(e.target.value)}
            >
              <option value="">All Elections</option>
              {elections.map(e => (<option key={e.id} value={e.id}>{e.title}</option>))}
            </select>
            <button 
              className="flex items-center gap-2 px-6 py-3 rounded-lg bg-gradient-to-r from-blue-600 to-blue-700 text-white font-medium hover:from-blue-700 hover:to-blue-800 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-all transform hover:scale-105 shadow-lg" 
              onClick={()=>setShowCreate(true)}
            >
              <Plus className="h-5 w-5"/> Create Candidate
            </button>
          </div>
        </div>
      </div>

      {/* Results Summary */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-gray-600">
            <User className="h-5 w-5" />
            <span className="font-medium">{candidates.length} candidate{candidates.length !== 1 ? 's' : ''} found</span>
          </div>
          {search && (
            <div className="text-sm text-gray-500">
              Searching for "{search}"
            </div>
          )}
        </div>
      </div>

      {/* Candidates Grid */}
      {candidates.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-xl border border-gray-200">
          <User className="mx-auto h-16 w-16 text-gray-300 mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No candidates found</h3>
          <p className="text-gray-500 mb-6">
            {search || electionId ? 'Try adjusting your search or filter criteria.' : 'Get started by creating your first candidate.'}
          </p>
          {!search && !electionId && (
            <button 
              className="inline-flex items-center gap-2 px-6 py-3 rounded-lg bg-blue-600 text-white font-medium hover:bg-blue-700 transition-colors"
              onClick={()=>setShowCreate(true)}
            >
              <Plus className="h-5 w-5"/> Create First Candidate
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {candidates.map(c => (
            <div 
              key={c.hashed_national_id} 
              className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-lg hover:border-blue-300 transition-all cursor-pointer transform hover:scale-[1.02]" 
              onClick={()=>{setSelected(c);setShowDetails(true);}}
            >
              <div className="flex items-start gap-4">
                {c.photo_url ? (
                  <img src={c.photo_url} alt={c.name} className="w-16 h-16 rounded-full object-cover border-2 border-gray-200" />
                ) : (
                  <div className="w-16 h-16 bg-gradient-to-r from-gray-200 to-gray-300 rounded-full flex items-center justify-center border-2 border-gray-200">
                    <User className="h-8 w-8 text-gray-500" />
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between mb-2">
                    <h4 className="font-semibold text-gray-900 truncate text-lg">{c.name}</h4>
                    {c.symbol_icon_url && (
                      <img src={c.symbol_icon_url} alt="Symbol" className="w-8 h-8 rounded object-cover" />
                    )}
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm text-gray-600 font-medium">{c.party || 'Independent'}</p>
                    <p className="text-xs text-gray-500">{c.country}</p>
                    {c.description && (
                      <p className="text-sm text-gray-600 line-clamp-2 mt-2">{c.description}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-2 mt-3 pt-3 border-t border-gray-100">
                    <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                      ID: {c.hashed_national_id.slice(-6)}
                    </span>
                    {c.district && (
                      <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                        {c.district}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <CandidateDetails
        candidate={selected}
        isOpen={showDetails}
        onClose={()=>{setShowDetails(false); setSelected(null);}}
        onUpdated={onUpdated}
        onDeleted={onDeleted}
      />

      {showCreate && (
        <CreateCandidateModal
          open={showCreate}
          onClose={()=>setShowCreate(false)}
          elections={elections}
          onCreated={(c)=> setCandidates(prev => [c, ...prev])}
        />
      )}
    </div>
  );
};

export default CandidatesList;

