import { Link, useLocation, useRouter } from "@tanstack/react-router";
import { useEffect, useState, type ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import { NAV } from "@/lib/nav";

export function AppShell({ children, title }: { children: ReactNode; title?: string }) {
  const { pathname } = useLocation();
  const router = useRouter();
  const [email, setEmail] = useState<string | null>(null);
  const [avatar, setAvatar] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setEmail(data.user?.email ?? null);
      setAvatar((data.user?.user_metadata?.avatar_url as string) ?? null);
    });
  }, []);

  async function signOut() {
    await supabase.auth.signOut();
    router.navigate({ to: "/auth", replace: true });
  }

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-slate-50 text-slate-900">
      <aside className="hidden w-64 shrink-0 flex-col border-r border-slate-200 bg-white md:flex">
        <div className="flex items-center gap-2 px-5 py-4">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-900 text-white">
            <span className="material-symbols-outlined text-base">corporate_fare</span>
          </div>
          <div>
            <div className="text-sm font-bold leading-tight">Nexus HRMS</div>
            <div className="text-[10px] uppercase tracking-wider text-slate-500">Enterprise Suite</div>
          </div>
        </div>
        <nav className="flex-1 overflow-y-auto px-2 py-2">
          <ul className="space-y-0.5">
            {NAV.map((item) => {
              const active = pathname.startsWith(item.to);
              return (
                <li key={item.to}>
                  <Link
                    to={item.to}
                    className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors ${
                      active
                        ? "bg-blue-50 font-semibold text-blue-700"
                        : "text-slate-600 hover:bg-slate-100"
                    }`}
                  >
                    <span className="material-symbols-outlined text-[20px]">{item.icon}</span>
                    <span>{item.label}</span>
                    {item.live && (
                      <span className="ml-auto rounded-full bg-emerald-100 px-1.5 text-[9px] font-bold uppercase text-emerald-700">
                        Live
                      </span>
                    )}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>
        <div className="border-t border-slate-200 p-3">
          <div className="flex items-center gap-2">
            {avatar ? (
              <img src={avatar} alt="" className="h-8 w-8 rounded-full" />
            ) : (
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-200 text-xs font-bold text-slate-700">
                {email?.[0]?.toUpperCase() ?? "U"}
              </div>
            )}
            <div className="min-w-0 flex-1">
              <div className="truncate text-xs font-medium">{email ?? "Signed in"}</div>
              <button
                onClick={signOut}
                className="text-[11px] text-slate-500 hover:text-slate-900"
              >
                Sign out
              </button>
            </div>
          </div>
        </div>
      </aside>
      <main className="flex flex-1 flex-col overflow-hidden">
        {title && (
          <header className="flex h-14 items-center justify-between border-b border-slate-200 bg-white px-6">
            <h1 className="text-lg font-semibold">{title}</h1>
          </header>
        )}
        <div className="flex-1 overflow-auto">{children}</div>
      </main>
    </div>
  );
}
