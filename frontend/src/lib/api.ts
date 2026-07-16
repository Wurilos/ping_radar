// ==============================================
// PingAlert Pro — API Client
// ==============================================

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

class ApiClient {
  private baseUrl: string;

  constructor() {
    this.baseUrl = API_URL;
  }

  private getToken(): string | null {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem('pingalert_token');
  }

  private async request<T>(
    path: string,
    options: RequestInit = {}
  ): Promise<T> {
    const token = this.getToken();
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(options.headers as Record<string, string>),
    };

    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const response = await fetch(`${this.baseUrl}${path}`, {
      ...options,
      headers,
    });

    if (response.status === 401) {
      if (typeof window !== 'undefined') {
        localStorage.removeItem('pingalert_token');
        localStorage.removeItem('pingalert_user');
        window.location.href = '/login';
      }
      throw new Error('Session expired');
    }

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || 'Request failed');
    }

    return data;
  }

  // Auth
  async login(email: string, password: string) {
    const data = await this.request<{ token: string; user: any }>('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
    if (typeof window !== 'undefined') {
      localStorage.setItem('pingalert_token', data.token);
      localStorage.setItem('pingalert_user', JSON.stringify(data.user));
    }
    return data;
  }

  async getProfile() {
    return this.request<any>('/api/auth/profile');
  }

  async updateProfile(data: any) {
    return this.request<any>('/api/auth/profile', {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  // Equipments
  async getEquipments(params?: Record<string, string>) {
    const query = params ? '?' + new URLSearchParams(params).toString() : '';
    return this.request<any>(`/api/equipments${query}`);
  }

  async getEquipmentStats() {
    return this.request<any>('/api/equipments/stats');
  }

  async getEquipmentGroups() {
    return this.request<string[]>('/api/equipments/groups');
  }

  async getEquipment(id: string) {
    return this.request<any>(`/api/equipments/${id}`);
  }

  async createEquipment(data: any) {
    return this.request<any>('/api/equipments', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateEquipment(id: string, data: any) {
    return this.request<any>(`/api/equipments/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async deleteEquipment(id: string) {
    return this.request<any>(`/api/equipments/${id}`, { method: 'DELETE' });
  }

  async deleteEquipments(ids: string[]) {
    return this.request<any>('/api/equipments/bulk-delete', {
      method: 'POST',
      body: JSON.stringify({ ids }),
    });
  }

  async testEquipment(id: string) {
    return this.request<any>(`/api/equipments/${id}/test`, { method: 'POST' });
  }

  async setMaintenance(id: string, enabled: boolean, reason?: string) {
    return this.request<any>(`/api/equipments/${id}/maintenance`, {
      method: 'POST',
      body: JSON.stringify({ enabled, reason }),
    });
  }

  async getEquipmentHistory(id: string, params?: Record<string, string>) {
    const query = params ? '?' + new URLSearchParams(params).toString() : '';
    return this.request<any>(`/api/equipments/${id}/history${query}`);
  }

  async getResponseTimeData(id: string, hours?: number) {
    const query = hours ? `?hours=${hours}` : '';
    return this.request<any>(`/api/equipments/${id}/response-time${query}`);
  }

  // Clients
  async getClients(params?: Record<string, string>) {
    const query = params ? '?' + new URLSearchParams(params).toString() : '';
    return this.request<any>(`/api/clients${query}`);
  }

  async getClient(id: string) {
    return this.request<any>(`/api/clients/${id}`);
  }

  async createClient(data: any) {
    return this.request<any>('/api/clients', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateClient(id: string, data: any) {
    return this.request<any>(`/api/clients/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async deleteClient(id: string) {
    return this.request<any>(`/api/clients/${id}`, { method: 'DELETE' });
  }

  async deleteClients(ids: string[]) {
    return this.request<any>('/api/clients/bulk-delete', {
      method: 'POST',
      body: JSON.stringify({ ids }),
    });
  }

  // Alerts
  async getAlerts(params?: Record<string, string>) {
    const query = params ? '?' + new URLSearchParams(params).toString() : '';
    return this.request<any>(`/api/alerts${query}`);
  }

  async sendManualAlert(equipmentId: string, message: string, channels: string[]) {
    return this.request<any>('/api/alerts/send', {
      method: 'POST',
      body: JSON.stringify({ equipmentId, message, channels }),
    });
  }

  // Users
  async getUsers() {
    return this.request<any>('/api/users');
  }

  async createUser(data: any) {
    return this.request<any>('/api/users', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateUser(id: string, data: any) {
    return this.request<any>(`/api/users/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async deleteUser(id: string) {
    return this.request<any>(`/api/users/${id}`, { method: 'DELETE' });
  }

  // Settings
  async getSettings() {
    return this.request<any>('/api/settings');
  }

  async updateSettings(data: any) {
    return this.request<any>('/api/settings', {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  // Integrations
  async getIntegrations() {
    return this.request<any>('/api/integrations');
  }

  async testTelegram() {
    return this.request<any>('/api/integrations/telegram/test', { method: 'POST' });
  }

  async getWhatsAppStatus() {
    return this.request<any>('/api/integrations/whatsapp/status');
  }

  // Webhooks
  async getWebhooks() {
    return this.request<any>('/api/webhooks');
  }

  async createWebhook(data: any) {
    return this.request<any>('/api/webhooks', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateWebhook(id: string, data: any) {
    return this.request<any>(`/api/webhooks/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async deleteWebhook(id: string) {
    return this.request<any>(`/api/webhooks/${id}`, { method: 'DELETE' });
  }

  // Health
  async getHealth() {
    return this.request<any>('/health');
  }

  logout() {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('pingalert_token');
      localStorage.removeItem('pingalert_user');
      window.location.href = '/login';
    }
  }
}

export const api = new ApiClient();
export default api;
