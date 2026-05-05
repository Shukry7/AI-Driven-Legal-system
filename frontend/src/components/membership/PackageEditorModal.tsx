import { useEffect, useMemo, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { supabase } from "@/lib/supabaseClient";
import { toast } from "sonner";

interface PackageEditorModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

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

interface EditableTier extends MembershipTier {
  price_monthly: number;
  price_yearly: number;
  enable_monthly: boolean;
  enable_yearly: boolean;
}

const emptyNewTier = () => ({
  code: "",
  name: "",
  monthly_tokens: 0,
  is_unlimited: false,
  price_monthly: 0,
  price_yearly: 0,
  enable_monthly: true,
  enable_yearly: true,
});

const CORE_TIERS = ["free", "pro", "premium"];

export function PackageEditorModal({ open, onOpenChange }: PackageEditorModalProps) {
  const [tiers, setTiers] = useState<EditableTier[]>([]);
  const [newTier, setNewTier] = useState(emptyNewTier());
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const priceMap = useMemo(() => {
    const map = new Map<string, MembershipPrice>();
    tiers.forEach((tier) => {
      map.set(`${tier.code}:monthly`, {
        tier_code: tier.code,
        billing_cycle: "monthly",
        price_usd: tier.price_monthly,
      });
      map.set(`${tier.code}:yearly`, {
        tier_code: tier.code,
        billing_cycle: "yearly",
        price_usd: tier.price_yearly,
      });
    });
    return map;
  }, [tiers]);

  useEffect(() => {
    if (!open) return;
    const load = async () => {
      setLoading(true);
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

      const prices = priceRes.data ?? [];
      const billingOptions: BillingOption[] = billingRes.data ?? [];
      const tierData = (tierRes.data ?? []).map((tier) => {
        const monthly = prices.find(
          (p) => p.tier_code === tier.code && p.billing_cycle === "monthly",
        )?.price_usd ?? 0;
        const yearly = prices.find(
          (p) => p.tier_code === tier.code && p.billing_cycle === "yearly",
        )?.price_usd ?? 0;
        const enableMonthly = billingOptions.find(
          (b) => b.tier_code === tier.code && b.billing_cycle === "monthly",
        )?.is_enabled ?? true;
        const enableYearly = billingOptions.find(
          (b) => b.tier_code === tier.code && b.billing_cycle === "yearly",
        )?.is_enabled ?? true;
        return {
          ...tier,
          price_monthly: Number(monthly),
          price_yearly: Number(yearly),
          enable_monthly: enableMonthly,
          enable_yearly: enableYearly,
        };
      });

      setTiers(tierData);
      setLoading(false);
    };

    void load();
  }, [open]);

  const updateTier = (id: string, updates: Partial<EditableTier>) => {
    setTiers((prev) =>
      prev.map((tier) => (tier.id === id ? { ...tier, ...updates } : tier)),
    );
  };

  const handleRemove = async (id: string) => {
    const tier = tiers.find((t) => t.id === id);
    if (tier && CORE_TIERS.includes(tier.code)) {
      toast.error("Core packages cannot be removed");
      return;
    }
    const { error } = await supabase
      .from("membership_tiers")
      .delete()
      .eq("id", id);

    if (error) {
      toast.error(error.message || "Failed to remove package");
      return;
    }

    setTiers((prev) => prev.filter((tier) => tier.id !== id));
    toast.success("Package removed");
  };

  const handleAdd = async () => {
    if (!newTier.code.trim() || !newTier.name.trim()) {
        toast.error("Code and name are required");
        return;
    }

    // Store values before async operations to prevent any race conditions
    const tierCode = newTier.code.trim();
    const tierName = newTier.name.trim();
    const tierMonthlyTokens = newTier.is_unlimited ? null : Number(newTier.monthly_tokens);
    const tierIsUnlimited = newTier.is_unlimited;
    const tierPriceMonthly = newTier.price_monthly;
    const tierPriceYearly = newTier.price_yearly;
    const tierEnableMonthly = newTier.enable_monthly;
    const tierEnableYearly = newTier.enable_yearly;

    const { data, error } = await supabase
        .from("membership_tiers")
        .insert({
        code: tierCode,
        name: tierName,
        monthly_tokens: tierMonthlyTokens,
        is_unlimited: tierIsUnlimited,
        })
        .select("id, code, name, monthly_tokens, is_unlimited")
        .single();

    if (error || !data) {
        toast.error(error?.message || "Failed to add package");
        return;
    }

    // Insert billing options
    await supabase.from("membership_billing_options").upsert([
        { tier_code: data.code, billing_cycle: "monthly", is_enabled: tierEnableMonthly },
        { tier_code: data.code, billing_cycle: "yearly", is_enabled: tierEnableYearly },
    ], { onConflict: "tier_code,billing_cycle" });

    // Insert prices only for enabled cycles
    const pricesToUpsert = [];
    if (tierEnableMonthly) {
        pricesToUpsert.push({ 
        tier_code: data.code, 
        billing_cycle: "monthly", 
        price_usd: tierPriceMonthly 
        });
    }
    if (tierEnableYearly) {
        pricesToUpsert.push({ 
        tier_code: data.code, 
        billing_cycle: "yearly", 
        price_usd: tierPriceYearly 
        });
    }
    if (pricesToUpsert.length) {
        await supabase.from("membership_prices").upsert(pricesToUpsert, { 
        onConflict: "tier_code,billing_cycle" 
        });
    }

    // Add the new tier to the state using the stored values, NOT the response data
    setTiers((prev) => [
        ...prev,
        {
        id: data.id, // Use the ID from response
        code: data.code, // Use the code from response (should match what we sent)
        name: data.name, // Use the name from response (should match what we sent)
        monthly_tokens: tierMonthlyTokens,
        is_unlimited: tierIsUnlimited,
        price_monthly: tierPriceMonthly,
        price_yearly: tierPriceYearly,
        enable_monthly: tierEnableMonthly,
        enable_yearly: tierEnableYearly,
        },
    ]);
    
    setNewTier(emptyNewTier());
    toast.success("Package added");
    };

  const handleSave = async () => {
    setSaving(true);
    const tierUpdates = await Promise.all(
      tiers.map((tier) =>
        supabase
          .from("membership_tiers")
          .update({
            name: tier.name,
            monthly_tokens: tier.is_unlimited ? null : tier.monthly_tokens,
            is_unlimited: tier.is_unlimited,
          })
          .eq("id", tier.id),
      ),
    );

    const billingUpdates = await Promise.all(
      tiers.flatMap((tier) => [
        supabase
          .from("membership_billing_options")
          .upsert(
            { tier_code: tier.code, billing_cycle: "monthly", is_enabled: tier.enable_monthly },
            { onConflict: "tier_code,billing_cycle" },
          ),
        supabase
          .from("membership_billing_options")
          .upsert(
            { tier_code: tier.code, billing_cycle: "yearly", is_enabled: tier.enable_yearly },
            { onConflict: "tier_code,billing_cycle" },
          ),
      ]),
    );

    const priceUpdates = await Promise.all(
      tiers.flatMap((tier) => {
        const upserts = [];
        if (tier.enable_monthly) {
          upserts.push(
            supabase
              .from("membership_prices")
              .upsert(
                {
                  tier_code: tier.code,
                  billing_cycle: "monthly",
                  price_usd: tier.price_monthly,
                },
                { onConflict: "tier_code,billing_cycle" },
              ),
          );
        }
        if (tier.enable_yearly) {
          upserts.push(
            supabase
              .from("membership_prices")
              .upsert(
                {
                  tier_code: tier.code,
                  billing_cycle: "yearly",
                  price_usd: tier.price_yearly,
                },
                { onConflict: "tier_code,billing_cycle" },
              ),
          );
        }
        return upserts;
      }),
    );

    const error = [...tierUpdates, ...billingUpdates, ...priceUpdates].find((res) => res.error)?.error;
    if (error) {
      toast.error(error.message || "Failed to save packages");
    } else {
      toast.success("Packages updated");
    }
    setSaving(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] flex flex-col p-0">
        <DialogHeader className="px-6 pt-6 pb-4 border-b">
          <DialogTitle>Manage Packages</DialogTitle>
        </DialogHeader>

        {loading ? (
          <div className="p-6">
            <p className="text-sm text-muted-foreground">Loading packages...</p>
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto px-6 py-4 space-y-6">
            <div className="space-y-4">
              {tiers.map((tier) => (
                <div key={tier.id} className="rounded-lg border p-4 space-y-3">
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex-1 grid gap-2 md:grid-cols-2">
                      <div className="space-y-1">
                        <Label>Name</Label>
                        <Input
                          value={tier.name}
                          onChange={(e) => updateTier(tier.id, { name: e.target.value })}
                        />
                      </div>
                      <div className="space-y-1">
                        <Label>Code</Label>
                        <Input value={tier.code} disabled />
                      </div>
                    </div>
                      <Button
                        variant="outline"
                        onClick={() => handleRemove(tier.id)}
                        disabled={CORE_TIERS.includes(tier.code)}
                      >
                      Remove
                    </Button>
                  </div>

                  <div className="grid gap-3 md:grid-cols-3">
                    <div className="space-y-1">
                      <Label>Monthly tokens</Label>
                      <Input
                        type="number"
                        value={tier.monthly_tokens ?? ""}
                        onChange={(e) =>
                          updateTier(tier.id, {
                            monthly_tokens: e.target.value === "" ? null : Number(e.target.value),
                          })
                        }
                        disabled={tier.is_unlimited}
                      />
                    </div>
                    <div className="space-y-1">
                      <Label>Monthly price ($)</Label>
                      <Input
                        type="number"
                        value={tier.price_monthly}
                        onChange={(e) =>
                          updateTier(tier.id, { price_monthly: Number(e.target.value) })
                        }
                        disabled={!tier.enable_monthly}
                      />
                    </div>
                    <div className="space-y-1">
                      <Label>Yearly price ($)</Label>
                      <Input
                        type="number"
                        value={tier.price_yearly}
                        onChange={(e) =>
                          updateTier(tier.id, { price_yearly: Number(e.target.value) })
                        }
                        disabled={!tier.enable_yearly}
                      />
                    </div>
                  </div>

                  <div className="flex items-center gap-2 text-sm">
                    <Switch
                      checked={tier.is_unlimited}
                      onCheckedChange={(checked) =>
                        updateTier(tier.id, {
                          is_unlimited: checked,
                          monthly_tokens: checked ? null : tier.monthly_tokens ?? 0,
                        })
                      }
                    />
                    <span>Unlimited tokens</span>
                  </div>

                  <div className="grid gap-3 md:grid-cols-2">
                    <div className="flex items-center gap-2 text-sm">
                      <Switch
                        checked={tier.enable_monthly}
                        onCheckedChange={(checked) =>
                          updateTier(tier.id, { enable_monthly: checked })
                        }
                      />
                      <span>Enable monthly billing</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <Switch
                        checked={tier.enable_yearly}
                        onCheckedChange={(checked) =>
                          updateTier(tier.id, { enable_yearly: checked })
                        }
                      />
                      <span>Enable yearly billing</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="rounded-lg border p-4 space-y-4">
              <div className="text-sm font-medium">Add new package</div>
              <div className="grid gap-3 md:grid-cols-2">
                <div className="space-y-1">
                  <Label>Code</Label>
                  <Input
                    value={newTier.code}
                    onChange={(e) => setNewTier((prev) => ({ ...prev, code: e.target.value }))}
                  />
                </div>
                <div className="space-y-1">
                  <Label>Name</Label>
                  <Input
                    value={newTier.name}
                    onChange={(e) => setNewTier((prev) => ({ ...prev, name: e.target.value }))}
                  />
                </div>
              </div>
              <div className="grid gap-3 md:grid-cols-3">
                <div className="space-y-1">
                  <Label>Monthly tokens</Label>
                  <Input
                    type="number"
                    value={newTier.monthly_tokens}
                    onChange={(e) =>
                      setNewTier((prev) => ({
                        ...prev,
                        monthly_tokens: Number(e.target.value),
                      }))
                    }
                    disabled={newTier.is_unlimited}
                  />
                </div>
                <div className="space-y-1">
                  <Label>Monthly price ($)</Label>
                  <Input
                    type="number"
                    value={newTier.price_monthly}
                    onChange={(e) =>
                      setNewTier((prev) => ({
                        ...prev,
                        price_monthly: Number(e.target.value),
                      }))
                    }
                    disabled={!newTier.enable_monthly}
                  />
                </div>
                <div className="space-y-1">
                  <Label>Yearly price ($)</Label>
                  <Input
                    type="number"
                    value={newTier.price_yearly}
                    onChange={(e) =>
                      setNewTier((prev) => ({
                        ...prev,
                        price_yearly: Number(e.target.value),
                      }))
                    }
                    disabled={!newTier.enable_yearly}
                  />
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Switch
                  checked={newTier.is_unlimited}
                  onCheckedChange={(checked) =>
                    setNewTier((prev) => ({
                      ...prev,
                      is_unlimited: checked,
                    }))
                  }
                />
                <span className="text-sm">Unlimited tokens</span>
              </div>
              <div className="grid gap-3 md:grid-cols-2">
                <div className="flex items-center gap-2 text-sm">
                  <Switch
                    checked={newTier.enable_monthly}
                    onCheckedChange={(checked) =>
                      setNewTier((prev) => ({
                        ...prev,
                        enable_monthly: checked,
                      }))
                    }
                  />
                  <span>Enable monthly billing</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <Switch
                    checked={newTier.enable_yearly}
                    onCheckedChange={(checked) =>
                      setNewTier((prev) => ({
                        ...prev,
                        enable_yearly: checked,
                      }))
                    }
                  />
                  <span>Enable yearly billing</span>
                </div>
              </div>
              <Button onClick={handleAdd}>Add package</Button>
            </div>
          </div>
        )}

        <div className="px-6 py-4 border-t flex justify-end gap-3">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? "Saving..." : "Save changes"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}