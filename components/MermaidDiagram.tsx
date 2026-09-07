"use client";

import { useEffect, useRef, useState } from "react";

export default function MermaidDiagram({ code, title }: { code: string; title?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    let canceled = false;
    import("mermaid").then(async ({ default: mermaid }) => {
      mermaid.initialize({
        startOnLoad: false,
        theme: "dark",
        securityLevel: "strict",
        fontFamily: "Inter, ui-sans-serif, system-ui"
      });
      try {
        if (ref.current) {
          const node = ref.current.querySelector(".mermaid") as HTMLElement | null;
          if (node) await mermaid.run({ nodes: [node] });
        }
      } catch (e: any) {
        if (!canceled) setError(e?.message || "Diagram could not be rendered");
      }
    });
    return () => { canceled = true; };
  }, [code]);

  return (
    <figure className="lesson-diagram">
      {title && <figcaption>{title}</figcaption>}
      <div ref={ref}>
        {error ? <pre className="diagram-fallback">{code}</pre> : <pre className="mermaid">{code}</pre>}
      </div>
    </figure>
  );
}
