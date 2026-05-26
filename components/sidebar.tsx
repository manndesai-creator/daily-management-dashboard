"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  ClipboardCheck,
  Users,
  CalendarRange,
  Target,
  BookOpen,
  Zap,
  Globe2,
} from "lucide-react";

const navItems = [
  {
    label: "Daily Log",
    href: "/daily-log",
    icon: ClipboardCheck,
    description: "Log & track today's work",
  },
  {
    label: "Clients",
    href: "/clients",
    icon: Users,
    description: "Manage client profiles",
  },
  {
    label: "Weekly View",
    href: "/weekly",
    icon: CalendarRange,
    description: "See your full week",
  },
  {
    label: "Goals",
    href: "/goals",
    icon: Target,
    description: "Monthly goals & progress",
  },
  {
    label: "Resources",
    href: "/resources",
    icon: BookOpen,
    description: "Links, videos & workshops",
  },
  {
    label: "Quick Capture",
    href: "/quick-capture",
    icon: Zap,
    description: "Dump thoughts instantly",
  },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="w-60 flex-shrink-0 bg-card border-r border-border flex flex-col h-screen sticky top-0">
      {/* Brand */}
      <div className="p-5 border-b border-border">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center flex-shrink-0">
            <Globe2 className="w-4 h-4 text-primary-foreground" />
          </div>
          <div className="min-w-0">
            <p className="font-bold text-foreground text-sm leading-tight truncate">
              Daily Management
            </p>
            <p className="text-xs text-muted-foreground truncate">
              Dashboard
            </p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto p-3">
        <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest px-3 pt-2 pb-3">
          Workspace
        </p>
        <ul className="space-y-0.5">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname.startsWith(item.href);
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className={cn(
                    "flex items-center gap-3 px-3 py-2.5 rounded-md text-sm transition-colors group",
                    isActive
                      ? "bg-primary text-primary-foreground font-medium"
                      : "text-muted-foreground hover:text-foreground hover:bg-secondary"
                  )}
                >
                  <Icon
                    className={cn(
                      "w-4 h-4 flex-shrink-0",
                      isActive
                        ? "text-primary-foreground"
                        : "text-muted-foreground group-hover:text-foreground"
                    )}
                  />
                  <div className="min-w-0 flex-1">
                    <p className="truncate leading-tight">{item.label}</p>
                    <p
                      className={cn(
                        "text-[10px] truncate leading-tight",
                        isActive
                          ? "text-primary-foreground/70"
                          : "text-muted-foreground/70"
                      )}
                    >
                      {item.description}
                    </p>
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      {/* Footer */}
      <div className="p-4 border-t border-border">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-emerald-500 flex-shrink-0" />
          <p className="text-xs text-muted-foreground truncate">
            v1.0 · Supabase
          </p>
        </div>
      </div>
    </aside>
  );
}
