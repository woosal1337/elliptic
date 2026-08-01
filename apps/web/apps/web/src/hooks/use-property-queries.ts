"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "@elliptic/ui";
import type { CustomProperty, PropertyType } from "@/lib/types";
import { api, errorMessage, orgPath } from "@/lib/api";

export const propertyKeys = {
  all: (orgId: string, projectId: string) =>
    ["orgs", orgId, "projects", projectId, "properties"] as const,
};

function propertiesPath(orgId: string, projectId: string, suffix = ""): string {
  return orgPath(orgId, `/projects/${projectId}/properties${suffix}`);
}

export function useCustomProperties(orgId: string, projectId: string, enabled = true) {
  return useQuery({
    queryKey: propertyKeys.all(orgId, projectId),
    queryFn: ({ signal }) =>
      api.get<CustomProperty[]>(propertiesPath(orgId, projectId), signal),
    enabled,
  });
}

export function useCreateProperty(orgId: string, projectId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: { name: string; type: PropertyType; options: string[] }) =>
      api.post<CustomProperty>(propertiesPath(orgId, projectId), input),
    onSuccess: () => {
      toast.success("Property added");
      void queryClient.invalidateQueries({ queryKey: propertyKeys.all(orgId, projectId) });
    },
    onError: (error) => toast.error(errorMessage(error)),
  });
}

export function useDeleteProperty(orgId: string, projectId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (propertyId: string) =>
      api.delete(propertiesPath(orgId, projectId, `/${propertyId}`)),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: propertyKeys.all(orgId, projectId) });
    },
    onError: (error) => toast.error(errorMessage(error)),
  });
}


export interface PropertyTemplate {
  id: string;
  name: string;
  type: PropertyType;
  options: string[];
}

const templatesKey = (orgId: string) => ["orgs", orgId, "property-templates"] as const;

export function usePropertyTemplates(orgId: string) {
  return useQuery({
    queryKey: templatesKey(orgId),
    queryFn: ({ signal }) =>
      api.get<PropertyTemplate[]>(orgPath(orgId, "/property-templates"), signal),
  });
}

export function useCreatePropertyTemplate(orgId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: { name: string; type: PropertyType; options: string[] }) =>
      api.post<PropertyTemplate>(orgPath(orgId, "/property-templates"), input),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: templatesKey(orgId) });
      toast.success("Saved to workspace library");
    },
    onError: (error) => toast.error(errorMessage(error)),
  });
}

export function useDeletePropertyTemplate(orgId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (templateId: string) =>
      api.delete<null>(orgPath(orgId, `/property-templates/${templateId}`)),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: templatesKey(orgId) });
    },
    onError: (error) => toast.error(errorMessage(error)),
  });
}

export function useImportPropertyTemplate(orgId: string, projectId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (templateId: string) =>
      api.post<CustomProperty>(
        orgPath(orgId, `/projects/${projectId}/properties/import/${templateId}`),
        {}
      ),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: propertyKeys.all(orgId, projectId) });
      toast.success("Imported from workspace library");
    },
    onError: (error) => toast.error(errorMessage(error)),
  });
}
