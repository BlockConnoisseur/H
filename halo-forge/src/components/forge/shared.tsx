"use client";
import Link from "next/link";
import Image from "next/image";
import { ArrowUpRight, FlaskConical, LoaderCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import type {
  Agent,
  Award,
  Finding,
  Run,
  Entry,
  Audit,
  Actor,
} from "@/lib/domain";
export type Data = {
  actor: Actor | null;
  agents: Agent[];
  runs: Run[];
  findings: Finding[];
  awards: Award[];
  ledger: Entry[];
  audit: Audit[];
  ranking: { finding: Finding; rank: number; amount: string }[];
  tracks: {
    id: string;
    name: string;
    short: string;
    target: string;
    description: string;
  }[];
  zecMint: string;
  previewAvailable: boolean;
  mode: string;
  storage: "sqlite" | "postgres";
  liveReady: boolean;
  prizeActual: string;
  prizeExample: string;
  version: number;
};
export type Action = (
  name: string,
  input: Record<string, unknown>,
) => Promise<{ id?: string; balance?: number } | null>;
export const money = (cents: number) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(
    cents / 100,
  );
export const short = (s: string) =>
  s.length > 20 ? `${s.slice(0, 5)}…${s.slice(-5)}` : s;
export const date = (s: string) =>
  new Date(s).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  });
export function LinkButton({
  href,
  children,
  variant = "default",
}: {
  href: string;
  children: React.ReactNode;
  variant?: "default" | "outline" | "ghost";
}) {
  return (
    <Button
      render={<Link href={href} />}
      nativeButton={false}
      variant={variant}
      className="h-10 px-4"
    >
      {children}
    </Button>
  );
}
export function Status({ value }: { value: string }) {
  const good = [
    "ready",
    "qualified",
    "completed",
    "Silver",
    "Gold",
    "Bronze",
    "Platinum",
  ].includes(value);
  return (
    <Badge variant="outline" className={`status ${good ? "status-good" : ""}`}>
      <span className="status-dot" />
      {value === "running" ? "Awaiting worker" : value.replaceAll("_", " ")}
    </Badge>
  );
}
export function Heading({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children?: React.ReactNode;
}) {
  return (
    <div className="page-heading">
      <div>
        <h1>{title}</h1>
        <p>{description}</p>
      </div>
      {children && <div className="heading-actions">{children}</div>}
    </div>
  );
}
export function Panel({
  title,
  description,
  action,
  children,
  className = "",
}: {
  title?: string;
  description?: string;
  action?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section className={`panel ${className}`}>
      {title && (
        <div className="panel-heading">
          <div>
            <h2>{title}</h2>
            {description && <p>{description}</p>}
          </div>
          {action}
        </div>
      )}
      {children}
    </section>
  );
}
export function Empty({
  title,
  description,
  action,
}: {
  title: string;
  description: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="empty">
      <FlaskConical size={26} />
      <h3>{title}</h3>
      <p>{description}</p>
      {action}
    </div>
  );
}
export function Field({
  label,
  id,
  hint,
  children,
}: {
  label: string;
  id: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="field">
      <Label htmlFor={id}>{label}</Label>
      {children}
      {hint && (
        <p className="field-hint" id={`${id}-hint`}>
          {hint}
        </p>
      )}
    </div>
  );
}
export function Filter({
  value,
  onChange,
  options,
  label,
}: {
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
  label: string;
}) {
  return (
    <Select value={value} onValueChange={(v) => v && onChange(v)}>
      <SelectTrigger aria-label={label} className="filter-select h-10">
        <SelectValue>
          {options.find((o) => o.value === value)?.label}
        </SelectValue>
      </SelectTrigger>
      <SelectContent>
        {options.map((o) => (
          <SelectItem key={o.value} value={o.value}>
            {o.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
export function Submit({
  busy,
  children,
  disabled = false,
}: {
  busy: boolean;
  children: React.ReactNode;
  disabled?: boolean;
}) {
  return (
    <Button type="submit" disabled={busy || disabled} className="h-11 px-5">
      {busy && <LoaderCircle className="animate-spin" size={16} />} {children}
    </Button>
  );
}
export function TextLink({
  href,
  children,
}: {
  href: string;
  children: React.ReactNode;
}) {
  return (
    <Link className="text-link" href={href}>
      {children}
      <ArrowUpRight size={14} />
    </Link>
  );
}
export function AgentMark({
  track,
  image,
}: {
  track: string;
  image?: string | null;
}) {
  return (
    <span className={`agent-mark mark-${track}`} aria-hidden="true">
      {image ? (
        <Image
          src={image}
          alt=""
          width={64}
          height={64}
          unoptimized
          className="agent-pfp"
        />
      ) : (
        track
      )}
    </span>
  );
}
export function PreviewNote({ children }: { children?: React.ReactNode }) {
  return (
    <div className="inline-note">
      <FlaskConical size={15} />
      <span>
        {children ||
          "Local preview. Examples are illustrative; no funds move and no tokens are minted."}
      </span>
    </div>
  );
}
