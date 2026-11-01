/**
 * API service for LiveSales Sync backend
 */

const API_BASE = '/api';

export const api = {
  // Check lightweight dataset status for polling
  checkStatus: async () => {
    const res = await fetch(`${API_BASE}/data/status/`, {
      headers: { 'Accept': 'application/json' },
      cache: 'no-store'
    });
    if (!res.ok) throw new Error(`Status check failed: ${res.statusText}`);
    return res.json();
  },

  // Fetch full dataset for latest upload (optionally for a specific sheet)
  getLatestData: async (sheetName = '') => {
    const url = sheetName 
      ? `${API_BASE}/data/latest/?sheet=${encodeURIComponent(sheetName)}`
      : `${API_BASE}/data/latest/`;
    const res = await fetch(url, {
      headers: { 'Accept': 'application/json' },
      cache: 'no-store'
    });
    if (!res.ok) throw new Error(`Failed to fetch latest data: ${res.statusText}`);
    return res.json();
  },

  // Upload Excel or CSV file
  uploadFile: async (file, uploaderName = 'Sales Manager') => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('uploader_name', uploaderName);

    const res = await fetch(`${API_BASE}/upload/`, {
      method: 'POST',
      body: formData,
    });

    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || 'Failed to upload file');
    }
    return data;
  },

  // Fetch upload history
  getHistory: async () => {
    const res = await fetch(`${API_BASE}/data/history/`, {
      headers: { 'Accept': 'application/json' },
      cache: 'no-store'
    });
    if (!res.ok) throw new Error(`Failed to fetch history: ${res.statusText}`);
    return res.json();
  },

  // Delete an uploaded dataset
  deleteDataset: async (id) => {
    const res = await fetch(`${API_BASE}/data/${id}/`, {
      method: 'DELETE',
    });
    if (!res.ok) {
      const data = await res.json();
      throw new Error(data.error || `Failed to delete dataset: ${res.statusText}`);
    }
  },

  // Download sample template URL
  getSampleTemplateUrl: () => `${API_BASE}/sample-template/`
};
