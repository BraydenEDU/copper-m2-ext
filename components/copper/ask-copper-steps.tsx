"use client";

// The stations Ask Copper draws for one answer: the tools on offer, the
// thinking, each tool call (what Copper sent and what came back), and the
// reply. Reads from progress.ts only, never from tools.ts.
import { Brain, TriangleAlert, Wrench } from "lucide-react";
import type { ReactNode } from "react";
import { Spinner } from "@/components/ui/spinner";
import { cn } from "cn";
import type { Progress, ToolStep } from "@/lib/copper/assistant/progress";
import { TOOL_LABELS } from "@/lib/copper/assistant/progress";
import { formatUsd } from "@/lib/copper/catalog";

const PRODUCT_NAMES: Record<string, string> = {
  "copper-home": "Copper Home",
  "copper-notes": "Copper Notes",
};
const PLAN_NAMES: Record<string, string> = {
  free: "Free",
  "copper-plus": "Copper Plus",
};

const label = "text-xs font-semibold tracking-wider uppercase";

type Rec = Record<string, unknown>;
const asRecord = (value: unknown): Rec => {
  let v = value;
  if (typeof v === "string") {
    try {
      v = JSON.parse(v);
    } catch {
      return {};
    }
  }
  return v && typeof v === "object" ? (v as Rec) : {};
};

function Station({
  node,
  title,
  children,
}: {
  node: ReactNode;
  title?: ReactNode;
  children?: ReactNode;
}) {
  return (
    <div className="relative pb-4 pl-10">
      <span className="absolute top-0 left-0 grid size-7 place-items-center rounded-full ring-4 ring-secondary">
        {node}
      </span>
      {title && <p className={cn(label, "pt-1.5")}>{title}</p>}
      {children}
    </div>
  );
}

const Node = ({
  className,
  children,
}: {
  className: string;
  children?: ReactNode;
}) => (
  <span
    className={cn("grid size-7 place-items-center rounded-full", className)}
  >
    {children}
  </span>
);

/** Renders the **bold** and `code` marks Gemini's summaries come with. */
function Markdown({ text }: { text: string }) {
  return (
    <>
      {text.split(/(\*\*[^*]+\*\*|`[^`]+`)/).map((piece, i) =>
        piece.startsWith("**") && piece.endsWith("**") && piece.length > 4 ? (
          <strong key={i}>{piece.slice(2, -2)}</strong>
        ) : piece.startsWith("`") && piece.endsWith("`") && piece.length > 2 ? (
          <code key={i} className="font-mono">
            {piece.slice(1, -1)}
          </code>
        ) : (
          <span key={i}>{piece}</span>
        ),
      )}
    </>
  );
}

function Row({ name, value }: { name: string; value: ReactNode }) {
  return (
    <div className="flex gap-3 text-sm">
      <span className="text-muted-foreground w-16 shrink-0">{name}</span>
      <span>{value}</span>
    </div>
  );
}

function SentInput({ step }: { step: ToolStep }) {
  if (step.name === "get_prices")
    return <p className="text-sm">Nothing, it just asked for the price list</p>;
  if (step.name === "get_products")
    return <p className="text-sm">Nothing, it just asked what Copper sells</p>;
  if (step.input === undefined)
    return (
      <p className="text-muted-foreground text-sm">filling in the details…</p>
    );
  const input = asRecord(step.input);
  if (step.name === "calculate_cost") {
    const products = Array.isArray(input.products) ? input.products : [];
    return (
      <div className="space-y-0.5">
        <Row
          name="Products"
          value={
            products.length
              ? products
                  .map((p) => PRODUCT_NAMES[String(p)] ?? String(p))
                  .join(", ")
              : "None"
          }
        />
        <Row
          name="Plan"
          value={PLAN_NAMES[String(input.plan)] ?? String(input.plan)}
        />
        <Row name="Billing" value={String(input.billing)} />
        <Row name="Years" value={String(input.years)} />
      </div>
    );
  }
  if (step.name === "compare_products") {
    const products = Array.isArray(input.products) ? input.products : [];
    return (
      <Row
        name="Products"
        value={products
          .map((p) => PRODUCT_NAMES[String(p)] ?? String(p))
          .join(" vs ")}
      />
    );
  }
  return (
    <div className="space-y-0.5">
      <Row
        name="Product"
        value={PRODUCT_NAMES[String(input.product)] ?? String(input.product)}
      />
      <Row
        name="Color"
        value={input.color ? String(input.color) : "All colors"}
      />
    </div>
  );
}

const pill = "rounded-full px-2 py-0.5 text-xs font-medium";

function restockLabel(date: string) {
  const parsed = new Date(`${date}T00:00:00Z`);
  return Number.isNaN(parsed.getTime())
    ? date
    : parsed.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
        timeZone: "UTC",
      });
}

function Result({ step }: { step: ToolStep }) {
  if (step.state === "calling")
    return (
      <p className="text-muted-foreground flex items-center gap-2 text-sm">
        <Spinner /> the app is running the code…
      </p>
    );
  if (step.state === "error" || typeof step.output === "string")
    return <p className="text-sm">{String(step.output)}</p>;
  const out = asRecord(step.output);

  if (step.name === "calculate_cost") {
    const lines = (Array.isArray(out.lines) ? out.lines : []) as Rec[];
    return (
      <div className="space-y-0.5">
        {lines.map((line, i) => (
          <div key={i} className="flex justify-between gap-3 text-sm">
            <span>{String(line.item)}</span>
            <span>{formatUsd(Number(line.usd))}</span>
          </div>
        ))}
        <div className="mt-1 flex items-baseline justify-between border-t pt-1">
          <span className="text-sm font-semibold">Total</span>
          <span className="text-primary text-xl font-bold">
            {formatUsd(Number(out.totalUsd))}
          </span>
        </div>
      </div>
    );
  }

  if (step.name === "get_products") {
    const products = (Array.isArray(out.products) ? out.products : []) as Rec[];
    return (
      <div className="space-y-2">
        {products.map((p) => (
          <div key={String(p.id)}>
            <p className="text-sm font-medium">
              {String(p.name)} · {formatUsd(Number(p.priceUsd))}
            </p>
            <p className="text-muted-foreground text-xs">{String(p.type)}</p>
            <div className="mt-1 flex flex-wrap gap-1">
              {((p.colors as string[]) ?? []).map((c) => (
                <span key={c} className={cn(pill, "bg-accent text-white")}>
                  {c}
                </span>
              ))}
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (step.name === "get_prices") {
    const products = (Array.isArray(out.products) ? out.products : []) as Rec[];
    const plans = (Array.isArray(out.plans) ? out.plans : []) as Rec[];
    return (
      <div className="space-y-0.5 text-sm">
        {products.map((p) => (
          <Row
            key={String(p.id)}
            name=""
            value={`${p.name} ${formatUsd(Number(p.priceUsd))}`}
          />
        ))}
        {plans
          .filter((p) => Number(p.monthlyUsd) > 0)
          .map((p) => (
            <Row
              key={String(p.id)}
              name=""
              value={`${p.name} ${formatUsd(Number(p.monthlyUsd))}/mo · ${formatUsd(Number(p.annualUsd))}/yr`}
            />
          ))}
      </div>
    );
  }

  if (step.name === "compare_products") {
    const products = (Array.isArray(out.products) ? out.products : []) as Rec[];
    const onlyIn = (Array.isArray(out.onlyIn) ? out.onlyIn : []) as Rec[];
    const diff = asRecord(out.priceDifference);
    return (
      <div className="space-y-2">
        <div className="space-y-0.5">
          {products.map((p) => (
            <Row
              key={String(p.id)}
              name=""
              value={`${p.name} ${formatUsd(Number(p.priceUsd))} · ${p.type}`}
            />
          ))}
          <p className="text-sm font-medium">
            {diff.moreExpensive
              ? `${diff.moreExpensive} costs ${formatUsd(Number(diff.usd))} more`
              : "Same price"}
          </p>
        </div>
        <div>
          <p className="text-muted-foreground text-xs">Both come in</p>
          <div className="mt-1 flex flex-wrap gap-1">
            {((out.sharedColors as string[]) ?? []).map((c) => (
              <span key={c} className={cn(pill, "bg-accent text-white")}>
                {c}
              </span>
            ))}
          </div>
        </div>
        {onlyIn.map((o) => (
          <div key={String(o.product)}>
            <p className="text-muted-foreground text-xs">
              Only {String(o.product)}
            </p>
            <div className="mt-1 flex flex-wrap gap-1">
              {((o.colors as string[]) ?? []).map((c) => (
                <span key={c} className={cn(pill, "bg-chart-4 text-foreground")}>
                  {c}
                </span>
              ))}
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (step.name === "check_availability") {
    if (out.status === "not_a_color")
      return (
        <p className="text-sm">
          {String(out.product)} doesn&apos;t come in {String(out.color)}. It
          comes in {((out.colors as string[]) ?? []).join(", ")}.
        </p>
      );
    if (out.status === "unavailable")
      return <p className="text-sm">{String(out.message)}</p>;
    const colors = (Array.isArray(out.colors) ? out.colors : []) as Rec[];
    return (
      <div className="space-y-1">
        {colors.map((c) => (
          <div
            key={String(c.color)}
            className="flex items-center justify-between gap-3 text-sm"
          >
            <span>{String(c.color)}</span>
            {c.stock === "in_stock" ? (
              <span className={cn(pill, "bg-accent text-white")}>In stock</span>
            ) : c.stock === "low_stock" ? (
              <span className={cn(pill, "bg-chart-4 text-foreground")}>
                Low stock
              </span>
            ) : (
              <span className={cn(pill, "bg-chart-3 text-foreground")}>
                Back-ordered until {restockLabel(String(c.restockDate))}
              </span>
            )}
          </div>
        ))}
      </div>
    );
  }

  return null;
}

function ToolCard({ step, count }: { step: ToolStep; count: number }) {
  return (
    <div
      data-testid="tool-call"
      data-tool={step.name}
      className="bg-card mt-2 overflow-hidden rounded-lg border"
    >
      <div className="bg-accent flex items-center gap-2 px-3 py-1.5 text-white">
        <span className="font-mono text-sm font-bold">{step.name}()</span>
        <span className="rounded bg-white/20 px-1.5 text-xs">tool {count}</span>
        <span className="ml-auto text-xs">{TOOL_LABELS[step.name] ?? ""}</span>
      </div>
      <div className="p-3">
        <p className={cn(label, "text-muted-foreground mb-1")}>
          → What Copper sent
        </p>
        <SentInput step={step} />
      </div>
      <div className="bg-accent/10 border-t p-3">
        <p className={cn(label, "text-muted-foreground mb-1")}>
          ← What came back
        </p>
        <Result step={step} />
      </div>
    </div>
  );
}

function Dots() {
  return (
    <span className="bg-card flex h-7 items-center gap-0.5 rounded-full px-1.5">
      {[0, 150, 300].map((delay) => (
        <span
          key={delay}
          className="bg-primary size-1.5 animate-bounce rounded-full"
          style={{ animationDelay: `${delay}ms` }}
        />
      ))}
    </span>
  );
}

/** One answer: the stations hanging off the rail, then the reply bubble. */
export function Answer({
  progress,
  useTools,
}: {
  progress: Progress | null;
  useTools: boolean;
}) {
  const steps = progress?.steps ?? [];
  const working = !progress || progress.status === "working";
  const used = new Set(
    steps.flatMap((step) => (step.type === "tool" ? [step.name] : [])),
  );
  const names = Object.keys(TOOL_LABELS);

  const nowText = progress?.reply
    ? "Writing the answer…"
    : !useTools
      ? "Answering from memory…"
      : steps.length
        ? "Deciding what to do next…"
        : "Reading your question…";

  return (
    <div className="space-y-2">
      <div className="relative">
        <span
          aria-hidden
          className={cn(
            "absolute top-3 bottom-3 left-[13px] w-0.5",
            useTools
              ? "from-primary via-accent to-accent bg-linear-to-b"
              : "bg-chart-3",
          )}
        />
        <Station
          node={<Node className={useTools ? "bg-primary" : "bg-chart-3"} />}
          title={
            useTools ? "Tools Copper can use" : "Tools given to Copper: none"
          }
        >
          <div className="mt-1 flex flex-wrap gap-1.5">
            {names.map((name) => (
              <span
                key={name}
                className={cn(
                  "rounded-md px-2 py-0.5 font-mono text-xs",
                  !useTools
                    ? "text-muted-foreground line-through"
                    : used.has(name)
                      ? "bg-accent font-bold text-white"
                      : "bg-muted text-muted-foreground",
                )}
              >
                {name}
              </span>
            ))}
          </div>
          {!useTools && (
            <p className="text-muted-foreground mt-1 text-xs">
              Copper has to answer from memory alone.
            </p>
          )}
        </Station>

        {steps.map((step, i) => {
          if (step.type === "thinking")
            return (
              <Station
                key={i}
                node={
                  <Node className={useTools ? "bg-primary" : "bg-chart-3"}>
                    <Brain className="size-4" />
                  </Node>
                }
                title="Copper is thinking"
              >
                <p
                  data-testid="thinking"
                  className="text-muted-foreground mt-1 border-l-2 pl-3 text-sm italic"
                >
                  <Markdown text={step.text} />
                </p>
              </Station>
            );
          const toolCount = steps
            .slice(0, i + 1)
            .filter((s) => s.type === "tool").length;
          return (
            <Station
              key={step.id}
              node={
                <Node className="bg-accent text-white">
                  <Wrench className="size-4" />
                </Node>
              }
              title={
                step.state === "calling"
                  ? "Copper is calling a tool"
                  : "Copper called a tool"
              }
            >
              <ToolCard step={step} count={toolCount} />
            </Station>
          );
        })}

        {working && (
          <Station node={<Dots />}>
            <p className="text-muted-foreground pt-1.5 text-sm">{nowText}</p>
          </Station>
        )}
      </div>

      {progress && progress.reply !== "" && (
        <div className="bg-card ml-10 rounded-xl rounded-tl-none border p-3 text-sm">
          <p className="text-primary mb-1 text-xs font-semibold">Copper</p>
          {!useTools && (
            <div className="bg-chart-3/15 border-chart-3 mb-2 rounded-md border p-2">
              <p className="flex items-center gap-1 font-semibold">
                <TriangleAlert className="size-4" /> Answered without tools: may
                be made up
              </p>
              <p className="text-muted-foreground mt-1 text-xs">
                With tools off, Copper can&apos;t see today&apos;s prices or
                stock. The AI only has what it learned in training, so it fills
                the gaps with guesses that sound right. That&apos;s a
                hallucination.
              </p>
            </div>
          )}
          <p className="whitespace-pre-wrap">
            {progress.reply}
            {working && (
              <span className="bg-foreground ml-0.5 inline-block h-4 w-0.5 animate-pulse align-text-bottom" />
            )}
          </p>
        </div>
      )}
    </div>
  );
}
