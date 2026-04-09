import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlertCircle, CheckCircle2, Save, Loader2, Trash2, Plus, X } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";
import { usePlatform } from "@/contexts/PlatformContext";
import { validateSiteUrl } from "@/lib/woocommerce/urlValidation";
import { PlatformCredentials, PlatformType, AuthMethod } from "@/lib/platform/types";

const Settings = () => {
  const { toast } = useToast();
  const { isConnected, isLoading, credentials, connectionStatus, error, connect, disconnect } = usePlatform();

  // Connection form state
  const [name, setName] = useState(credentials?.name || "");
  const [baseUrl, setBaseUrl] = useState(credentials?.baseUrl || "");
  const [platformType, setPlatformType] = useState<PlatformType>(credentials?.platformType || "generic_rest");
  const [authMethod, setAuthMethod] = useState<AuthMethod>(credentials?.authMethod || "bearer");
  const [username, setUsername] = useState(credentials?.username || "");
  const [secret, setSecret] = useState(credentials?.secret || "");
  const [apiKeyHeader, setApiKeyHeader] = useState(credentials?.apiKeyHeader || "X-API-Key");
  const [basePath, setBasePath] = useState(credentials?.basePath || "");
  const [customHeaders, setCustomHeaders] = useState<Array<{ key: string; value: string }>>(
    credentials?.customHeaders ? Object.entries(credentials.customHeaders).map(([key, value]) => ({ key, value })) : []
  );

  // Product settings
  const [createAsDrafts, setCreateAsDrafts] = useState(() => {
    const saved = localStorage.getItem("ditech_product_settings");
    return saved ? JSON.parse(saved).createAsDrafts ?? true : true;
  });
  const [autoGenerateSku, setAutoGenerateSku] = useState(() => {
    const saved = localStorage.getItem("ditech_product_settings");
    return saved ? JSON.parse(saved).autoGenerateSku ?? true : true;
  });
  const [enableBulkLogging, setEnableBulkLogging] = useState(() => {
    const saved = localStorage.getItem("ditech_product_settings");
    return saved ? JSON.parse(saved).enableBulkLogging ?? true : true;
  });

  useEffect(() => {
    if (credentials) {
      setName(credentials.name);
      setBaseUrl(credentials.baseUrl);
      setPlatformType(credentials.platformType);
      setAuthMethod(credentials.authMethod);
      setUsername(credentials.username || "");
      setSecret(credentials.secret || "");
      setApiKeyHeader(credentials.apiKeyHeader || "X-API-Key");
      setBasePath(credentials.basePath || "");
      setCustomHeaders(
        credentials.customHeaders ? Object.entries(credentials.customHeaders).map(([key, value]) => ({ key, value })) : []
      );
    }
  }, [credentials]);

  // Auto-fill WooCommerce defaults when platform type changes
  useEffect(() => {
    if (platformType === "woocommerce") {
      setAuthMethod("woocommerce");
      setBasePath("/wp-json/wc/v3");
      if (!name) setName("WooCommerce");
    }
  }, [platformType]);

  const handleConnect = async () => {
    if (!baseUrl) {
      toast({ title: "Missing URL", description: "Please enter the API base URL", variant: "destructive" });
      return;
    }

    const urlValidation = validateSiteUrl(baseUrl);
    if (!urlValidation.isValid) {
      toast({ title: "Invalid URL", description: urlValidation.error, variant: "destructive" });
      return;
    }

    if (authMethod === "woocommerce") {
      if (!username.startsWith("ck_") || !secret.startsWith("cs_")) {
        toast({ title: "Invalid Credentials", description: "WooCommerce keys must start with ck_ and cs_", variant: "destructive" });
        return;
      }
    }

    const creds: PlatformCredentials = {
      name: name || "My API",
      baseUrl: urlValidation.sanitizedUrl || baseUrl.replace(/\/$/, ""),
      platformType,
      authMethod,
      username: authMethod === "basic" || authMethod === "woocommerce" ? username : undefined,
      secret: authMethod !== "none" ? secret : undefined,
      apiKeyHeader: authMethod === "api_key" ? apiKeyHeader : undefined,
      basePath: basePath || undefined,
      customHeaders: customHeaders.length > 0
        ? Object.fromEntries(customHeaders.filter(h => h.key.trim()).map(h => [h.key.trim(), h.value]))
        : undefined,
    };

    const success = await connect(creds);
    toast({
      title: success ? "Connected!" : "Connection failed",
      description: success
        ? `Successfully connected to ${creds.name}.`
        : error || "Unable to connect. Check your configuration.",
      variant: success ? "default" : "destructive",
    });
  };

  const handleDisconnect = () => {
    disconnect();
    setName(""); setBaseUrl(""); setUsername(""); setSecret("");
    setBasePath(""); setCustomHeaders([]);
    toast({ title: "Disconnected", description: "Connection cleared." });
  };

  const handleSave = () => {
    localStorage.setItem("ditech_product_settings", JSON.stringify({ createAsDrafts, autoGenerateSku, enableBulkLogging }));
    toast({ title: "Settings saved", description: "Your configuration has been updated" });
  };

  const authLabel: Record<AuthMethod, string> = {
    none: "No Authentication",
    basic: "Basic Auth (Username/Password)",
    bearer: "Bearer Token",
    api_key: "API Key (Custom Header)",
    woocommerce: "WooCommerce (Consumer Key/Secret)",
  };

  return (
    <div className="p-4 sm:p-8 max-w-4xl">
      <div className="mb-8">
        <h1 className="text-2xl sm:text-3xl font-bold text-foreground mb-2">Settings</h1>
        <p className="text-muted-foreground">Connect to any REST API platform</p>
      </div>

      <div className="space-y-6">
        {/* Connection Status */}
        <Card className="p-4 sm:p-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
            <div>
              <h2 className="text-lg font-semibold text-foreground mb-1">Connection Status</h2>
              <p className="text-sm text-muted-foreground">Current API connection</p>
            </div>
            <Badge variant={isConnected ? "default" : "secondary"}>
              {isConnected ? <><CheckCircle2 className="w-3 h-3 mr-1" />Connected</> : <><AlertCircle className="w-3 h-3 mr-1" />Not Connected</>}
            </Badge>
          </div>

          {isConnected && connectionStatus ? (
            <div className="bg-success/10 border border-success/20 rounded-lg p-4 mb-6">
              <div className="flex flex-col sm:flex-row gap-3">
                <CheckCircle2 className="w-5 h-5 text-success flex-shrink-0 mt-0.5" />
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-foreground mb-1">Connected to {connectionStatus.platformName}</p>
                  <div className="text-sm text-muted-foreground space-y-1">
                    {connectionStatus.details && Object.entries(connectionStatus.details).map(([k, v]) => (
                      <p key={k} className="truncate">{k}: {v}</p>
                    ))}
                    {connectionStatus.version && !connectionStatus.details && (
                      <p>Version: {connectionStatus.version}</p>
                    )}
                  </div>
                </div>
                <Button variant="outline" size="sm" onClick={handleDisconnect} className="self-start">
                  <Trash2 className="w-4 h-4 mr-1" />Disconnect
                </Button>
              </div>
            </div>
          ) : (
            <div className="bg-warning/10 border border-warning/20 rounded-lg p-4 mb-6">
              <div className="flex gap-3">
                <AlertCircle className="w-5 h-5 text-warning flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-medium text-foreground mb-1">No Connection</p>
                  <p className="text-sm text-muted-foreground">
                    Connect your API below to manage real data. Currently using sample data.
                  </p>
                </div>
              </div>
            </div>
          )}
        </Card>

        {/* API Connection */}
        <Card className="p-4 sm:p-6">
          <h2 className="text-lg font-semibold text-foreground mb-4">API Connection</h2>
          <div className="space-y-4">
            {/* Platform Type */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Platform Type</Label>
                <Select value={platformType} onValueChange={(v) => setPlatformType(v as PlatformType)} disabled={isConnected}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="woocommerce">WooCommerce</SelectItem>
                    <SelectItem value="generic_rest">Generic REST API</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Connection Name</Label>
                <Input placeholder="My Store" value={name} onChange={(e) => setName(e.target.value)} disabled={isConnected} />
              </div>
            </div>

            {/* Base URL */}
            <div className="space-y-2">
              <Label>Base URL</Label>
              <Input placeholder="https://api.example.com" value={baseUrl} onChange={(e) => setBaseUrl(e.target.value)} disabled={isConnected} />
              <p className="text-xs text-muted-foreground">HTTPS required. The root URL of your site or API.</p>
            </div>

            {/* Auth Method */}
            <div className="space-y-2">
              <Label>Authentication Method</Label>
              <Select value={authMethod} onValueChange={(v) => setAuthMethod(v as AuthMethod)} disabled={isConnected}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(authLabel).map(([key, label]) => (
                    <SelectItem key={key} value={key}>{label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Auth Fields */}
            {(authMethod === "basic" || authMethod === "woocommerce") && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>{authMethod === "woocommerce" ? "Consumer Key" : "Username"}</Label>
                  <Input
                    type="password"
                    placeholder={authMethod === "woocommerce" ? "ck_xxxx" : "username"}
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    disabled={isConnected}
                  />
                </div>
                <div className="space-y-2">
                  <Label>{authMethod === "woocommerce" ? "Consumer Secret" : "Password"}</Label>
                  <Input type="password" placeholder={authMethod === "woocommerce" ? "cs_xxxx" : "password"} value={secret} onChange={(e) => setSecret(e.target.value)} disabled={isConnected} />
                </div>
              </div>
            )}

            {authMethod === "bearer" && (
              <div className="space-y-2">
                <Label>Bearer Token</Label>
                <Input type="password" placeholder="your-api-token" value={secret} onChange={(e) => setSecret(e.target.value)} disabled={isConnected} />
              </div>
            )}

            {authMethod === "api_key" && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Header Name</Label>
                  <Input placeholder="X-API-Key" value={apiKeyHeader} onChange={(e) => setApiKeyHeader(e.target.value)} disabled={isConnected} />
                </div>
                <div className="space-y-2">
                  <Label>API Key</Label>
                  <Input type="password" placeholder="your-api-key" value={secret} onChange={(e) => setSecret(e.target.value)} disabled={isConnected} />
                </div>
              </div>
            )}

            {/* Base Path */}
            {platformType === "generic_rest" && (
              <div className="space-y-2">
                <Label>API Base Path (optional)</Label>
                <Input placeholder="/api/v1" value={basePath} onChange={(e) => setBasePath(e.target.value)} disabled={isConnected} />
                <p className="text-xs text-muted-foreground">Path appended after the base URL for all requests.</p>
              </div>
            )}

            {/* Custom Headers */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Custom Headers (optional)</Label>
                {!isConnected && (
                  <Button variant="ghost" size="sm" onClick={() => setCustomHeaders([...customHeaders, { key: "", value: "" }])}>
                    <Plus className="w-3 h-3 mr-1" />Add
                  </Button>
                )}
              </div>
              {customHeaders.map((header, i) => (
                <div key={i} className="flex gap-2 items-center">
                  <Input placeholder="Header-Name" value={header.key} onChange={(e) => { const h = [...customHeaders]; h[i].key = e.target.value; setCustomHeaders(h); }} disabled={isConnected} className="flex-1" />
                  <Input placeholder="value" value={header.value} onChange={(e) => { const h = [...customHeaders]; h[i].value = e.target.value; setCustomHeaders(h); }} disabled={isConnected} className="flex-1" />
                  {!isConnected && (
                    <Button variant="ghost" size="icon" onClick={() => setCustomHeaders(customHeaders.filter((_, j) => j !== i))} className="h-8 w-8 flex-shrink-0">
                      <X className="w-4 h-4" />
                    </Button>
                  )}
                </div>
              ))}
            </div>

            <div className="flex flex-col sm:flex-row gap-3 pt-4">
              <Button onClick={handleConnect} disabled={isLoading || isConnected}>
                {isLoading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                {isConnected ? "Connected" : "Test & Connect"}
              </Button>
            </div>
          </div>
        </Card>

        {/* Product Settings */}
        <Card className="p-4 sm:p-6">
          <h2 className="text-lg font-semibold text-foreground mb-4">Product Settings</h2>
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Create products as drafts by default</Label>
                <p className="text-sm text-muted-foreground">New products will be created in draft status</p>
              </div>
              <Switch checked={createAsDrafts} onCheckedChange={setCreateAsDrafts} />
            </div>
            <Separator />
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Auto-generate SKU</Label>
                <p className="text-sm text-muted-foreground">Automatically create unique SKUs for new products</p>
              </div>
              <Switch checked={autoGenerateSku} onCheckedChange={setAutoGenerateSku} />
            </div>
            <Separator />
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Enable bulk upload logging</Label>
                <p className="text-sm text-muted-foreground">Keep detailed logs of bulk product creation</p>
              </div>
              <Switch checked={enableBulkLogging} onCheckedChange={setEnableBulkLogging} />
            </div>
          </div>
        </Card>

        <div className="flex justify-end">
          <Button size="lg" onClick={handleSave}>
            <Save className="w-4 h-4 mr-2" />Save Settings
          </Button>
        </div>
      </div>
    </div>
  );
};

export default Settings;
