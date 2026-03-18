import { cn } from "@/lib/utils";

interface EmptyStateProps {
  icon?: React.ReactNode;
  heading: string;
  subtext?: string;
  action?: React.ReactNode;
  className?: string;
}

export function EmptyState({
  icon,
  heading,
  subtext,
  action,
  className,
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center text-center",
        "py-16 px-6 gap-4",
        className
      )}
    >
      {icon && (
        <div className="text-gray-300" aria-hidden="true">
          {icon}
        </div>
      )}
      <div className="space-y-1.5">
        <p className="text-heading font-semibold text-foreground">{heading}</p>
        {subtext && (
          <p className="text-body text-foreground-muted max-w-xs">{subtext}</p>
        )}
      </div>
      {action && <div>{action}</div>}
    </div>
  );
}