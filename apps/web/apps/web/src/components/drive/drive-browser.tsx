"use client";

import * as React from "react";
import {
  ChevronRight,
  Eye,
  FileText,
  Folder,
  FolderInput,
  Home,
  ImageIcon,
  Link2,
  Pencil,
  Trash2,
  Upload,
} from "lucide-react";
import {
  Button,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  EmptyState,
  IconButton,
  Input,
  Skeleton,
  cn,
  toast,
} from "@elliptic/ui";
import { relativeTime } from "@/lib/format";
import { ContentCard } from "@/components/content-card";
import { ErrorState } from "@/components/error-state";
import {
  DRIVE_FILE_LIMIT,
  useDeleteDriveFile,
  useDriveFiles,
  useDriveFolders,
  useRenameDriveFolder,
  useUpdateDriveFile,
  useUploadToDrive,
} from "@/hooks/use-drive-queries";
import type { DriveFile } from "@/lib/types";

export function humanSize(bytes: number | null): string {
  if (!bytes) return "";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/** The markdown a task description needs to link this document. */
export function mentionMarkdown(file: DriveFile): string {
  return `[${file.name.replace(/([[\]])/g, "\\$1")}](/__mention/file/${file.id})`;
}

function joinPath(parent: string, name: string): string {
  return parent ? `${parent}/${name}` : name;
}

/** The folders sitting directly inside `current`, derived from the paths files carry. */
function childFolders(paths: readonly string[], current: string): { name: string; path: string }[] {
  const prefix = current ? `${current}/` : "";
  const names = new Set<string>();
  for (const path of paths) {
    if (current && !path.startsWith(prefix)) continue;
    const rest = path.slice(prefix.length);
    if (!rest) continue;
    const head = rest.split("/")[0];
    if (head) names.add(head);
  }
  return [...names]
    .sort((a, b) => a.localeCompare(b, undefined, { numeric: true }))
    .map((name) => ({ name, path: joinPath(current, name) }));
}

export function DriveBrowser({
  orgId,
  onOpenDetails,
}: {
  orgId: string;
  onOpenDetails?: (fileId: string) => void;
}) {
  const [folder, setFolder] = React.useState("");
  const [search, setSearch] = React.useState("");
  const searching = search.trim().length > 0;

  const files = useDriveFiles(orgId, folder, search);
  const folders = useDriveFolders(orgId);
  const upload = useUploadToDrive(orgId);
  const updateFile = useUpdateDriveFile(orgId);
  const deleteFile = useDeleteDriveFile(orgId);
  const renameFolder = useRenameDriveFolder(orgId);

  const inputRef = React.useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = React.useState(false);

  const folderPaths = React.useMemo(
    () => (folders.data ?? []).map((entry) => entry.path),
    [folders.data]
  );
  const here = React.useMemo(() => childFolders(folderPaths, folder), [folderPaths, folder]);
  const trail = React.useMemo(
    () => (folder ? folder.split("/") : []),
    [folder]
  );

  const send = React.useCallback(
    (list: FileList | null) => {
      const picked = Array.from(list ?? []);
      if (picked.length === 0) return;
      for (const file of picked) {
        if (file.size > DRIVE_FILE_LIMIT) {
          toast.error(`${file.name} is larger than the 100 MB limit`);
          continue;
        }
        upload.mutate(
          { file, folderPath: folder },
          { onSuccess: (created) => toast.success(`${created.name} uploaded`) }
        );
      }
    },
    [folder, upload]
  );

  const rename = (file: DriveFile) => {
    const next = window.prompt("Document name", file.name);
    if (next === null || next.trim() === file.name) return;
    if (!next.trim()) {
      toast.error("A document needs a name");
      return;
    }
    updateFile.mutate({ fileId: file.id, name: next.trim() });
  };

  const move = (file: DriveFile, target: string) =>
    updateFile.mutate({ fileId: file.id, folder_path: target });

  const remove = (file: DriveFile) => {
    if (!window.confirm(`Delete ${file.name}? Links to it in task descriptions will stop working.`))
      return;
    deleteFile.mutate(file.id);
  };

  const copyMention = async (file: DriveFile) => {
    try {
      await navigator.clipboard.writeText(mentionMarkdown(file));
      toast.success("Copied the link — paste it into a description");
    } catch {
      toast.error("Could not copy the link");
    }
  };

  const createFolder = () => {
    const name = window.prompt("Folder name");
    if (!name?.trim()) return;
    // A folder is a path on a document, so it exists once something is in it.
    // Opening it immediately lets the next upload land there.
    setFolder(joinPath(folder, name.trim()));
    setSearch("");
  };

  const renameCurrentFolder = () => {
    if (!folder) return;
    const segments = folder.split("/");
    const next = window.prompt("Folder name", segments[segments.length - 1] ?? "");
    if (!next?.trim()) return;
    const target = [...segments.slice(0, -1), next.trim()].join("/");
    renameFolder.mutate({ path: folder, new_path: target }, { onSuccess: () => setFolder(target) });
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-2">
        <Input
          aria-label="Search the Drive"
          placeholder="Search documents…"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          className="h-9 max-w-xs"
        />
        <div className="ml-auto flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={createFolder}>
            <Folder className="size-4" />
            New folder
          </Button>
          <Button size="sm" disabled={upload.isPending} onClick={() => inputRef.current?.click()}>
            <Upload className="size-4" />
            {upload.isPending ? "Uploading…" : "Upload"}
          </Button>
          <input
            ref={inputRef}
            type="file"
            multiple
            className="hidden"
            aria-label="Upload documents"
            onChange={(event) => {
              send(event.target.files);
              event.target.value = "";
            }}
          />
        </div>
      </div>

      {searching ? (
        <p className="text-caption text-muted-foreground">
          Searching the whole Drive for “{search.trim()}”.
        </p>
      ) : (
        <nav aria-label="Drive folders" className="flex flex-wrap items-center gap-1">
          <button
            type="button"
            onClick={() => setFolder("")}
            className="inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-caption text-muted-foreground transition-colors hover:bg-subtle hover:text-foreground"
          >
            <Home className="size-3.5" />
            Drive
          </button>
          {trail.map((segment, index) => (
            <React.Fragment key={`${segment}-${index}`}>
              <ChevronRight className="size-3 text-muted-foreground/60" aria-hidden="true" />
              <button
                type="button"
                onClick={() => setFolder(trail.slice(0, index + 1).join("/"))}
                className="rounded-md px-1.5 py-0.5 text-caption text-muted-foreground transition-colors hover:bg-subtle hover:text-foreground"
              >
                {segment}
              </button>
            </React.Fragment>
          ))}
          {folder ? (
            <IconButton
              aria-label="Rename this folder"
              variant="ghost"
              size="sm"
              className="ml-1"
              onClick={renameCurrentFolder}
            >
              <Pencil className="size-3.5" />
            </IconButton>
          ) : null}
        </nav>
      )}

      <div
        onDragOver={(event) => {
          event.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(event) => {
          event.preventDefault();
          setDragging(false);
          send(event.dataTransfer.files);
        }}
        className={cn(
          "flex flex-col gap-2 rounded-lg border border-dashed border-transparent transition-colors",
          dragging && "border-accent bg-accent-subtle/20 p-2"
        )}
      >
        {files.isPending || folders.isPending ? (
          Array.from({ length: 4 }, (_, index) => <Skeleton key={index} className="h-16 w-full" />)
        ) : files.isError ? (
          <ErrorState error={files.error} onRetry={() => void files.refetch()} />
        ) : (
          <>
            {!searching &&
              here.map((entry) => (
                <ContentCard
                  key={entry.path}
                  title={entry.name}
                  onClick={() => setFolder(entry.path)}
                  leading={<Folder className="size-4 text-muted-foreground" />}
                  tag={{ label: "Folder", variant: "outline" }}
                />
              ))}

            {(files.data ?? []).map((file) => (
              <ContentCard
                key={file.id}
                title={file.name}
                summary={file.description ?? file.filename}
                onClick={() => onOpenDetails?.(file.id)}
                leading={
                  file.kind === "image" ? (
                    <ImageIcon className="size-4 text-accent" />
                  ) : (
                    <FileText className="size-4 text-accent" />
                  )
                }
                tag={
                  searching && file.folder_path
                    ? { label: file.folder_path, variant: "outline" }
                    : file.size_bytes
                      ? { label: humanSize(file.size_bytes), variant: "outline" }
                      : undefined
                }
                timestamp={{
                  label: `Added ${relativeTime(file.created_at).relative}`,
                  title: relativeTime(file.created_at).title,
                  iso: file.created_at,
                }}
                trailing={
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="ghost"
                        size="sm"
                        aria-label={`Actions for ${file.name}`}
                        onClick={(event) => event.preventDefault()}
                      >
                        <FolderInput className="size-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="max-h-80 overflow-y-auto">
                      <DropdownMenuItem onSelect={() => onOpenDetails?.(file.id)}>
                        <Eye className="size-4" />
                        Preview
                      </DropdownMenuItem>
                      <DropdownMenuItem onSelect={() => void copyMention(file)}>
                        <Link2 className="size-4" />
                        Copy link for a description
                      </DropdownMenuItem>
                      <DropdownMenuItem onSelect={() => rename(file)}>
                        <Pencil className="size-4" />
                        Rename
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuLabel>Move to</DropdownMenuLabel>
                      {file.folder_path ? (
                        <DropdownMenuItem onSelect={() => move(file, "")}>
                          <Home className="size-4" />
                          Drive root
                        </DropdownMenuItem>
                      ) : null}
                      {folderPaths
                        .filter((path) => path !== file.folder_path)
                        .map((path) => (
                          <DropdownMenuItem key={path} onSelect={() => move(file, path)}>
                            <Folder className="size-4" />
                            {path}
                          </DropdownMenuItem>
                        ))}
                      <DropdownMenuSeparator />
                      <DropdownMenuItem onSelect={() => remove(file)}>
                        <Trash2 className="size-4" />
                        Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                }
              />
            ))}

            {(files.data ?? []).length === 0 && (searching || here.length === 0) ? (
              <EmptyState
                icon={<FileText className="size-5" />}
                title={searching ? "No documents match" : "No documents here yet"}
                description={
                  searching
                    ? "Try a shorter search, or clear it to browse the folders."
                    : "Upload contracts, plans and specs here, then link them from any task description with “@”."
                }
                action={
                  searching ? undefined : (
                    <Button size="sm" onClick={() => inputRef.current?.click()}>
                      <Upload className="size-4" />
                      Upload a document
                    </Button>
                  )
                }
              />
            ) : null}
          </>
        )}
      </div>
    </div>
  );
}
