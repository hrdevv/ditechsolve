import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { AlertCircle, CheckCircle2, Save, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";
import { useWordPressSettings } from "@/hooks/useWordPressSettings";

const Settings = () => {
  const { settings, saveSettings, isConfigured, testConnection } = useWordPressSettings();
  const [isConnected, setIsConnected] = useState(isConfigured);
  const [isTesting, setIsTesting] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  
  // Form state
  const [siteUrl, setSiteUrl] = useState(settings?.siteUrl || "");
  const [consumerKey, setConsumerKey] = useState(settings?.consumerKey || "");
  const [consumerSecret, setConsumerSecret] = useState(settings?.consumerSecret || "");
  
  const { toast } = useToast();

  const handleTestConnection = async () => {
    if (!siteUrl || !consumerKey || !consumerSecret) {
      toast({
        title: "Missing credentials",
        description: "Please fill in all connection fields",
        variant: "destructive",
      });
      return;
    }

    setIsTesting(true);
    
    try {
      // Save settings first
      await saveSettings({ siteUrl, consumerKey, consumerSecret });
      
      // Test connection
      const result = await testConnection();
      
      if (result.success) {
        setIsConnected(true);
        toast({
          title: "Connection successful",
          description: result.version 
            ? `Connected to WooCommerce v${result.version}`
            : "Successfully connected to WordPress/WooCommerce",
        });
      } else {
        setIsConnected(false);
        toast({
          title: "Connection failed",
          description: result.message,
          variant: "destructive",
        });
      }
    } catch (error) {
      setIsConnected(false);
      toast({
        title: "Connection error",
        description: error instanceof Error ? error.message : "Failed to connect",
        variant: "destructive",
      });
    } finally {
      setIsTesting(false);
    }
  };

  const handleSave = async () => {
    if (!siteUrl || !consumerKey || !consumerSecret) {
      toast({
        title: "Missing credentials",
        description: "Please fill in all connection fields",
        variant: "destructive",
      });
      return;
    }

    setIsSaving(true);

    try {
      await saveSettings({ siteUrl, consumerKey, consumerSecret });
      toast({
        title: "Settings saved",
        description: "Your WordPress connection has been configured",
      });
    } catch (error) {
      toast({
        title: "Save failed",
        description: error instanceof Error ? error.message : "Failed to save settings",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="p-8 max-w-4xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-foreground mb-2">Settings</h1>
        <p className="text-muted-foreground">Configure your WordPress/WooCommerce connection</p>
      </div>

      <div className="space-y-6">
        {/* Connection Status */}
        <Card className="p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-lg font-semibold text-foreground mb-1">Connection Status</h2>
              <p className="text-sm text-muted-foreground">
                Current connection to WordPress/WooCommerce
              </p>
            </div>
            <Badge variant={isConnected ? "default" : "secondary"}>
              {isConnected ? (
                <>
                  <CheckCircle2 className="w-3 h-3 mr-1" />
                  Connected
                </>
              ) : (
                <>
                  <AlertCircle className="w-3 h-3 mr-1" />
                  Not Connected
                </>
              )}
            </Badge>
          </div>

          {!isConnected && (
            <div className="bg-warning/10 border border-warning/20 rounded-lg p-4 mb-6">
              <div className="flex gap-3">
                <AlertCircle className="w-5 h-5 text-warning flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-medium text-foreground mb-1">Mock Mode Active</p>
                  <p className="text-sm text-muted-foreground">
                    You're currently working with sample data. Connect your WordPress site below to manage real products.
                  </p>
                </div>
              </div>
            </div>
          )}
        </Card>

        {/* WordPress Connection */}
        <Card className="p-6">
          <h2 className="text-lg font-semibold text-foreground mb-4">WordPress Connection</h2>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="site-url">Site URL</Label>
              <Input
                id="site-url"
                placeholder="https://yourstore.com"
                value={siteUrl}
                onChange={(e) => setSiteUrl(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                Your WordPress site URL (without trailing slash)
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="consumer-key">Consumer Key</Label>
              <Input
                id="consumer-key"
                placeholder="ck_xxxxxxxxxxxxxxxx"
                type="password"
                value={consumerKey}
                onChange={(e) => setConsumerKey(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                WooCommerce REST API Consumer Key
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="consumer-secret">Consumer Secret</Label>
              <Input
                id="consumer-secret"
                placeholder="cs_xxxxxxxxxxxxxxxx"
                type="password"
                value={consumerSecret}
                onChange={(e) => setConsumerSecret(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                WooCommerce REST API Consumer Secret
              </p>
            </div>

            <div className="flex gap-3 pt-4">
              <Button onClick={handleTestConnection} disabled={isTesting}>
                {isTesting ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Testing...
                  </>
                ) : (
                  'Test Connection'
                )}
              </Button>
              <Button variant="outline" asChild>
                <a 
                  href="https://woocommerce.github.io/woocommerce-rest-api-docs/" 
                  target="_blank" 
                  rel="noopener noreferrer"
                >
                  View API Documentation
                </a>
              </Button>
            </div>
          </div>
        </Card>

        {/* Product Settings */}
        <Card className="p-6">
          <h2 className="text-lg font-semibold text-foreground mb-4">Product Settings</h2>
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Create products as drafts by default</Label>
                <p className="text-sm text-muted-foreground">
                  New products will be created in draft status
                </p>
              </div>
              <Switch defaultChecked />
            </div>

            <Separator />

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Auto-generate SKU</Label>
                <p className="text-sm text-muted-foreground">
                  Automatically create unique SKUs for new products
                </p>
              </div>
              <Switch defaultChecked />
            </div>

            <Separator />

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Enable bulk upload logging</Label>
                <p className="text-sm text-muted-foreground">
                  Keep detailed logs of bulk product creation
                </p>
              </div>
              <Switch defaultChecked />
            </div>
          </div>
        </Card>

        {/* Save Button */}
        <div className="flex justify-end">
          <Button size="lg" onClick={handleSave} disabled={isSaving}>
            {isSaving ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="w-4 h-4 mr-2" />
                Save Settings
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default Settings;
