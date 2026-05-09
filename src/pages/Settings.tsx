import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useSettingsMap, useUpdateSetting, useAuditLogs, useSendBroadcast } from "@/hooks/useSettings";
import { useAuth } from "@/contexts/AuthContext";
import { useCenters } from "@/hooks/useCenters";
import { useSubCounties } from "@/hooks/useSubCounties";
import { Loader2, Settings as SettingsIcon, Bell, Shield, Palette, Radio, FileSearch, Lock, Globe } from "lucide-react";

export default function Settings() {
  const { isSuperAdmin } = useAuth();
  const { map, isLoading } = useSettingsMap();
  const update = useUpdateSetting();
  const canEdit = isSuperAdmin();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  const get = (cat: string, key: string, fallback: any = "") => {
    const v = map[`${cat}.${key}`];
    return v === undefined ? fallback : v;
  };

  const save = (category: string, key: string, value: any) => update.mutate({ category, key, value });

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <SettingsIcon className="w-7 h-7 text-primary" />
        <div>
          <h1 className="text-2xl font-bold">System Settings</h1>
          <p className="text-muted-foreground text-sm">Configure branding, notifications, privacy, channels, and security</p>
        </div>
      </div>

      {!canEdit && (
        <div className="bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900 text-amber-900 dark:text-amber-200 rounded-lg p-3 text-sm">
          You have read-only access. Only Super Admins can modify settings.
        </div>
      )}

      <Tabs defaultValue="branding" className="w-full">
        <TabsList className="grid grid-cols-4 lg:grid-cols-8 w-full">
          <TabsTrigger value="branding"><Palette className="w-4 h-4 mr-1" />Branding</TabsTrigger>
          <TabsTrigger value="notifications"><Bell className="w-4 h-4 mr-1" />Notifications</TabsTrigger>
          <TabsTrigger value="privacy"><Shield className="w-4 h-4 mr-1" />Privacy</TabsTrigger>
          <TabsTrigger value="approvals"><FileSearch className="w-4 h-4 mr-1" />Approvals</TabsTrigger>
          <TabsTrigger value="channels"><Radio className="w-4 h-4 mr-1" />Channels</TabsTrigger>
          <TabsTrigger value="security"><Lock className="w-4 h-4 mr-1" />Security</TabsTrigger>
          <TabsTrigger value="locale"><Globe className="w-4 h-4 mr-1" />Locale</TabsTrigger>
          <TabsTrigger value="broadcast">Broadcast</TabsTrigger>
        </TabsList>

        {/* BRANDING */}
        <TabsContent value="branding" className="space-y-4 mt-4">
          <SettingCard title="Brand Identity" description="System name and visual identity">
            <SettingText label="System Name" value={get("branding", "system_name")} disabled={!canEdit} onSave={(v) => save("branding", "system_name", v)} />
            <SettingText label="Primary Color (hex)" value={get("branding", "primary_color")} disabled={!canEdit} onSave={(v) => save("branding", "primary_color", v)} />
            <SettingText label="Logo URL" value={get("branding", "logo_url")} disabled={!canEdit} onSave={(v) => save("branding", "logo_url", v)} />
            <SettingText label="Support Email" value={get("branding", "support_email")} disabled={!canEdit} onSave={(v) => save("branding", "support_email", v)} />
            <SettingText label="Support Phone" value={get("branding", "support_phone")} disabled={!canEdit} onSave={(v) => save("branding", "support_phone", v)} />
          </SettingCard>
        </TabsContent>

        {/* NOTIFICATIONS */}
        <TabsContent value="notifications" className="space-y-4 mt-4">
          <SettingCard title="Master Channels" description="Global on/off switches">
            <SettingSwitch label="Email enabled" value={get("notifications", "email_enabled", true)} disabled={!canEdit} onSave={(v) => save("notifications", "email_enabled", v)} />
            <SettingSwitch label="SMS enabled" value={get("notifications", "sms_enabled", true)} disabled={!canEdit} onSave={(v) => save("notifications", "sms_enabled", v)} />
            <SettingSwitch label="In-app enabled" value={get("notifications", "inapp_enabled", true)} disabled={!canEdit} onSave={(v) => save("notifications", "inapp_enabled", v)} />
          </SettingCard>
          <SettingCard title="Event Triggers" description="Choose which events trigger notifications">
            <EventsEditor value={get("notifications", "events", {})} disabled={!canEdit} onSave={(v) => save("notifications", "events", v)} />
          </SettingCard>
        </TabsContent>

        {/* PRIVACY */}
        <TabsContent value="privacy" className="space-y-4 mt-4">
          <SettingCard title="Data Protection & Privacy" description="GDPR / Kenya Data Protection Act compliance">
            <SettingSwitch label="Mask PII for non-privileged roles" value={get("privacy", "mask_pii", true)} disabled={!canEdit} onSave={(v) => save("privacy", "mask_pii", v)} />
            <SettingSwitch label="Require parental consent" value={get("privacy", "require_consent", true)} disabled={!canEdit} onSave={(v) => save("privacy", "require_consent", v)} />
            <SettingNumber label="Retention period (days)" value={get("privacy", "retention_days", 1825)} disabled={!canEdit} onSave={(v) => save("privacy", "retention_days", v)} />
            <SettingText label="Data Protection Officer email" value={get("privacy", "data_protection_officer")} disabled={!canEdit} onSave={(v) => save("privacy", "data_protection_officer", v)} />
          </SettingCard>
          <AuditLogsCard />
        </TabsContent>

        {/* APPROVALS */}
        <TabsContent value="approvals" className="space-y-4 mt-4">
          <SettingCard title="Approval Workflow & AI" description="AI anomaly detection and approval rules">
            <SettingNumber label="AI anomaly threshold (0–1)" value={get("approvals", "ai_anomaly_threshold", 0.7)} step={0.05} disabled={!canEdit} onSave={(v) => save("approvals", "ai_anomaly_threshold", v)} />
            <SettingSwitch label="Auto-block high severity requisitions" value={get("approvals", "ai_auto_block_high", false)} disabled={!canEdit} onSave={(v) => save("approvals", "ai_auto_block_high", v)} />
            <SettingSwitch label="Require Ministry (L2) approval for new centers" value={get("approvals", "require_l2_for_centers", true)} disabled={!canEdit} onSave={(v) => save("approvals", "require_l2_for_centers", v)} />
          </SettingCard>
        </TabsContent>

        {/* CHANNELS */}
        <TabsContent value="channels" className="space-y-4 mt-4">
          <SettingCard title="SMS — Africa's Talking" description="SMS provider configuration">
            <SettingSwitch label="Use sandbox mode" value={get("channels", "sms_sandbox", true)} disabled={!canEdit} onSave={(v) => save("channels", "sms_sandbox", v)} />
            <p className="text-xs text-muted-foreground">API key, username, and sender ID are stored securely as backend secrets. Contact a Super Admin to update them.</p>
          </SettingCard>
          <SettingCard title="Email — Resend" description="Email provider configuration">
            <SettingText label="From address" value={get("channels", "email_from")} disabled={!canEdit} onSave={(v) => save("channels", "email_from", v)} />
          </SettingCard>
        </TabsContent>

        {/* SECURITY */}
        <TabsContent value="security" className="space-y-4 mt-4">
          <SettingCard title="Authentication & Session" description="Login security policies">
            <SettingNumber label="Session timeout (minutes)" value={get("security", "session_timeout_minutes", 60)} disabled={!canEdit} onSave={(v) => save("security", "session_timeout_minutes", v)} />
            <SettingNumber label="Minimum password length" value={get("security", "password_min_length", 8)} disabled={!canEdit} onSave={(v) => save("security", "password_min_length", v)} />
            <SettingSwitch label="Require 2FA for admins" value={get("security", "enforce_2fa_admins", false)} disabled={!canEdit} onSave={(v) => save("security", "enforce_2fa_admins", v)} />
          </SettingCard>
        </TabsContent>

        {/* LOCALE */}
        <TabsContent value="locale" className="space-y-4 mt-4">
          <SettingCard title="Locale & Formatting">
            <SettingText label="Timezone" value={get("locale", "timezone")} disabled={!canEdit} onSave={(v) => save("locale", "timezone", v)} />
            <SettingText label="Date format" value={get("locale", "date_format")} disabled={!canEdit} onSave={(v) => save("locale", "date_format", v)} />
            <SettingText label="Currency" value={get("locale", "currency")} disabled={!canEdit} onSave={(v) => save("locale", "currency", v)} />
          </SettingCard>
        </TabsContent>

        {/* BROADCAST */}
        <TabsContent value="broadcast" className="space-y-4 mt-4">
          <BroadcastCard />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function SettingCard({ title, description, children }: any) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">{title}</CardTitle>
        {description && <CardDescription>{description}</CardDescription>}
      </CardHeader>
      <CardContent className="space-y-4">{children}</CardContent>
    </Card>
  );
}

function SettingText({ label, value, disabled, onSave }: any) {
  const [v, setV] = useState<string>(typeof value === "string" ? value : JSON.stringify(value ?? ""));
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-3 items-end">
      <Label className="md:col-span-1">{label}</Label>
      <Input className="md:col-span-1" value={v} onChange={(e) => setV(e.target.value)} disabled={disabled} />
      <Button onClick={() => onSave(v)} disabled={disabled || v === value} size="sm">Save</Button>
    </div>
  );
}

function SettingNumber({ label, value, disabled, onSave, step = 1 }: any) {
  const [v, setV] = useState<number>(Number(value ?? 0));
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-3 items-end">
      <Label className="md:col-span-1">{label}</Label>
      <Input className="md:col-span-1" type="number" step={step} value={v} onChange={(e) => setV(Number(e.target.value))} disabled={disabled} />
      <Button onClick={() => onSave(v)} disabled={disabled || v === value} size="sm">Save</Button>
    </div>
  );
}

function SettingSwitch({ label, value, disabled, onSave }: any) {
  return (
    <div className="flex items-center justify-between border rounded-lg p-3">
      <Label>{label}</Label>
      <Switch checked={!!value} disabled={disabled} onCheckedChange={(v) => onSave(v)} />
    </div>
  );
}

const EVENT_KEYS: Record<string, string> = {
  approval_pending: "Approval pending (any)",
  approval_approved: "Approval approved",
  approval_rejected: "Approval rejected",
  low_stock: "Low stock alert",
  delivery_received: "Delivery received",
  requisition_anomaly: "AI anomaly on requisition",
  user_welcome: "User welcome / account created",
  role_assigned: "Role assigned to user",
};

function EventsEditor({ value, disabled, onSave }: any) {
  const [state, setState] = useState<Record<string, boolean>>(value || {});
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
        {Object.entries(EVENT_KEYS).map(([k, label]) => (
          <div key={k} className="flex items-center justify-between border rounded-lg p-2">
            <span className="text-sm">{label}</span>
            <Switch checked={!!state[k]} disabled={disabled} onCheckedChange={(v) => setState({ ...state, [k]: v })} />
          </div>
        ))}
      </div>
      <Button size="sm" disabled={disabled} onClick={() => onSave(state)}>Save events</Button>
    </div>
  );
}

function AuditLogsCard() {
  const { data, isLoading } = useAuditLogs(50);
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2"><FileSearch className="w-4 h-4" />Audit Log (last 50)</CardTitle>
        <CardDescription>Sensitive record access and changes</CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : (
          <div className="max-h-96 overflow-y-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>When</TableHead>
                  <TableHead>User</TableHead>
                  <TableHead>Action</TableHead>
                  <TableHead>Resource</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(data ?? []).map((l: any) => (
                  <TableRow key={l.id}>
                    <TableCell className="text-xs">{new Date(l.created_at).toLocaleString()}</TableCell>
                    <TableCell className="text-xs">{l.user_email ?? "—"}</TableCell>
                    <TableCell><Badge variant="outline">{l.action}</Badge></TableCell>
                    <TableCell className="text-xs">{l.resource_type}</TableCell>
                  </TableRow>
                ))}
                {(!data || data.length === 0) && (
                  <TableRow><TableCell colSpan={4} className="text-center text-muted-foreground py-6">No audit events yet</TableCell></TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function BroadcastCard() {
  const { data: centers } = useCenters();
  const { data: subCounties } = useSubCounties();
  const send = useSendBroadcast();
  const [audience, setAudience] = useState<"all" | "role" | "center" | "subcounty">("all");
  const [role, setRole] = useState<string>("");
  const [centerId, setCenterId] = useState<string>("");
  const [subId, setSubId] = useState<string>("");
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [email, setEmail] = useState(true);
  const [sms, setSms] = useState(true);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2"><Radio className="w-4 h-4" />Send Broadcast</CardTitle>
        <CardDescription>Send a one-off announcement via email, SMS, and in-app</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div>
            <Label>Audience</Label>
            <Select value={audience} onValueChange={(v: any) => setAudience(v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All users</SelectItem>
                <SelectItem value="role">By role</SelectItem>
                <SelectItem value="center">By center</SelectItem>
                <SelectItem value="subcounty">By sub-county</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {audience === "role" && (
            <div>
              <Label>Role</Label>
              <Select value={role} onValueChange={setRole}>
                <SelectTrigger><SelectValue placeholder="Select role" /></SelectTrigger>
                <SelectContent>
                  {["super_admin", "admin", "education_officer", "center_admin", "teacher", "data_entry", "viewer", "governor"].map((r) => (
                    <SelectItem key={r} value={r}>{r}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
          {audience === "center" && (
            <div>
              <Label>Center</Label>
              <Select value={centerId} onValueChange={setCenterId}>
                <SelectTrigger><SelectValue placeholder="Select center" /></SelectTrigger>
                <SelectContent>
                  {(centers ?? []).map((c: any) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          )}
          {audience === "subcounty" && (
            <div>
              <Label>Sub-county</Label>
              <Select value={subId} onValueChange={setSubId}>
                <SelectTrigger><SelectValue placeholder="Select sub-county" /></SelectTrigger>
                <SelectContent>
                  {(subCounties ?? []).map((s: any) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          )}
        </div>
        <div>
          <Label>Subject</Label>
          <Input value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="Notification subject" />
        </div>
        <div>
          <Label>Message</Label>
          <Textarea value={message} onChange={(e) => setMessage(e.target.value)} rows={5} placeholder="Type your message..." />
        </div>
        <div className="flex gap-4">
          <label className="flex items-center gap-2"><Switch checked={email} onCheckedChange={setEmail} />Email</label>
          <label className="flex items-center gap-2"><Switch checked={sms} onCheckedChange={setSms} />SMS</label>
        </div>
        <Button
          disabled={!message || send.isPending}
          onClick={() => send.mutate({
            audience, role, center_id: centerId, sub_county_id: subId,
            subject, message, channels: { email, sms }
          })}
        >
          {send.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
          Send broadcast
        </Button>
      </CardContent>
    </Card>
  );
}
