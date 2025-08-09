import { useQuery } from '@tanstack/react-query';
import { organizationApi } from '../services/api';

export const useOrganizationDashboardStats = () => {
  return useQuery({
    queryKey: ['organizationDashboardStats'],
    queryFn: organizationApi.getDashboardStats,
    enabled: !!localStorage.getItem('authToken'), // Only run if token exists
    staleTime: 5 * 60 * 1000, // 5 minutes
    refetchOnWindowFocus: false,
  });
};
