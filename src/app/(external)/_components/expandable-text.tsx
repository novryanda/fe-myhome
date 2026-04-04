"use client";

import { useState } from "react";

import { Button } from "@/components/ui/button";

export function ExpandableText({
  text,
  className = "",
  previewClassName = "",
}: {
  text: string;
  className?: string;
  previewClassName?: string;
}) {
  const [expanded, setExpanded] = useState(false);

  if (!text) return null;

  return (
    <div className={className}>
      <p className={`${expanded ? "" : "line-clamp-2"} ${previewClassName}`}>{text}</p>
      {text.length > 96 ? (
        <Button
          type="button"
          variant="link"
          className="mt-1 h-auto p-0 text-sm font-semibold text-blue-700 hover:text-blue-800"
          onClick={() => setExpanded((value) => !value)}
        >
          {expanded ? "Tutup" : "Selengkapnya"}
        </Button>
      ) : null}
    </div>
  );
}
