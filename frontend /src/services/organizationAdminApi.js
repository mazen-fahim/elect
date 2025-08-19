const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost/api';

class OrganizationAdminApi {
  constructor() {
    this.baseUrl = `${API_BASE_URL}/organization-admins`;
  }

  getAuthHeaders() {
    const token = localStorage.getItem('authToken');
    return {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {})
    };
  }

  async getOrganizationAdmins() {
    try {
      const response = await fetch(this.baseUrl, {
        method: 'GET',
        headers: this.getAuthHeaders(),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error fetching organization admins:', error);
      throw error;
    }
  }

  async createOrganizationAdmin(adminData) {
    try {
      const response = await fetch(`${this.baseUrl}/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...this.getAuthHeaders(),
        },
        body: JSON.stringify({
          email: adminData.email,
          password: adminData.password,
          first_name: adminData.first_name,
          last_name: adminData.last_name
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Failed to create organization admin');
      }

      return await response.json();
    } catch (error) {
      console.error('Error creating organization admin:', error);
      throw error;
    }
  }

  async updateOrganizationAdmin(userId, adminData) {
    try {
      const response = await fetch(`${this.baseUrl}/${userId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          ...this.getAuthHeaders(),
        },
        body: JSON.stringify({
          email: adminData.email,
          password: adminData.password || undefined,
          first_name: adminData.first_name,
          last_name: adminData.last_name
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Failed to update organization admin');
      }

      return await response.json();
    } catch (error) {
      console.error('Error updating organization admin:', error);
      throw error;
    }
  }

  async deleteOrganizationAdmin(adminId) {
    try {
      const response = await fetch(`${this.baseUrl}/${adminId}`, {
        method: 'DELETE',
        headers: this.getAuthHeaders(),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.detail || 'Failed to delete organization admin');
      }

      return true;
    } catch (error) {
      console.error('Error deleting organization admin:', error);
      throw error;
    }
  }
}

export const organizationAdminApi = new OrganizationAdminApi();
