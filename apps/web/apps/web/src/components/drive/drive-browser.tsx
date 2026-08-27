"use client";

import * as React from "react";
import { plainText } from "@/components/notes/markdown";
import {
  ChevronRight,
  Eye,
  FileText,
  Folder,
  FolderInput,
  HardDrive,
  Home,
  ImageIcon,
  Link2,
  Music,
  Pencil,
  Trash2,
  Upload,
  Video,
} from "lucide-react";
import {
  Avatar,
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
import { ErrorState } from "@/components/error-state";
import { NameDialog, type NameDialogRequest } from "@/components/name-dialog";
import { FolderTree, type FolderTreeNode } from "@/components/library/folder-tree";
import {
  FolderCardGrid,
  LibrarySectionHeading,
} from "@/components/library/folder-card-grid";
import {
  LibraryCell,
  LibraryNameCell,
  LibraryRow,
  LibraryTable,
} from "@/components/library/library-table";
import {
  DRIVE_FILE_LIMIT,
  useDeleteDriveFile,
  useDriveFiles,
  useDriveFolders,
  useRenameDriveFolder,
  useUpdateDriveFile,
  useUploadToDrive,
} from "@/hooks/use-drive-queries";
import { useOrgMembers } from "@/hooks/use-org-queries";
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

function fileIcon(file: DriveFile): React.ReactNode {
  if (file.kind === "image") return <ImageIcon className="size-4" />;
  if (file.content_type.startsWith("video/")) return <Video className="size-4" />;
  if (file.content_type.startsWith("audio/")) return <Music className="size-4" />;
  return <FileText className="size-4" />;
}

function countLabel(count: number, noun: string): string {
  return count === 1 ? `1 ${noun}` : `${count} ${noun}s`;
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

/**
 * Every folder as a tree row, depth first. A folder that holds only folders
 * never appears in the API list — it is a prefix, not a row — so the nodes come
 * from expanding every path into all of its ancestors.
 */
function treeNodes(
  paths: readonly string[],
  countByPath: ReadonlyMap<string, number>
): FolderTreeNode[] {
  const nodes: FolderTreeNode[] = [];
  const walk = (current: string, depth: number) => {
    for (const child of childFolders(paths, current)) {
      nodes.push({
        id: child.path,
        label: child.name,
        depth,
        count: countByPath.get(child.path) ?? 0,
      });
      walk(child.path, depth + 1);
    }
  };
  walk("", 0);
  return nodes;
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
  const members = useOrgMembers(orgId);
  const upload = useUploadToDrive(orgId);
  const updateFile = useUpdateDriveFile(orgId);
  const deleteFile = useDeleteDriveFile(orgId);
  const renameFolder = useRenameDriveFolder(orgId);

  const inputRef = React.useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = React.useState(false);
  const [namePrompt, setNamePrompt] = React.useState<NameDialogRequest | null>(null);

  const folderPaths = React.useMemo(
    () => (folders.data ?? []).map((entry) => entry.path),
    [folders.data]
  );
  const countByPath = React.useMemo(
    () => new Map((folders.data ?? []).map((entry) => [entry.path, entry.file_count])),
    [folders.data]
  );
  const memberByUserId = React.useMemo(
    () => new Map((members.data ?? []).map((member) => [member.user_id, member])),
    [members.data]
  );
  const nodes = React.useMemo(
    () => treeNodes(folderPaths, countByPath),
    [folderPaths, countByPath]
  );
  const here = React.useMemo(() => childFolders(folderPaths, folder), [folderPaths, folder]);
  const trail = React.useMemo(() => (folder ? folder.split("/") : []), [folder]);

  /** Everything filed at or under a path — what the folder card promises to open. */
  const countUnder = React.useCallback(
    (path: string) => {
      const prefix = `${path}/`;
      let total = 0;
      for (const [entry, count] of countByPath) {
        if (entry === path || entry.startsWith(prefix)) total += count;
      }
      return total;
    },
    [countByPath]
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

  const openFolder = (path: string) => {
    setFolder(path);
    setSearch("");
  };

  const rename = (file: DriveFile) => {
    setNamePrompt({
      title: "Rename document",
      label: "Document name",
      initialValue: file.name,
      submitLabel: "Rename",
      onSubmit: (name) => {
        if (name !== file.name) updateFile.mutate({ fileId: file.id, name });
      },
    });
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
    setNamePrompt({
      title: "New folder",
      label: "Folder name",
      description: "The folder holds its place once a document lands in it.",
      submitLabel: "Create",
      // A folder is a path on a document, so it exists once something is in
      // it. Opening it immediately lets the next upload land there.
      onSubmit: (name) => openFolder(joinPath(folder, name)),
    });
  };

  const renameCurrentFolder = () => {
    if (!folder) return;
    const segments = folder.split("/");
    setNamePrompt({
      title: "Rename folder",
      label: "Folder name",
      initialValue: segments[segments.length - 1] ?? "",
      submitLabel: "Rename",
      onSubmit: (name) => {
        const target = [...segments.slice(0, -1), name].join("/");
        if (target === folder) return;
        renameFolder.mutate(
          { path: folder, new_path: target },
          { onSuccess: () => setFolder(target) }
        );
      },
    });
  };

  const fileMenu = (file: DriveFile) => (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          aria-label={`Actions for ${file.name}`}
          onClick={(event) => event.stopPropagation()}
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
  );

  const addedBy = (file: DriveFile) => {
    const member = file.uploaded_by ? memberByUserId.get(file.uploaded_by) : undefined;
    if (!member) return <span className="text-caption text-muted-foreground">—</span>;
    return (
      <span className="flex items-center gap-2">
        <Avatar name={member.full_name} size="sm" />
        <span className="truncate text-small text-foreground">{member.full_name}</span>
      </span>
    );
  };

  const fileRows = (list: DriveFile[]) => (
    <LibraryTable
      aria-label="Documents"
      columns={[
        { label: "Name" },
        { label: searching ? "Folder" : "Added by", className: "w-44 max-lg:hidden" },
        { label: "Size", className: "w-24" },
        { label: "Added", className: "w-32 max-sm:hidden" },
        { label: "", className: "w-12" },
      ]}
    >
      {list.map((file) => {
        const added = relativeTime(file.created_at);
        return (
          <LibraryRow key={file.id} onOpen={() => onOpenDetails?.(file.id)}>
            <LibraryNameCell
              icon={fileIcon(file)}
              name={file.name}
              detail={file.description ? plainText(file.description) : file.filename}
              onOpen={() => onOpenDetails?.(file.id)}
            />
            <LibraryCell className="max-lg:hidden">
              {searching ? (
                <span className="text-caption text-muted-foreground">
                  {file.folder_path || "Drive root"}
                </span>
              ) : (
                addedBy(file)
              )}
            </LibraryCell>
            <LibraryCell>
              <span className="tabular text-caption text-muted-foreground">
                {humanSize(file.size_bytes) || "—"}
              </span>
            </LibraryCell>
            <LibraryCell className="max-sm:hidden">
              <time
                dateTime={file.created_at}
                title={added.title}
                className="text-caption text-muted-foreground"
              >
                {added.relative}
              </time>
            </LibraryCell>
            <LibraryCell className="text-right">{fileMenu(file)}</LibraryCell>
          </LibraryRow>
        );
      })}
    </LibraryTable>
  );

  const list = files.data ?? [];
  const loading = files.isPending || folders.isPending;

  return (
    <div className="flex items-start gap-8">
      <NameDialog request={namePrompt} onClose={() => setNamePrompt(null)} />
      <aside className="sticky top-8 hidden w-56 shrink-0 flex-col gap-3 lg:flex">
        <div className="flex items-center justify-between gap-2">
          <span className="text-caption font-medium uppercase tracking-wide text-muted-foreground">
            Folders
          </span>
          <IconButton
            aria-label="New folder"
            variant="ghost"
            size="sm"
            onClick={createFolder}
          >
            <Folder className="size-3.5" />
          </IconButton>
        </div>
        {folders.isPending ? (
          <div className="flex flex-col gap-1.5">
            {Array.from({ length: 4 }, (_, index) => (
              <Skeleton key={index} className="h-7 w-full" />
            ))}
          </div>
        ) : (
          <FolderTree
            label="Drive folders"
            rootLabel="Drive"
            rootIcon={HardDrive}
            nodes={nodes}
            selectedId={folder || null}
            onSelectRoot={() => openFolder("")}
            onSelect={openFolder}
          />
        )}
      </aside>

      <div className="flex min-w-0 flex-1 flex-col gap-5">
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
          <nav aria-label="Drive path" className="flex flex-wrap items-center gap-1">
            <button
              type="button"
              onClick={() => openFolder("")}
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
                  onClick={() => openFolder(trail.slice(0, index + 1).join("/"))}
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
            "flex flex-col gap-5 rounded-lg border border-dashed border-transparent transition-colors",
            dragging && "border-accent bg-accent-subtle/20 p-2"
          )}
        >
          {loading ? (
            <div className="flex flex-col gap-2">
              {Array.from({ length: 4 }, (_, index) => (
                <Skeleton key={index} className="h-14 w-full" />
              ))}
            </div>
          ) : files.isError ? (
            <ErrorState error={files.error} onRetry={() => void files.refetch()} />
          ) : (
            <>
              {!searching && here.length > 0 ? (
                <section className="flex flex-col gap-3" aria-label="Folders here">
                  <LibrarySectionHeading>Folders</LibrarySectionHeading>
                  <FolderCardGrid
                    items={here.map((entry) => ({
                      id: entry.path,
                      label: entry.name,
                      countLabel: countLabel(countUnder(entry.path), "file"),
                    }))}
                    onOpen={openFolder}
                  />
                </section>
              ) : null}

              {list.length > 0 ? (
                <section className="flex flex-col gap-3" aria-label="Documents here">
                  <LibrarySectionHeading>Files</LibrarySectionHeading>
                  {fileRows(list)}
                </section>
              ) : null}

              {list.length === 0 && (searching || here.length === 0) ? (
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
    </div>
  );
}
