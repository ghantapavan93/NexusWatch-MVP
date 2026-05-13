import Link from "next/link";
import { BarChart3, Bot, ClipboardList, FileInput, FileText, Home, Layers3, Settings, ShieldCheck, Table2 } from "lucide-react";

const navItems = [
  { href: "/dashboard", label: "Dashboard", icon: Home },
  { href: "/invoices", label: "Invoices", icon: FileText },
  { href: "/upload", label: "Upload Invoice", icon: FileInput },
  { href: "/states", label: "States", icon: BarChart3 },
  { href: "/rules", label: "Rules", icon: ShieldCheck },
  { href: "/review", label: "Review Queue", icon: ClipboardList },
  { href: "/ai-brief", label: "AI Brief", icon: Bot },
  { href: "/exports", label: "Exports", icon: Table2 },
  { href: "/settings", label: "Settings", icon: Settings },
];

export function AppSidebar() {
  return (
    <aside className="w-full shrink-0 bg-sidebar text-sidebar-foreground lg:min-h-screen lg:w-72">
      <div className="border-b border-white/10 px-5 py-4 lg:px-6 lg:py-6">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-white text-slate-950">
            <Layers3 className="h-5 w-5" />
          </div>
          <div>
            <div className="text-lg font-semibold">NexusWatch</div>
            <div className="text-xs text-slate-400">Decision support console</div>
          </div>
        </div>
      </div>
      <nav className="flex gap-1 overflow-x-auto px-3 py-3 lg:flex-1 lg:flex-col lg:space-y-1 lg:overflow-visible lg:py-5">
        {navItems.map((item) => {
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className="flex shrink-0 items-center gap-2 rounded-md px-3 py-2.5 text-sm font-medium text-slate-300 hover:bg-white/10 hover:text-white lg:gap-3"
            >
              <Icon className="h-4 w-4" />
              {item.label}
            </Link>
          );
        })}
      </nav>
      <div className="hidden border-t border-white/10 p-5 text-xs leading-5 text-slate-400 lg:block">
        Decision support only. Final tax treatment should be reviewed with accounting.
      </div>
    </aside>
  );
}
