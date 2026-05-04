import { useState } from "react";
import { AppShell } from "@/components/layout/AppShell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/context/AuthContext";
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

const pricing = {
  pro: { monthly: 5, yearly: 55 },
  premium: { monthly: 11, yearly: 110 },
};

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

export default function MembershipPage() {
  const { plan } = useAuth();
  const [billing, setBilling] = useState<"monthly" | "yearly">("monthly");
  const [hoveredPlan, setHoveredPlan] = useState<string | null>(null);

  const priceLabel = (value: number) => `$${value}/${billing === "monthly" ? "month" : "year"}`;
  
  const getSavings = () => {
    if (billing === "yearly") {
      const monthlyTotal = pricing.pro.monthly * 12;
      const yearlyPrice = pricing.pro.yearly;
      const savings = ((monthlyTotal - yearlyPrice) / monthlyTotal) * 100;
      return Math.round(savings);
    }
    return 0;
  };

  const savings = getSavings();

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
              Select the perfect plan for your legal practice. All plans include core AI features
              with different token allocations and additional benefits.
            </p>
          </div>

          {/* Billing Toggle */}
          <div className="flex justify-center">
            <div className="inline-flex items-center gap-4 p-1 bg-muted/50 rounded-full backdrop-blur-sm">
              <span className={`px-4 py-2 rounded-full text-sm font-medium transition-all duration-200 ${billing === "monthly" ? "bg-background shadow-sm" : "text-muted-foreground"}`}>
                Monthly billing
              </span>
              <Switch
                checked={billing === "yearly"}
                onCheckedChange={(checked) => setBilling(checked ? "yearly" : "monthly")}
                className="data-[state=checked]:bg-primary"
              />
              <span className={`px-4 py-2 rounded-full text-sm font-medium transition-all duration-200 ${billing === "yearly" ? "bg-background shadow-sm" : "text-muted-foreground"}`}>
                Yearly billing
                {savings > 0 && (
                  <Badge variant="secondary" className="ml-2 bg-primary/10 text-primary">
                    Save {savings}%
                  </Badge>
                )}
              </span>
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
                {plan === "free" && (
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
                    <div className="text-xl font-semibold">100</div>
                    <p className="text-xs text-muted-foreground">tokens / month</p>
                    </div>
                    <Button 
                    variant="outline" 
                    disabled={plan === "free"}
                    size="sm"
                    className="w-full transition-all duration-200 h-8 text-sm"
                    >
                    {plan === "free" ? "Current Plan" : "Downgrade"}
                    </Button>
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
                {plan === "pro" && (
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
                    <div className="text-2xl font-semibold">{priceLabel(pricing.pro[billing])}</div>
                    <p className="text-xs text-muted-foreground mt-0.5">
                        {billing === "yearly" ? (
                        <span className="text-green-600 dark:text-green-400 text-[11px]">
                            Save ${pricing.pro.monthly * 12 - pricing.pro.yearly}/yr
                        </span>
                        ) : (
                        "Cancel anytime"
                        )}
                    </p>
                    </div>
                </CardHeader>
                <CardContent className="space-y-4 pb-5">
                    <div className="text-center">
                    <div className="text-xl font-semibold">1,000</div>
                    <p className="text-xs text-muted-foreground">tokens / month</p>
                    </div>
                    <Button 
                    variant={plan === "pro" ? "outline" : "default"}
                    disabled={plan === "pro"}
                    size="sm"
                    className="w-full transition-all duration-200 h-8 text-sm"
                    >
                    {plan === "pro" ? "Current Plan" : "Upgrade to Pro"}
                    </Button>
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
                {plan === "premium" && (
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
                    <div className="text-2xl font-semibold">{priceLabel(pricing.premium[billing])}</div>
                    <p className="text-xs text-muted-foreground mt-0.5">
                        {billing === "yearly" ? (
                        <span className="text-green-600 dark:text-green-400 text-[11px]">
                            Save ${pricing.premium.monthly * 12 - pricing.premium.yearly}/yr
                        </span>
                        ) : (
                        "Cancel anytime"
                        )}
                    </p>
                    </div>
                </CardHeader>
                <CardContent className="space-y-4 pb-5">
                    <div className="text-center">
                    <div className="text-xl font-semibold flex items-center justify-center gap-1">
                        Unlimited
                    </div>
                    <p className="text-xs text-muted-foreground">tokens / month</p>
                    </div>
                    <Button 
                    variant={plan === "premium" ? "outline" : "default"}
                    disabled={plan === "premium"}
                    size="sm"
                    className="w-full transition-all duration-200 h-8 text-sm bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700"
                    >
                    {plan === "premium" ? "Current Plan" : "Upgrade to Premium"}
                    </Button>
                </CardContent>
                </Card>
            </div>
            </div>

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