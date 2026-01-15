import { ButtonHTMLAttributes, forwardRef } from "react";
import { Slot } from "@radix-ui/react-slot";
import { cn } from "@/lib/cn";

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "ghost" | "destructive";
  size?: "sm" | "md" | "lg" | "icon";
  asChild?: boolean;
}

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "primary", size = "md", asChild = false, children, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return (
      <Comp
        ref={ref}
        className={cn(
          "inline-flex items-center justify-center rounded-xl font-semibold transition-all",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
          "disabled:pointer-events-none disabled:opacity-50",
          {
            primary:
              "bg-primary text-primary-foreground shadow-soft hover:brightness-110 active:scale-95",
            secondary:
              "bg-muted text-foreground border border-border hover:bg-muted/80",
            ghost: "hover:bg-muted text-foreground",
            destructive:
              "bg-destructive text-destructive-foreground shadow-soft hover:brightness-110",
          }[variant],
          {
            sm: "h-9 px-3 text-sm",
            md: "h-10 px-4 text-base",
            lg: "h-12 px-6 text-lg",
            icon: "h-9 w-9 p-0",
          }[size],
          className
        )}
        {...props}
      >
        {children}
      </Comp>
    );
  }
);

Button.displayName = "Button";

export { Button };
