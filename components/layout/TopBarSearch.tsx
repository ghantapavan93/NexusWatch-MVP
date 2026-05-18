"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Search } from "lucide-react";

export function TopBarSearch() {
  const router = useRouter();
  const [value, setValue] = useState("");
  const inputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        inputRef.current?.focus();
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const query = value.trim();
    if (!query) return;
    router.push(`/invoices?q=${encodeURIComponent(query)}`);
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="hidden min-w-0 items-center gap-3 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 shadow-sm focus-within:ring-4 focus-within:ring-blue-100 sm:flex lg:w-[32rem]"
      role="search"
    >
      <Search className="h-4 w-4 shrink-0 text-slate-400" />
      <input
        ref={inputRef}
        type="search"
        value={value}
        onChange={(event) => setValue(event.target.value)}
        placeholder="Search invoices, customers, or states"
        className="min-w-0 flex-1 bg-transparent outline-none placeholder:text-slate-400"
        aria-label="Search invoices"
      />
      <span className="ml-auto rounded-md border border-slate-200 bg-slate-50 px-1.5 py-0.5 text-[11px] font-semibold text-slate-500">
        ⌘ K
      </span>
    </form>
  );
}
