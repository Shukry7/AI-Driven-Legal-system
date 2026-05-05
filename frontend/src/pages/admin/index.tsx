import { useEffect, useState } from "react";
import { AppShell } from "@/components/layout/AppShell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/lib/supabaseClient";
import { useAuth } from "@/context/AuthContext";
import { toast } from "sonner";

interface MembershipTier {
  id: string;
  code: string;
  name: string;
  monthly_tokens: number | null;
  is_unlimited: boolean;
}


interface UserProfileRow {
  id: string;
  email: string | null;
  full_name: string | null;
  username: string | null;
  is_admin: boolean;
  created_at?: string | null;
}

interface UserMembershipRow {
  user_id: string;
  tier_id: string;
}

export default function AdminPage() {
  const { isAdmin } = useAuth();
  const [tiers, setTiers] = useState<MembershipTier[]>([]);
  const [profiles, setProfiles] = useState<UserProfileRow[]>([]);
  const [memberships, setMemberships] = useState<UserMembershipRow[]>([]);

  const loadAdminData = async () => {
    const [tierRes, profileRes, membershipRes] = await Promise.all([
      supabase.from("membership_tiers").select("id, code, name, monthly_tokens, is_unlimited"),
      supabase.from("profiles").select("id, email, full_name, username, is_admin, created_at"),
      supabase.from("user_memberships").select("user_id, tier_id"),
    ]);

    if (tierRes.error) toast.error(tierRes.error.message);
    if (profileRes.error) toast.error(profileRes.error.message);
    if (membershipRes.error) toast.error(membershipRes.error.message);

    setTiers(tierRes.data ?? []);
    setProfiles(profileRes.data ?? []);
    setMemberships(membershipRes.data ?? []);
  };

  useEffect(() => {
    void loadAdminData();
  }, []);

  if (!isAdmin) {
    return (
      <AppShell activeModule="admin">
        <div className="max-w-3xl mx-auto">
          <Card>
            <CardHeader>
              <CardTitle>Access restricted</CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground">
              You do not have permission to view this page.
            </CardContent>
          </Card>
        </div>
      </AppShell>
    );
  }

  const handleUserTierChange = async (userId: string, tierId: string) => {
    const { error } = await supabase
      .from("user_memberships")
      .update({ tier_id: tierId })
      .eq("user_id", userId);

    if (error) {
      toast.error(error.message || "Failed to update user tier");
      return;
    }

    setMemberships((prev) =>
      prev.map((m) => (m.user_id === userId ? { ...m, tier_id: tierId } : m)),
    );
    toast.success("User membership updated");
  };

  return (
    <AppShell activeModule="admin">
      <div className="max-w-6xl mx-auto space-y-8">
        <div>
          <h1 className="text-2xl font-bold">Admin Console</h1>
          <p className="text-sm text-muted-foreground">
            Manage membership pricing, token limits, and user plans.
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>User Management</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-muted-foreground">
                    <th className="text-left py-2 pr-4 font-medium">User</th>
                    <th className="text-left py-2 pr-4 font-medium">Email</th>
                    <th className="text-left py-2 pr-4 font-medium">Joined</th>
                    <th className="text-left py-2 pr-4 font-medium">Subscription</th>
                    <th className="text-left py-2 font-medium">Promote package</th>
                  </tr>
                </thead>
                <tbody>
                  {profiles.map((profile) => {
                    const membership = memberships.find((m) => m.user_id === profile.id);
                    const tier = tiers.find((t) => t.id === membership?.tier_id);
                    const joined = profile.created_at
                      ? new Date(profile.created_at).toLocaleDateString()
                      : "-";

                    return (
                      <tr key={profile.id} className="border-b last:border-b-0">
                        <td className="py-3 pr-4">
                          <div className="font-medium">{profile.full_name || "Unnamed"}</div>
                          <div className="text-xs text-muted-foreground">{profile.username ?? "-"}</div>
                        </td>
                        <td className="py-3 pr-4 text-muted-foreground">
                          {profile.email ?? "-"}
                        </td>
                        <td className="py-3 pr-4 text-muted-foreground">{joined}</td>
                        <td className="py-3 pr-4">
                          <span className="text-xs font-medium">
                            {tier?.name ?? "Free"}
                          </span>
                        </td>
                        <td className="py-3">
                          <Select
                            value={membership?.tier_id}
                            onValueChange={(value) => handleUserTierChange(profile.id, value)}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Select tier" />
                            </SelectTrigger>
                            <SelectContent>
                              {tiers.map((tierItem) => (
                                <SelectItem key={tierItem.id} value={tierItem.id}>
                                  {tierItem.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>
    </AppShell>
  );
}
