"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  ClipboardCheck,
  Users,
  CalendarRange,
  BookOpen,
  Zap,
  Building2,
  Menu,
  X,
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
    label: "Agency Work",
    href: "/agency-work",
    icon: Building2,
    description: "Track internal Varion tasks",
  },
  {
    label: "Learning",
    href: "/resources",
    icon: BookOpen,
    description: "Track what you learn daily",
  },
  {
    label: "Weekly View",
    href: "/weekly",
    icon: CalendarRange,
    description: "See your full week",
  },
  {
    label: "Quick Capture",
    href: "/quick-capture",
    icon: Zap,
    description: "Dump thoughts instantly",
  },
];

function NavContent({
  pathname,
  onNavClick,
}: {
  pathname: string;
  onNavClick?: () => void;
}) {
  return (
    <>
      {/* Brand */}
      <div className="p-5 border-b border-border">
        <div className="flex items-center gap-3">
          <img
            src="/agency-logo.png"
            alt=""
            className="w-9 h-9 rounded-lg object-cover flex-shrink-0"
          />
          <div className="min-w-0">
            <p className="font-bold text-foreground text-sm leading-tight truncate">
              Varion Media
            </p>
            <p className="text-xs text-muted-foreground truncate">Daily ops</p>
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
                  onClick={onNavClick}
                  className={cn(
                    "flex items-center gap-3 px-3 py-2.5 rounded-md text-sm transition-colors group",
                    isActive
                      ? "bg-primary text-primary-foreground font-medium"
                      : "text-muted-foreground hover:text-foreground hover:bg-secondary"
                  )}
                >
                  {item.href === "/agency-work" ? (
                    <img
                      src="/agency-logo.png"
                      alt=""
                      className="w-4 h-4 rounded-sm object-cover flex-shrink-0"
                    />
                  ) : (
                    <Icon
                      className={cn(
                        "w-4 h-4 flex-shrink-0",
                        isActive
                          ? "text-primary-foreground"
                          : "text-muted-foreground group-hover:text-foreground"
                      )}
                    />
                  )}
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
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <div className="w-2 h-2 rounded-full bg-emerald-500 flex-shrink-0" />
            <p className="text-xs text-muted-foreground truncate">v1.0 · Supabase</p>
          </div>
          <span
            className="text-[10px] font-medium text-muted-foreground/80 px-1.5 py-0.5 rounded bg-secondary/60"
            title="All dates use Asia / Kolkata (IST)"
          >
            IST
          </span>
        </div>
      </div>
    </>
  );
}

export function Sidebar() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  return (
    <>
      {/* Mobile top bar */}
      <div className="md:hidden fixed top-0 left-0 right-0 z-40 h-14 bg-card border-b border-border flex items-center px-4 gap-3">
        <button
          onClick={() => setOpen(true)}
          className="p-1.5 rounded hover:bg-secondary transition-colors"
          aria-label="Open menu"
        >
          <Menu className="w-5 h-5 text-foreground" />
        </button>
        <div className="flex items-center gap-2.5">
          <img
            src="/agency-logo.png"
            alt=""
            className="w-7 h-7 rounded-md object-cover"
          />
          <p className="font-bold text-foreground text-sm">Varion Media</p>
        </div>
      </div>

      {/* Desktop sidebar */}
      <aside className="hidden md:flex w-60 flex-shrink-0 bg-card border-r border-border flex-col h-screen sticky top-0">
        <NavContent pathname={pathname} />
      </aside>

      {/* Mobile backdrop */}
      {open && (
        <div
          className="md:hidden fixed inset-0 z-40 bg-black/50"
          onClick={() => setOpen(false)}
        />
      )}

      {/* Mobile drawer */}
      <aside
        className={cn(
          "md:hidden fixed top-0 left-0 z-50 w-72 h-screen bg-card border-r border-border flex flex-col transition-transform duration-200",
          open ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <div className="flex items-center justify-between p-4 border-b border-border">
          <div className="flex items-center gap-2.5">
            <img
              src="/agency-logo.png"
              alt=""
              className="w-7 h-7 rounded-md object-cover"
            />
            <p className="font-bold text-foreground text-sm">Varion Media</p>
          </div>
          <button
            onClick={() => setOpen(false)}
            className="p-1.5 rounded hover:bg-secondary transition-colors"
          >
            <X className="w-4 h-4 text-muted-foreground" />
          </button>
        </div>
        <NavContent pathname={pathname} onNavClick={() => setOpen(false)} />
      </aside>
    </>
  );
}
