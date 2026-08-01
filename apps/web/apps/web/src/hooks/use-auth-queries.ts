"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "@elliptic/ui";
import { api, errorMessage } from "@/lib/api";
import type { LoginResult, Org, User } from "@/lib/types";

export const authKeys = {
  all: ["auth"] as const,
  me: () => [...authKeys.all, "me"] as const,
};

export function useMe() {
  return useQuery({
    queryKey: authKeys.me(),
    queryFn: ({ signal }) => api.get<User>("/api/v1/auth/me", signal),
    retry: false,
  });
}

export function useUpdateProfile() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: { full_name?: string; locale?: string }) =>
      api.patch<User>("/api/v1/users/me", input),
    onSuccess: (user) => {
      queryClient.setQueryData(authKeys.me(), user);
      toast.success("Profile updated");
    },
    onError: (error) => toast.error(errorMessage(error)),
  });
}

export function useLogin() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: { email: string; password: string; code?: string }) =>
      api.post<LoginResult>("/api/v1/auth/login", input),
    onSuccess: (result) => {
      if (!result.two_factor_required) queryClient.clear();
    },
    onError: (error) => {
      toast.error(errorMessage(error));
    },
  });
}

export interface SignupResult {
  verificationRequired: boolean;
  user: User;
}

export function useSignup() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      full_name: string;
      email: string;
      password: string;
    }): Promise<SignupResult> => {
      const user = await api.post<User>("/api/v1/auth/register", input);
      if (user.email_verified === false) {
        return { verificationRequired: true, user };
      }
      const result = await api.post<LoginResult>("/api/v1/auth/login", {
        email: input.email,
        password: input.password,
      });
      return { verificationRequired: false, user: result.user ?? user };
    },
    onSuccess: () => {
      queryClient.clear();
    },
    onError: (error) => {
      toast.error(errorMessage(error));
    },
  });
}

export function useVerifyEmail() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: { email: string; code: string }) =>
      api.post<LoginResult>("/api/v1/auth/verify-email", input),
    onSuccess: () => {
      queryClient.clear();
    },
  });
}

export function useResendVerification() {
  return useMutation({
    mutationFn: (input: { email: string }) =>
      api.post<null>("/api/v1/auth/resend-verification", input),
    onSuccess: () => {
      toast.success("Verification code sent");
    },
    onError: (error) => {
      toast.error(errorMessage(error));
    },
  });
}

export function useLogout() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => api.post<null>("/api/v1/auth/logout"),
    onSuccess: () => {
      queryClient.clear();
      window.location.assign("/login");
    },
    onError: (error) => {
      toast.error(errorMessage(error));
    },
  });
}

export interface InvitePreview {
  org_id: string;
  org_name: string;
  email: string;
  role: "owner" | "admin" | "member";
  status: "pending" | "accepted" | "revoked" | "expired";
  expires_at: string;
  acceptable: boolean;
}

export function useInvitePreview(token: string) {
  return useQuery({
    queryKey: [...authKeys.all, "invite", token],
    queryFn: ({ signal }) =>
      api.get<InvitePreview>(`/api/v1/invites/${encodeURIComponent(token)}`, signal),
    retry: false,
    enabled: token.length > 0,
  });
}

export function useAcceptInvite() {
  return useMutation({
    mutationFn: (token: string) => api.post<Org>("/api/v1/invites/accept", { token }),
    onSuccess: () => {
      toast.success("Invite accepted");
    },
    onError: (error) => {
      toast.error(errorMessage(error));
    },
  });
}

export function useSetup2fa() {
  return useMutation({
    mutationFn: () =>
      api.post<{ secret: string; otpauth_uri: string }>("/api/v1/auth/2fa/setup", {}),
    onError: (error) => toast.error(errorMessage(error)),
  });
}

export function useEnable2fa() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (code: string) => api.post<null>("/api/v1/auth/2fa/enable", { code }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: authKeys.me() });
      toast.success("Two-factor authentication enabled");
    },
    onError: (error) => toast.error(errorMessage(error)),
  });
}

export function useDisable2fa() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (code: string) => api.post<null>("/api/v1/auth/2fa/disable", { code }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: authKeys.me() });
      toast.success("Two-factor authentication disabled");
    },
    onError: (error) => toast.error(errorMessage(error)),
  });
}
