import type { AttributifyAttributes } from "@unocss/preset-attributify";

declare module "preact" {
  namespace JSX {
    interface HTMLAttributes extends AttributifyAttributes {
      "transition-custom"?: string;
      areas?: string;
    }
  }
}
