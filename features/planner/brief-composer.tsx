"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Sparkles, Loader2 } from "lucide-react";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const EXAMPLES = [
  "Build a cloud console for managing Kubernetes workloads with teams, environments, deployments, logs, alerts, and billing",
  "Build a multi-tenant CRM with contacts, pipelines, and reports",
  "Build a customer support portal with tickets, knowledge base, and SLAs",
];

/**
 * Molecule: the natural-language brief input + framework picker that kicks off
 * plan generation, then navigates to the new planner workspace.
 */
export function BriefComposer() {
  const router = useRouter();
  const [brief, setBrief] = useState("");
  const [framework, setFramework] = useState("nextjs");
  const [pending, start] = useTransition();

  function generate() {
    if (brief.trim().length < 8) {
      toast.error("Describe the app in a bit more detail.");
      return;
    }
    start(async () => {
      try {
        const res = await fetch("/api/plans/generate", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ brief, targetFramework: framework }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error ?? "Generation failed");
        toast.success("Plan generated");
        router.push(`/plans/${data.planId}`);
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Generation failed");
      }
    });
  }

  return (
    <div className="rounded-xl border border-white/10 bg-card/60 p-4">
      <Textarea
        value={brief}
        onChange={(e) => setBrief(e.target.value)}
        placeholder="Describe the app you want to plan…"
        className="min-h-28 resize-none border-white/10 bg-black/40 text-sm"
        disabled={pending}
      />
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <Select value={framework} onValueChange={(v) => setFramework(v ?? "nextjs")} disabled={pending}>
          <SelectTrigger className="h-9 w-36 border-white/10 bg-black/40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="nextjs">Next.js</SelectItem>
            <SelectItem value="react">React</SelectItem>
            <SelectItem value="vue">Vue</SelectItem>
          </SelectContent>
        </Select>
        <Button onClick={generate} disabled={pending} className="ml-auto gap-2">
          {pending ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" /> Generating…
            </>
          ) : (
            <>
              <Sparkles className="h-4 w-4" /> Generate plan
            </>
          )}
        </Button>
      </div>
      <div className="mt-3 flex flex-wrap gap-2">
        {EXAMPLES.map((ex) => (
          <button
            key={ex}
            onClick={() => setBrief(ex)}
            disabled={pending}
            className="rounded-full border border-white/10 bg-white/[0.02] px-3 py-1 text-left text-xs text-muted-foreground hover:border-white/20 hover:text-foreground"
          >
            {ex.length > 52 ? ex.slice(0, 52) + "…" : ex}
          </button>
        ))}
      </div>
    </div>
  );
}
