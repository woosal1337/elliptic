"use client";

import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "../lib/cn";

export const iconButtonVariants = cva(
  "inline-flex shrink-0 items-center justify-center rounded-md transition-[color,background-color,border-color,box-shadow] duration-150 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:ring-offset-2 focus-visible:ring-offset-background active:translate-y-px disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      variant: {
        ghost: "text-muted-foreground hover:bg-muted hover:text-foreground",
        outline:
          "border border-input bg-surface text-muted-foreground shadow-xs hover:bg-muted hover:text-foreground",
        primary: "bg-primary text-primary-foreground shadow-sm hover:bg-primary/90",
        accent: "bg-accent text-accent-foreground shadow-sm hover:bg-accent/90",
        danger: "text-muted-foreground hover:bg-danger-muted hover:text-danger",
      },
      size: {
        // Matches Button's `xxs`: for controls that sit inside a 44px row.
        xxs: "size-6 [&_svg]:size-3",
        sm: "size-7 [&_svg]:size-3.5",
        md: "size-8 [&_svg]:size-4",
        lg: "size-9 [&_svg]:size-[18px]",
        xl: "size-11 rounded-lg [&_svg]:size-5",
      },
    },
    defaultVariants: {
      variant: "ghost",
      size: "md",
    },
  }
);

export interface IconButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof iconButtonVariants> {
  "aria-label": string;
}

export const IconButton = React.forwardRef<HTMLButtonElement, IconButtonProps>(
  ({ className, variant, size, type = "button", ...props }, ref) => (
    <button
      ref={ref}
      type={type}
      className={cn(iconButtonVariants({ variant, size }), className)}
      {...props}
    />
  )
);
IconButton.displayName = "IconButton";
