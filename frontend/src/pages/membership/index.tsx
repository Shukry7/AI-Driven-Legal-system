import { useEffect, useMemo, useState } from "react";
import { AppShell } from "@/components/layout/AppShell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/context/AuthContext";
import { supabase } from "@/lib/supabaseClient";
import { toast } from "sonner";
import { PackageEditorModal } from "@/components/membership/PackageEditorModal";
import {
  CheckCircle2,
  XCircle,
  Sparkles,
  Zap,
  Crown,
  Users,
  Star,
  Shield,
  FileText,
  Languages,
  AlertTriangle,
  GitGraph,
  TrendingUp,
  CreditCard,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface MembershipTier {
  id: string;
  code: string;
  name: string;
  monthly_tokens: number | null;
  is_unlimited: boolean;
}

interface MembershipPrice {
  tier_code: string;
  billing_cycle: "monthly" | "yearly";
  price_usd: number;
}

interface BillingOption {
  tier_code: string;
  billing_cycle: "monthly" | "yearly";
  is_enabled: boolean;
}

const features = [
  {
    name: "Document Analysis",
    icon: FileText,
    description: "AI-powered contract clause detection and analysis",
    free: true,
    pro: true,
    premium: true,
  },
  {
    name: "Multilingual Translation",
    icon: Languages,
    description: "Translate legal documents across multiple languages",
    free: true,
    pro: true,
    premium: true,
  },
  {
    name: "Risk Classification",
    icon: AlertTriangle,
    description: "Automated risk assessment and classification",
    free: true,
    pro: true,
    premium: true,
  },
  {
    name: "Legal Lineage",
    icon: GitGraph,
    description: "Track document history and legal precedence",
    free: true,
    pro: true,
    premium: true,
  },
  {
    name: "Priority Support",
    icon: Shield,
    description: "24/7 priority customer support",
    free: false,
    pro: true,
    premium: true,
  },
  {
    name: "API Access",
    icon: Zap,
    description: "REST API for custom integrations",
    free: false,
    pro: true,
    premium: true,
  },
  {
    name: "Team Collaboration",
    icon: Users,
    description: "Share and collaborate with team members",
    free: false,
    pro: false,
    premium: true,
  },
  {
    name: "Custom Workflows",
    icon: TrendingUp,
    description: "Create custom automation workflows",
    free: false,
    pro: false,
    premium: true,
  },
];

const CORE_TIERS = ["free", "pro", "premium"];

export default function MembershipPage() {
  const { plan, refreshTokens, isAdmin } = useAuth();
  const [billing, setBilling] = useState<"monthly" | "yearly">("monthly");
  const [hoveredPlan, setHoveredPlan] = useState<string | null>(null);
  const [showEditor, setShowEditor] = useState(false);
  const [tiers, setTiers] = useState<MembershipTier[]>([]);
  const [prices, setPrices] = useState<MembershipPrice[]>([]);
  const [billingOptions, setBillingOptions] = useState<BillingOption[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadMembership = async () => {
      const [tierRes, priceRes, billingRes] = await Promise.all([
        supabase
          .from("membership_tiers")
          .select("id, code, name, monthly_tokens, is_unlimited"),
        supabase
          .from("membership_prices")
          .select("tier_code, billing_cycle, price_usd"),
        supabase
          .from("membership_billing_options")
          .select("tier_code, billing_cycle, is_enabled"),
      ]);

      if (tierRes.error) toast.error(tierRes.error.message);
      if (priceRes.error) toast.error(priceRes.error.message);
      if (billingRes.error) toast.error(billingRes.error.message);

      setTiers(tierRes.data ?? []);
      setPrices(priceRes.data ?? []);
      setBillingOptions(billingRes.data ?? []);
      setLoading(false);
    };

    void loadMembership();
  }, []);

  const priceLookup = useMemo(() => {
    const map = new Map<string, MembershipPrice>();
    prices.forEach((price) => {
      map.set(`${price.tier_code}:${price.billing_cycle}`, price);
    });
    return map;
  }, [prices]);

  const tierByCode = useMemo(() => {
    const map = new Map<string, MembershipTier>();
    tiers.forEach((tier) => map.set(tier.code, tier));
    return map;
  }, [tiers]);

  const billingOptionLookup = useMemo(() => {
    const map = new Map<string, boolean>();
    billingOptions.forEach((option) => {
      map.set(`${option.tier_code}:${option.billing_cycle}`, option.is_enabled);
    });
    return map;
  }, [billingOptions]);

  const isBillingEnabled = (tierCode: string, cycle: "monthly" | "yearly") =>
    billingOptionLookup.get(`${tierCode}:${cycle}`) ?? true;

  const availableBillingCycles = useMemo(() => {
    const cycles = new Set<"monthly" | "yearly">();
    billingOptions.forEach((option) => {
      if (option.is_enabled) cycles.add(option.billing_cycle);
    });
    if (cycles.size === 0) {
      cycles.add("monthly");
      cycles.add("yearly");
    }
    return Array.from(cycles);
  }, [billingOptions]);

  useEffect(() => {
    if (!availableBillingCycles.includes(billing) && availableBillingCycles.length > 0) {
      setBilling(availableBillingCycles[0]);
    }
  }, [availableBillingCycles, billing]);

  const priceLabel = (value: number, cycle: "monthly" | "yearly") =>
    `$${value}/${cycle === "monthly" ? "month" : "year"}`;

  const getEffectiveBilling = (tierCode: string) => {
    if (isBillingEnabled(tierCode, billing)) return billing;
    const fallback = billing === "monthly" ? "yearly" : "monthly";
    return isBillingEnabled(tierCode, fallback) ? fallback : billing;
  };
  
  const getSavings = () => {
    if (
      billing === "yearly" &&
      isBillingEnabled("pro", "yearly") &&
      isBillingEnabled("pro", "monthly")
    ) {
      const monthlyTotal = (priceLookup.get("pro:monthly")?.price_usd ?? 0) * 12;
      const yearlyPrice = priceLookup.get("pro:yearly")?.price_usd ?? 0;
      if (monthlyTotal === 0) return 0;
      const savings = ((monthlyTotal - yearlyPrice) / monthlyTotal) * 100;
      return Math.round(savings);
    }
    return 0;
  };

  const handleSubscribe = async (tierCode: string) => {
    if (isAdmin) return;
    const tier = tierByCode.get(tierCode);
    if (!tier) return;
    const user = (await supabase.auth.getUser()).data.user;
    if (!user) return;
    const { error } = await supabase
      .from("user_memberships")
      .update({ tier_id: tier.id })
      .eq("user_id", user.id);

    if (error) {
      toast.error(error.message || "Failed to update membership");
      return;
    }

    await refreshTokens();
    toast.success("Membership updated");
  };

  const savings = getSavings();
  const canToggleBilling = availableBillingCycles.length > 1;
  const proBilling = getEffectiveBilling("pro");
  const premiumBilling = getEffectiveBilling("premium");

  const seasonalTiers = useMemo(() => {
    return tiers.filter((tier) => !CORE_TIERS.includes(tier.code));
  }, [tiers]);

  return (
    <AppShell activeModule="membership">
      <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5">
        <div className="max-w-7xl mx-auto space-y-8 p-6">
          {/* Header Section */}
          <div className="text-center space-y-4">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-sm font-medium">
              <Sparkles className="w-4 h-4" />
              Choose Your Plan
            </div>
            <h1 className="text-4xl font-bold bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text text-transparent">
              Membership Plans
            </h1>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              {isAdmin
                ? "Pricing overview for all packages. Update values from the admin console."
                : "Select the perfect plan for your legal practice. All plans include core AI features with different token allocations and additional benefits."}
            </p>
            {isAdmin && (
              <div>
                <Button variant="outline" onClick={() => setShowEditor(true)}>
                  Edit package information
                </Button>
              </div>
            )}
          </div>

          {/* Billing Toggle */}
          <div className="flex justify-center">
            <div className="relative inline-flex rounded-lg bg-muted/30 p-1 gap-1">
              {/* Animated background indicator */}
              <div 
                className={cn(
                  "absolute top-1 bottom-1 w-[calc(50%-4px)] rounded-md bg-sidebar-accent shadow-sm transition-all duration-300 ease-out",
                  billing === "monthly" ? "left-1" : "left-[calc(50%+2px)]"
                )}
              />
              
              <button
                onClick={() => canToggleBilling && setBilling("monthly")}
                disabled={!canToggleBilling || !availableBillingCycles.includes("monthly")}
                className={cn(
                  "relative z-10 px-6 py-2 text-sm font-medium rounded-md transition-all duration-200",
                  billing === "monthly"
                    ? "text-sidebar-foreground"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted/50",
                  (!canToggleBilling || !availableBillingCycles.includes("monthly")) && "opacity-40 cursor-not-allowed"
                )}
              >
                Monthly
              </button>
              
              <button
                onClick={() => canToggleBilling && setBilling("yearly")}
                disabled={!canToggleBilling || !availableBillingCycles.includes("yearly")}
                className={cn(
                  "relative z-10 px-6 py-2 text-sm font-medium rounded-md transition-all duration-200",
                  billing === "yearly"
                    ? "text-sidebar-foreground"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted/50",
                  (!canToggleBilling || !availableBillingCycles.includes("yearly")) && "opacity-40 cursor-not-allowed"
                )}
              >
                Yearly
                {savings > 0 && billing === "yearly" && (
                  <Badge variant="secondary" className="ml-2 bg-primary/10 text-primary text-[10px]">
                    Save {savings}%
                  </Badge>
                )}
              </button>
            </div>
          </div>

          {/* Pricing Cards */}
            <div className="flex justify-center items-center mt-6">
            <div className="grid gap-5 md:grid-cols-3 max-w-4xl mx-auto">
                {/* Free Plan */}
                <Card 
                className={`relative overflow-hidden transition-all duration-300 w-64 ${
                    plan === "free" 
                    ? "border-primary shadow-md" 
                    : "hover:shadow-lg hover:-translate-y-1"
                }`}
                onMouseEnter={() => setHoveredPlan("free")}
                onMouseLeave={() => setHoveredPlan(null)}
                >
                {!isAdmin && plan === "free" && (
                    <div className="absolute top-0 right-0">
                    <div className="bg-primary text-primary-foreground px-2 py-0.5 rounded-bl-md text-[10px] font-medium">
                        Current
                    </div>
                    </div>
                )}
                <CardHeader className="text-center pb-3 pt-5">
                    <div className="w-12 h-12 mx-auto bg-gradient-to-br from-gray-500/10 to-gray-500/5 rounded-xl flex items-center justify-center mb-3">
                    <Star className="w-6 h-6 text-gray-500" />
                    </div>
                    <CardTitle className="text-xl">Free</CardTitle>
                    <div className="mt-1">
                    <div className="text-2xl font-semibold">$0</div>
                    <p className="text-xs text-muted-foreground mt-0.5">Forever free</p>
                    </div>
                </CardHeader>
                <CardContent className="space-y-4 pb-5">
                    <div className="text-center">
                    <div className="text-xl font-semibold">
                      {tierByCode.get("free")?.is_unlimited
                        ? "Unlimited"
                        : tierByCode.get("free")?.monthly_tokens ?? 0}
                    </div>
                    <p className="text-xs text-muted-foreground">tokens / month</p>
                    </div>
                    {!isAdmin && (
                      <Button 
                        variant="outline" 
                        disabled={plan === "free"}
                        size="sm"
                        className="w-full transition-all duration-200 h-8 text-sm"
                        onClick={() => handleSubscribe("free")}
                      >
                        {plan === "free" ? "Current Plan" : "Downgrade"}
                      </Button>
                    )}
                </CardContent>
                </Card>

                {/* Pro Plan */}
                <Card 
                className={`relative overflow-hidden transition-all duration-300 w-64 ${
                    plan === "pro" 
                    ? "border-primary shadow-md" 
                    : "hover:shadow-lg hover:-translate-y-1"
                }`}
                onMouseEnter={() => setHoveredPlan("pro")}
                onMouseLeave={() => setHoveredPlan(null)}
                >
                {!isAdmin && plan === "pro" && (
                    <div className="absolute top-0 right-0">
                    <div className="bg-primary text-primary-foreground px-2 py-0.5 rounded-bl-md text-[10px] font-medium">
                        Current
                    </div>
                    </div>
                )}
                <div className="absolute top-0 left-0 w-full h-0.5 bg-gradient-to-r from-primary to-primary/50" />
                <CardHeader className="text-center pb-3 pt-5">
                    <div className="w-12 h-12 mx-auto bg-gradient-to-br from-primary/20 to-primary/10 rounded-xl flex items-center justify-center mb-3">
                    <Zap className="w-6 h-6 text-primary" />
                    </div>
                    <CardTitle className="text-xl">Pro</CardTitle>
                    <div className="mt-1">
                    <div className="text-2xl font-semibold">
                      {priceLabel(priceLookup.get(`pro:${proBilling}`)?.price_usd ?? 0, proBilling)}
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">
                        {proBilling === "yearly" ? (
                          isBillingEnabled("pro", "monthly") ? (
                            <span className="text-green-600 dark:text-green-400 text-[11px]">
                              Save ${
                                (priceLookup.get("pro:monthly")?.price_usd ?? 0) * 12 -
                                (priceLookup.get("pro:yearly")?.price_usd ?? 0)
                              }/yr
                            </span>
                          ) : (
                            "Yearly billing only"
                          )
                        ) : isBillingEnabled("pro", "yearly") ? (
                          "Cancel anytime"
                        ) : (
                          "Monthly billing only"
                        )}
                    </p>
                    </div>
                </CardHeader>
                <CardContent className="space-y-4 pb-5">
                    <div className="text-center">
                    <div className="text-xl font-semibold">
                      {tierByCode.get("pro")?.is_unlimited
                        ? "Unlimited"
                        : tierByCode.get("pro")?.monthly_tokens ?? 0}
                    </div>
                    <p className="text-xs text-muted-foreground">tokens / month</p>
                    </div>
                    {!isAdmin && (
                      <Button 
                        variant={plan === "pro" ? "outline" : "default"}
                        disabled={plan === "pro"}
                        size="sm"
                        className="w-full transition-all duration-200 h-8 text-sm"
                        onClick={() => handleSubscribe("pro")}
                      >
                        {plan === "pro" ? "Current Plan" : "Upgrade to Pro"}
                      </Button>
                    )}
                </CardContent>
                </Card>

                {/* Premium Plan */}
                <Card 
                className={`relative overflow-hidden transition-all duration-300 w-64 ${
                    plan === "premium" 
                    ? "border-primary shadow-md" 
                    : "hover:shadow-lg hover:-translate-y-1"
                }`}
                onMouseEnter={() => setHoveredPlan("premium")}
                onMouseLeave={() => setHoveredPlan(null)}
                >
                {!isAdmin && plan === "premium" && (
                    <div className="absolute top-0 right-0">
                    <div className="bg-primary text-primary-foreground px-2 py-0.5 rounded-bl-md text-[10px] font-medium">
                        Current
                    </div>
                    </div>
                )}
                <div className="absolute top-0 left-0 w-full h-0.5 bg-gradient-to-r from-amber-500 to-amber-500/50" />
                <CardHeader className="text-center pb-3 pt-5">
                    <div className="relative">
                    <div className="absolute -top-2 -right-2">
                        <Badge className="bg-amber-500 text-white text-[10px] px-1.5 py-0">Best Value</Badge>
                    </div>
                    <div className="w-12 h-12 mx-auto bg-gradient-to-br from-amber-500/20 to-amber-500/10 rounded-xl flex items-center justify-center mb-3">
                        <Crown className="w-6 h-6 text-amber-500" />
                    </div>
                    </div>
                    <CardTitle className="text-xl">Premium</CardTitle>
                    <div className="mt-1">
                    <div className="text-2xl font-semibold">
                      {priceLabel(
                        priceLookup.get(`premium:${premiumBilling}`)?.price_usd ?? 0,
                        premiumBilling,
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">
                        {premiumBilling === "yearly" ? (
                          isBillingEnabled("premium", "monthly") ? (
                            <span className="text-green-600 dark:text-green-400 text-[11px]">
                              Save ${
                                (priceLookup.get("premium:monthly")?.price_usd ?? 0) * 12 -
                                (priceLookup.get("premium:yearly")?.price_usd ?? 0)
                              }/yr
                            </span>
                          ) : (
                            "Yearly billing only"
                          )
                        ) : isBillingEnabled("premium", "yearly") ? (
                          "Cancel anytime"
                        ) : (
                          "Monthly billing only"
                        )}
                    </p>
                    </div>
                </CardHeader>
                <CardContent className="space-y-4 pb-5">
                    <div className="text-center">
                    <div className="text-xl font-semibold flex items-center justify-center gap-1">
                      {tierByCode.get("premium")?.is_unlimited
                        ? "Unlimited"
                        : tierByCode.get("premium")?.monthly_tokens ?? 0}
                    </div>
                    <p className="text-xs text-muted-foreground">tokens / month</p>
                    </div>
                    {!isAdmin && (
                      <Button 
                        variant={plan === "premium" ? "outline" : "default"}
                        disabled={plan === "premium"}
                        size="sm"
                        className="w-full transition-all duration-200 h-8 text-sm bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700"
                        onClick={() => handleSubscribe("premium")}
                      >
                        {plan === "premium" ? "Current Plan" : "Upgrade to Premium"}
                      </Button>
                    )}
                </CardContent>
                </Card>
            </div>
            </div>

          {seasonalTiers.length > 0 && (
            <>
              <div className="flex items-center gap-4 pt-6">
                <div className="h-px flex-1 bg-border" />
                <span className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
                  Seasonal offers
                </span>
                <div className="h-px flex-1 bg-border" />
              </div>
              <div className="flex justify-center items-center mt-6">
                <div className={cn(
                  "grid gap-5 mx-auto",
                  seasonalTiers.length === 1 && "grid-cols-1",
                  seasonalTiers.length === 2 && "grid-cols-1 md:grid-cols-2",
                  seasonalTiers.length >= 3 && "grid-cols-1 md:grid-cols-2 lg:grid-cols-3",
                  "max-w-5xl"
                )}>
                  {seasonalTiers.map((tier) => {
                    const tierBilling = getEffectiveBilling(tier.code);
                    const priceValue =
                      priceLookup.get(`${tier.code}:${tierBilling}`)?.price_usd ?? 0;
                    return (
                      <Card
                        key={tier.id}
                        className="relative overflow-hidden transition-all duration-300 w-64 mx-auto border border-indigo-500/30 bg-indigo-500/5 shadow-sm hover:shadow-lg hover:-translate-y-1"
                        onMouseEnter={() => setHoveredPlan(tier.code)}
                        onMouseLeave={() => setHoveredPlan(null)}
                      >
                        {!isAdmin && plan === tier.code && (
                          <div className="absolute top-0 right-0">
                            <div className="bg-indigo-600 text-white px-2 py-0.5 rounded-bl-md text-[10px] font-medium">
                              Current
                            </div>
                          </div>
                        )}
                        <div className="absolute top-0 left-0 w-full h-0.5 bg-gradient-to-r from-indigo-500 to-indigo-500/50" />
                        <CardHeader className="text-center pb-3 pt-5">
                          <div className="w-12 h-12 mx-auto bg-indigo-500/15 rounded-xl flex items-center justify-center mb-3">
                            <Sparkles className="w-6 h-6 text-indigo-500" />
                          </div>
                          <CardTitle className="text-xl">{tier.name}</CardTitle>
                          <div className="mt-1">
                            <div className="text-2xl font-semibold">
                              {priceLabel(priceValue, tierBilling)}
                            </div>
                            <p className="text-xs text-muted-foreground mt-0.5">
                              {tierBilling === "yearly" ? (
                                isBillingEnabled(tier.code, "monthly") ? (
                                  <span className="text-green-600 dark:text-green-400 text-[11px]">
                                    Save ${(priceLookup.get(`${tier.code}:monthly`)?.price_usd ?? 0) * 12 -
                                      (priceLookup.get(`${tier.code}:yearly`)?.price_usd ?? 0)}/yr
                                  </span>
                                ) : (
                                  "Yearly billing only"
                                )
                              ) : isBillingEnabled(tier.code, "yearly") ? (
                                "Cancel anytime"
                              ) : (
                                "Monthly billing only"
                              )}
                            </p>
                          </div>
                        </CardHeader>
                        <CardContent className="space-y-4 pb-5">
                          <div className="text-center">
                            <div className="text-xl font-semibold">
                              {tier.is_unlimited ? "Unlimited" : tier.monthly_tokens ?? 0}
                            </div>
                            <p className="text-xs text-muted-foreground">tokens / month</p>
                          </div>
                          {!isAdmin && (
                            <Button
                              variant={plan === tier.code ? "outline" : "default"}
                              disabled={plan === tier.code}
                              size="sm"
                              className="w-full transition-all duration-200 h-8 text-sm"
                              onClick={() => handleSubscribe(tier.code)}
                            >
                              {plan === tier.code ? "Current Plan" : "Choose plan"}
                            </Button>
                          )}
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              </div>
            </>
          )}

          {/* Features Comparison Table */}
          <Card className="mt-12 overflow-hidden">
            <CardHeader className="bg-muted/30">
              <CardTitle className="flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-primary" />
                Features & Benefits
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b bg-muted/20">
                      <th className="text-left p-4 font-semibold">Feature</th>
                      <th className="text-center p-4 font-semibold w-24">Free</th>
                      <th className="text-center p-4 font-semibold w-24">Pro</th>
                      <th className="text-center p-4 font-semibold w-24">Premium</th>
                    </tr>
                  </thead>
                  <tbody>
                    {features.map((feature, idx) => {
                      const Icon = feature.icon;
                      return (
                        <tr key={idx} className="border-b hover:bg-muted/20 transition-colors">
                          <td className="p-4">
                            <div className="flex items-center gap-3">
                              <Icon className="w-5 h-5 text-muted-foreground" />
                              <div>
                                <div className="font-medium">{feature.name}</div>
                                <div className="text-xs text-muted-foreground">{feature.description}</div>
                              </div>
                            </div>
                          </td>
                          <td className="text-center p-4">
                            {feature.free ? (
                              <CheckCircle2 className="w-5 h-5 text-green-500 mx-auto" />
                            ) : (
                              <XCircle className="w-5 h-5 text-muted-foreground/30 mx-auto" />
                            )}
                          </td>
                          <td className="text-center p-4">
                            {feature.pro ? (
                              <CheckCircle2 className="w-5 h-5 text-green-500 mx-auto" />
                            ) : (
                              <XCircle className="w-5 h-5 text-muted-foreground/30 mx-auto" />
                            )}
                          </td>
                          <td className="text-center p-4">
                            {feature.premium ? (
                              <CheckCircle2 className="w-5 h-5 text-green-500 mx-auto" />
                            ) : (
                              <XCircle className="w-5 h-5 text-muted-foreground/30 mx-auto" />
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>

          {/* FAQ Section */}
          <Card className="mt-8">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CreditCard className="w-5 h-5 text-primary" />
                Frequently Asked Questions
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <h4 className="font-semibold flex items-center gap-2">
                    Can I change my plan later?
                  </h4>
                  <p className="text-sm text-muted-foreground">
                    Yes, you can upgrade or downgrade your plan at any time. Changes take effect immediately.
                  </p>
                </div>
                  <PackageEditorModal open={showEditor} onOpenChange={setShowEditor} />
                <div className="space-y-2">
                  <h4 className="font-semibold flex items-center gap-2">
                    What payment methods do you accept?
                  </h4>
                  <p className="text-sm text-muted-foreground">
                    We accept all major credit cards, PayPal, and bank transfers for annual plans.
                  </p>
                </div>
                <div className="space-y-2">
                  <h4 className="font-semibold flex items-center gap-2">
                    What does "unlimited tokens" mean?
                  </h4>
                  <p className="text-sm text-muted-foreground">
                    Premium plan users have no monthly token limits, allowing unrestricted access to all AI features.
                  </p>
                </div>
                <div className="space-y-2">
                  <h4 className="font-semibold flex items-center gap-2">
                    Is there a refund policy?
                  </h4>
                  <p className="text-sm text-muted-foreground">
                    We offer a 14-day money-back guarantee for monthly plans and 30-day for annual plans.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Footer Note */}
          <div className="text-center pt-8 pb-4">
            <p className="text-xs text-muted-foreground">
              All prices are in USD. Taxes may apply based on your location.
              Need a custom plan? <Button variant="link" className="text-xs p-0 h-auto">Contact our sales team</Button>
            </p>
          </div>
        </div>
      </div>
    </AppShell>
  );
}