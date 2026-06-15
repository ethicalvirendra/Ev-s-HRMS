import { createFileRoute, useRouter } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable/index";
import { toast } from "sonner";

export const Route = createFileRoute("/auth")({
  ssr: false,
  head: () => ({ meta: [{ title: "Sign in — Nexus HRMS" }] }),
  component: AuthPage,
});

function AuthPage() {
  const router = useRouter();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) router.navigate({ to: "/dashboard", replace: true });
    });
  }, [router]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      if (mode === "signup") {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: window.location.origin,
            data: { 
              full_name: name || email.split("@")[0],
              company_name: companyName,
            },
          },
        });
        if (error) throw error;
        toast.success("Account created. You're signed in.");
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      }
      router.navigate({ to: "/dashboard", replace: true });
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setBusy(false);
    }
  }

  async function google() {
    setBusy(true);
    const result = await lovable.auth.signInWithOAuth("google", {
      redirect_uri: window.location.origin,
    });
    if (result.error) {
      toast.error(result.error.message ?? "Google sign-in failed");
      setBusy(false);
      return;
    }
    if (result.redirected) return;
    router.navigate({ to: "/dashboard", replace: true });
  }

  async function handleDevLogin(role: "admin" | "manager" | "employee") {
    setBusy(true);
    const email = `dev-${role}@nexus.local`;
    const password = "DevPassword123!";
    try {
      const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });
      if (signInError) {
        if (
          signInError.message.includes("Invalid login credentials") ||
          signInError.message.includes("User not found")
        ) {
          const { error: signUpError } = await supabase.auth.signUp({
            email,
            password,
            options: {
              data: { full_name: `Developer ${role.charAt(0).toUpperCase() + role.slice(1)}` },
            },
          });
          if (signUpError) throw signUpError;

          const { error: retryError } = await supabase.auth.signInWithPassword({ email, password });
          if (retryError) throw retryError;
        } else {
          throw signInError;
        }
      }
      toast.success(`Logged in as Developer ${role}`);
      router.navigate({ to: "/dashboard", replace: true });
    } catch (err: any) {
      toast.error(err.message || "Developer login failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex min-h-screen w-full">
      <div className="hidden flex-1 flex-col justify-between bg-slate-900 p-12 text-white lg:flex">
        <div className="flex items-center gap-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-white text-slate-900">
            <span className="material-symbols-outlined text-base">corporate_fare</span>
          </div>
          <span className="text-lg font-bold">Nexus HRMS</span>
        </div>
        <div>
          <h2 className="text-4xl font-bold leading-tight">
            The operating system for modern People teams.
          </h2>
          <p className="mt-4 max-w-md text-slate-300">
            Directory, attendance, time-off, recruitment, payroll, learning and Zia AI — all in
            one place.
          </p>
        </div>
        <div className="text-xs text-slate-400">© Nexus HRMS</div>
      </div>
      <div className="flex flex-1 items-center justify-center bg-white p-6">
        <div className="w-full max-w-sm">
          <h1 className="text-2xl font-bold">
            {mode === "signin" ? "Welcome back" : "Create your account"}
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            {mode === "signin"
              ? "Sign in to continue to Nexus HRMS."
              : "Get started with your free workspace."}
          </p>

          <button
            type="button"
            onClick={google}
            disabled={busy}
            className="mt-6 flex w-full items-center justify-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm font-medium hover:bg-slate-50 disabled:opacity-60"
          >
            <img src="https://www.gstatic.com/marketing-cms/assets/images/d5/dc/cfe9ce8b4425b410b49b7f2dd3f3/g.webp=s48-fcrop64=1,00000000ffffffff-rw" alt="" className="h-4 w-4" />
            Continue with Google
          </button>

          <div className="my-5 flex items-center gap-3 text-xs uppercase tracking-wider text-slate-400">
            <div className="h-px flex-1 bg-slate-200" /> or <div className="h-px flex-1 bg-slate-200" />
          </div>

          <form onSubmit={submit} className="space-y-3">
            {mode === "signup" && (
              <>
                <div>
                  <label className="text-xs font-medium text-slate-700">Full name</label>
                  <input
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                    placeholder="Sarah Chen"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-slate-700">Company name (optional)</label>
                  <input
                    value={companyName}
                    onChange={(e) => setCompanyName(e.target.value)}
                    className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                    placeholder="Acme Corporation"
                  />
                </div>
              </>
            )}
            <div>
              <label className="text-xs font-medium text-slate-700">Work email</label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                placeholder="you@company.com"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-slate-700">Password</label>
              <input
                type="password"
                required
                minLength={6}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                placeholder="••••••••"
              />
            </div>
            <button
              type="submit"
              disabled={busy}
              className="w-full rounded-lg bg-slate-900 px-4 py-2.5 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-60"
            >
              {busy ? "Please wait…" : mode === "signin" ? "Sign in" : "Create account"}
            </button>
          </form>

          <p className="mt-4 text-center text-xs text-slate-500">
            {mode === "signin" ? "New here?" : "Already have an account?"}{" "}
            <button
              type="button"
              onClick={() => setMode(mode === "signin" ? "signup" : "signin")}
              className="font-semibold text-blue-700 hover:underline"
            >
              {mode === "signin" ? "Create an account" : "Sign in"}
            </button>
          </p>

          {import.meta.env.DEV && (
            <div className="mt-6 border-t border-slate-200 pt-6">
              <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3 text-center">
                Developer Bypass (No Auth Required)
              </h3>
              <div className="grid grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => handleDevLogin("admin")}
                  disabled={busy}
                  className="rounded-lg border border-red-200 bg-red-50 py-2 text-center text-xs font-bold text-red-700 hover:bg-red-100 disabled:opacity-60"
                >
                  Dev Admin
                </button>
                <button
                  type="button"
                  onClick={() => handleDevLogin("manager")}
                  disabled={busy}
                  className="rounded-lg border border-amber-200 bg-amber-50 py-2 text-center text-xs font-bold text-amber-700 hover:bg-amber-100 disabled:opacity-60"
                >
                  Dev Manager
                </button>
                <button
                  type="button"
                  onClick={() => handleDevLogin("employee")}
                  disabled={busy}
                  className="rounded-lg border border-blue-200 bg-blue-50 py-2 text-center text-xs font-bold text-blue-700 hover:bg-blue-100 disabled:opacity-60"
                >
                  Dev Employee
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
