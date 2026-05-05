import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabaseClient";
import { PLAN_LIMITS, type PlanTier } from "@/lib/tokenPolicy";

interface AuthContextType {
  session: Session | null;
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  isAdmin: boolean;
  isApproved: boolean;
  plan: PlanTier;
  monthlyLimit: number;
  tokensUsed: number;
  tokensRemaining: number;
  refreshTokens: () => Promise<void>;
  canConsumeTokens: (amount: number) => boolean;
  consumeTokens: (
    amount: number,
    reason?: string,
  ) => Promise<{ ok: boolean; error?: string }>;
  login: (email: string, password: string) => Promise<{ error?: string }>;
  register: (
    email: string,
    password: string,
    details: {
      phone: string;
      profession: string;
      professionOther?: string;
      professionalIdNumber?: string;
    },
  ) => Promise<{ error?: string; needsEmailConfirmation?: boolean }>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [plan, setPlan] = useState<PlanTier>("free");
  const [monthlyLimit, setMonthlyLimit] = useState<number>(PLAN_LIMITS.free);
  const [tokensUsed, setTokensUsed] = useState(0);
  const [tokensRemaining, setTokensRemaining] = useState<number>(PLAN_LIMITS.free);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isApproved, setIsApproved] = useState(true);

  const applySnapshot = (snapshot?: {
    tier_code?: string | null;
    monthly_limit?: number | null;
    tokens_used?: number | null;
    tokens_remaining?: number | null;
    is_unlimited?: boolean | null;
  } | null) => {
    if (!snapshot) {
      setPlan("free");
      setMonthlyLimit(PLAN_LIMITS.free);
      setTokensUsed(0);
      setTokensRemaining(PLAN_LIMITS.free);
      return;
    }

    const nextPlan = (snapshot.tier_code as PlanTier | undefined) ?? "free";
    const unlimited = Boolean(snapshot.is_unlimited);
    const limit = unlimited
      ? Number.POSITIVE_INFINITY
      : Number(snapshot.monthly_limit ?? PLAN_LIMITS[nextPlan]);
    const used = Number(snapshot.tokens_used ?? 0);
    const remaining = unlimited
      ? Number.POSITIVE_INFINITY
      : Number(snapshot.tokens_remaining ?? Math.max(limit - used, 0));

    setPlan(nextPlan);
    setMonthlyLimit(limit);
    setTokensUsed(used);
    setTokensRemaining(remaining);
  };

  const refreshTokenSnapshot = useCallback(async (userId?: string) => {
    if (!userId) return;
    const { data, error } = await supabase.rpc("get_token_snapshot", {
      p_user_id: userId,
    });
    if (error) {
      console.error("Token snapshot error", error);
      return;
    }
    const snapshot = Array.isArray(data) ? data[0] : data;
    applySnapshot(snapshot ?? null);
  }, []);

  useEffect(() => {
    let isMounted = true;

    supabase.auth
      .getSession()
      .then(({ data }) => {
        if (!isMounted) return;
        setSession(data.session ?? null);
        setUser(data.session?.user ?? null);
      })
      .finally(() => {
        if (isMounted) setIsLoading(false);
      });

    const { data: authListener } = supabase.auth.onAuthStateChange(
      (_event, nextSession) => {
        setSession(nextSession);
        setUser(nextSession?.user ?? null);
      },
    );

    return () => {
      isMounted = false;
      authListener.subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (!user) {
      setPlan("free");
      setTokensUsed(0);
      setMonthlyLimit(PLAN_LIMITS.free);
      setTokensRemaining(PLAN_LIMITS.free);
      setIsAdmin(false);
      setIsApproved(true);
      return;
    }
    refreshTokenSnapshot(user.id);
    (async () => {
      try {
        const { data } = await supabase
          .from("profiles")
          .select("is_admin, approval_status")
          .eq("id", user.id)
          .single();
        setIsAdmin(Boolean(data?.is_admin));
        const approved = data?.approval_status === "approved";
        setIsApproved(approved);
        if (!approved) {
          await supabase.auth.signOut();
        }
      } catch {
        setIsAdmin(false);
        setIsApproved(true);
      }
    })();
  }, [refreshTokenSnapshot, user]);

  const login = async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    if (error) return { error: error.message };

    const userId = data.user?.id;
    if (!userId) return { error: "Unable to verify account" };

    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("approval_status, approval_reason")
      .eq("id", userId)
      .single();

    if (profileError) {
      await supabase.auth.signOut();
      return { error: "Unable to verify approval status" };
    }

    if (profile?.approval_status !== "approved") {
      await supabase.auth.signOut();
      if (profile?.approval_status === "rejected") {
        return {
          error: profile.approval_reason
            ? `Registration rejected: ${profile.approval_reason}`
            : "Registration rejected. Please contact support.",
        };
      }
      return { error: "Your registration is pending approval. Please wait." };
    }

    return {};
  };

  const register = async (
    email: string,
    password: string,
    details: {
      phone: string;
      profession: string;
      professionOther?: string;
      professionalIdNumber?: string;
    },
  ) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: window.location.origin,
        data: {
          phone: details.phone,
          profession: details.profession,
          profession_other: details.professionOther ?? "",
          professional_id_number: details.professionalIdNumber ?? "",
          approval_status: "pending",
        },
      },
    });

    if (data.session) {
      await supabase.auth.signOut();
    }
    return {
      error: error?.message,
      needsEmailConfirmation: Boolean(data.user && !data.session),
    };
  };

  const logout = async () => {
    await supabase.auth.signOut();
  };

  const canConsumeTokens = useCallback(
    (amount: number) => {
      if (monthlyLimit === Number.POSITIVE_INFINITY) return true;
      return tokensRemaining >= amount;
    },
    [monthlyLimit, tokensRemaining],
  );

  const consumeTokens = useCallback(async (amount: number, reason?: string) => {
    if (!user) {
      return { ok: false, error: "Authentication required" };
    }

    const { data, error } = await supabase.rpc("consume_tokens", {
      p_feature: reason ?? "usage",
      p_amount: amount,
    });

    if (error) {
      return { ok: false, error: error.message };
    }

    const snapshot = Array.isArray(data) ? data[0] : data;
    if (!snapshot?.ok) {
      return { ok: false, error: "Insufficient tokens" };
    }

    applySnapshot(snapshot ?? null);
    await refreshTokenSnapshot(user.id);
    return { ok: true };
  }, [refreshTokenSnapshot, user]);

  const refreshTokens = useCallback(async () => {
    if (!user) return;
    await refreshTokenSnapshot(user.id);
  }, [refreshTokenSnapshot, user]);

  const value = useMemo(
    () => ({
      session,
      user,
      isAuthenticated: Boolean(user) && isApproved,
      isLoading,
      isAdmin,
      isApproved,
      plan,
      monthlyLimit,
      tokensUsed,
      tokensRemaining,
      refreshTokens,
      canConsumeTokens,
      consumeTokens,
      login,
      register,
      logout,
    }),
    [
      session,
      user,
      isLoading,
      isAdmin,
      isApproved,
      plan,
      monthlyLimit,
      tokensUsed,
      tokensRemaining,
      refreshTokens,
      canConsumeTokens,
      consumeTokens,
    ],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
