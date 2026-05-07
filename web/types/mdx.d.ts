declare module "*.mdx" {
  import type { ComponentType } from "react";
  import type { TocItem } from "@/components/docs/docs-toc";

  export const toc: TocItem[];
  const Component: ComponentType;
  export default Component;
}
