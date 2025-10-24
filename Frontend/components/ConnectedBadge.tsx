// components/ConnectedBadge.tsx
"use client";
import React from "react";

export default function ConnectedBadge({ address }: { address: string | null }) {
  if (!address) return null;
  return (
    <div className="inline-flex items-center gap-3 px-3 py-1 rounded-md bg-yellow-300 text-black font-medium">
      <span className="font-mono">{address.slice(0, 6)}…{address.slice(-4)}</span>
    </div>
  );
}
