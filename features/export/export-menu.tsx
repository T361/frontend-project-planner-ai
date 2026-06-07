"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Download, FileJson, FileText, Bot, Share2, Loader2 } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";

/** Molecule: all the ways a plan leaves the app — md / json / agent prompt / share. */
export function ExportMenu({ planId }: { planId: string }) {
  const [busy, setBusy] = useState(false);
  const [agentPrompt, setAgentPrompt] = useState<string | null>(null);
  const [shareUrl, setShareUrl] = useState<string | null>(null);

  function download(kind: "markdown" | "json") {
    window.open(`/api/plans/${planId}/export/${kind}`, "_blank");
  }

  async function copyAgentPrompt() {
    setBusy(true);
    try {
      const res = await fetch(`/api/plans/${planId}/agent-prompt`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setAgentPrompt(data.prompt);
      await navigator.clipboard.writeText(data.prompt).catch(() => {});
      toast.success("Agent prompt copied to clipboard");
    } catch {
      toast.error("Could not build agent prompt");
    } finally {
      setBusy(false);
    }
  }

  async function createShare() {
    setBusy(true);
    try {
      const res = await fetch(`/api/plans/${planId}/share`, { method: "POST", body: "{}" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setShareUrl(data.url);
      await navigator.clipboard.writeText(data.url).catch(() => {});
      toast.success("Read-only share link copied");
    } catch {
      toast.error("Could not create share link");
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger
          render={<Button variant="outline" size="sm" className="gap-2" disabled={busy} />}
        >
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
          Export
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56">
          <DropdownMenuItem onClick={() => download("markdown")}>
            <FileText className="mr-2 h-4 w-4" /> Markdown spec
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => download("json")}>
            <FileJson className="mr-2 h-4 w-4" /> JSON plan
          </DropdownMenuItem>
          <DropdownMenuItem onClick={copyAgentPrompt}>
            <Bot className="mr-2 h-4 w-4" /> Agent scaffold prompt
          </DropdownMenuItem>
          <DropdownMenuItem onClick={createShare}>
            <Share2 className="mr-2 h-4 w-4" /> Read-only share link
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <Dialog open={!!agentPrompt} onOpenChange={(v) => !v && setAgentPrompt(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Agent scaffolding prompt</DialogTitle>
            <DialogDescription>
              Copied to your clipboard — paste into Claude Code or Cursor to scaffold the project.
            </DialogDescription>
          </DialogHeader>
          <Textarea readOnly value={agentPrompt ?? ""} className="min-h-[50vh] border-white/10 bg-black/40 font-mono text-xs" />
        </DialogContent>
      </Dialog>

      <Dialog open={!!shareUrl} onOpenChange={(v) => !v && setShareUrl(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Read-only share link</DialogTitle>
            <DialogDescription>Anyone with this link can view (not edit) the plan.</DialogDescription>
          </DialogHeader>
          <div className="flex gap-2">
            <input readOnly value={shareUrl ?? ""} className="flex-1 rounded-md border border-white/10 bg-black/40 px-3 py-2 font-mono text-xs" />
            <Button size="sm" onClick={() => { navigator.clipboard.writeText(shareUrl ?? ""); toast.success("Copied"); }}>
              Copy
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
