import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { supabase } from "@/lib/supabaseClient";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AppShell } from "@/components/layout/AppShell";
import { toast } from "sonner";
import { User, Mail, Upload, Save, Camera, Loader2, CreditCard } from "lucide-react";

interface ProfileRecord {
  id: string;
  email: string | null;
  full_name: string | null;
  username: string | null;
  avatar_url: string | null;
  phone?: string | null;
  approval_status?: string | null;
}

export default function ProfilePage() {
  const { user, plan, tokensRemaining, tokensUsed, monthlyLimit, isApproved } = useAuth();
  const navigate = useNavigate();
  const [profile, setProfile] = useState<ProfileRecord | null>(null);
  const [fullName, setFullName] = useState("");
  const [username, setUsername] = useState("");
  const [phone, setPhone] = useState("");
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [hoverAvatar, setHoverAvatar] = useState(false);

  useEffect(() => {
    if (!user) return;
    const loadProfile = async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("id, email, full_name, username, avatar_url, phone, approval_status")
        .eq("id", user.id)
        .single();

      if (error) {
        toast.error(error.message || "Failed to load profile");
        return;
      }

      setProfile(data);
      setFullName(data.full_name ?? "");
      setUsername(data.username ?? "");
      setPhone(data.phone ?? "");
      setAvatarUrl(data.avatar_url ?? null);
    };

    void loadProfile();
  }, [user]);

  const handleAvatarUpload = async (file: File) => {
    if (!user) return;
    
    // Validate file size (max 2MB)
    if (file.size > 2 * 1024 * 1024) {
      toast.error("File size must be less than 2MB");
      return;
    }
    
    // Validate file type
    if (!file.type.startsWith("image/")) {
      toast.error("Please upload an image file");
      return;
    }
    
    setUploading(true);

    const fileExt = file.name.split(".").pop();
    const filePath = `${user.id}/${Date.now()}.${fileExt}`;

    const { error: uploadError } = await supabase.storage
      .from("avatars")
      .upload(filePath, file, { upsert: true });

    if (uploadError) {
      setUploading(false);
      toast.error(uploadError.message || "Avatar upload failed");
      return;
    }

    const { data } = supabase.storage.from("avatars").getPublicUrl(filePath);
    setAvatarUrl(data.publicUrl);
    setUploading(false);
    toast.success("Avatar uploaded successfully");
  };

  const handleSave = async () => {
    if (!user) return;
    setSaving(true);

    const updates = {
      id: user.id,
      email: user.email ?? null,
      full_name: fullName.trim(),
      username: username.trim() || null,
      phone: phone.trim(),
      avatar_url: avatarUrl,
      updated_at: new Date().toISOString(),
    };

    const { error } = await supabase.from("profiles").upsert(updates, {
      onConflict: "id",
    });

    if (error) {
      setSaving(false);
      toast.error(error.message || "Failed to save profile");
      return;
    }

    await supabase.auth.updateUser({
      data: {
        full_name: updates.full_name,
        avatar_url: updates.avatar_url,
      },
    });

    setProfile((prev) => (prev ? { ...prev, ...updates } : (updates as ProfileRecord)));
    setSaving(false);
    toast.success("Profile updated successfully");
  };

  const isUnlimited = monthlyLimit === Number.POSITIVE_INFINITY;

  return (
    <AppShell activeModule="profile">
      <div className="max-w-4xl mx-auto space-y-8">
        {/* Header */}
        <div className="space-y-2">
          <h1 className="text-3xl font-bold bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text text-transparent">
            Profile
          </h1>
          <p className="text-muted-foreground">
            Manage your account details and personalize your avatar
          </p>
          <div>
            {isApproved ? (
              <Badge className="bg-emerald-500/15 text-emerald-600">Approved</Badge>
            ) : (
              <Badge variant="secondary">Pending approval</Badge>
            )}
          </div>
        </div>

        <Card className="overflow-hidden border shadow-lg transition-all duration-300 hover:shadow-xl">
          <CardHeader className="border-b bg-muted/30 px-8 py-6">
            <CardTitle className="text-xl flex items-center gap-2">
              <User className="w-5 h-5 text-primary" />
              Profile Details
            </CardTitle>
          </CardHeader>
          
          <CardContent className="px-8 py-8 space-y-8">
            {/* Avatar Section */}
            <div className="flex flex-col items-center space-y-4 sm:flex-row sm:space-y-0 sm:space-x-6">
              <div 
                className="relative group cursor-pointer"
                onMouseEnter={() => setHoverAvatar(true)}
                onMouseLeave={() => setHoverAvatar(false)}
                onClick={() => {
                  const input = document.getElementById("avatar");
                  if (input) input.click();
                }}
              >
                <div className="w-28 h-28 rounded-full bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center overflow-hidden ring-4 ring-background shadow-lg transition-all duration-300 group-hover:ring-primary/30 group-hover:scale-105">
                  {avatarUrl ? (
                    <img 
                      src={avatarUrl} 
                      alt="Avatar" 
                      className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-110"
                    />
                  ) : (
                    <div className="flex flex-col items-center justify-center text-muted-foreground">
                      <User className="w-10 h-10" />
                    </div>
                  )}
                </div>
                
                {/* Hover overlay */}
                {hoverAvatar && !uploading && (
                  <div className="absolute inset-0 flex items-center justify-center bg-black/50 rounded-full transition-all duration-300">
                    <Camera className="w-8 h-8 text-white" />
                  </div>
                )}
                
                {/* Uploading overlay */}
                {uploading && (
                  <div className="absolute inset-0 flex items-center justify-center bg-black/60 rounded-full">
                    <Loader2 className="w-8 h-8 text-white animate-spin" />
                  </div>
                )}
                
                {/* Status badge */}
                {avatarUrl && !hoverAvatar && !uploading && (
                  <div className="absolute bottom-0 right-0 bg-primary rounded-full p-1.5 ring-2 ring-background">
                    <Camera className="w-3 h-3 text-primary-foreground" />
                  </div>
                )}
              </div>
              
              <div className="flex-1 text-center sm:text-left">
                <Label htmlFor="avatar" className="text-base font-semibold">
                  Profile image
                </Label>
                <Input
                  id="avatar"
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) void handleAvatarUpload(file);
                  }}
                  disabled={uploading}
                />
                <div className="mt-2 space-y-1">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => document.getElementById("avatar")?.click()}
                    disabled={uploading}
                    className="transition-all duration-200 hover:bg-primary hover:text-primary-foreground hover:border-primary"
                  >
                    <Upload className="w-4 h-4 mr-2" />
                    {uploading ? "Uploading..." : "Choose image"}
                  </Button>
                  <p className="text-xs text-muted-foreground">
                    JPG or PNG, max 2MB. Recommended 512×512px
                  </p>
                </div>
              </div>
            </div>

            {/* Form Fields */}
            <div className="grid gap-6 md:grid-cols-2 pt-4">
              <div className="space-y-2">
                <Label htmlFor="fullName" className="text-sm font-semibold flex items-center gap-2">
                  <User className="w-4 h-4 text-primary" />
                  Full name
                </Label>
                <Input
                  id="fullName"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Your full name"
                  className="transition-all duration-200 focus:ring-2 focus:ring-primary/20 hover:border-primary/50"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="username" className="text-sm font-semibold flex items-center gap-2">
                  @
                  Username
                </Label>
                <Input
                  id="username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="username"
                  className="transition-all duration-200 focus:ring-2 focus:ring-primary/20 hover:border-primary/50"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="phone" className="text-sm font-semibold flex items-center gap-2">
                Phone
              </Label>
              <Input
                id="phone"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+1 555 0123"
                className="transition-all duration-200 focus:ring-2 focus:ring-primary/20 hover:border-primary/50"
              />
            </div>

            {/* Email Field - Full Width */}
            <div className="space-y-2 pt-2">
              <Label className="text-sm font-semibold flex items-center gap-2">
                <Mail className="w-4 h-4 text-primary" />
                Email address
              </Label>
              <Input 
                value={profile?.email ?? user?.email ?? ""} 
                disabled 
                className="bg-muted/50 cursor-not-allowed transition-all duration-200"
              />
              <p className="text-xs text-muted-foreground">
                Email cannot be changed
              </p>
            </div>

            {/* Action Buttons */}
            <div className="flex justify-end pt-6 border-t">
              <Button 
                onClick={handleSave} 
                disabled={saving}
                className="min-w-[140px] transition-all duration-200 hover:shadow-lg hover:scale-105 disabled:opacity-50"
              >
                {saving ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4 mr-2" />
                    Save changes
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <CreditCard className="w-5 h-5 text-primary" />
              Membership
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-sm text-muted-foreground">Current plan</p>
                <p className="text-lg font-semibold capitalize">{plan}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Usage this month</p>
                <p className="text-sm font-medium">
                  {isUnlimited
                    ? "Unlimited"
                    : `${tokensUsed}/${monthlyLimit} tokens used`}
                </p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Remaining</p>
                <p className="text-sm font-medium">
                  {isUnlimited ? "Unlimited" : `${tokensRemaining} tokens`}
                </p>
              </div>
            </div>
            <Button variant="outline" onClick={() => navigate("/membership")}
            >
              View membership options
            </Button>
          </CardContent>
        </Card>
      </div>
    </AppShell>
  );
}