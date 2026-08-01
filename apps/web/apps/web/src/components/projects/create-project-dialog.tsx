"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  Input,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Textarea,
} from "@elliptic/ui";
import { useCreateProject } from "@/hooks/use-project-queries";
import {
  useInstantiateProjectTemplate,
  useProjectTemplates,
} from "@/hooks/use-project-template-queries";

const BLANK = "__blank__";

const projectSchema = z.object({
  name: z.string().min(2, "Name is too short"),
  key: z
    .string()
    .min(2, "2-6 uppercase letters")
    .max(6, "2-6 uppercase letters")
    .regex(/^[A-Z]+$/, "Uppercase letters only"),
  description: z.string().optional(),
});

type ProjectValues = z.infer<typeof projectSchema>;

export function CreateProjectDialog({
  orgId,
  open: controlledOpen,
  onOpenChange,
}: {
  orgId: string;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}) {
  const [uncontrolledOpen, setUncontrolledOpen] = useState(false);
  const open = controlledOpen ?? uncontrolledOpen;
  const setOpen = onOpenChange ?? setUncontrolledOpen;
  const createProject = useCreateProject(orgId);
  const templates = useProjectTemplates(orgId);
  const instantiate = useInstantiateProjectTemplate(orgId);
  const [templateId, setTemplateId] = useState(BLANK);

  const form = useForm<ProjectValues>({
    resolver: zodResolver(projectSchema),
    defaultValues: { name: "", key: "", description: "" },
  });

  const close = () => {
    setOpen(false);
    form.reset();
    setTemplateId(BLANK);
  };

  const onSubmit = form.handleSubmit((values) => {
    if (templateId !== BLANK) {
      instantiate.mutate(
        { templateId, name: values.name, key: values.key },
        { onSuccess: close }
      );
      return;
    }
    createProject.mutate(
      { name: values.name, key: values.key, description: values.description || undefined },
      { onSuccess: close }
    );
  });

  const templateOptions = templates.data ?? [];

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm">
          <Plus className="size-4" />
          New project
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create project</DialogTitle>
          <DialogDescription>
            Projects group tasks, meetings, and notes around one stream of work.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={onSubmit} className="flex flex-col gap-4" noValidate>
          {templateOptions.length > 0 ? (
            <div className="flex flex-col gap-1.5">
              <Label>Start from</Label>
              <Select value={templateId} onValueChange={setTemplateId}>
                <SelectTrigger aria-label="Template">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={BLANK}>Blank project</SelectItem>
                  {templateOptions.map((template) => (
                    <SelectItem key={template.id} value={template.id}>
                      {template.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          ) : null}
          <div className="grid grid-cols-[1fr_8rem] gap-3">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="project-name">Name</Label>
              <Input id="project-name" placeholder="Website redesign" {...form.register("name")} />
              {form.formState.errors.name ? (
                <p className="text-caption text-danger">{form.formState.errors.name.message}</p>
              ) : null}
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="project-key">Key</Label>
              <Input
                id="project-key"
                placeholder="WEB"
                className="font-mono uppercase"
                {...form.register("key")}
              />
              {form.formState.errors.key ? (
                <p className="text-caption text-danger">{form.formState.errors.key.message}</p>
              ) : null}
            </div>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="project-description">Description</Label>
            <Textarea
              id="project-description"
              placeholder="What is this project about?"
              {...form.register("description")}
            />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={close}>
              Cancel
            </Button>
            <Button type="submit" loading={createProject.isPending || instantiate.isPending}>
              {templateId !== BLANK ? "Create from template" : "Create project"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
