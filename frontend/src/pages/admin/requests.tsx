import { useEffect, useState } from "react";
import { AppShell } from "@/components/layout/AppShell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/lib/supabaseClient";
import { useAuth } from "@/context/AuthContext";
import { toast } from "sonner";

interface RegistrationRequestRow {
  id: string;
  email: string | null;
  full_name: string | null;
  phone: string | null;
  profession: string | null;
  profession_other: string | null;
  professional_id_number: string | null;
  approval_status: string | null;
  approval_reason: string | null;
  created_at?: string | null;
}

export default function RegistrationRequestsPage() {
  const { isAdmin } = useAuth();
  const [requests, setRequests] = useState<RegistrationRequestRow[]>([]);
  const [reasons, setReasons] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);

  const loadRequests = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("profiles")
      .select(
        "id, email, full_name, phone, profession, profession_other, professional_id_number, approval_status, approval_reason, created_at",
      )
      .eq("approval_status", "pending")
      .order("created_at", { ascending: true });

    if (error) toast.error(error.message);
    setRequests(data ?? []);
    setLoading(false);
  };

  useEffect(() => {
    void loadRequests();
  }, []);

  const updateRequest = async (
    profileId: string,
    status: "approved" | "rejected",
    reason?: string,
  ) => {
    if (status === "rejected" && !reason?.trim()) {
      toast.error("Please provide a reason for rejection.");
      return;
    }

    const { error } = await supabase.rpc("admin_update_approval", {
      p_profile_id: profileId,
      p_status: status,
      p_reason: reason?.trim() ?? null,
    });

    if (error) {
      toast.error(error.message || "Failed to update request");
      return;
    }

    await loadRequests();
    toast.success(`Request ${status === "approved" ? "approved" : "rejected"}`);
  };

  if (!isAdmin) {
    return (
      <AppShell activeModule="requests">
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

  return (
    <AppShell activeModule="requests">
      <div className="max-w-6xl mx-auto space-y-8">
        <div>
          <h1 className="text-2xl font-bold">Registration Requests</h1>
          <p className="text-sm text-muted-foreground">
            Review and approve access requests from new users.
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Pending requests</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {loading ? (
              <p className="text-sm text-muted-foreground">Loading requests...</p>
            ) : requests.length === 0 ? (
              <p className="text-sm text-muted-foreground">No pending requests.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b text-muted-foreground">
                      <th className="text-left py-2 pr-4 font-medium">User</th>
                      <th className="text-left py-2 pr-4 font-medium">Contact</th>
                      <th className="text-left py-2 pr-4 font-medium">Profession</th>
                      <th className="text-left py-2 pr-4 font-medium">ID Number</th>
                      <th className="text-left py-2 pr-4 font-medium">Status</th>
                      <th className="text-left py-2 font-medium">Decision</th>
                    </tr>
                  </thead>
                  <tbody>
                    {requests.map((request) => {
                      const professionLabel =
                        request.profession === "other"
                          ? request.profession_other || "Other"
                          : request.profession ?? "-";
                      return (
                        <tr key={request.id} className="border-b last:border-b-0 align-top">
                          <td className="py-3 pr-4">
                            <div className="font-medium">{request.full_name || "Unnamed"}</div>
                            <div className="text-xs text-muted-foreground">
                              {request.email ?? "-"}
                            </div>
                          </td>
                          <td className="py-3 pr-4 text-muted-foreground">
                            {request.phone ?? "-"}
                          </td>
                          <td className="py-3 pr-4">
                            <span className="text-xs font-medium">{professionLabel}</span>
                          </td>
                          <td className="py-3 pr-4 text-muted-foreground">
                            {request.professional_id_number ?? "-"}
                          </td>
                          <td className="py-3 pr-4">
                            <Badge variant="secondary">Pending</Badge>
                          </td>
                          <td className="py-3 space-y-2">
                            <textarea
                              value={reasons[request.id] ?? ""}
                              onChange={(e) =>
                                setReasons((prev) => ({
                                  ...prev,
                                  [request.id]: e.target.value,
                                }))
                              }
                              rows={2}
                              placeholder="Reason (required for rejection)"
                              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                            />
                            <div className="flex flex-wrap gap-2">
                              <Button
                                size="sm"
                                onClick={() => updateRequest(request.id, "approved")}
                              >
                                Approve
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() =>
                                  updateRequest(request.id, "rejected", reasons[request.id])
                                }
                              >
                                Reject
                              </Button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </AppShell>
  );
}
