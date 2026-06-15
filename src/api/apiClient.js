const API_BASE_URL = '/api';

class ApiClient {
  constructor() {
    this.token = null;
    this.listeners = new Map();
  }

  setToken(token) {
    this.token = token;
    if (token) {
      localStorage.setItem('access_token', token);
    } else {
      localStorage.removeItem('access_token');
    }
  }

  getToken() {
    if (!this.token) {
      this.token = localStorage.getItem('access_token');
    }
    return this.token;
  }

  async request(endpoint, options = {}) {
    const token = this.getToken();
    const headers = {
      'Content-Type': 'application/json',
      ...(token && { Authorization: `Bearer ${token}` }),
      ...options.headers,
    };

    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      ...options,
      headers,
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ message: 'Request failed' }));
      throw new ApiError(response.status, error.message || 'Request failed', error);
    }

    return response.json();
  }

  // Auth methods
  auth = {
    loginViaEmailPassword: async (email, password) => {
      const response = await this.request('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, password }),
      });
      if (response.access_token) {
        this.setToken(response.access_token);
      }
      return response;
    },

    register: async (email, password, full_name, phone) => {
      return this.request('/auth/register', {
        method: 'POST',
        body: JSON.stringify({ email, password, full_name, phone }),
      });
    },

    verifyOtp: async (email, otpCode) => {
      const response = await this.request('/auth/verify-otp', {
        method: 'POST',
        body: JSON.stringify({ email, otp_code: otpCode }),
      });
      if (response.access_token) {
        this.setToken(response.access_token);
      }
      return response;
    },

    resendOtp: async (email) => {
      return this.request('/auth/resend-otp', {
        method: 'POST',
        body: JSON.stringify({ email }),
      });
    },

    resetPasswordRequest: async (email) => {
      return this.request('/auth/reset-password-request', {
        method: 'POST',
        body: JSON.stringify({ email }),
      });
    },

    resetPassword: async (resetToken, newPassword) => {
      return this.request('/auth/reset-password', {
        method: 'POST',
        body: JSON.stringify({ reset_token: resetToken, new_password: newPassword }),
      });
    },

    loginWithProvider: async (provider, redirectUrl) => {
      if (provider === 'google') {
        window.location.href = `/api/auth/google?redirect=${encodeURIComponent(redirectUrl)}`;
      } else {
        window.location.href = `${API_BASE_URL}/auth/${provider}?redirect=${encodeURIComponent(redirectUrl)}`;
      }
    },

    me: async () => {
      return this.request('/auth/me');
    },

    logout: (redirectUrl) => {
      this.setToken(null);
      if (redirectUrl) {
        window.location.href = redirectUrl;
      }
    },

    redirectToLogin: (redirectUrl) => {
      window.location.href = `/login?redirect=${encodeURIComponent(redirectUrl)}`;
    },
  };

  // Entity methods
  entities = {
    RiderProfile: {
      create: async (data) => this.request('/rider-profiles', { method: 'POST', body: JSON.stringify(data) }),
      update: async (id, data) => this.request(`/rider-profiles/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
      filter: async (filters, sort, limit) => {
        const params = new URLSearchParams();
        if (filters) Object.entries(filters).forEach(([k, v]) => params.append(k, v));
        if (sort) params.append('sort', sort);
        if (limit) params.append('limit', limit);
        return this.request(`/rider-profiles?${params.toString()}`);
      },
      list: async (sort, limit) => {
        const params = new URLSearchParams();
        if (sort) params.append('sort', sort);
        if (limit) params.append('limit', limit);
        return this.request(`/rider-profiles?${params.toString()}`);
      },
    },

    DriverProfile: {
      create: async (data) => this.request('/driver-profiles', { method: 'POST', body: JSON.stringify(data) }),
      update: async (id, data) => this.request(`/driver-profiles/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
      filter: async (filters, sort, limit) => {
        const params = new URLSearchParams();
        if (filters) Object.entries(filters).forEach(([k, v]) => params.append(k, v));
        if (sort) params.append('sort', sort);
        if (limit) params.append('limit', limit);
        return this.request(`/driver-profiles?${params.toString()}`);
      },
      list: async (sort, limit) => {
        const params = new URLSearchParams();
        if (sort) params.append('sort', sort);
        if (limit) params.append('limit', limit);
        return this.request(`/driver-profiles?${params.toString()}`);
      },
      delete: async (id) => this.request(`/driver-profiles/${id}`, { method: 'DELETE' }),
    },

    DriverApplication: {
      list: async (sort, limit) => {
        const params = new URLSearchParams();
        if (sort) params.append('sort', sort);
        if (limit) params.append('limit', limit);
        return this.request(`/driver-applications?${params.toString()}`);
      },
      approve: async (id) => this.request(`/driver-applications/${id}/approve`, { method: 'PATCH' }),
      reject: async (id) => this.request(`/driver-applications/${id}/reject`, { method: 'PATCH' }),
    },

    Ride: {
      create: async (data) => this.request('/rides', { method: 'POST', body: JSON.stringify(data) }),
      update: async (id, data) => this.request(`/rides/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
      filter: async (filters, sort, limit) => {
        const params = new URLSearchParams();
        if (filters) Object.entries(filters).forEach(([k, v]) => params.append(k, v));
        if (sort) params.append('sort', sort);
        if (limit) params.append('limit', limit);
        return this.request(`/rides?${params.toString()}`);
      },
      list: async (sort, limit) => {
        const params = new URLSearchParams();
        if (sort) params.append('sort', sort);
        if (limit) params.append('limit', limit);
        return this.request(`/rides?${params.toString()}`);
      },
      subscribe: (callback) => {
        const token = this.getToken();
        const url = token ? `${API_BASE_URL}/rides/stream?token=${encodeURIComponent(token)}` : `${API_BASE_URL}/rides/stream`;
        const eventSource = new EventSource(url);
        eventSource.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data);
            callback(data);
          } catch (e) {
            console.error('Failed to parse SSE data:', e);
          }
        };
        eventSource.onerror = () => {
          eventSource.close();
        };
        return () => eventSource.close();
      },
    },

    Ad: {
      create: async (data) => this.request('/ads', { method: 'POST', body: JSON.stringify(data) }),
      update: async (id, data) => this.request(`/ads/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
      delete: async (id) => this.request(`/ads/${id}`, { method: 'DELETE' }),
      list: async () => this.request('/ads'),
      getActive: async () => this.request('/ads/active'),
    },

    Withdrawal: {
      getEarnings: async () => this.request('/withdrawals/earnings'),
      withdraw: async (data) => this.request('/withdrawals/withdraw', { method: 'POST', body: JSON.stringify(data) }),
      list: async () => this.request('/withdrawals'),
      listAll: async () => this.request('/withdrawals/all'),
      listBanks: async () => this.request('/withdrawals/banks'),
      updateStatus: async (id, status) => this.request(`/withdrawals/${id}/status`, { method: 'PATCH', body: JSON.stringify({ status }) }),
    },

    Message: {
      create: async (data) => this.request('/messages', { method: 'POST', body: JSON.stringify(data) }),
      filter: async (filters, sort, limit) => {
        const params = new URLSearchParams();
        if (filters) Object.entries(filters).forEach(([k, v]) => params.append(k, v));
        if (sort) params.append('sort', sort);
        if (limit) params.append('limit', limit);
        return this.request(`/messages?${params.toString()}`);
      },
      subscribe: (callback) => {
        const token = this.getToken();
        const url = token ? `${API_BASE_URL}/messages/stream?token=${encodeURIComponent(token)}` : `${API_BASE_URL}/messages/stream`;
        const eventSource = new EventSource(url);
        eventSource.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data);
            callback(data);
          } catch (e) {
            console.error('Failed to parse SSE data:', e);
          }
        };
        eventSource.onerror = () => {
          eventSource.close();
        };
        return () => eventSource.close();
      },
    },
  };

  // Integrations
  integrations = {
    Core: {
      SendEmail: async (data) => this.request('/integrations/send-email', { method: 'POST', body: JSON.stringify(data) }),
      UploadFile: async (file) => {
        const formData = new FormData();
        formData.append('file', file);
        const token = this.getToken();
        const response = await fetch(`${API_BASE_URL}/integrations/upload-file`, {
          method: 'POST',
          headers: {
            ...(token && { Authorization: `Bearer ${token}` }),
          },
          body: formData,
        });
        if (!response.ok) {
          const error = await response.json().catch(() => ({ message: 'Upload failed' }));
          throw new ApiError(response.status, error.message || 'Upload failed', error);
        }
        return response.json();
      },
    },
  };

  // Users
  users = {
    inviteUser: async (email, role) => this.request('/users/invite', { method: 'POST', body: JSON.stringify({ email, role }) }),
    getDetails: async (id) => this.request(`/users/${id}/details`),
    restrict: async (id, reason) => this.request(`/users/${id}/restrict`, { method: 'PATCH', body: JSON.stringify({ reason }) }),
    unrestrict: async (id) => this.request(`/users/${id}/unrestrict`, { method: 'PATCH' }),
    setDiscount: async (id, discount_percent, discount_eligible_rides) => this.request(`/users/${id}/discount`, { method: 'PATCH', body: JSON.stringify({ discount_percent, discount_eligible_rides }) }),
  };

  // Subscribe to real-time updates
  subscribe(entity, callback) {
    const token = this.getToken();
    const url = token ? `${API_BASE_URL}/${entity}/stream?token=${encodeURIComponent(token)}` : `${API_BASE_URL}/${entity}/stream`;
    const eventSource = new EventSource(url);
    eventSource.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        callback(data);
      } catch (e) {
        console.error('Failed to parse SSE data:', e);
      }
    };
    eventSource.onerror = () => {
      eventSource.close();
    };
    return () => eventSource.close();
  }
}

class ApiError extends Error {
  constructor(status, message, data) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.data = data;
  }
}

export const api = new ApiClient();
export { ApiError };