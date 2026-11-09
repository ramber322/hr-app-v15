import { supabase } from "./supabase";

export async function logActivity(action, description, extra = {}) {
  try {
    // ✅ use the user we already have; otherwise fall back to getUser()
    const user = extra.user ?? (await supabase.auth.getUser()).data.user;
    if (!user) {
      console.warn("[logActivity] no user — skipping log:", action);
      return;
    }

    const { error } = await supabase.from("activity_logs").insert({
      user_email: user.email,
      user_role: user.user_metadata?.role ?? "user",
      action,
      description,
      job_id: extra.job_id ?? null,
      metadata: extra.metadata ?? null,
    });

    if (error) {
      console.error("[logActivity] insert failed:", error);
    }
  } catch (err) {
    console.error("[logActivity] error:", err);
  }
}