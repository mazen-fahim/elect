import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { authApi } from '../services/api';

export const useRegisterOrganization = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: authApi.register,
    onSuccess: (data) => {
      // Invalidate and refetch related queries if needed
      queryClient.invalidateQueries({ queryKey: ['organizations'] });
    },
    onError: (error) => {
      console.error('Registration failed:', error);
    },
  });
};

export const useLogin = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: authApi.login,
    onSuccess: (data) => {
      // Store the token
      localStorage.setItem('authToken', data.access_token);
      // Invalidate user-related queries
      queryClient.invalidateQueries({ queryKey: ['user'] });
    },
  });
};

export const useForgotPassword = () => {
  return useMutation({
    mutationFn: authApi.forgotPassword,
    onError: (error) => {
      console.error('Forgot password failed:', error);
    },
  });
};

export const useResetPassword = () => {
  return useMutation({
    mutationFn: ({ token, passwords }) => authApi.resetPassword(token, passwords),
    onError: (error) => {
      console.error('Reset password failed:', error);
    },
  });
};

export const useCurrentUser = () => {
  return useQuery({
    queryKey: ['currentUser'],
    queryFn: authApi.getCurrentUser,
    enabled: !!localStorage.getItem('authToken'), // Only run if token exists
    retry: false, // Don't retry on failure (likely means token is invalid)
  });
};

