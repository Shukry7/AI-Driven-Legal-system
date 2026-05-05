import { useEffect, useMemo, useState } from "react";
import { Sidebar } from "@/components/layout/Sidebar";
import { TranslationModule } from "@/components/translation/TranslationModule";
import { ClassificationModule } from "@/components/classification/ClassificationModule";
import { ClassificationProvider } from "@/components/classification/ClassificationContext";
import { useNavigate } from "react-router-dom";
import { Toaster } from "@/components/ui/sonner";
import LegalLineageModule from "@/components/legalLineage/LegalLineageModule";
import { cn } from "@/lib/utils";
import { useAuth } from "@/context/AuthContext";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { supabase } from "@/lib/supabaseClient";
import { Badge } from "@/components/ui/badge";
import { Crown, Sparkles, Zap } from "lucide-react";

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

export default function Index() {
  const { plan } = useAuth();
  const [activeModule, setActiveModule] = useState(plan === "free" ? "clause" : "translation");
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [showUpgrade, setShowUpgrade] = useState(false);
  const [lockedModule, setLockedModule] = useState<string | null>(null);
  const [tiers, setTiers] = useState<MembershipTier[]>([]);
  const [prices, setPrices] = useState<MembershipPrice[]>([]);
  const [billingOptions, setBillingOptions] = useState<BillingOption[]>([]);
  const navigate = useNavigate();
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

      setTiers(tierRes.data ?? []);
      setPrices(priceRes.data ?? []);
      setBillingOptions(billingRes.data ?? []);
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

  const getEffectiveBilling = (tierCode: string) => {
    if (isBillingEnabled(tierCode, "monthly")) return "monthly";
    if (isBillingEnabled(tierCode, "yearly")) return "yearly";
    return "monthly";
  };

  const priceLabel = (value: number, cycle: "monthly" | "yearly") =>
    `$${value}/${cycle === "monthly" ? "month" : "year"}`;

  const lockedModules = useMemo(() => {
    if (plan !== "free") return [];
    return ["translation", "classification"];
  }, [plan]);

  useEffect(() => {
    if (lockedModules.includes(activeModule)) {
      setActiveModule("clause");
      navigate("/clause");
    }
  }, [activeModule, lockedModules, navigate]);

  const handleModuleChange = (module: string) => {
    if (lockedModules.includes(module)) {
      setLockedModule(module);
      setShowUpgrade(true);
      return;
    }
    setActiveModule(module);
    if (module === "clause") navigate("/clause");
    if (module === "cases") navigate("/cases");
  };

  const handleLockedModule = (module: string) => {
    setLockedModule(module);
    setShowUpgrade(true);
  };

  return (
    <div className="min-h-screen bg-background">
      <Sidebar
        activeModule={activeModule}
        onModuleChange={handleModuleChange}
        lockedModules={lockedModules}
        onLockedModule={handleLockedModule}
        collapsed={sidebarCollapsed}
        onCollapsedChange={setSidebarCollapsed}
      />

      <main className={cn(
        "min-h-screen transition-all duration-300",
        sidebarCollapsed ? "ml-20" : "ml-64"
      )}>
        <div className="p-8">
          {activeModule === "translation" && <TranslationModule />}
          {activeModule === "classification" && (
            <ClassificationProvider>
              <ClassificationModule />
            </ClassificationProvider>
          )}
          {activeModule === "legalLineage" && <LegalLineageModule />}

          {activeModule !== "translation" &&
            activeModule !== "clause" &&
            activeModule !== "classification" &&
            activeModule !== "legalLineage" && (
              <div className="flex items-center justify-center h-[calc(100vh-8rem)]">
                <div className="text-center">
                  <h2 className="font-heading text-xl font-bold text-foreground mb-2">
                    {activeModule.charAt(0).toUpperCase() +
                      activeModule.slice(1)}{" "}
                    Module
                  </h2>
                  <p className="text-muted-foreground">
                    This module is under development
                  </p>
                </div>
              </div>
            )}
        </div>
      </main>

      <Toaster />

      <Dialog open={showUpgrade} onOpenChange={setShowUpgrade}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Upgrade required</DialogTitle>
            <DialogDescription>
              {lockedModule === "translation"
                ? "Multilingual Translation is available on Pro and Premium plans."
                : "Risk Classification is available on Pro and Premium plans."}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-5 md:grid-cols-2">
            {(["pro", "premium"] as const).map((tierCode) => {
              const tier = tierByCode.get(tierCode);
              const tierBilling = getEffectiveBilling(tierCode);
              const priceValue =
                priceLookup.get(`${tierCode}:${tierBilling}`)?.price_usd ?? 0;
              if (!tier) return null;

              if (tierCode === "pro") {
                return (
                  <Card
                    key={tierCode}
                    className="relative overflow-hidden rounded-2xl transition-all duration-300 w-full border-primary/20"
                  >
                    <div className="absolute top-0 left-0 w-full h-0.5 bg-gradient-to-r from-primary to-primary/50" />
                    <CardHeader className="text-center pb-3 pt-5">
                      <div className="w-12 h-12 mx-auto bg-gradient-to-br from-primary/20 to-primary/10 rounded-xl flex items-center justify-center mb-3">
                        <Zap className="w-6 h-6 text-primary" />
                      </div>
                      <CardTitle className="text-xl">{tier.name}</CardTitle>
                      <div className="mt-1">
                        <div className="text-2xl font-semibold">
                          {priceLabel(priceValue, tierBilling)}
                        </div>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {tierBilling === "yearly"
                            ? isBillingEnabled(tierCode, "monthly")
                              ? "Save with annual billing"
                              : "Yearly billing only"
                            : isBillingEnabled(tierCode, "yearly")
                              ? "Cancel anytime"
                              : "Monthly billing only"}
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
                      <Button className="w-full" onClick={() => navigate("/membership")}>
                        View {tier.name}
                      </Button>
                    </CardContent>
                  </Card>
                );
              }

              return (
                <Card
                  key={tierCode}
                  className="relative overflow-hidden rounded-2xl transition-all duration-300 w-full border-amber-500/30"
                >
                  <div className="absolute top-0 left-0 w-full h-0.5 bg-gradient-to-r from-amber-500 to-amber-500/50" />
                  <CardHeader className="text-center pb-3 pt-5">
                    <div className="relative">
                      <div className="absolute -top-2 -right-2">
                        <Badge className="bg-amber-500 text-white text-[10px] px-1.5 py-0">
                          Best Value
                        </Badge>
                      </div>
                      <div className="w-12 h-12 mx-auto bg-gradient-to-br from-amber-500/20 to-amber-500/10 rounded-xl flex items-center justify-center mb-3">
                        <Crown className="w-6 h-6 text-amber-500" />
                      </div>
                    </div>
                    <CardTitle className="text-xl">{tier.name}</CardTitle>
                    <div className="mt-1">
                      <div className="text-2xl font-semibold">
                        {priceLabel(priceValue, tierBilling)}
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {tierBilling === "yearly"
                          ? isBillingEnabled(tierCode, "monthly")
                            ? "Save with annual billing"
                            : "Yearly billing only"
                          : isBillingEnabled(tierCode, "yearly")
                            ? "Cancel anytime"
                            : "Monthly billing only"}
                      </p>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4 pb-5">
                    <div className="text-center">
                      <div className="text-xl font-semibold flex items-center justify-center gap-1">
                        {tier.is_unlimited ? "Unlimited" : tier.monthly_tokens ?? 0}
                      </div>
                      <p className="text-xs text-muted-foreground">tokens / month</p>
                    </div>
                    <Button
                      variant="outline"
                      className="w-full"
                      onClick={() => navigate("/membership")}
                    >
                      View {tier.name}
                    </Button>
                  </CardContent>
                </Card>
              );
            })}
          </div>
          {tiers.length === 0 && (
            <div className="flex items-center justify-center rounded-lg border border-dashed p-6 text-sm text-muted-foreground">
              <Sparkles className="mr-2 h-4 w-4" />
              Loading membership offers...
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}