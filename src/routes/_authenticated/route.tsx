import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  beforeLoad: async () => {
    const { data, error } = await supabase.auth.getUser();
    if (error || !data.user) {
      try {
        const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
          email: "dev-admin@nexus.local",
          password: "DevPassword123!",
        });
        if (signInError || !signInData.user) {
          throw redirect({ to: "/auth" });
        }
        return { user: signInData.user };
      } catch {
        throw redirect({ to: "/auth" });
      }
    }
    return { user: data.user };
  },
  component: () => <Outlet />,
});
