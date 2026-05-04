import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AppShell } from "@/components/layout/AppShell";

export default function SettingsPage() {
  return (
    <AppShell activeModule="settings">
      <div className="max-w-3xl mx-auto space-y-6">
        <div>
          <h1 className="text-2xl font-bold">Settings</h1>
          <p className="text-sm text-muted-foreground">
            Application preferences will appear here.
          </p>
        </div>
        <Card>
          <CardHeader>
            <CardTitle>General</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            Settings are coming soon.
          </CardContent>
        </Card>
      </div>
    </AppShell>
  );
}
