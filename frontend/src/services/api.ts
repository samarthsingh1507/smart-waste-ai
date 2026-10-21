import {
  Dish,
  WasteEvent,
  WasteEventCreate,
  VisionAnalysis,
  Settings,
  DashboardSummary,
  PrepPlannerResponse,
  InsightsResponse,
  SampleImage
} from '../types';

const API_BASE = '/api';

async function handleResponse<T>(res: Response): Promise<T> {
  if (!res.ok) {
    let errorDetail = 'API request failed';
    try {
      const errJson = await res.json();
      errorDetail = errJson.detail || errJson.message || errorDetail;
    } catch {
      errorDetail = `Request failed with status ${res.status}`;
    }
    throw new Error(errorDetail);
  }
  return res.json();
}

export const api = {
  // Health
  async getHealth() {
    const res = await fetch(`${API_BASE}/health`);
    return handleResponse<{
      status: string;
      database: string;
      ai_vision: {
        gemini_configured: boolean;
        model: string;
        demo_fallback_active: boolean;
        status_label: string;
      };
      version: string;
    }>(res);
  },

  // Settings
  async getSettings(): Promise<Settings> {
    const res = await fetch(`${API_BASE}/settings`);
    return handleResponse<Settings>(res);
  },

  async updateSettings(data: Partial<Settings>): Promise<Settings> {
    const res = await fetch(`${API_BASE}/settings`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    return handleResponse<Settings>(res);
  },

  async resetDemoData(): Promise<{ status: string; message: string }> {
    const res = await fetch(`${API_BASE}/settings/reset-demo`, {
      method: 'POST'
    });
    return handleResponse<{ status: string; message: string }>(res);
  },

  // Dishes
  async getDishes(): Promise<Dish[]> {
    const res = await fetch(`${API_BASE}/dishes`);
    return handleResponse<Dish[]>(res);
  },

  async createDish(dish: Partial<Dish>): Promise<Dish> {
    const res = await fetch(`${API_BASE}/dishes`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(dish)
    });
    return handleResponse<Dish>(res);
  },

  async uploadDishPhoto(file: File): Promise<{ image_url: string; filename: string }> {
    const formData = new FormData();
    formData.append('file', file);
    const res = await fetch(`${API_BASE}/dishes/upload-photo`, {
      method: 'POST',
      body: formData
    });
    return handleResponse<{ image_url: string; filename: string }>(res);
  },

  async updateDish(id: number, dish: Partial<Dish>): Promise<Dish> {
    const res = await fetch(`${API_BASE}/dishes/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(dish)
    });
    return handleResponse<Dish>(res);
  },

  async deleteDish(id: number): Promise<{ status: string; message: string }> {
    const res = await fetch(`${API_BASE}/dishes/${id}`, {
      method: 'DELETE'
    });
    return handleResponse<{ status: string; message: string }>(res);
  },

  // Waste Events
  async getWasteEvents(params?: {
    search?: string;
    date_from?: string;
    date_to?: string;
    meal_period?: string;
    waste_type?: string;
    category?: string;
    limit?: number;
    offset?: number;
  }): Promise<WasteEvent[]> {
    const query = new URLSearchParams();
    if (params) {
      Object.entries(params).forEach(([k, v]) => {
        if (v !== undefined && v !== null && v !== '') {
          query.append(k, String(v));
        }
      });
    }
    const res = await fetch(`${API_BASE}/waste-events?${query.toString()}`);
    return handleResponse<WasteEvent[]>(res);
  },

  async getWasteEvent(id: number): Promise<WasteEvent> {
    const res = await fetch(`${API_BASE}/waste-events/${id}`);
    return handleResponse<WasteEvent>(res);
  },

  async createWasteEvent(data: WasteEventCreate): Promise<WasteEvent> {
    const res = await fetch(`${API_BASE}/waste-events`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    return handleResponse<WasteEvent>(res);
  },

  async updateWasteEvent(id: number, data: Partial<WasteEventCreate>): Promise<WasteEvent> {
    const res = await fetch(`${API_BASE}/waste-events/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    return handleResponse<WasteEvent>(res);
  },

  async deleteWasteEvent(id: number): Promise<{ status: string; message: string }> {
    const res = await fetch(`${API_BASE}/waste-events/${id}`, {
      method: 'DELETE'
    });
    return handleResponse<{ status: string; message: string }>(res);
  },

  // Analytics
  async getDashboardSummary(params?: {
    date_from?: string;
    date_to?: string;
    meal_period?: string;
  }): Promise<DashboardSummary> {
    const query = new URLSearchParams();
    if (params) {
      Object.entries(params).forEach(([k, v]) => {
        if (v) query.append(k, v);
      });
    }
    const res = await fetch(`${API_BASE}/analytics/dashboard?${query.toString()}`);
    return handleResponse<DashboardSummary>(res);
  },

  async getInsights(days: number = 14): Promise<InsightsResponse> {
    const res = await fetch(`${API_BASE}/analytics/insights?days=${days}`);
    return handleResponse<InsightsResponse>(res);
  },

  // Recommendations
  async getPrepPlanner(params?: {
    target_date?: string;
    meal_period?: string;
    dish_id?: number;
  }): Promise<PrepPlannerResponse> {
    const query = new URLSearchParams();
    if (params) {
      Object.entries(params).forEach(([k, v]) => {
        if (v !== undefined && v !== null && v !== '') {
          query.append(k, String(v));
        }
      });
    }
    const res = await fetch(`${API_BASE}/recommendations/prep-planner?${query.toString()}`);
    return handleResponse<PrepPlannerResponse>(res);
  },

  // Vision
  async getSampleImages(): Promise<SampleImage[]> {
    const res = await fetch(`${API_BASE}/vision/samples`);
    return handleResponse<SampleImage[]>(res);
  },

  async analyzeImage(file?: File | null, sampleFilename?: string): Promise<VisionAnalysis> {
    const formData = new FormData();
    if (file) {
      formData.append('file', file);
    }
    if (sampleFilename) {
      formData.append('sample_filename', sampleFilename);
    }
    const res = await fetch(`${API_BASE}/vision/analyze`, {
      method: 'POST',
      body: formData
    });
    return handleResponse<VisionAnalysis>(res);
  }
};
