"use client";

import ReactMarkdown from "react-markdown";
import MermaidDiagram from "./MermaidDiagram";

export default function LessonMarkdown({ markdown }: { markdown: string }) {
  return (
    <ReactMarkdown
      components={{
        code(props: any) {
          const { children, className } = props;
          const match = /language-(\w+)/.exec(className || "");
          if (match?.[1] === "mermaid") {
            return <MermaidDiagram code={String(children || "").replace(/\n$/, "")} />;
          }
          return <code className={className}>{children}</code>;
        }
      }}
    >
      {markdown}
    </ReactMarkdown>
  );
}
