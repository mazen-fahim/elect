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
        } else if (errorData.detail && errorData.detail.includes('Please verify your email address')) {
          errorMessage = errorData.detail;
        } else if (errorData.detail && errorData.detail.includes('pending approval')) {
          errorMessage = errorData.detail;
        } else if (errorData.detail && errorData.detail.includes('has been rejected')) {
          errorMessage = errorData.detail;
        } else if (errorData.detail && errorData.detail.includes('Please wait for admin acceptance')) {
          errorMessage = errorData.detail;
        } else if (errorData.detail && errorData.detail.includes('has been rejected by the admin')) {
          errorMessage = errorData.detail;
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

  getCurrentUser: async () => {
    return apiRequest('/auth/me');
  },

  forgotPassword: async (email) => {
    return apiRequest('/auth/forgot-password', {
      method: 'POST',
      body: JSON.stringify({ email }),
    });
  },

  resetPassword: async (token, newPassword) => {
    return apiRequest('/auth/reset-password', {
      method: 'POST',
      body: JSON.stringify({ token, new_password: newPassword }),
    });
  },
};

// Public API functions that don't require authentication
const publicApi = {
  getHomeStats: async () => {
    return apiRequest('/home/', {
      method: 'GET',
    });
  },

  getPublicElections: async (params = {}) => {
    const queryString = new URLSearchParams(
      Object.fromEntries(
        Object.entries(params).filter(([, v]) => v !== undefined && v !== null && v !== '')
      )
    ).toString();
    const endpoint = queryString ? `/home/elections?${queryString}` : '/home/elections';
    return apiRequest(endpoint);
  },

  getFilterOptions: async () => {
    return apiRequest('/home/filter-options');
  },
  getPublicElectionById: async (id) => {
    // reuse public list endpoint and filter client-side if needed; ideally, backend should expose a single-election public endpoint
    const res = await apiRequest(`/home/elections?limit=1&page=1`);
    return res; // placeholder, not used directly
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
const voterApi = {
  requestOtp: async ({ electionId, nationalId, phoneNumber, eligibleCandidates }) => {
    const params = new URLSearchParams();
    params.append('election_id', electionId);
    if (nationalId) params.append('national_id', nationalId);
    if (phoneNumber) params.append('phone_number', phoneNumber);
    
    // For API-based elections, send eligible candidates in the request body
    const requestBody = eligibleCandidates ? { eligible_candidates: eligibleCandidates } : {};
    
    return apiRequest(`/voters/login/request-otp?${params.toString()}`, { 
      method: 'POST',
      body: JSON.stringify(requestBody)
    });
  },
  verifyOtp: async ({ electionId, code, nationalId }) => {
    const params = new URLSearchParams();
    params.append('election_id', electionId);
    params.append('code', code);
    if (nationalId) params.append('national_id', nationalId);
    return apiRequest(`/voters/login/verify-otp?${params.toString()}`, { method: 'POST' });
  },
};

const votingApi = {
  getElectionCandidates: async (electionId) => {
    return apiRequest(`/voting/election/${electionId}/candidates`);
  },
  
  castVote: async (electionId, voteRequest) => {
    return apiRequest(`/voting/election/${electionId}/vote`, {
      method: 'POST',
      body: JSON.stringify(voteRequest),
    });
  },
  
  getVoterVotingStatus: async (electionId, voterHashedNationalId) => {
    return apiRequest(`/voting/election/${electionId}/voter/${voterHashedNationalId}/status`);
  },
};

const resultsApi = {
  getElectionResults: async (electionId) => {
    return apiRequest(`/results/election/${electionId}`);
  },
  
  getElectionSummary: async (electionId) => {
    return apiRequest(`/results/election/${electionId}/summary`);
  },
  
  finalizeElectionResults: async (electionId) => {
    return apiRequest(`/results/election/${electionId}/finalize`, {
      method: 'POST',
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



const notificationApi = {
  list: async (params = {}) => {
    const queryString = new URLSearchParams(
      Object.fromEntries(
        Object.entries(params).filter(([, v]) => v !== undefined && v !== null && v !== '')
      )
    ).toString();
    const endpoint = queryString ? `/notifications/?${queryString}` : '/notifications/';
    return apiRequest(endpoint);
  },

  getById: async (notificationId) => {
    return apiRequest(`/notifications/${notificationId}`);
  },

  getSummary: async () => {
    return apiRequest('/notifications/summary');
  },

  markAsRead: async (notificationId) => {
    return apiRequest(`/notifications/${notificationId}`, {
      method: 'PATCH',
      body: JSON.stringify({ is_read: true }),
    });
  },

  markAsUnread: async (notificationId) => {
    return apiRequest(`/notifications/${notificationId}`, {
      method: 'PATCH',
      body: JSON.stringify({ is_read: false }),
    });
  },

  markAllAsRead: async () => {
    return apiRequest('/notifications/mark-all-read', {
      method: 'PATCH',
      body: JSON.stringify({ mark_all_read: true }),
    });
  },

  delete: async (notificationId) => {
    return apiRequest(`/notifications/${notificationId}`, {
      method: 'DELETE',
    });
  },

  getTypes: async () => {
    return apiRequest('/notifications/types/available');
  },

  getPriorities: async () => {
    return apiRequest('/notifications/priorities/available');
  },
};

// System Admin endpoints (admin-only)
const systemAdminApi = {
  getDashboardStats: async () => {
    return apiRequest('/SystemAdmin/dashboard/stats');
  },

  listActiveElections: async (params = {}) => {
    const queryString = new URLSearchParams(
      Object.fromEntries(
        Object.entries(params).filter(([, v]) => v !== undefined && v !== null && v !== '')
      )
    ).toString();
    const endpoint = queryString ? `/SystemAdmin/elections/active?${queryString}` : '/SystemAdmin/elections/active';
    return apiRequest(endpoint);
  },

  getElectionDetails: async (electionId) => {
    return apiRequest(`/SystemAdmin/elections/${electionId}/details`);
  },

  listOrganizations: async (params = {}) => {
    const queryString = new URLSearchParams(
      Object.fromEntries(
        Object.entries(params).filter(([, v]) => v !== undefined && v !== null && v !== '')
      )
    ).toString();
    const endpoint = queryString ? `/SystemAdmin/organizations?${queryString}` : '/SystemAdmin/organizations';
    return apiRequest(endpoint);
  },

  getOrgElectionsGrouped: async (organizationUserId) => {
    return apiRequest(`/SystemAdmin/organizations/${organizationUserId}/elections-grouped`);
  },

  deleteOrganization: async (organizationUserId) => {
    return apiRequest(`/SystemAdmin/organizations/${organizationUserId}`, { method: 'DELETE' });
  },

  updateOrganizationStatus: async (organizationUserId, status) => {
    return apiRequest(`/SystemAdmin/organizations/${organizationUserId}/status`, {
      method: 'PUT',
      body: JSON.stringify({ status }),
    });
  },

  // Organization Admin Management
  getOrganizationAdmins: async (organizationUserId) => {
    return apiRequest(`/SystemAdmin/organizations/${organizationUserId}/admins`);
  },

  createOrganizationAdmin: async (organizationUserId, adminData) => {
    return apiRequest(`/SystemAdmin/organizations/${organizationUserId}/admins`, {
      method: 'POST',
      body: JSON.stringify(adminData),
    });
  },

  updateOrganizationAdmin: async (organizationUserId, adminUserId, adminData) => {
    return apiRequest(`/SystemAdmin/organizations/${organizationUserId}/admins/${adminUserId}`, {
      method: 'PUT',
      body: JSON.stringify(adminData),
    });
  },

  deleteOrganizationAdmin: async (organizationUserId, adminUserId) => {
    return apiRequest(`/SystemAdmin/organizations/${organizationUserId}/admins/${adminUserId}`, {
      method: 'DELETE',
    });
  },

  organizationsActivity: async (params = {}) => {
    const queryString = new URLSearchParams(
      Object.fromEntries(
        Object.entries(params).filter(([, v]) => v !== undefined && v !== null && v !== '')
      )
    ).toString();
    const endpoint = queryString
      ? `/SystemAdmin/notifications/organizations?${queryString}`
      : '/SystemAdmin/notifications/organizations';
    return apiRequest(endpoint);
  },
};

// Dummy Service endpoints for testing API-based elections
const dummyServiceApi = {
  listCandidates: async (params = {}) => {
    const queryString = new URLSearchParams(
      Object.fromEntries(
        Object.entries(params).filter(([, v]) => v !== undefined && v !== null && v !== '')
      )
    ).toString();
    const endpoint = queryString ? `/dummy-service/candidates?${queryString}` : '/dummy-service/candidates';
    return apiRequest(endpoint);
  },

  createCandidate: async (candidateData) => {
    return apiRequest('/dummy-service/candidates', {
      method: 'POST',
      body: JSON.stringify(candidateData),
    });
  },

  deleteCandidate: async (candidateId) => {
    return apiRequest(`/dummy-service/candidates/${candidateId}`, {
      method: 'DELETE',
    });
  },

  listVoters: async (params = {}) => {
    const queryString = new URLSearchParams(
      Object.fromEntries(
        Object.entries(params).filter(([, v]) => v !== undefined && v !== null && v !== '')
      )
    ).toString();
    const endpoint = queryString ? `/dummy-service/voters?${queryString}` : '/dummy-service/voters';
    return apiRequest(endpoint);
  },

  createVoter: async (voterData) => {
    return apiRequest('/dummy-service/voters', {
      method: 'POST',
      body: JSON.stringify(voterData),
    });
  },

  deleteVoter: async (voterId) => {
    return apiRequest(`/dummy-service/voters/${voterId}`, {
      method: 'DELETE',
    });
  },

  verifyVoter: async (verificationData) => {
    return apiRequest('/proxy/dummy-service/verify-voter/public', {
      method: 'POST',
      body: JSON.stringify(verificationData),
    });
  },
};

// Payment API endpoints
const paymentApi = {
  getConfig: async () => {
    return apiRequest('/payment/config');
  },

  createCheckoutSession: async (payload) => {
    return apiRequest('/payment/create-checkout-session', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  getSessionStatus: async (sessionId) => {
    return apiRequest(`/payment/session/${sessionId}`);
  },

  getWalletBalance: async () => {
    return apiRequest('/payment/wallet/balance');
  },

  getTransactionHistory: async (params = {}) => {
    const queryString = new URLSearchParams(
      Object.fromEntries(
        Object.entries(params).filter(([, v]) => v !== undefined && v !== null && v !== '')
      )
    ).toString();
    const endpoint = queryString ? `/payment/wallet/transactions?${queryString}` : '/payment/wallet/transactions';
    return apiRequest(endpoint);
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
  notification: notificationApi,
  systemAdmin: systemAdminApi,
  public: publicApi, // Add publicApi to the default export
  voter: voterApi,
  dummyService: dummyServiceApi,
  payment: paymentApi,
};

export default api;
export { ApiError, authApi, organizationApi, electionApi, candidateApi, notificationApi, systemAdminApi, publicApi, voterApi, votingApi, resultsApi, dummyServiceApi, paymentApi };

