import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-[16px] border text-sm font-medium transition-all duration-150 outline-none focus-visible:ring-2 focus-visible:ring-ring/40 disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      variant: {
        default: "border-slate-900 bg-slate-900 text-white hover:bg-slate-800 hover:border-slate-800 dark:border-slate-100 dark:bg-slate-100 dark:text-slate-950 dark:hover:bg-white",
        outline: "border-border bg-background text-foreground hover:bg-muted/70",
        secondary: "border-transparent bg-muted text-foreground hover:bg-muted/90",
        ghost: "border-transparent bg-transparent text-muted-foreground hover:bg-muted/70 hover:text-foreground",
        link: "border-transparent bg-transparent px-0 text-foreground underline-offset-4 hover:underline",
        destructive: "border-destructive bg-destructive text-white hover:bg-destructive/92",
      },
      size: {
        default: "h-11 px-4 py-2",
        sm: "h-10 px-3 py-2 text-xs",
        lg: "h-12 px-5 py-2.5",
        icon: "size-11 p-0",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

function Button({ asChild = false, className, size, variant, ...props }: ButtonProps) {
  const Comp = asChild ? Slot : "button";
  return <Comp className={cn(buttonVariants({ variant, size }), className)} {...props} />;
}

export { Button, buttonVariants };
