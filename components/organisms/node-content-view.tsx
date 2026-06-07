import { SectionLabel } from "@/components/atoms/section-label";
import type { NodeContent } from "@/lib/validators/node";
import type { Component as Comp } from "@/lib/validators/primitives";

/**
 * Organism (presentational, no client state): renders an expanded node's
 * engineering content. Shared by the planner inspector and the public share page.
 */

function ComponentTable({ title, items }: { title: string; items?: Comp[] }) {
  if (!items?.length) return null;
  return (
    <div>
      <SectionLabel>{title}</SectionLabel>
      <div className="mt-2 space-y-2">
        {items.map((c) => (
          <div
            key={c.name}
            className="rounded-md border border-white/10 bg-white/[0.02] p-2.5"
          >
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-medium">{c.name}</span>
              <span className="font-mono text-[11px] text-muted-foreground">
                {c.filePath}
              </span>
            </div>
            <p className="mt-1 text-xs text-muted-foreground">{c.purpose}</p>
            <p className="mt-1 text-[11px] text-primary/80">
              <span className="text-muted-foreground">why {c.atomicLevel}:</span>{" "}
              {c.reason}
            </p>
            {c.dependsOn?.length ? (
              <p className="mt-1 text-[11px] text-muted-foreground">
                depends on: {c.dependsOn.join(", ")}
              </p>
            ) : null}
          </div>
        ))}
      </div>
    </div>
  );
}

function Bullets({ title, items }: { title: string; items?: string[] }) {
  if (!items?.length) return null;
  return (
    <div>
      <SectionLabel>{title}</SectionLabel>
      <ul className="mt-2 space-y-1 text-sm text-muted-foreground">
        {items.map((x, i) => (
          <li key={i} className="flex gap-2">
            <span className="text-primary/60">•</span>
            <span>{x}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function NodeContentView({
  content,
}: {
  content: Partial<NodeContent>;
}) {
  const c = content;
  return (
    <div className="space-y-6">
      {c.purpose && (
        <div>
          <SectionLabel>Purpose</SectionLabel>
          <p className="mt-1.5 text-sm">{c.purpose}</p>
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        <Bullets title="Primary users" items={c.primaryUsers} />
        <Bullets title="Required data" items={c.requiredData} />
      </div>

      <ComponentTable title="Atoms" items={c.atoms} />
      <ComponentTable title="Molecules" items={c.molecules} />
      <ComponentTable title="Organisms" items={c.organisms} />
      <ComponentTable title="Templates" items={c.templates} />

      {c.hooks?.length ? (
        <div>
          <SectionLabel>Hooks</SectionLabel>
          <div className="mt-2 space-y-2">
            {c.hooks.map((h) => (
              <div key={h.name} className="rounded-md border border-white/10 bg-white/[0.02] p-2.5 text-sm">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-mono font-medium">{h.name}</span>
                  <span className="font-mono text-[11px] text-muted-foreground">{h.filePath}</span>
                </div>
                <p className="mt-1 text-xs text-muted-foreground">{h.purpose}</p>
                <p className="mt-1 text-[11px] text-muted-foreground">
                  in: <span className="text-foreground/80">{h.input}</span> · out:{" "}
                  <span className="text-foreground/80">{h.output}</span>
                </p>
              </div>
            ))}
          </div>
        </div>
      ) : null}

      {c.contexts?.length ? (
        <div>
          <SectionLabel>Contexts</SectionLabel>
          <div className="mt-2 space-y-2">
            {c.contexts.map((x) => (
              <div key={x.name} className="rounded-md border border-white/10 bg-white/[0.02] p-2.5 text-sm">
                <span className="font-medium">{x.name}</span>
                <p className="mt-1 text-xs text-muted-foreground">{x.responsibility}</p>
                {x.provides?.length ? (
                  <p className="mt-1 text-[11px] text-muted-foreground">provides: {x.provides.join(", ")}</p>
                ) : null}
              </div>
            ))}
          </div>
        </div>
      ) : null}

      {c.dataModels?.length ? (
        <div>
          <SectionLabel>Data shape</SectionLabel>
          <div className="mt-2 space-y-2">
            {c.dataModels.map((m) => (
              <div key={m.name} className="rounded-md border border-white/10 bg-white/[0.02] p-2.5">
                <span className="font-mono text-sm font-medium">{m.name}</span>
                <div className="mt-1.5 grid gap-1 text-[11px] font-mono text-muted-foreground">
                  {m.fields.map((f) => (
                    <div key={f.name}>
                      <span className="text-foreground/80">{f.name}</span>: {f.type}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : null}

      {c.mockData?.length ? (
        <div>
          <SectionLabel>Mock data</SectionLabel>
          <div className="mt-2 space-y-2">
            {c.mockData.map((m, i) => (
              <details key={i} className="rounded-md border border-white/10 bg-black/40">
                <summary className="cursor-pointer px-2.5 py-2 text-sm">{m.name}</summary>
                <pre className="overflow-x-auto px-2.5 pb-2.5 text-[11px] text-muted-foreground">
                  {JSON.stringify(m.sample, null, 2)}
                </pre>
              </details>
            ))}
          </div>
        </div>
      ) : null}

      {c.libraries?.length ? (
        <div>
          <SectionLabel>Libraries</SectionLabel>
          <div className="mt-2 flex flex-wrap gap-2">
            {c.libraries.map((l) => (
              <span key={l.name} className="rounded-full border border-white/10 bg-white/[0.03] px-2.5 py-1 text-xs" title={l.reason}>
                {l.name}
              </span>
            ))}
          </div>
        </div>
      ) : null}

      <Bullets title="Edge cases" items={c.edgeCases} />
      <Bullets title="Acceptance criteria" items={c.acceptanceCriteria} />
    </div>
  );
}
