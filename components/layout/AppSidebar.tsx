"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
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
  const pathname = usePathname();

  return (
    <aside className="w-full shrink-0 overflow-hidden bg-[radial-gradient(circle_at_top_left,rgba(37,99,235,0.34),transparent_22rem),linear-gradient(180deg,#071530,#031023)] text-sidebar-foreground shadow-2xl lg:min-h-screen lg:w-72">
      <div className="border-b border-white/10 px-5 py-4 lg:px-6 lg:py-6">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-white text-slate-950 shadow-lg shadow-blue-950/30">
            <Layers3 className="h-5 w-5" />
          </div>
          <div>
            <div className="text-lg font-semibold">NexusWatch</div>
            <div className="text-xs text-slate-400">Decision support console</div>
          </div>
        </div>
      </div>
      <nav className="flex gap-1 overflow-x-auto px-3 py-3 lg:flex-1 lg:flex-col lg:space-y-1.5 lg:overflow-visible lg:py-5">
        {navItems.map((item) => {
          const Icon = item.icon;
          const active = pathname === item.href || (item.href !== "/dashboard" && pathname.startsWith(item.href));
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`group flex shrink-0 items-center gap-2 rounded-xl px-3 py-2.5 text-sm font-semibold transition lg:gap-3 ${
                active
                  ? "bg-blue-600/30 text-white shadow-lg shadow-blue-950/25 ring-1 ring-blue-300/20"
                  : "text-slate-300 hover:bg-white/9 hover:text-white"
              }`}
            >
              <span className={`flex h-7 w-7 items-center justify-center rounded-lg ${active ? "bg-blue-500 text-white" : "text-slate-300 group-hover:bg-white/10 group-hover:text-white"}`}>
                <Icon className="h-4 w-4" />
              </span>
              <span className="flex-1 whitespace-nowrap">{item.label}</span>
            </Link>
          );
        })}
      </nav>
      <div className="m-5 hidden rounded-xl border border-white/10 bg-white/[0.045] p-5 text-xs leading-5 text-slate-300 shadow-inner lg:block">
        <div className="mb-2 font-semibold text-white">Decision support only.</div>
        Final tax treatment should be reviewed with accounting.
        <div className="mt-4 font-semibold text-blue-200">Learn more →</div>
      </div>
    </aside>
  );
}
