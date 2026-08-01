"use client";

import { useRef, useState } from "react";
import { FileText, FileUp, Upload, Braces, X } from "lucide-react";
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
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
  Textarea,
} from "@elliptic/ui";
import { cn } from "@elliptic/ui";
import { useImportMeeting } from "@/hooks/use-meeting-queries";
import { parseTranscript } from "./parse-transcript";

type Method = "transcript" | "json" | "file";

const helperText: Record<Method, string> = {
  transcript: 'Lines like "Alex: let us ship it" become speaker segments. Everything else is kept verbatim.',
  json: "Paste the raw export from the Folio recorder. We validate the JSON before importing.",
  file: "Drop a .txt, .md, .vtt, or .srt transcript, or a .json Folio export.",
};

export function ImportMeetingDialog({
  orgId,
  open: controlledOpen,
  onOpenChange: controlledOnOpenChange,
}: {
  orgId: string;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}) {
  const [uncontrolledOpen, setUncontrolledOpen] = useState(false);
  const open = controlledOpen ?? uncontrolledOpen;
  const setOpen = controlledOnOpenChange ?? setUncontrolledOpen;
  const [method, setMethod] = useState<Method>("transcript");

  const [transcriptTitle, setTranscriptTitle] = useState("");
  const [transcriptText, setTranscriptText] = useState("");

  const [json, setJson] = useState("");

  const [fileTitle, setFileTitle] = useState("");
  const [fileName, setFileName] = useState<string | null>(null);
  const [fileContent, setFileContent] = useState<string | null>(null);
  const [fileIsJson, setFileIsJson] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [error, setError] = useState<string | null>(null);
  const importMeeting = useImportMeeting(orgId);

  const reset = () => {
    setMethod("transcript");
    setTranscriptTitle("");
    setTranscriptText("");
    setJson("");
    setFileTitle("");
    setFileName(null);
    setFileContent(null);
    setFileIsJson(false);
    setError(null);
  };

  const onOpenChange = (next: boolean) => {
    setOpen(next);
    if (!next) {
      reset();
    }
  };

  const send = (payload: unknown) => {
    importMeeting.mutate(payload, {
      onSuccess: () => onOpenChange(false),
    });
  };

  const submit = () => {
    setError(null);

    if (method === "transcript") {
      if (transcriptTitle.trim().length === 0) {
        setError("Add a title for this meeting.");
        return;
      }
      if (transcriptText.trim().length === 0) {
        setError("Paste the transcript text to import.");
        return;
      }
      send(parseTranscript(transcriptTitle, transcriptText));
      return;
    }

    if (method === "json") {
      let parsed: unknown;
      try {
        parsed = JSON.parse(json);
      } catch {
        setError("Not valid JSON. Paste the raw Folio export.");
        return;
      }
      send(parsed);
      return;
    }

    if (fileContent === null) {
      setError("Choose a file to import.");
      return;
    }
    if (fileIsJson) {
      let parsed: unknown;
      try {
        parsed = JSON.parse(fileContent);
      } catch {
        setError("That .json file is not valid Folio JSON.");
        return;
      }
      send(parsed);
      return;
    }
    const title = fileTitle.trim().length > 0 ? fileTitle : (fileName ?? "Imported meeting");
    send(parseTranscript(title, fileContent));
  };

  const onFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setError(null);
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }
    const isJson = file.name.toLowerCase().endsWith(".json");
    const reader = new FileReader();
    reader.onload = () => {
      setFileName(file.name);
      setFileContent(typeof reader.result === "string" ? reader.result : "");
      setFileIsJson(isJson);
      if (!isJson && fileTitle.trim().length === 0) {
        setFileTitle(file.name.replace(/\.[^.]+$/, ""));
      }
    };
    reader.onerror = () => setError("Could not read that file. Try again.");
    reader.readAsText(file);
  };

  const clearFile = () => {
    setFileName(null);
    setFileContent(null);
    setFileIsJson(false);
    setFileTitle("");
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const submitDisabled =
    (method === "transcript" &&
      (transcriptTitle.trim().length === 0 || transcriptText.trim().length === 0)) ||
    (method === "json" && json.trim().length === 0) ||
    (method === "file" && fileContent === null);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTrigger asChild>
        <Button size="sm">
          <Upload className="size-4" />
          Import meeting
        </Button>
      </DialogTrigger>
      <DialogContent size="lg">
        <DialogHeader>
          <DialogTitle className="font-display">Import a meeting</DialogTitle>
          <DialogDescription className="text-small">
            Bring a transcript into this organization. Pick the source you have.
          </DialogDescription>
        </DialogHeader>

        <Tabs
          value={method}
          onValueChange={(value) => {
            setMethod(value as Method);
            setError(null);
          }}
        >
          <TabsList>
            <TabsTrigger value="transcript">
              <FileText className="size-4" />
              Paste transcript
            </TabsTrigger>
            <TabsTrigger value="json">
              <Braces className="size-4" />
              Folio JSON
            </TabsTrigger>
            <TabsTrigger value="file">
              <FileUp className="size-4" />
              Upload file
            </TabsTrigger>
          </TabsList>

          <TabsContent value="transcript" className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="transcript-title">Title</Label>
              <Input
                id="transcript-title"
                placeholder="Weekly sync"
                value={transcriptTitle}
                onChange={(event) => setTranscriptTitle(event.target.value)}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="transcript-text">Transcript</Label>
              <Textarea
                id="transcript-text"
                rows={10}
                placeholder={"Alex: Let us start with the roadmap.\nJordan: Shipping Friday.\nOpen question on pricing."}
                value={transcriptText}
                onChange={(event) => setTranscriptText(event.target.value)}
              />
              <p className="text-caption text-muted-foreground">{helperText.transcript}</p>
            </div>
          </TabsContent>

          <TabsContent value="json" className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="folio-json">Folio JSON</Label>
              <Textarea
                id="folio-json"
                rows={11}
                placeholder={'{"title": "Weekly sync", "started_at": "2026-06-11T15:00:00Z", "segments": [...]}'}
                value={json}
                onChange={(event) => setJson(event.target.value)}
                className="font-mono text-caption"
                aria-invalid={error && method === "json" ? true : undefined}
              />
              <p className="text-caption text-muted-foreground">{helperText.json}</p>
            </div>
          </TabsContent>

          <TabsContent value="file" className="flex flex-col gap-4">
            <input
              ref={fileInputRef}
              type="file"
              accept=".txt,.md,.vtt,.srt,.json"
              onChange={onFileChange}
              className="sr-only"
              id="transcript-file"
            />
            {fileName === null ? (
              <Label
                htmlFor="transcript-file"
                className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-border bg-muted/30 px-6 py-12 text-center transition-colors duration-150 hover:border-border-strong hover:bg-muted/50"
              >
                <span className="flex size-11 items-center justify-center rounded-lg border border-border bg-surface text-muted-foreground [&_svg]:size-5">
                  <FileUp className="size-5" />
                </span>
                <span className="text-small font-medium text-foreground">Choose a file</span>
                <span className="text-caption text-muted-foreground">{helperText.file}</span>
              </Label>
            ) : (
              <div className="flex flex-col gap-4">
                <div className="flex items-center gap-3 rounded-md border border-border bg-surface px-3 py-2.5">
                  <FileText className="size-4 shrink-0 text-muted-foreground" />
                  <span className="flex-1 truncate font-mono text-small text-foreground">
                    {fileName}
                  </span>
                  <button
                    type="button"
                    onClick={clearFile}
                    aria-label="Remove file"
                    className={cn(
                      "flex size-6 items-center justify-center rounded-sm text-muted-foreground transition-colors duration-150",
                      "hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/30"
                    )}
                  >
                    <X className="size-4" />
                  </button>
                </div>
                {!fileIsJson ? (
                  <div className="flex flex-col gap-1.5">
                    <Label htmlFor="file-title">Title</Label>
                    <Input
                      id="file-title"
                      placeholder="Weekly sync"
                      value={fileTitle}
                      onChange={(event) => setFileTitle(event.target.value)}
                    />
                  </div>
                ) : (
                  <p className="text-caption text-muted-foreground">
                    Folio JSON export detected. Title comes from the file.
                  </p>
                )}
              </div>
            )}
          </TabsContent>
        </Tabs>

        {error ? <p className="text-small text-danger">{error}</p> : null}

        <DialogFooter>
          <Button onClick={submit} loading={importMeeting.isPending} disabled={submitDisabled}>
            Import meeting
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
