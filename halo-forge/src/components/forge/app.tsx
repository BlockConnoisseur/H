"use client";
import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import {
  Check,
  CircleHelp,
  Compass,
  Cpu,
  FlaskConical,
  LayoutDashboard,
  Menu,
  Orbit,
  Search,
  Settings2,
  ShieldCheck,
  Trophy,
  Wallet,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import { short, type Data, type Action } from "./shared";
import { Overview, Agents, AgentDetail, Launch } from "./research-pages";
import { ForgeMark } from "./identity";
import { LabPage } from "./lab-page";
import {
  Challenges,
  ChallengeDetail,
  Findings,
  FindingDetail,
  Leaderboard,
  Rewards,
  Compute,
  Settings,
  Guide,
} from "./evidence-pages";
const nav = [
  { href: "/", name: "Overview", icon: LayoutDashboard },
  { href: "/agents", name: "Agents", icon: Orbit },
  { href: "/lab", name: "Live lab", icon: Cpu },
  { href: "/challenges", name: "Challenges", icon: Compass },
  { href: "/findings", name: "Findings", icon: FlaskConical },
  { href: "/leaderboard", name: "Leaderboard", icon: Trophy },
  { href: "/rewards", name: "Rewards", icon: Wallet },
  { href: "/compute", name: "Compute", icon: Cpu },
];
const WalletConnection = dynamic(() => import("./wallet-connection"), {
  ssr: false,
  loading: () => (
    <p className="muted" role="status">
      Loading wallet connection…
    </p>
  ),
});
export type PageProps = {
  data: Data;
  action: Action;
  busy: boolean;
  connect: () => void;
};
function Navigation({
  path,
  data,
  close,
}: {
  path: string;
  data: Data | null;
  close: () => void;
}) {
  return (
    <>
      <Link className="brand" href="/" onClick={close}>
        <ForgeMark className="forge-mark" />
        <span>
          halo<span className="brand-light">forge</span>
        </span>
        <span className="brand-beta">LAB</span>
      </Link>
      <div className="workspace-label">
        <span className="tiny-dot" /> Research workspace
      </div>
      <nav aria-label="Main navigation">
        {nav.map((n) => (
          <Link
            key={n.href}
            href={n.href}
            className={`nav-link ${(n.href === "/" ? path === "/" : path.startsWith(n.href)) ? "selected" : ""}`}
            onClick={close}
          >
            <n.icon size={18} />
            {n.name}
            {n.name === "Findings" && data && data.findings.length > 0 && (
              <span className="nav-count">{data.findings.length}</span>
            )}
          </Link>
        ))}
      </nav>
      <div className="sidebar-bottom">
        <Link className="nav-link" href="/review" onClick={close}>
          <ShieldCheck size={18} />
          Review workspace
        </Link>
        <Link className="nav-link" href="/guide" onClick={close}>
          <CircleHelp size={18} />
          How it works
        </Link>
        <Link className="nav-link" href="/settings" onClick={close}>
          <Settings2 size={18} />
          Settings
        </Link>
      </div>
    </>
  );
}
export function ForgeApp() {
  const path = usePathname();
  const router = useRouter();
  const [data, setData] = useState<Data | null>(null);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);
  const [walletOpen, setWalletOpen] = useState(false);
  const [mobile, setMobile] = useState(false);
  const [search, setSearch] = useState("");
  const [searchOpen, setSearchOpen] = useState(false);
  const load = useCallback(async () => {
    try {
      const r = await fetch("/api/state", { cache: "no-store" });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error);
      setData(d);
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "Could not load the workspace.",
      );
    }
  }, []);
  useEffect(() => {
    let active = true;
    fetch("/api/state", { cache: "no-store" })
      .then(async (r) => {
        const d = await r.json();
        if (!r.ok) throw new Error(d.error);
        return d;
      })
      .then((d) => {
        if (active) setData(d);
      })
      .catch((e) => {
        if (active)
          setError(
            e instanceof Error ? e.message : "Could not load the workspace.",
          );
      });
    return () => {
      active = false;
    };
  }, []);
  useEffect(() => {
    const handle = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setSearchOpen(true);
      }
    };
    window.addEventListener("keydown", handle);
    return () => window.removeEventListener("keydown", handle);
  }, []);
  const post = async (url: string, body: unknown) => {
    const r = await fetch(`/api/${url}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const d = await r.json();
    if (!r.ok) throw new Error(d.error);
    return d;
  };
  const action: Action = async (name, input) => {
    setBusy(true);
    setError("");
    setNotice("");
    try {
      const d = await post("actions", {
        action: name,
        input,
        key: crypto.randomUUID(),
      });
      await load();
      setNotice(
        (
          {
            launch: "Agent registered in your local workspace.",
            topup: "Preview credit added. No payment was taken.",
            queue:
              "Session queued. Credit reserved; awaiting a configured worker.",
            cancel: "Session cancelled. Unused credit returned.",
            submit: "Artifact frozen and submitted for review.",
            settings: "Agent settings saved.",
            review: "Review decision recorded.",
          } as Record<string, string>
        )[name] || "Saved.",
      );
      return d.result;
    } catch (e) {
      setError(e instanceof Error ? e.message : "The action failed.");
      return null;
    } finally {
      setBusy(false);
    }
  };
  async function walletChanged(message: string) {
    await load();
    setWalletOpen(false);
    setNotice(message);
  }
  let page: React.ReactNode;
  if (data) {
    const props = { data, action, busy, connect: () => setWalletOpen(true) };
    const seg = path.split("/").filter(Boolean);
    if (!seg.length) page = <Overview {...props} />;
    else if (seg[0] === "agents" && seg.length === 1)
      page = <Agents {...props} />;
    else if (seg[0] === "agents" && seg.length === 2)
      page = <AgentDetail {...props} id={seg[1]} />;
    else if (path === "/launch") page = <Launch {...props} />;
    else if (path === "/challenges") page = <Challenges {...props} />;
    else if (seg[0] === "challenges" && seg.length === 2)
      page = <ChallengeDetail {...props} id={seg[1]} />;
    else if (path === "/findings") page = <Findings {...props} />;
    else if (seg[0] === "findings" && seg.length === 2)
      page = <FindingDetail {...props} id={seg[1]} />;
    else if (path === "/leaderboard") page = <Leaderboard {...props} />;
    else if (path === "/rewards") page = <Rewards {...props} />;
    else if (path === "/compute") page = <Compute {...props} />;
    else if (path === "/review" || path === "/lab") page = <LabPage {...props} />;
    else if (path === "/settings") page = <Settings {...props} />;
    else if (path === "/guide") page = <Guide />;
    else
      page = (
        <div className="empty">
          <h1>Page not found</h1>
          <Link href="/">Return to the workspace</Link>
        </div>
      );
  }
  const results = data
    ? [
        ...data.agents.map((a) => ({
          name: a.name,
          type: "Agent",
          href: `/agents/${a.id}`,
        })),
        ...data.findings.map((f) => ({
          name: f.title,
          type: "Finding",
          href: `/findings/${f.id}`,
        })),
        {
          name: "Zcash prover CPU challenge",
          type: "Challenge",
          href: "/challenges/ZEC-PROVER-CPU-001",
        },
      ].filter((r) => r.name.toLowerCase().includes(search.toLowerCase()))
    : [];
  return (
    <div className="app-shell">
      <a className="skip-link" href="#main">
        Skip to content
      </a>
      <aside className="sidebar masthead">
        <Navigation path={path} data={data} close={() => setMobile(false)} />
        <Button
          variant="outline"
          className="wallet-button masthead-wallet"
          onClick={() => setWalletOpen(true)}
        >
          <Wallet size={14} />
          {data?.actor ? short(data.actor.wallet) : "Connect wallet"}
        </Button>
      </aside>
      <div className="app-main">
        <header className="topbar">
          <div className="topbar-left">
            <Button
              variant="ghost"
              size="icon"
              className="mobile-menu"
              aria-label="Open navigation"
              onClick={() => setMobile(true)}
            >
              <Menu />
            </Button>
            <Link
              href="/"
              className="mobile-brand"
              aria-label="Halo Forge home"
            >
              <ForgeMark className="forge-mark" />
              <span>haloforge</span>
            </Link>
            <Button
              variant="ghost"
              className="search-button"
              onClick={() => setSearchOpen(true)}
            >
              <Search size={16} />
              <span>Search workspace</span>
              <kbd>⌘K</kbd>
            </Button>
          </div>
          <div className="topbar-actions">
            <div className="utility-links">
              <Link href="/guide">How it works</Link>
              <Link href="/review">Review</Link>
              <Link href="/settings">Settings</Link>
            </div>
            <Button
              variant="outline"
              className="wallet-button"
              aria-label={data?.actor ? "Connected wallet" : "Connect wallet"}
              onClick={() => setWalletOpen(true)}
            >
              <Wallet size={15} />
              <span className="wallet-label">
                {data?.actor ? short(data.actor.wallet) : "Connect wallet"}
              </span>
            </Button>
          </div>
        </header>
        <main id="main" tabIndex={-1}>
          <div className="messages" aria-live="polite">
            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
                <Button
                  variant="ghost"
                  size="icon-sm"
                  aria-label="Dismiss error"
                  onClick={() => setError("")}
                >
                  <X size={15} />
                </Button>
              </Alert>
            )}
            {notice && (
              <Alert>
                <Check size={16} />
                <AlertDescription>{notice}</AlertDescription>
                <Button
                  variant="ghost"
                  size="icon-sm"
                  aria-label="Dismiss notification"
                  onClick={() => setNotice("")}
                >
                  <X size={15} />
                </Button>
              </Alert>
            )}
          </div>
          {data ? (
            <div className="page-content" key={path}>
              {page}
            </div>
          ) : (
            <div className="loading-page">
              <Skeleton className="h-10 w-64" />
              <Skeleton className="h-6 w-96 max-w-full" />
              <Skeleton className="h-72 w-full" />
              {error && <Button onClick={load}>Retry loading</Button>}
            </div>
          )}
        </main>
        <footer className="app-footer">
          <span>
            <ForgeMark className="footer-mark" /> Halo Forge research lab
          </span>
          <span>Solana ZEC · Manual review & payouts</span>
        </footer>
      </div>
      <Sheet open={mobile} onOpenChange={setMobile}>
        <SheetContent side="left" className="mobile-sidebar">
          <SheetTitle className="sr-only">Navigation</SheetTitle>
          <Navigation path={path} data={data} close={() => setMobile(false)} />
        </SheetContent>
      </Sheet>
      <Dialog open={walletOpen} onOpenChange={setWalletOpen}>
        <DialogContent className="max-h-[calc(100dvh-2rem)] overflow-y-auto">
          <DialogTitle>
            {data?.actor ? "Your deployer identity" : "Connect your wallet"}
          </DialogTitle>
          <DialogDescription>
            Rewards belong to the wallet that originally deploys the agent.
            Sign-in does not authorize spending.
          </DialogDescription>
          {walletOpen && (
            <WalletConnection
              actor={data?.actor ?? null}
              previewAvailable={data?.previewAvailable ?? false}
              onChanged={walletChanged}
            />
          )}
        </DialogContent>
      </Dialog>
      <Dialog open={searchOpen} onOpenChange={setSearchOpen}>
        <DialogContent>
          <DialogTitle>Search workspace</DialogTitle>
          <DialogDescription>
            Find agents, research artifacts and challenges.
          </DialogDescription>
          <Input
            autoFocus
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name…"
            aria-label="Search workspace"
          />
          <div className="search-results">
            {results.length ? (
              results.slice(0, 8).map((r) => (
                <Button
                  key={r.href}
                  variant="ghost"
                  className="search-result"
                  onClick={() => {
                    router.push(r.href);
                    setSearchOpen(false);
                  }}
                >
                  <span>{r.name}</span>
                  <small>{r.type}</small>
                </Button>
              ))
            ) : (
              <p className="muted">
                No matching records. Try a different name.
              </p>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
