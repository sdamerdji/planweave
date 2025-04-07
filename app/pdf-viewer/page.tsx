"use client";
import dynamic from "next/dynamic";

const DynamicViewer = dynamic(() => import("./viewer"), { ssr: false });

export default function Page() {
  return <DynamicViewer />;
}
