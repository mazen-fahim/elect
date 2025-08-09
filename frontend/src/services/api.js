const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost/api';

class ApiError extends Error {
  constructor(message, status, response) {
    super(message);
    this.status = status;
    this.response = response;
  }
}

const apiRequest = async (endpoint, options = {}) => {
  const url = `${API_BASE_URL}${endpoint}`;
  
  const config = {
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
    ...options,
  };

  // Add auth token if available
  const token = localStorage.getItem('authToken');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  try {
    const response = await fetch(url, config);
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      
      // Convert backend error codes to user-friendly messages
      let errorMessage = errorData.detail || errorData.error_message || `HTTP ${response.status}: ${response.statusText}`;
      
      if (response.status === 401) {
        if (errorData.error_message === 'Invalid Credentials') {
          errorMessage = 'Invalid email or password. Please check your credentials and try again.';
        } else if (errorData.detail === 'err.login.inactive' || errorData.error_message === 'User is inactive') {
          errorMessage = 'Your account is inactive. Please contact support.';
        } else {
          errorMessage = 'Authentication failed. Please check your credentials.';
        }
      } else if (response.status === 403) {
        if (errorData.detail === 'err.login.inactive' || errorData.error_message === 'User is inactive') {
          errorMessage = 'Your account is inactive. Please verify your email or contact support.';
        } else {
          errorMessage = 'Access denied. You do not have permission to access this resource.';
        }
      } else if (response.status >= 500) {
        errorMessage = 'Server error. Please try again later.';
      }
      
      throw new ApiError(
        errorMessage,
        response.status,
        errorData
      );
    }

    // Handle no content responses
    if (response.status === 204) {
      return null;
    }

    return await response.json();
  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }
    throw new ApiError('Network error occurred', 0, null);
  }
};

const authApi = {
  register: async (organizationData) => {
    return apiRequest('/auth/register', {
      method: 'POST',
      body: JSON.stringify(organizationData),
    });
  },

  login: async (credentials) => {
    return apiRequest('/auth/login', {
      method: 'POST',
      body: JSON.stringify(credentials),
    });
  },

  forgotPassword: async (email) => {
    return apiRequest('/auth/forgot-password', {
      method: 'POST',
      body: JSON.stringify({ email }),
    });
  },

  resetPassword: async (token, passwords) => {
    return apiRequest(`/auth/reset-password?token=${token}`, {
      method: 'POST',
      body: JSON.stringify(passwords),
    });
  },

  getCurrentUser: async () => {
    return apiRequest('/auth/me');
  },
};

const organizationApi = {
  getAll: async () => {
    return apiRequest('/organizations/');
  },

  getDashboardStats: async () => {
    return apiRequest('/organizations/dashboard-stats');
  },
};

const electionApi = {
  create: async (electionData) => {
    return apiRequest('/election/', {
      method: 'POST',
      body: JSON.stringify(electionData),
    });
  },

  createWithCsv: async (formData) => {
    // For file uploads, don't set Content-Type header, let browser set it
    const url = `${API_BASE_URL}/election/create-with-csv`;
    
    const config = {
      method: 'POST',
      body: formData, // FormData object
    };

    // Add auth token if available
    const token = localStorage.getItem('authToken');
    if (token) {
      config.headers = {
        Authorization: `Bearer ${token}`,
      };
    }

    try {
      const response = await fetch(url, config);
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        
        // Convert backend error codes to user-friendly messages
        let errorMessage = errorData.detail || errorData.error_message || `HTTP ${response.status}: ${response.statusText}`;
        
        if (response.status === 401) {
          errorMessage = 'Authentication failed. Please log in again.';
        } else if (response.status === 400) {
          // Keep detailed error messages for CSV validation errors
          errorMessage = errorData.detail || 'Invalid request. Please check your form data and files.';
        } else if (response.status >= 500) {
          errorMessage = 'Server error. Please try again later.';
        }
        
        throw new ApiError(
          errorMessage,
          response.status,
          errorData
        );
      }

      return await response.json();
    } catch (error) {
      if (error instanceof ApiError) {
        throw error;
      }
      throw new ApiError('Network error occurred', 0, null);
    }
  },

  getAll: async () => {
    return apiRequest('/election/');
  },

  getOrganizationElections: async (params = {}) => {
    const queryString = new URLSearchParams(params).toString();
    const endpoint = queryString ? `/election/organization?${queryString}` : '/election/organization';
    return apiRequest(endpoint);
  },

  getById: async (id) => {
    return apiRequest(`/election/${id}`);
  },

  update: async (id, electionData) => {
    return apiRequest(`/election/${id}`, {
      method: 'PUT',
      body: JSON.stringify(electionData),
    });
  },

  delete: async (id) => {
    return apiRequest(`/election/${id}`, {
      method: 'DELETE',
    });
  },
};

const candidateApi = {
  list: async (params = {}) => {
    const queryString = new URLSearchParams(
      Object.fromEntries(
        Object.entries(params).filter(([, v]) => v !== undefined && v !== null && v !== '')
      )
    ).toString();
    const endpoint = queryString ? `/candidates/?${queryString}` : '/candidates/';
    return apiRequest(endpoint);
  },

  getById: async (hashedId) => {
    return apiRequest(`/candidates/${hashedId}`);
  },

  listByElection: async (electionId) => {
    return apiRequest(`/candidates/election/${electionId}`);
  },

  update: async (hashedId, data) => {
    return apiRequest(`/candidates/${hashedId}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },

  delete: async (hashedId) => {
    return apiRequest(`/candidates/${hashedId}`, {
      method: 'DELETE',
    });
  },
};
// Default export for easier importing
const api = {
  get: (endpoint) => apiRequest(endpoint),
  post: (endpoint, data) => apiRequest(endpoint, {
    method: 'POST',
    body: JSON.stringify(data),
  }),
  put: (endpoint, data) => apiRequest(endpoint, {
    method: 'PUT',
    body: JSON.stringify(data),
  }),
  delete: (endpoint) => apiRequest(endpoint, {
    method: 'DELETE',
  }),
  // Named exports for specific functionality
  auth: authApi,
  organization: organizationApi,
  election: electionApi,
  candidate: candidateApi,
};

export default api;
export { ApiError, authApi, organizationApi, electionApi, candidateApi };

