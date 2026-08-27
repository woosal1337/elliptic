"use client";

import * as React from "react";
import { Slot } from "radix-ui";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "../lib/cn";
import { Spinner } from "./spinner";

export const buttonVariants = cva(
  "relative inline-flex shrink-0 select-none items-center justify-center gap-2 whitespace-nowrap rounded-md font-medium transition-[color,background-color,border-color,box-shadow,scale] duration-150 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:ring-offset-2 focus-visible:ring-offset-background active:not-disabled:scale-[0.97] disabled:pointer-events-none disabled:opacity-50 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        primary:
          "bg-primary text-primary-foreground shadow-sm hover:bg-primary/90",
        accent:
          "bg-accent text-accent-foreground shadow-sm hover:bg-accent/90",
        secondary:
          "bg-subtle text-foreground shadow-xs hover:bg-subtle/70",
        outline:
          "border border-input bg-surface text-foreground shadow-xs hover:bg-muted",
        ghost: "text-foreground hover:bg-muted",
        link: "text-accent underline-offset-4 hover:underline",
        danger:
          "bg-danger text-danger-foreground shadow-sm hover:bg-danger/90",
      },
      size: {
        // The two tightest sizes are for buttons that live inside a row or a
        // toolbar, where a 32px control would set the line height of everything
        // around it. They are not "small primary buttons" — reach for `sm` for
        // that.
        xxs: "h-6 gap-1 rounded-md px-2 text-caption [&_svg]:size-3",
        xs: "h-7 gap-1.5 rounded-md px-2.5 text-caption [&_svg]:size-3.5",
        sm: "h-8 gap-1.5 rounded-md px-3 text-[0.8125rem] [&_svg]:size-3.5",
        md: "h-9 px-4 text-small [&_svg]:size-4",
        lg: "h-10 px-5 text-small [&_svg]:size-4",
        xl: "h-12 rounded-lg px-7 text-[0.9375rem] [&_svg]:size-[18px]",
        icon: "size-9 [&_svg]:size-4",
      },
    },
    defaultVariants: {
      variant: "primary",
      size: "md",
    },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  loading?: boolean;
  iconLeft?: React.ReactNode;
  iconRight?: React.ReactNode;
  asChild?: boolean;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className,
      variant,
      size,
      loading = false,
      disabled,
      iconLeft,
      iconRight,
      asChild = false,
      children,
      type,
      ...props
    },
    ref
  ) => {
    if (asChild) {
      return (
        <Slot.Root
          ref={ref}
          className={cn(buttonVariants({ variant, size }), className)}
          aria-busy={loading || undefined}
          {...props}
        >
          {children}
        </Slot.Root>
      );
    }

    return (
      <button
        ref={ref}
        type={type ?? "button"}
        className={cn(buttonVariants({ variant, size }), className)}
        disabled={disabled ?? loading}
        aria-busy={loading || undefined}
        {...props}
      >
        {loading ? (
          <Spinner size="sm" className="text-current" />
        ) : iconLeft ? (
          <span className="inline-flex shrink-0 items-center">{iconLeft}</span>
        ) : null}
        {children}
        {iconRight && !loading ? (
          <span className="inline-flex shrink-0 items-center">{iconRight}</span>
        ) : null}
      </button>
    );
  }
);
Button.displayName = "Button";
