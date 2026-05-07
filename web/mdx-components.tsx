import type { MDXComponents } from "mdx/types";
import { CodeBlock, SimpleCode } from "@/components/docs/code-block";
import { Callout } from "@/components/docs/callout";

export function useMDXComponents(components: MDXComponents): MDXComponents {
  return {
    ...components,
    Callout,
    CodeBlock,
    SimpleCode,
  };
}
