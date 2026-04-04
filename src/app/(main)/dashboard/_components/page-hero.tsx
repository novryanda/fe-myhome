import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

export function PageHero({
  title,
  description,
  badge,
  action,
  className,
}: {
  title: string;
  description: string;
  badge?: ReactNode;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <section className={cn("dashboard-hero", className)}>
      <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
        <div className="space-y-3">
          {badge ? <div>{badge}</div> : null}
          <div className="space-y-2">
            <h1 className="text-3xl font-semibold tracking-tight text-balance lg:text-4xl">{title}</h1>
            <p className="max-w-3xl text-sm leading-6 text-muted-foreground lg:text-base">{description}</p>
          </div>
        </div>
        {action ? <div className="flex shrink-0 items-center gap-3">{action}</div> : null}
      </div>
    </section>
  );
}
