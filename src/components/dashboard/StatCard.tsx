import { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface StatCardProps {
  title: string;
  value: string | number;
  icon: ReactNode;
  trend?: {
    value: number;
    isPositive: boolean;
  };
  variant?: "default" | "primary" | "secondary" | "accent";
}

const variantStyles = {
  default: "bg-card",
  primary: "bg-primary text-primary-foreground",
  secondary: "bg-secondary text-secondary-foreground",
  accent: "bg-accent text-accent-foreground",
};

export function StatCard({ title, value, icon, trend, variant = "default" }: StatCardProps) {
  return (
    <div className={cn("stat-card animate-fade-in", variantStyles[variant])}>
      <div className="flex items-start justify-between">
        <div>
          <p className={cn(
            "text-sm font-medium",
            variant === "default" ? "text-muted-foreground" : "opacity-80"
          )}>
            {title}
          </p>
          <p className="text-3xl font-display font-bold mt-2">{value}</p>
          {trend && (
            <p className={cn(
              "text-sm mt-2 font-medium",
              trend.isPositive ? "text-success" : "text-destructive"
            )}>
              {trend.isPositive ? "+" : "-"}{Math.abs(trend.value)}% from last month
            </p>
          )}
        </div>
        <div className={cn(
          "p-3 rounded-xl",
          variant === "default" ? "bg-primary/10 text-primary" : "bg-white/20"
        )}>
          {icon}
        </div>
      </div>
    </div>
  );
}
