import { apiFetch } from '../../auth/apiFetch';
import { BASE_URL } from '../../../config';
import type { DashboardResponse } from '../types';

export async function getDashboard(params: { desde?: string; hasta?: string } = {}): Promise<DashboardResponse> {
  const searchParams = new URLSearchParams();
  if (params.desde) searchParams.append('desde', params.desde);
  if (params.hasta) searchParams.append('hasta', params.hasta);
  
  const queryString = searchParams.toString();
  const url = `${BASE_URL}/dashboard/${queryString ? `?${queryString}` : ''}`;
  
  const response = await apiFetch(url, {
    method: 'GET',
    headers: {
      'Accept': 'application/json',
    },
  });
  
  if (!response.ok) {
    const error = await response.text();
    throw new Error(error || `Error ${response.status}`);
  }
  
  return response.json();
}
