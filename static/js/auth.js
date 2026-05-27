/**
 * Enterprise AI RAG Assistant - Client Auth Manager
 * Manages JWT tokens, validation, token refresh, and page redirections.
 */

const AuthManager = {
    // API endpoint paths
    ENDPOINTS: {
        token: '/api/token/',
        refresh: '/api/token/refresh/',
        me: '/api/accounts/me/'
    },

    // Save tokens and user data in local storage
    saveSession(access, refresh, userDetails = null) {
        localStorage.setItem('rag_access_token', access);
        if (refresh) {
            localStorage.setItem('rag_refresh_token', refresh);
        }
        if (userDetails) {
            localStorage.setItem('rag_user', JSON.stringify(userDetails));
        }
    },

    // Retrieve access token
    getAccessToken() {
        return localStorage.getItem('rag_access_token');
    },

    // Retrieve refresh token
    getRefreshToken() {
        return localStorage.getItem('rag_refresh_token');
    },

    // Retrieve cached user details
    getCachedUser() {
        const userStr = localStorage.getItem('rag_user');
        return userStr ? JSON.parse(userStr) : null;
    },

    // Clear local storage and logout user
    logout() {
        localStorage.removeItem('rag_access_token');
        localStorage.removeItem('rag_refresh_token');
        localStorage.removeItem('rag_user');
        window.location.href = '/login/';
    },

    // Decode JWT payload to check expiry
    isTokenExpired(token) {
        if (!token) return true;
        try {
            const base64Url = token.split('.')[1];
            const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
            const jsonPayload = decodeURIComponent(atob(base64).split('').map(function(c) {
                return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
            }).join(''));
            const payload = JSON.parse(jsonPayload);
            
            // Check if current time is greater than token exp time (with 10-second buffer)
            const currentTime = Math.floor(Date.now() / 1000);
            return payload.exp < (currentTime + 10);
        } catch (e) {
            return true;
        }
    },

    // Refresh the access token using the refresh token
    async refreshAccessToken() {
        const refreshToken = this.getRefreshToken();
        if (!refreshToken) {
            this.logout();
            return null;
        }

        try {
            const response = await fetch(this.ENDPOINTS.refresh, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ refresh: refreshToken })
            });

            if (response.ok) {
                const data = await response.json();
                this.saveSession(data.access, data.refresh || null);
                return data.access;
            } else {
                // If refresh token fails (e.g., expired), force logout
                this.logout();
                return null;
            }
        } catch (error) {
            console.error('Failed to refresh token:', error);
            this.logout();
            return null;
        }
    },

    // Check auth and refresh if necessary
    async checkAuth() {
        let token = this.getAccessToken();
        if (!token) {
            return false;
        }

        if (this.isTokenExpired(token)) {
            token = await this.refreshAccessToken();
            return !!token;
        }

        return true;
    },

    // Fetch authorized user details from the backend
    async fetchUserDetails(token) {
        try {
            const response = await fetch(this.ENDPOINTS.me, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            if (response.ok) {
                return await response.json();
            }
            return null;
        } catch (error) {
            console.error('Failed to fetch user details:', error);
            return null;
        }
    },

    // Perform API Login request
    async login(email, password) {
        try {
            const response = await fetch(this.ENDPOINTS.token, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ email: email, password: password })
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.detail || 'Invalid email or password.');
            }

            const data = await response.json();
            
            // Get user details right after getting tokens
            const userDetails = await this.fetchUserDetails(data.access);
            if (!userDetails) {
                throw new Error('Failed to retrieve user profile data.');
            }

            this.saveSession(data.access, data.refresh, userDetails);
            return userDetails;
        } catch (error) {
            console.error('Login error:', error);
            throw error;
        }
    },

    // Helper for authorized fetches
    async fetchWithAuth(url, options = {}) {
        const isAuth = await this.checkAuth();
        if (!isAuth) {
            this.logout();
            throw new Error('Unauthenticated');
        }

        const token = this.getAccessToken();
        options.headers = {
            ...options.headers,
            'Authorization': `Bearer ${token}`
        };

        return fetch(url, options);
    },

    // Initialize security guards for pages
    async initGuard() {
        const isLoginPage = window.location.pathname.includes('/login/');
        const isAuth = await this.checkAuth();

        if (isLoginPage) {
            if (isAuth) {
                // If already logged in, send to dashboard
                window.location.href = '/';
            }
        } else {
            if (!isAuth) {
                // If unauthenticated on app pages, redirect to login
                window.location.href = '/login/';
            }
        }
    }
};

// Auto-run guard on page load
document.addEventListener('DOMContentLoaded', () => {
    AuthManager.initGuard();
});
