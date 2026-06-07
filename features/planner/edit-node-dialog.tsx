"use client";

import { useState } from "react";
import { Loader2, Save } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import type { ClientNode } from "./types";

export type NodeEdit = {
  title: string;
  routePath: string;
  purpose: string;
};

/** Molecule: structured edit of a node's headline fields. */
export function EditNodeDialog({
  node,
  open,
  onOpenChange,
  onConfirm,
  pending,
}: {
  node: ClientNode | null;
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onConfirm: (edit: NodeEdit) => void;
  pending: boolean;
}) {
  const [title, setTitle] = useState("");
  const [routePath, setRoutePath] = useState("");
  const [purpose, setPurpose] = useState("");

  // Sync local state when the dialog opens for a node.
  function onChange(v: boolean) {
    if (v && node) {
      setTitle(node.title);
      setRoutePath(node.route_path ?? "");
      setPurpose((node.content?.purpose as string) ?? "");
    }
    onOpenChange(v);
  }

  return (
    <Dialog open={open} onOpenChange={onChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit node</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label htmlFor="t">Title</Label>
            <Input id="t" value={title} onChange={(e) => setTitle(e.target.value)} className="border-white/10 bg-black/40" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="r">Route path</Label>
            <Input id="r" value={routePath} onChange={(e) => setRoutePath(e.target.value)} className="border-white/10 bg-black/40 font-mono" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="p">Purpose</Label>
            <Textarea id="p" value={purpose} onChange={(e) => setPurpose(e.target.value)} className="min-h-24 border-white/10 bg-black/40" />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onChange(false)} disabled={pending}>
            Cancel
          </Button>
          <Button onClick={() => onConfirm({ title, routePath, purpose })} disabled={pending} className="gap-2">
            {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
