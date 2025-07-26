// src/services/api.ts
// This is your centralized API service - all API calls go here!

// Helper function for all API calls
async function apiCall(endpoint: string, options?: RequestInit) {
  try {
    const response = await fetch(endpoint, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options?.headers,
      },
      credentials: 'include', // Important for cookies
    });

    // Handle different response types
    let data;
    const contentType = response.headers.get('content-type');
    
    if (contentType && contentType.includes('application/json')) {
      data = await response.json();
    } else {
      // Handle non-JSON responses
      data = await response.text();
    }

    // Return both response status and data
    return { ok: response.ok, data, status: response.status };
  } catch (error) {
    // Network error or other fetch errors
    console.error('API call error:', error);
    return { 
      ok: false, 
      data: { error: 'Network error. Please check your connection.' }, 
      status: 0 
    };
  }
}

// ==========================================
// AUTH API - UPDATED with forgot password support
// ==========================================
export const authAPI = {
  login: async (username: string, password: string) => {
    return apiCall('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ username, password }),
    });
  },

  // UPDATED: Register with secret questions
  register: async (userData: {
    username: string;
    email: string;
    password: string;
    birthday: string;
    secretQuestionId: number;
    secretAnswer: string;
  }) => {
    return apiCall('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify(userData),
    });
  },

  // NEW: Forgot password
  forgotPassword: async (forgotData: {
    username: string;
    secretAnswer: string;
    newPassword: string;
  }) => {
    return apiCall('/api/auth/forgot-password', {
      method: 'POST',
      body: JSON.stringify(forgotData),
    });
  },

  // NEW: Get secret questions
  getSecretQuestions: async () => {
    return apiCall('/api/auth/secret-question');
  },

  // NEW: Get user's secret question
  getUserSecretQuestion: async (username: string) => {
    return apiCall(`/api/auth/secret-question/${encodeURIComponent(username)}`);
  },

  // NEW: Logout
  logout: async () => {
    return apiCall('/api/auth/logout', {
      method: 'POST',
    });
  },

  // NEW: Check auth status
  checkAuth: async () => {
    return apiCall('/api/auth/me');
  },

  // NEW: Update secret question (for logged-in users)
  updateSecretQuestion: async (secretQuestionId: number, secretAnswer: string) => {
    return apiCall('/api/auth/update-secret-question', {
      method: 'POST',
      body: JSON.stringify({ secretQuestionId, secretAnswer }),
    });
  },
};

// ==========================================
// ADMIN API - Enhanced with better error handling
// ==========================================
export const adminAPI = {
  checkAccess: async () => {
    return apiCall('/api/admin/check');
  },

  getUsers: async (page: number = 1, limit: number = 20, search?: string) => {
    const params = new URLSearchParams({
      page: page.toString(),
      limit: limit.toString(),
    });
    
    if (search) {
      params.append('search', search);
    }
    
    return apiCall(`/api/admin/users?${params.toString()}`);
  },

  updateUserPassword: async (userId: number, newPassword: string) => {
    return apiCall('/api/admin/users/update-password', {
      method: 'POST',
      body: JSON.stringify({ userId, newPassword }),
    });
  },

  deleteUser: async (userId: number) => {
    return apiCall(`/api/admin/users/${userId}`, {
      method: 'DELETE',
    });
  },

  toggleBan: async (userId: number, banStatus: number) => {
    return apiCall('/api/admin/users/toggle-ban', {
      method: 'POST',
      body: JSON.stringify({ userId, banStatus })
    });
  },

  updateNXCredits: async (userId: number, amount: number) => {
    return apiCall('/api/admin/users/update-nx', {
      method: 'POST',
      body: JSON.stringify({ userId, amount })
    });
  },

  updateMeso: async (characterId: number, amount: number) => {
    return apiCall('/api/admin/characters/update-meso', {
      method: 'POST',
      body: JSON.stringify({ characterId, amount })
    });
  },

  getUserInventory: async (userId: number) => {
    return apiCall(`/api/admin/users/${userId}/inventory`);
  },

  // NEW: Get user details with characters
  getUserDetails: async (userId: number) => {
    return apiCall(`/api/admin/users/${userId}/details`);
  },

  // NEW: Get admin activity logs
  getActivityLogs: async (page: number = 1, limit: number = 50) => {
    return apiCall(`/api/admin/logs?page=${page}&limit=${limit}`);
  },

  // NEW: Get password reset attempts
  getPasswordResetAttempts: async (page: number = 1, limit: number = 50) => {
    return apiCall(`/api/admin/password-reset-attempts?page=${page}&limit=${limit}`);
  },
};

// ==========================================
// DASHBOARD API - Enhanced with caching support
// ==========================================
export const dashboardAPI = {
  getStats: async () => {
    return apiCall('/api/dashboard/stats');
  },

  getCharacters: async () => {
    return apiCall('/api/dashboard/characters');
  },

  // Updated rankings API with proper parameters
  getRankings: async (params?: {
    page?: number;
    limit?: number;
    job?: string;
    search?: string;
  }) => {
    const searchParams = new URLSearchParams();
    
    if (params?.page) searchParams.append('page', params.page.toString());
    if (params?.limit) searchParams.append('limit', params.limit.toString());
    if (params?.job) searchParams.append('job', params.job);
    if (params?.search) searchParams.append('search', params.search);
    
    const queryString = searchParams.toString();
    const url = queryString ? `/api/dashboard/rankings?${queryString}` : '/api/dashboard/rankings';
    
    return apiCall(url);
  },

  // NEW: Get character details with equipment
  getCharacterDetails: async (characterId: number) => {
    return apiCall(`/api/dashboard/characters/${characterId}`);
  },

  // NEW: Update user profile
  updateProfile: async (profileData: {
    email?: string;
    secretQuestionId?: number;
    secretAnswer?: string;
  }) => {
    return apiCall('/api/dashboard/profile', {
      method: 'POST',
      body: JSON.stringify(profileData),
    });
  },
};

// ==========================================
// ANNOUNCEMENTS API - Enhanced with pagination
// ==========================================
export const announcementsAPI = {
  getAll: async (page: number = 1, limit: number = 10) => {
    return apiCall(`/api/announcements?page=${page}&limit=${limit}`);
  },

  create: async (announcement: {
    type: 'event' | 'update' | 'maintenance';
    title: string;
    description: string;
    priority?: number;
  }) => {
    return apiCall('/api/announcements', {
      method: 'POST',
      body: JSON.stringify(announcement),
    });
  },

  update: async (id: number, announcement: {
    type?: 'event' | 'update' | 'maintenance';
    title?: string;
    description?: string;
    priority?: number;
  }) => {
    return apiCall(`/api/announcements/${id}`, {
      method: 'PUT',
      body: JSON.stringify(announcement),
    });
  },

  delete: async (id: number) => {
    return apiCall(`/api/announcements?id=${id}`, {
      method: 'DELETE',
    });
  },

  // NEW: Get single announcement
  getById: async (id: number) => {
    return apiCall(`/api/announcements/${id}`);
  },
};

// ==========================================
// VOTE API - Enhanced with better error handling
// ==========================================
export const voteAPI = {
  getStatus: async () => {
    return apiCall('/api/vote/status');
  },

  // NEW: Submit vote
  submitVote: async (siteId: number) => {
    return apiCall('/api/vote/submit', {
      method: 'POST',
      body: JSON.stringify({ siteId }),
    });
  },

  // NEW: Get vote history
  getHistory: async (page: number = 1, limit: number = 20) => {
    return apiCall(`/api/vote/history?page=${page}&limit=${limit}`);
  },
};

// ==========================================
// SERVER API - Enhanced with caching
// ==========================================
export const serverAPI = {
  getStatus: async () => {
    return apiCall('/api/server/status');
  },

  // NEW: Get server statistics
  getStats: async () => {
    return apiCall('/api/server/stats');
  },

  // NEW: Get server events
  getEvents: async () => {
    return apiCall('/api/server/events');
  },
};

// ==========================================
// DISCORD API - Enhanced with fallback
// ==========================================
export const discordAPI = {
  getServerInfo: async () => {
    const serverId = process.env.NEXT_PUBLIC_DISCORD_SERVER_ID || '1388386202805342293';
    
    try {
      const response = await fetch(`https://discord.com/api/guilds/${serverId}/widget.json`);
      if (response.ok) {
        const data = await response.json();
        return {
          ok: true,
          data: {
            online: data.presence_count || 0,
            members: data.member_count || 0,
            loading: false,
            fallback: false
          }
        };
      }
      throw new Error('Failed to fetch Discord data');
    } catch (error) {
      console.warn('Discord API error, using fallback data:', error);
      // Return fallback data
      return {
        ok: true,
        data: {
          online: 127,
          members: 2847,
          loading: false,
          fallback: true
        }
      };
    }
  },
};

// ==========================================
// UTILITY FUNCTIONS
// ==========================================

// NEW: Handle API errors consistently
export function handleApiError(error: any, defaultMessage: string = 'An error occurred') {
  if (error?.data?.error) {
    return error.data.error;
  }
  if (error?.message) {
    return error.message;
  }
  return defaultMessage;
}

// NEW: Check if user is authenticated
export async function checkAuthentication() {
  try {
    const response = await authAPI.checkAuth();
    return response.ok ? response.data : null;
  } catch (error) {
    return null;
  }
}

// NEW: Logout and cleanup
export async function logout() {
  try {
    await authAPI.logout();
    // Clear local storage
    localStorage.removeItem('user');
    // Redirect to login
    window.location.href = '/auth';
  } catch (error) {
    console.error('Logout error:', error);
    // Force cleanup even if API call fails
    localStorage.removeItem('user');
    window.location.href = '/auth';
  }
}

// NEW: Format API responses consistently
export function formatApiResponse<T>(response: any): {
  success: boolean;
  data?: T;
  error?: string;
  status: number;
} {
  return {
    success: response.ok,
    data: response.ok ? response.data : undefined,
    error: response.ok ? undefined : (response.data?.error || 'Unknown error'),
    status: response.status
  };
}

// NEW: Retry failed API calls
export async function retryApiCall<T>(
  apiFunction: () => Promise<T>,
  maxRetries: number = 3,
  delay: number = 1000
): Promise<T> {
  let lastError: any;

  for (let i = 0; i < maxRetries; i++) {
    try {
      return await apiFunction();
    } catch (error) {
      lastError = error;
      if (i < maxRetries - 1) {
        await new Promise(resolve => setTimeout(resolve, delay * Math.pow(2, i)));
      }
    }
  }

  throw lastError;
}