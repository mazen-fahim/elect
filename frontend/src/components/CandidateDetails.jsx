import React, { useEffect, useMemo, useState } from 'react';
import { X, User, Globe, MapPin, Edit3, Trash2, Calendar, Check, XCircle } from 'lucide-react';
import { candidateApi, electionApi } from '../services/api';
import { COUNTRIES } from '../constants/countries.js';

const CandidateDetails = ({ candidate, isOpen, onClose, onUpdated, onDeleted }) => {
  const [editing, setEditing] = useState(false);
  const [editingParticipations, setEditingParticipations] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [form, setForm] = useState({});
  const [elections, setElections] = useState([]);
  const [photoFile, setPhotoFile] = useState(null);
  const [symbolIconFile, setSymbolIconFile] = useState(null);

  useEffect(() => {
    if (candidate) {
      setForm({
        name: candidate.name || '',
        party: candidate.party || '',
        symbol_name: candidate.symbol_name || '',
        description: candidate.description || '',
        district: candidate.district || '',
        governorate: candidate.governorate || candidate.governerate || '',
        country: candidate.country || '',
      });
      // Reset file inputs when candidate changes
      setPhotoFile(null);
      setSymbolIconFile(null);
    }
  }, [candidate]);

  useEffect(() => {
    // load organization elections for context (status checks)
    (async () => {
      try {
        const data = await electionApi.getOrganizationElections();
        setElections(data || []);
      } catch (_) {}
    })();
  }, []);

  const isInRunningElection = useMemo(() => {
    if (!candidate || !candidate.participations) return false;
    const map = new Map(elections.map(e => [e.id, e]));
    return candidate.participations.some(p => {
      const e = map.get(p.election_id);
      return e && e.computed_status === 'running';
    });
  }, [candidate, elections]);

  if (!isOpen || !candidate) return null;

  const handleSave = async () => {
    try {
      setSaving(true);
      
      // Use FormData if files are provided, otherwise use JSON
      if (photoFile || symbolIconFile) {
        const formData = new FormData();
        
        // Add form fields
        Object.keys(form).forEach(key => {
          if (form[key] !== '' && form[key] !== null && form[key] !== undefined) {
            formData.append(key, form[key]);
          }
        });
        
        // Add files if provided
        if (photoFile) {
          formData.append('photo', photoFile);
        }
        if (symbolIconFile) {
          formData.append('symbol_icon', symbolIconFile);
        }
        
        // Call the new endpoint with file support
        const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost/api'}/candidates/${candidate.hashed_national_id}/with-files`, {
          method: 'PUT',
          headers: {
            ...(localStorage.getItem('authToken') ? { Authorization: `Bearer ${localStorage.getItem('authToken')}` } : {})
          },
          body: formData
        });
        
        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(errorData.detail || 'Failed to save candidate');
        }
        
        const updated = await response.json();
        setEditing(false);
        onUpdated && onUpdated(updated);
      } else {
        // No files, use existing JSON API
        const payload = { ...form };
        // remove empty strings
        Object.keys(payload).forEach(k => (payload[k] === '' || payload[k] === null) && delete payload[k]);
        const updated = await candidateApi.update(candidate.hashed_national_id, payload);
        setEditing(false);
        onUpdated && onUpdated(updated);
      }
    } catch (e) {
      alert(e?.message || 'Failed to save candidate');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!window.confirm(`Delete candidate "${candidate.name}"? This cannot be undone.`)) return;
    try {
      setDeleting(true);
      await candidateApi.delete(candidate.hashed_national_id);
      onDeleted && onDeleted(candidate);
      onClose();
    } catch (e) {
      alert(e?.message || 'Failed to delete candidate');
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto shadow-2xl">
        <div className="sticky top-0 bg-gradient-to-r from-blue-600 to-blue-700 text-white px-6 py-4 flex items-center justify-between rounded-t-xl">
          <div className="flex items-center gap-3">
            <User className="h-6 w-6" />
            <div>
              <h2 className="text-xl font-semibold">{editing ? 'Edit Candidate' : candidate.name}</h2>
              {isInRunningElection && (
                <span className="text-xs bg-red-500 text-white px-2 py-1 rounded-full">Locked - Election Running</span>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2">
            {!editing && !editingParticipations && (
              <>
                <button
                  className="p-2 text-blue-100 hover:text-white hover:bg-blue-500 rounded-full transition-colors"
                  onClick={() => setEditing(true)}
                  disabled={isInRunningElection}
                  title="Edit Candidate"
                >
                  <Edit3 className="h-5 w-5" />
                </button>
                <button
                  className="p-2 text-blue-100 hover:text-white hover:bg-blue-500 rounded-full transition-colors"
                  onClick={() => setEditingParticipations(true)}
                  disabled={isInRunningElection}
                  title="Edit Participations"
                >
                  <UsersIcon />
                </button>
                <button
                  className="p-2 text-red-100 hover:text-white hover:bg-red-500 rounded-full transition-colors"
                  onClick={handleDelete}
                  disabled={isInRunningElection || deleting}
                  title="Delete Candidate"
                >
                  <Trash2 className="h-5 w-5" />
                </button>
              </>
            )}
            <button className="text-blue-100 hover:text-white hover:bg-blue-500 rounded-full p-2 transition-colors" onClick={onClose}>
              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {!editing && !editingParticipations ? (
          // View Mode
          <div className="p-6 space-y-6">
            {/* Profile Section */}
            <div className="bg-gray-50 rounded-lg p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Profile Information</h3>
              <div className="flex items-start gap-6">
                {candidate.photo_url ? (
                  <img src={candidate.photo_url} alt={candidate.name} className="w-20 h-20 rounded-full object-cover border-2 border-gray-200" />
                ) : (
                  <div className="w-20 h-20 rounded-full bg-gradient-to-r from-gray-200 to-gray-300 flex items-center justify-center border-2 border-gray-200">
                    <User className="h-10 w-10 text-gray-500" />
                  </div>
                )}
                <div className="flex-1 space-y-3">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <div className="text-sm font-medium text-gray-500">Full Name</div>
                      <div className="text-gray-900">{candidate.name}</div>
                    </div>
                    <div>
                      <div className="text-sm font-medium text-gray-500">Political Party</div>
                      <div className="text-gray-900">{candidate.party || 'Independent'}</div>
                    </div>
                    <div>
                      <div className="text-sm font-medium text-gray-500">Country</div>
                      <div className="text-gray-900">{candidate.country}</div>
                    </div>
                    <div>
                      <div className="text-sm font-medium text-gray-500">Symbol Name</div>
                      <div className="text-gray-900">{candidate.symbol_name || '—'}</div>
                    </div>
                    {candidate.district && (
                      <div>
                        <div className="text-sm font-medium text-gray-500">District</div>
                        <div className="text-gray-900">{candidate.district}</div>
                      </div>
                    )}
                    {candidate.governorate && (
                      <div>
                        <div className="text-sm font-medium text-gray-500">Governorate</div>
                        <div className="text-gray-900">{candidate.governorate}</div>
                      </div>
                    )}
                  </div>
                  {candidate.symbol_icon_url && (
                    <div>
                      <div className="text-sm font-medium text-gray-500 mb-2">Symbol Icon</div>
                      <img src={candidate.symbol_icon_url} alt="Symbol" className="w-12 h-12 rounded object-cover border" />
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Description Section */}
            <div className="bg-gray-50 rounded-lg p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Biography / Description</h3>
              <p className="text-gray-700 whitespace-pre-wrap leading-relaxed">
                {candidate.description || 'No description provided.'}
              </p>
            </div>

            {/* Candidate ID */}
            <div className="bg-blue-50 rounded-lg p-4">
              <div className="flex items-center gap-2 text-blue-800">
                <Calendar className="h-5 w-5" />
                <span className="font-medium">Candidate ID: {candidate.hashed_national_id}</span>
              </div>
            </div>
          </div>
        ) : editing ? (
          // Edit Mode
          <div className="p-6 space-y-6">
            {/* Required Information Section */}
            <div className="bg-gray-50 rounded-lg p-4">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Required Information</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Full Name</label>
                  <input 
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500" 
                    value={form.name||''} 
                    onChange={e=>setForm({...form,name:e.target.value})} 
                    placeholder="Enter full name" 
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Country</label>
                  <select 
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500" 
                    value={form.country||''} 
                    onChange={e=>setForm({...form,country:e.target.value})}
                  >
                    <option value="">Select country</option>
                    {COUNTRIES.map(name=> (<option key={name} value={name}>{name}</option>))}
                  </select>
                </div>
              </div>
            </div>

            {/* Optional Information Section */}
            <div className="bg-gray-50 rounded-lg p-4">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Optional Information</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Political Party</label>
                  <input 
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500" 
                    value={form.party||''} 
                    onChange={e=>setForm({...form,party:e.target.value})} 
                    placeholder="Enter party name (optional)" 
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Symbol Name</label>
                  <input 
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500" 
                    value={form.symbol_name||''} 
                    onChange={e=>setForm({...form,symbol_name:e.target.value})} 
                    placeholder="Enter symbol name (optional)" 
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">District</label>
                  <input 
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500" 
                    value={form.district||''} 
                    onChange={e=>setForm({...form,district:e.target.value})} 
                    placeholder="Enter district (optional)" 
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Governorate</label>
                  <input 
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500" 
                    value={form.governorate||''} 
                    onChange={e=>setForm({...form,governorate:e.target.value})} 
                    placeholder="Enter governorate (optional)" 
                  />
                </div>
              </div>

              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                <textarea 
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500" 
                  rows={4} 
                  value={form.description||''} 
                  onChange={e=>setForm({...form,description:e.target.value})} 
                  placeholder="Enter candidate description (optional)"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Photo</label>
                  <div className="space-y-2">
                    {candidate.photo_url && (
                      <div className="flex items-center gap-2">
                        <img src={candidate.photo_url} alt="Current photo" className="w-12 h-12 rounded object-cover border" />
                        <span className="text-sm text-gray-500">Current photo</span>
                      </div>
                    )}
                    <input 
                      type="file"
                      accept="image/*"
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500" 
                      onChange={e => setPhotoFile(e.target.files[0] || null)}
                    />
                    <p className="text-xs text-gray-500">Upload a new photo to replace the current one</p>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Symbol Icon</label>
                  <div className="space-y-2">
                    {candidate.symbol_icon_url && (
                      <div className="flex items-center gap-2">
                        <img src={candidate.symbol_icon_url} alt="Current symbol" className="w-12 h-12 rounded object-cover border" />
                        <span className="text-sm text-gray-500">Current symbol icon</span>
                      </div>
                    )}
                    <input 
                      type="file"
                      accept="image/*"
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500" 
                      onChange={e => setSymbolIconFile(e.target.files[0] || null)}
                    />
                    <p className="text-xs text-gray-500">Upload a new symbol icon to replace the current one</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Form Actions */}
            <div className="flex justify-end gap-3 pt-4 border-t">
              <button 
                className="px-6 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors" 
                onClick={()=>{setEditing(false);}}
              >
                Cancel
              </button>
              <button 
                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors" 
                onClick={handleSave} 
                disabled={saving}
              >
                {saving ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </div>
        ) : (
          // Participations Edit Mode  
          <div className="p-6">
            <div className="bg-blue-50 rounded-lg p-4">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Edit Election Participations</h3>
              <EditParticipations
                elections={elections}
                candidate={candidate}
                onCancel={()=>setEditingParticipations(false)}
                onSaved={(updated)=>{ setEditingParticipations(false); onUpdated && onUpdated(updated);} }
              />
            </div>
          </div>
        )}

        {/* Participations Sidebar - Only show in view mode */}
        {!editing && !editingParticipations && (
          <div className="bg-gray-50 border-t px-6 py-4">
            <div className="bg-white rounded-lg p-4">
              <div className="flex items-center justify-between mb-3">
                <h4 className="font-medium text-gray-900">Election Participations</h4>
                <button 
                  className="text-sm text-blue-600 hover:text-blue-800 font-medium"
                  onClick={()=>setEditingParticipations(true)}
                  disabled={isInRunningElection}
                >
                  Edit
                </button>
              </div>
              {(candidate.participations||[]).length === 0 ? (
                <div className="text-sm text-gray-500 py-2">No election participations</div>
              ) : (
                <div className="space-y-2">
                  {candidate.participations.map((p, idx)=> {
                    const e = elections.find(e=>e.id===p.election_id);
                    return (
                      <div key={idx} className="flex items-center justify-between py-2 px-3 bg-gray-50 rounded">
                        <div>
                          <div className="font-medium text-sm text-gray-900">
                            {e ? e.title : `Election #${p.election_id}`}
                          </div>
                          <div className="text-xs text-gray-500">
                            Votes: {p.vote_count || 0}
                          </div>
                        </div>
                        {e && (
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                            e.computed_status==='running' ? 'bg-red-100 text-red-700' : 
                            e.computed_status==='upcoming' ? 'bg-blue-100 text-blue-700' :
                            'bg-gray-100 text-gray-700'
                          }`}>
                            {e.computed_status}
                          </span>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default CandidateDetails;

function UsersIcon(){
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="h-5 w-5">
      <path d="M16 11c1.657 0 3-1.79 3-4s-1.343-4-3-4-3 1.79-3 4 1.343 4 3 4zM8 11c1.657 0 3-1.79 3-4S9.657 3 8 3 5 4.79 5 7s1.343 4 3 4zm0 2c-2.761 0-8 1.343-8 4v3h10v-3c0-1.657.895-3.09 2.242-4.063C11.232 12.676 9.7 13 8 13zm8 0c-.543 0-1.064.038-1.561.11C15.43 14.158 16 15.498 16 17v3h8v-3c0-2.657-5.239-4-8-4z"/>
    </svg>
  )
}

function EditParticipations({ elections, candidate, onCancel, onSaved }){
  const [selected, setSelected] = React.useState(()=> new Set((candidate.participations||[]).map(p=>p.election_id)));
  const toggle = (id) => {
    const next = new Set(selected);
    if (next.has(id)) next.delete(id); else next.add(id);
    setSelected(next);
  };
  const [saving, setSaving] = React.useState(false);

  const save = async () => {
    try {
      setSaving(true);
      const body = { election_ids: Array.from(selected) };
      const resp = await fetch((import.meta.env.VITE_API_URL || 'http://localhost/api') + `/candidates/${candidate.hashed_national_id}/participations`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          ...(localStorage.getItem('authToken') ? { Authorization: `Bearer ${localStorage.getItem('authToken')}` } : {})
        },
        body: JSON.stringify(body)
      });
      if (!resp.ok) {
        const data = await resp.json().catch(()=>({}));
        throw new Error(data.detail || 'Failed to save participations');
      }
      const updated = await resp.json();
      onSaved && onSaved(updated);
    } catch (e) {
      alert(e.message || 'Failed to save participations');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-4">
      <p className="text-sm text-gray-600">Select the elections this candidate should participate in. Running elections cannot be modified.</p>
      
      <div className="max-h-64 overflow-auto border border-gray-300 rounded-lg p-4 bg-white">
        {elections.length === 0 ? (
          <div className="text-sm text-gray-500 py-4 text-center">No elections available</div>
        ) : elections.map(e => {
          const isRunning = e.computed_status === 'running';
          return (
            <label 
              key={e.id} 
              className={`flex items-center gap-3 py-3 px-2 rounded hover:bg-gray-50 ${isRunning ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
            >
              <input 
                type="checkbox" 
                checked={selected.has(e.id)} 
                onChange={()=>toggle(e.id)}
                disabled={isRunning}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded" 
              />
              <div className="flex-1">
                <div className="font-medium text-sm text-gray-900">{e.title}</div>
                <div className="text-xs text-gray-500">
                  {e.starts_at && e.ends_at && (
                    `${new Date(e.starts_at).toLocaleDateString()} - ${new Date(e.ends_at).toLocaleDateString()}`
                  )}
                </div>
              </div>
              <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                e.computed_status==='running' ? 'bg-red-100 text-red-700' : 
                e.computed_status==='upcoming' ? 'bg-blue-100 text-blue-700' :
                'bg-gray-100 text-gray-700'
              }`}>
                {e.computed_status}
              </span>
            </label>
          );
        })}
      </div>
      
      <div className="flex justify-end gap-3 pt-4 border-t">
        <button 
          className="px-6 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors" 
          onClick={onCancel}
        >
          Cancel
        </button>
        <button 
          className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors" 
          disabled={saving} 
          onClick={save}
        >
          {saving ? 'Saving...' : 'Save Participations'}
        </button>
      </div>
    </div>
  );
}

