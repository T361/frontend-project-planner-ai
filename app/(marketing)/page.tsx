import Link from "next/link";
import { ArrowRight, GitBranch, Layers, ShieldCheck, Sparkles, Zap, FileJson } from "lucide-react";
import { Logo } from "@/components/atoms/logo";
import { SectionLabel } from "@/components/atoms/section-label";
import { HeroBackground } from "@/components/organisms/hero-background";
import { SignInButton } from "@/features/auth/sign-in-button";
import { UserMenu } from "@/features/auth/user-menu";
import { Button } from "@/components/ui/button";
import { getAuth } from "@/lib/auth";

const FEATURES = [
  { icon: GitBranch, title: "Route-first plan tree", body: "Start at pages, not pixels. Every route ships with purpose, users, and the data it touches.", span: "md:col-span-2" },
  { icon: Zap, title: "Lazy generation", body: "We don't burn tokens generating the universe. Expand a node and only then does it get decomposed.", span: "" },
  { icon: Layers, title: "Real atomic decomposition", body: "Atoms → molecules → organisms, each with a file path and a reason it sits at that level.", span: "" },
  { icon: Sparkles, title: "Coherence checks", body: "Regenerate one node and dependents get flagged stale — the plan doesn't silently rot.", span: "md:col-span-2" },
  { icon: FileJson, title: "Exports that ship", body: "Markdown spec, JSON plan, and a paste-ready scaffolding prompt for Claude Code / Cursor.", span: "md:col-span-2" },
  { icon: ShieldCheck, title: "Owner-scoped by RLS", body: "Google sign-in only. Every row is locked to its owner in Postgres — never bypassed from the client.", span: "" },
];

export default async function MarketingPage() {
  const { user } = await getAuth();

  return (
    <main className="relative flex-1">
      {/* Header */}
      <header className="glass sticky top-0 z-40 border-b border-white/10">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-5">
          <Logo />
          <nav className="hidden items-center gap-7 text-sm text-muted-foreground md:flex">
            <a href="#features" className="hover:text-foreground">Platform</a>
            <a href="#how" className="hover:text-foreground">How it works</a>
            <Link href="/share/sample" className="hover:text-foreground">Sample plan</Link>
          </nav>
          {user ? (
            <UserMenu
              email={user.email ?? ""}
              name={user.user_metadata?.full_name}
              avatarUrl={user.user_metadata?.avatar_url}
            />
          ) : (
            <SignInButton />
          )}
        </div>
      </header>

      {/* Hero */}
      <section className="relative isolate overflow-hidden">
        <div className="absolute inset-0 grid-bg" />
        <HeroBackground />
        <div className="relative mx-auto max-w-4xl px-5 pb-28 pt-24 text-center md:pt-32">
          <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.03] px-3 py-1 text-xs text-muted-foreground">
            <span className="h-1.5 w-1.5 rounded-full bg-primary shadow-[0_0_8px] shadow-primary" />
            AI-augmented frontend planning
          </span>
          <h1 className="mt-6 text-balance text-4xl font-semibold tracking-tight md:text-6xl">
            Plan frontend systems <br className="hidden md:block" />
            before you build them.
          </h1>
          <p className="mx-auto mt-5 max-w-2xl text-balance text-base text-muted-foreground md:text-lg">
            Convert vague product briefs into drillable, editable, atomic frontend
            implementation trees an engineer — or an agent — can start from.
          </p>
          <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
            {user ? (
              <Button render={<Link href="/dashboard" />} size="lg" className="gap-2">
                Open dashboard <ArrowRight className="h-4 w-4" />
              </Button>
            ) : (
              <SignInButton label="Start planning with Google" />
            )}
            <Button render={<Link href="/share/sample" />} size="lg" variant="outline">
              View a sample plan
            </Button>
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="mx-auto max-w-6xl px-5 py-20">
        <SectionLabel>The platform</SectionLabel>
        <h2 className="mt-2 max-w-2xl text-balance text-2xl font-semibold tracking-tight md:text-3xl">
          A planning console, not a chat that forgets.
        </h2>
        <div className="mt-10 grid gap-4 md:grid-cols-3">
          {FEATURES.map((f) => (
            <div
              key={f.title}
              className={`rounded-xl border border-white/10 bg-card/60 p-5 transition-colors hover:border-white/20 ${f.span}`}
            >
              <f.icon className="h-5 w-5 text-primary" />
              <h3 className="mt-3 font-medium">{f.title}</h3>
              <p className="mt-1.5 text-sm text-muted-foreground">{f.body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* How it works */}
      <section id="how" className="mx-auto max-w-6xl px-5 pb-24">
        <div className="grid gap-4 md:grid-cols-4">
          {[
            ["01", "Describe the app", "One sentence is enough. “Build a cloud console for K8s workloads.”"],
            ["02", "Get a route tree", "Pages, global data models, contexts and risks — generated, not guessed."],
            ["03", "Drill in", "Expand any page into atoms, hooks, contexts, data shape and mock data."],
            ["04", "Edit & export", "Accept, reject, regenerate, then export a spec or an agent scaffold prompt."],
          ].map(([n, t, b]) => (
            <div key={n} className="rounded-xl border border-white/10 bg-card/40 p-5">
              <span className="font-mono text-sm text-primary">{n}</span>
              <h3 className="mt-2 font-medium">{t}</h3>
              <p className="mt-1.5 text-sm text-muted-foreground">{b}</p>
            </div>
          ))}
        </div>
      </section>

      <footer className="border-t border-white/10">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-3 px-5 py-8 text-sm text-muted-foreground md:flex-row">
          <Logo className="text-sm" />
          <p>Built by Taimoor Shaukat · Next.js · Supabase · Groq</p>
        </div>
      </footer>
    </main>
  );
}
