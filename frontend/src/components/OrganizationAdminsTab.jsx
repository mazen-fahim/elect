import React, { useState, useEffect } from 'react';
import { Plus, Edit, Trash2, User, Shield, Mail, Phone, Loader2, X } from 'lucide-react';
import Modal from './Modal';
import ConfirmModal from './ConfirmModal';
import { organizationAdminApi } from '../services/organizationAdminApi';

const OrganizationAdminsTab = () => {
  const [admins, setAdmins] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingAdmin, setEditingAdmin] = useState(null);
  const [modalConfig, setModalConfig] = useState({ isOpen: false, title: '', message: '', type: 'info' });
  const [showConfirmDelete, setShowConfirmDelete] = useState(false);
  const [adminToDelete, setAdminToDelete] = useState(null);

  // Form state
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    first_name: '',
    last_name: ''
  });

  // Helper functions for modal
  const showModal = (title, message, type = 'info') => {
    setModalConfig({ isOpen: true, title, message, type });
  };

  const closeModal = () => {
    setModalConfig({ isOpen: false, title: '', message: '', type: 'info' });
  };

  // Load admins
  useEffect(() => {
    loadAdmins();
  }, []);

  const loadAdmins = async () => {
    try {
      setLoading(true);
      const response = await organizationAdminApi.getOrganizationAdmins();
      
      // Transform the API response to match our UI needs
      const transformedAdmins = response.map(admin => ({
        id: admin.user_id,
        email: admin.email,
        name: admin.email.split('@')[0], // Use email prefix as name for now
        role: 'organization_admin',
        created_at: admin.created_at,
        last_active: admin.created_at // Use created_at as last_active for now
      }));
      
      setAdmins(transformedAdmins);
    } catch (error) {
      showModal('Error', 'Failed to load organization admins', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateAdmin = async (e) => {
    e.preventDefault();
    
    try {
      // Validate form
      if (!formData.email) {
        showModal('Validation Error', 'Email is required', 'warning');
        return;
      }

      // Create admin using real API
      const response = await organizationAdminApi.createOrganizationAdmin(formData);
      
      // Add to local state
      const newAdmin = {
        id: response.user_id,
        email: response.email,
        name: response.email.split('@')[0],
        role: 'organization_admin',
        created_at: response.created_at,
        last_active: response.created_at
      };
      setAdmins([...admins, newAdmin]);
      
      setShowCreateModal(false);
      resetForm();
      showModal('Success', 'Organization admin created successfully', 'success');
    } catch (error) {
      showModal('Error', error.message || 'Failed to create organization admin', 'error');
    }
  };

  const handleUpdateAdmin = async (e) => {
    e.preventDefault();
    
    try {
      // Update admin using real API
      const response = await organizationAdminApi.updateOrganizationAdmin(editingAdmin.id, formData);
      
      // Update local state
      setAdmins(admins.map(admin => 
        admin.id === editingAdmin.id 
          ? { ...admin, email: formData.email, last_active: new Date().toISOString() }
          : admin
      ));
      
      setShowEditModal(false);
      setEditingAdmin(null);
      resetForm();
      showModal('Success', 'Organization admin updated successfully', 'success');
    } catch (error) {
      showModal('Error', error.message || 'Failed to update organization admin', 'error');
    }
  };

  const handleDeleteAdmin = async (adminId) => {
    const admin = admins.find(a => a.id === adminId);
    setAdminToDelete(admin);
    setShowConfirmDelete(true);
  };

  const confirmDeleteAdmin = async () => {
    try {
      // Delete admin using real API
      await organizationAdminApi.deleteOrganizationAdmin(adminToDelete.id);
      
      // Remove from local state
      setAdmins(admins.filter(admin => admin.id !== adminToDelete.id));
      showModal('Success', 'Organization admin deleted successfully', 'success');
    } catch (error) {
      showModal('Error', error.message || 'Failed to delete organization admin', 'error');
    }
  };

  const resetForm = () => {
    setFormData({
      email: '',
      password: '',
      first_name: '',
      last_name: ''
    });
  };

  const openEditModal = (admin) => {
    setEditingAdmin(admin);
    setFormData({
      email: admin.email,
      password: ''
    });
    setShowEditModal(true);
  };

  const handleEditAdmin = (admin) => {
    setFormData({
      email: admin.email,
      password: '',
      first_name: admin.first_name,
      last_name: admin.last_name
    });
    setEditingAdmin(admin);
    setShowEditModal(true);
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



  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
        <span className="ml-2 text-gray-600">Loading admins...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-lg font-medium text-gray-900">Manage Organization Administrators</h3>
          <p className="text-sm text-gray-600">Control access and permissions for your organization</p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
        >
          <Plus className="h-4 w-4 mr-2" />
          Add Admin
        </button>
      </div>

      {/* Admins List */}
      <div className="bg-white shadow overflow-hidden sm:rounded-md">
        <ul className="divide-y divide-gray-200">
          {admins.map((admin) => (
            <li key={admin.id}>
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
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => openEditModal(admin)}
                      className="inline-flex items-center px-3 py-1 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                    >
                      <Edit className="h-4 w-4 mr-1" />
                      Edit
                    </button>
                    <button
                      onClick={() => handleDeleteAdmin(admin.id)}
                      className="inline-flex items-center px-3 py-1 border border-transparent text-sm leading-4 font-medium rounded-md text-red-700 bg-red-100 hover:bg-red-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
                    >
                      <Trash2 className="h-4 w-4 mr-1" />
                      Delete
                    </button>
                  </div>
                </div>
                


                {/* Timestamps */}
                <div className="mt-4 flex items-center text-xs text-gray-500">
                  <span>Created: {formatDate(admin.created_at)}</span>
                  <span className="mx-2">•</span>
                  <span>Last active: {formatDate(admin.last_active)}</span>
                </div>
              </div>
            </li>
          ))}
        </ul>
        
        {admins.length === 0 && (
          <div className="text-center py-12">
            <Shield className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">No admins</h3>
            <p className="mt-1 text-sm text-gray-500">Get started by creating your first organization admin.</p>
            <div className="mt-6">
              <button
                onClick={() => setShowCreateModal(true)}
                className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Admin
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Create Admin Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <h3 className="text-xl font-semibold text-gray-900">Add Organization Admin</h3>
              <button
                onClick={() => {
                  setShowCreateModal(false);
                  resetForm();
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="h-6 w-6" />
              </button>
            </div>
            
            <form onSubmit={handleCreateAdmin} className="p-6 space-y-6">
              <div className="space-y-4">
                {/* Email */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Email</label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="admin@example.com"
                    required
                  />
                </div>

                {/* First Name */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">First Name</label>
                  <input
                    type="text"
                    value={formData.first_name}
                    onChange={(e) => setFormData({ ...formData, first_name: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="John"
                    required
                  />
                </div>

                {/* Last Name */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Last Name</label>
                  <input
                    type="text"
                    value={formData.last_name}
                    onChange={(e) => setFormData({ ...formData, last_name: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Doe"
                    required
                  />
                </div>

                {/* Password */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Password</label>
                  <input
                    type="password"
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Enter password"
                    required
                  />
                  <p className="text-xs text-gray-500 mt-1">The admin will use this password to log in</p>
                </div>
              </div>

              <div className="flex justify-end space-x-3 pt-4 border-t">
                <button
                  type="button"
                  onClick={() => {
                    setShowCreateModal(false);
                    resetForm();
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
      {showEditModal && editingAdmin && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <h3 className="text-xl font-semibold text-gray-900">Edit Organization Admin</h3>
              <button
                onClick={() => {
                  setShowEditModal(false);
                  setEditingAdmin(null);
                  resetForm();
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="h-6 w-6" />
              </button>
            </div>
            
            <form onSubmit={handleUpdateAdmin} className="p-6 space-y-6">
              <div className="space-y-4">
                {/* Email */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Email</label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="admin@example.com"
                    required
                  />
                </div>

                {/* First Name */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">First Name</label>
                  <input
                    type="text"
                    value={formData.first_name}
                    onChange={(e) => setFormData({ ...formData, first_name: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="John"
                    required
                  />
                </div>

                {/* Last Name */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Last Name</label>
                  <input
                    type="text"
                    value={formData.last_name}
                    onChange={(e) => setFormData({ ...formData, last_name: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Doe"
                    required
                  />
                </div>

                {/* Password */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">New Password (Optional)</label>
                  <input
                    type="password"
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Leave blank to keep current password"
                  />
                  <p className="text-xs text-gray-500 mt-1">Only fill this if you want to change the password</p>
                </div>
              </div>

              <div className="flex justify-end space-x-3 pt-4 border-t">
                <button
                  type="button"
                  onClick={() => {
                    setShowEditModal(false);
                    setEditingAdmin(null);
                    resetForm();
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

      {/* Notification Modal */}
      <Modal
        isOpen={modalConfig.isOpen}
        onClose={closeModal}
        title={modalConfig.title}
        type={modalConfig.type}
      >
        <div className="text-center">
          <p className="text-sm text-gray-600">{modalConfig.message}</p>
        </div>
      </Modal>

      {/* Confirm Delete Modal */}
      <ConfirmModal
        isOpen={showConfirmDelete}
        onClose={() => {
          setShowConfirmDelete(false);
          setAdminToDelete(null);
        }}
        onConfirm={confirmDeleteAdmin}
        title="Delete Admin"
        message="Are you sure you want to delete this admin? This action cannot be undone."
        confirmText="Delete"
        cancelText="Cancel"
        type="danger"
      />
    </div>
  );
};

export default OrganizationAdminsTab;
