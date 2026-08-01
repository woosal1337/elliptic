"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "@elliptic/ui";
import { api, errorMessage, orgPath } from "@/lib/api";

export type ContractStatus = "prospect" | "trial" | "active" | "churned";

export interface Customer {
  id: string;
  name: string;
  description: string | null;
  email: string | null;
  website_url: string | null;
  employees: number | null;
  industry: string | null;
  stage: string | null;
  contract_status: ContractStatus | null;
  revenue: string | null;
  created_at: string;
  updated_at: string;
}

const key = (orgId: string) => ["orgs", orgId, "customers"] as const;

export function useCustomers(orgId: string, search?: string) {
  return useQuery({
    queryKey: [...key(orgId), search ?? ""] as const,
    queryFn: ({ signal }) =>
      api.get<Customer[]>(
        orgPath(orgId, `/customers${search ? `?search=${encodeURIComponent(search)}` : ""}`),
        signal
      ),
  });
}

export function useCreateCustomer(orgId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: { name: string; industry?: string; email?: string }) =>
      api.post<Customer>(orgPath(orgId, "/customers"), input),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: key(orgId) });
      toast.success("Customer created");
    },
    onError: (error) => toast.error(errorMessage(error)),
  });
}

export function useUpdateCustomer(orgId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      customerId,
      ...body
    }: {
      customerId: string;
      name?: string;
      stage?: string;
      contract_status?: ContractStatus;
      revenue?: string;
    }) => api.patch<Customer>(orgPath(orgId, `/customers/${customerId}`), body),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: key(orgId) });
    },
    onError: (error) => toast.error(errorMessage(error)),
  });
}

export function useDeleteCustomer(orgId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (customerId: string) => api.delete<null>(orgPath(orgId, `/customers/${customerId}`)),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: key(orgId) });
      toast.success("Customer deleted");
    },
    onError: (error) => toast.error(errorMessage(error)),
  });
}

export type RequestStatus = "open" | "planned" | "in_progress" | "closed";

export interface CustomerRequest {
  id: string;
  customer_id: string;
  title: string;
  description: string | null;
  status: RequestStatus;
  source_url: string | null;
  task_ids: string[];
  created_at: string;
}

const requestsKey = (orgId: string, customerId: string) =>
  ["orgs", orgId, "customers", customerId, "requests"] as const;

export function useCustomerRequests(orgId: string, customerId: string, enabled = true) {
  return useQuery({
    queryKey: requestsKey(orgId, customerId),
    enabled,
    queryFn: ({ signal }) =>
      api.get<CustomerRequest[]>(orgPath(orgId, `/customers/${customerId}/requests`), signal),
  });
}

export function useCreateCustomerRequest(orgId: string, customerId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: { title: string; status?: RequestStatus; source_url?: string }) =>
      api.post<CustomerRequest>(orgPath(orgId, `/customers/${customerId}/requests`), input),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: requestsKey(orgId, customerId) });
    },
    onError: (error) => toast.error(errorMessage(error)),
  });
}

export function useUpdateCustomerRequest(orgId: string, customerId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ requestId, ...body }: { requestId: string; status?: RequestStatus }) =>
      api.patch<CustomerRequest>(orgPath(orgId, `/customers/requests/${requestId}`), body),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: requestsKey(orgId, customerId) });
    },
    onError: (error) => toast.error(errorMessage(error)),
  });
}

export function useDeleteCustomerRequest(orgId: string, customerId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (requestId: string) =>
      api.delete<null>(orgPath(orgId, `/customers/requests/${requestId}`)),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: requestsKey(orgId, customerId) });
    },
    onError: (error) => toast.error(errorMessage(error)),
  });
}
