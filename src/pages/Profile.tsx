import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { useAuth } from "@/contexts/AuthContext";
import { usePlatform } from "@/contexts/PlatformContext";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { User, Mail, Calendar, Shield, Key, CheckCircle2, AlertCircle, Loader2, Save } from "lucide-react";

interface ProfileData {
  display_name: string | null;
  avatar_url: string | null;
  created_at: string;
}

const Profile = () => {
  const { user } = useAuth();
  const { isConnected, connectionStatus, credentials } = usePlatform();
  const { toast } = useToast();
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [displayName, setDisplayName] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const fetchProfile = async () => {
      if (!user) return;
      const { data, error } = await supabase
        .from("profiles")
        .select("display_name, avatar_url, created_at")
        .eq("user_id", user.id)
        .single();

      if (data) {
        setProfile(data);
        setDisplayName(data.display_name || "");
      }
      if (error) {
        console.error("Failed to load profile:", error);
      }
      setLoading(false);
    };

    fetchProfile();
  }, [user]);

  const handleSave = async () => {
    if (!user) return;
    setSaving(true);
    const { error } = await supabase
      .from("profiles")
      .update({ display_name: displayName })
      .eq("user_id", user.id);

    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Profile updated", description: "Your display name has been saved." });
      setProfile((prev) => prev ? { ...prev, display_name: displayName } : null);
    }
    setSaving(false);
  };

  const memberSince = profile
    ? new Date(profile.created_at).toLocaleDateString(undefined, { year: "numeric", month: "long", day: "numeric" })
    : "—";

  const maskedEmail = user?.email
    ? user.email.replace(/(.{2})(.*)(@.*)/, "$1***$3")
    : "—";

  return (
    <div className="p-4 sm:p-8 max-w-4xl">
      <div className="mb-8">
        <h1 className="text-2xl sm:text-3xl font-bold text-foreground mb-2">Account</h1>
        <p className="text-muted-foreground">View and manage your login access details</p>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-48">
          <Loader2 className="w-6 h-6 animate-spin text-primary" />
        </div>
      ) : (
        <div className="space-y-6">
          {/* User Identity */}
          <Card className="p-4 sm:p-6">
            <div className="flex items-center gap-4 mb-6">
              <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center">
                <User className="w-7 h-7 text-primary" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-foreground">
                  {profile?.display_name || user?.email || "User"}
                </h2>
                <p className="text-sm text-muted-foreground">{user?.email}</p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="displayName">Display Name</Label>
                <Input
                  id="displayName"
                  placeholder="Your name"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>Email Address</Label>
                <div className="flex items-center gap-2 h-10 px-3 rounded-md border border-input bg-muted/50 text-sm text-muted-foreground">
                  <Mail className="w-4 h-4" />
                  <span className="truncate">{maskedEmail}</span>
                </div>
              </div>
            </div>

            <div className="mt-4 flex flex-wrap gap-3 text-sm text-muted-foreground">
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4" />
                <span>Member since {memberSince}</span>
              </div>
              <div className="flex items-center gap-2">
                <Shield className="w-4 h-4" />
                <span>Role: User</span>
              </div>
            </div>

            <div className="mt-6 flex justify-end">
              <Button onClick={handleSave} disabled={saving}>
                {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                <Save className="w-4 h-4 mr-2" />Save Profile
              </Button>
            </div>
          </Card>

          {/* Login Access Details */}
          <Card className="p-4 sm:p-6">
            <h2 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
              <Key className="w-5 h-5" />
              Platform Access Details
            </h2>

            {isConnected && connectionStatus ? (
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <Badge variant="default" className="bg-success/20 text-success border-success/30 hover:bg-success/20">
                    <CheckCircle2 className="w-3 h-3 mr-1" />Connected
                  </Badge>
                  <span className="text-sm font-medium text-foreground">{connectionStatus.platformName}</span>
                </div>

                <Separator />

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-muted-foreground mb-1">Platform Type</p>
                    <p className="font-medium text-foreground capitalize">{credentials?.platformType?.replace("_", " ")}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground mb-1">Base URL</p>
                    <p className="font-medium text-foreground truncate">{credentials?.baseUrl}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground mb-1">Authentication</p>
                    <p className="font-medium text-foreground capitalize">{credentials?.authMethod?.replace("_", " ")}</p>
                  </div>
                  {connectionStatus.version && (
                    <div>
                      <p className="text-muted-foreground mb-1">Version</p>
                      <p className="font-medium text-foreground">{connectionStatus.version}</p>
                    </div>
                  )}
                  {credentials?.basePath && (
                    <div>
                      <p className="text-muted-foreground mb-1">API Base Path</p>
                      <p className="font-medium text-foreground">{credentials.basePath}</p>
                    </div>
                  )}
                  {connectionStatus.details && Object.entries(connectionStatus.details).map(([k, v]) => (
                    <div key={k}>
                      <p className="text-muted-foreground mb-1">{k}</p>
                      <p className="font-medium text-foreground truncate">{String(v)}</p>
                    </div>
                  ))}
                </div>

                <div className="bg-muted/50 rounded-lg p-3 text-xs text-muted-foreground">
                  <p>
                    Credentials are encrypted and stored securely on the server. They are never exposed to the browser.
                  </p>
                </div>
              </div>
            ) : (
              <div className="flex items-start gap-3 bg-warning/10 border border-warning/20 rounded-lg p-4">
                <AlertCircle className="w-5 h-5 text-warning flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-medium text-foreground">No Platform Connected</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    Go to Settings to connect your REST API platform and view access details here.
                  </p>
                </div>
              </div>
            )}
          </Card>

          {/* Session Info */}
          <Card className="p-4 sm:p-6">
            <h2 className="text-lg font-semibold text-foreground mb-4">Session Information</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-muted-foreground mb-1">User ID</p>
                <p className="font-mono text-foreground text-xs break-all">{user?.id}</p>
              </div>
              <div>
                <p className="text-muted-foreground mb-1">Last Sign In</p>
                <p className="font-medium text-foreground">
                  {user?.last_sign_in_at ? new Date(user.last_sign_in_at).toLocaleString() : "—"}
                </p>
              </div>
              <div>
                <p className="text-muted-foreground mb-1">Email Confirmed</p>
                <p className="font-medium text-foreground">{user?.email_confirmed_at ? "Yes" : "Pending"}</p>
              </div>
              <div>
                <p className="text-muted-foreground mb-1">Auth Provider</p>
                <p className="font-medium text-foreground capitalize">{user?.app_metadata?.provider || "Email"}</p>
              </div>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
};

export default Profile;
