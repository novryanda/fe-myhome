"use client";

import { useEffect, useMemo, useState } from "react";

import Image from "next/image";

import { isAxiosError } from "axios";
import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  FileText,
  History,
  Loader2,
  LogOut,
  MessageCircle,
  PlugZap,
  QrCode,
  RefreshCw,
  Save,
  Send,
} from "lucide-react";
import { toast } from "sonner";

import { PageHero } from "@/app/(main)/dashboard/_components/page-hero";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { api } from "@/lib/api";

type WhatsappOverview = {
  settings?: {
    WAHA_API_URL?: string;
    WAHA_SESSION_NAME?: string;
    WAHA_API_KEY?: string;
  };
  configured: boolean;
  settingsReady: boolean;
  sessionName?: string;
  session?: {
    status?: string;
    me?: unknown;
    errorMessage?: string;
  };
  templatesCount: number;
  recentLogs: WhatsappLog[];
};

type WhatsappTemplate = {
  id: string;
  code: string;
  title: string;
  body: string;
  audience: "ADMIN" | "TENANT" | "SYSTEM";
  variables: string[];
};

type WhatsappLog = {
  id: string;
  recipient: string;
  message: string;
  status: "PENDING" | "SENT" | "FAILED";
  type: string;
  templateCode?: string | null;
  errorMessage?: string | null;
  providerMessageId?: string | null;
  createdAt: string;
  sentAt?: string | null;
};

const statusVariant = (status?: string) => {
  if (status === "SENT" || status === "WORKING") return "success";
  if (status === "FAILED" || status === "STOPPED") return "destructive";
  if (status === "PENDING" || status === "SCAN_QR_CODE" || status === "STARTING") return "warning";
  return "outline";
};

const dateTimeLabel = (value?: string | null) =>
  value ? new Intl.DateTimeFormat("id-ID", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value)) : "-";

const extractConnectedNumber = (me: unknown) => {
  if (!me || typeof me !== "object") return "-";
  const record = me as Record<string, unknown>;
  const id = record.id || record._serialized || record.wid || record.pushName;
  return typeof id === "string" ? id : "-";
};

const getErrorMessage = (error: unknown, fallback: string) => {
  if (isAxiosError(error)) {
    const apiMessage = error.response?.data?.message;
    if (typeof apiMessage === "string" && apiMessage.trim()) {
      return apiMessage;
    }
  }

  if (error instanceof Error && error.message.trim()) {
    return error.message;
  }

  return fallback;
};

export default function WhatsappPage() {
  const queryClient = useQueryClient();
  const [settings, setSettings] = useState({
    WAHA_API_URL: "",
    WAHA_SESSION_NAME: "superadmin",
    WAHA_API_KEY: "",
  });
  const [testForm, setTestForm] = useState({ recipient: "", message: "Tes pesan WhatsApp dari MyHome." });
  const [selectedTemplateCode, setSelectedTemplateCode] = useState("");
  const [templateBody, setTemplateBody] = useState("");
  const [logFilters, setLogFilters] = useState({
    status: "ALL",
    templateCode: "ALL",
    recipient: "",
    date: "",
    page: 1,
    size: 10,
  });

  const overviewQuery = useQuery({
    queryKey: ["whatsapp-overview"],
    queryFn: async () => (await api.get("/api/whatsapp/overview")).data?.data as WhatsappOverview,
    refetchInterval: 20_000,
  });

  const templatesQuery = useQuery({
    queryKey: ["whatsapp-templates"],
    queryFn: async () => (await api.get("/api/whatsapp/templates")).data?.data as WhatsappTemplate[],
  });

  const logsQuery = useQuery({
    queryKey: ["whatsapp-logs", logFilters],
    queryFn: async () => {
      const response = await api.get("/api/whatsapp/logs", {
        params: {
          status: logFilters.status === "ALL" ? undefined : logFilters.status,
          templateCode: logFilters.templateCode === "ALL" ? undefined : logFilters.templateCode,
          recipient: logFilters.recipient || undefined,
          date: logFilters.date || undefined,
          page: logFilters.page,
          size: logFilters.size,
        },
      });
      return response.data as { data: WhatsappLog[]; paging?: { total_page: number; total_items: number } };
    },
    placeholderData: keepPreviousData,
  });

  const qrQuery = useQuery({
    queryKey: ["whatsapp-session-qr"],
    queryFn: async () => (await api.get("/api/whatsapp/session/qr")).data?.data as { dataUrl: string },
    enabled: false,
    retry: false,
  });

  const selectedTemplate = useMemo(
    () => templatesQuery.data?.find((template) => template.code === selectedTemplateCode),
    [selectedTemplateCode, templatesQuery.data],
  );

  useEffect(() => {
    if (!overviewQuery.data?.settings) return;
    setSettings({
      WAHA_API_URL: overviewQuery.data.settings.WAHA_API_URL || "",
      WAHA_SESSION_NAME: overviewQuery.data.settings.WAHA_SESSION_NAME || "superadmin",
      WAHA_API_KEY: overviewQuery.data.settings.WAHA_API_KEY || "",
    });
  }, [overviewQuery.data?.settings]);

  useEffect(() => {
    const firstTemplate = templatesQuery.data?.[0];
    if (!selectedTemplateCode && firstTemplate) {
      setSelectedTemplateCode(firstTemplate.code);
      setTemplateBody(firstTemplate.body);
    }
  }, [selectedTemplateCode, templatesQuery.data]);

  useEffect(() => {
    if (selectedTemplate) {
      setTemplateBody(selectedTemplate.body);
    }
  }, [selectedTemplate]);

  const saveSettings = useMutation({
    mutationFn: async () => (await api.put("/api/whatsapp/settings", settings)).data,
    onSuccess: () => {
      toast.success("Pengaturan WAHA tersimpan");
      queryClient.invalidateQueries({ queryKey: ["whatsapp-overview"] });
    },
    onError: (error: unknown) => {
      toast.error(getErrorMessage(error, "Gagal menyimpan pengaturan WAHA"));
    },
  });

  const loadQr = async () => {
    const result = await qrQuery.refetch();
    if (result.error) {
      toast.error(getErrorMessage(result.error, "Gagal mengambil QR WhatsApp"));
    }
  };

  const startSession = useMutation({
    mutationFn: async () => (await api.post("/api/whatsapp/session/start")).data,
    onSuccess: async () => {
      toast.success("Sesi WhatsApp dimulai");
      await Promise.all([queryClient.invalidateQueries({ queryKey: ["whatsapp-overview"] }), loadQr()]);
    },
    onError: (error: unknown) => toast.error(getErrorMessage(error, "Gagal memulai sesi WAHA")),
  });

  const logoutSession = useMutation({
    mutationFn: async () => (await api.post("/api/whatsapp/session/logout")).data,
    onSuccess: () => {
      toast.success("Sesi WhatsApp diputus");
      queryClient.invalidateQueries({ queryKey: ["whatsapp-overview"] });
    },
    onError: (error: unknown) => toast.error(getErrorMessage(error, "Gagal memutus sesi WhatsApp")),
  });

  const sendTest = useMutation({
    mutationFn: async () => (await api.post("/api/whatsapp/test-send", testForm)).data,
    onSuccess: () => {
      toast.success("Pesan tes terkirim");
      queryClient.invalidateQueries({ queryKey: ["whatsapp-logs"] });
    },
    onError: (error: unknown) => toast.error(getErrorMessage(error, "Gagal mengirim pesan tes")),
  });

  const saveTemplate = useMutation({
    mutationFn: async () =>
      (await api.put(`/api/whatsapp/templates/${selectedTemplateCode}`, { body: templateBody })).data,
    onSuccess: () => {
      toast.success("Template tersimpan");
      queryClient.invalidateQueries({ queryKey: ["whatsapp-templates"] });
    },
    onError: (error: unknown) => toast.error(getErrorMessage(error, "Gagal menyimpan template")),
  });

  const overview = overviewQuery.data;
  const sessionStatus = overview?.session?.status || "UNKNOWN";
  const sessionName = overview?.sessionName || settings.WAHA_SESSION_NAME || "superadmin";
  const logs = logsQuery.data?.data || [];
  const totalLogPages = logsQuery.data?.paging?.total_page || 1;

  return (
    <div className="space-y-6">
      <PageHero
        title="WhatsApp Reminder"
        description="Kelola koneksi WAHA, template pesan, dan audit pengiriman reminder dari satu nomor pengirim superadmin."
        badge={
          <Badge variant={statusVariant(sessionStatus)}>
            <MessageCircle className="size-3" />
            {sessionStatus}
          </Badge>
        }
        action={
          <Button variant="outline" onClick={() => overviewQuery.refetch()} disabled={overviewQuery.isFetching}>
            {overviewQuery.isFetching ? <Loader2 className="size-4 animate-spin" /> : <RefreshCw className="size-4" />}
            Refresh
          </Button>
        }
      />

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Status sesi</CardDescription>
            <CardTitle className="text-xl">{sessionStatus}</CardTitle>
          </CardHeader>
          <CardContent className="text-muted-foreground text-sm">
            Session: {sessionName}
            <br />
            Nomor aktif: {extractConnectedNumber(overview?.session?.me)}
            {overview?.session?.errorMessage ? (
              <p className="mt-2 text-destructive">{overview.session.errorMessage}</p>
            ) : null}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Template</CardDescription>
            <CardTitle className="text-xl">{overview?.templatesCount || templatesQuery.data?.length || 0}</CardTitle>
          </CardHeader>
          <CardContent className="text-muted-foreground text-sm">
            Template pesan aktif untuk admin dan penghuni.
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Konfigurasi</CardDescription>
            <CardTitle className="text-xl">{overview?.configured ? "Tersimpan" : "Belum lengkap"}</CardTitle>
          </CardHeader>
          <CardContent className="text-muted-foreground text-sm">
            {overview?.settingsReady ? "Enkripsi settings aktif." : "SETTINGS_ENCRYPTION_KEY belum siap."}
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="connection" className="space-y-4">
        <TabsList>
          <TabsTrigger value="connection">
            <PlugZap className="size-4" />
            Koneksi
          </TabsTrigger>
          <TabsTrigger value="templates">
            <FileText className="size-4" />
            Template
          </TabsTrigger>
          <TabsTrigger value="logs">
            <History className="size-4" />
            Riwayat
          </TabsTrigger>
        </TabsList>

        <TabsContent value="connection" className="space-y-4">
          <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_360px]">
            <Card>
              <CardHeader>
                <CardTitle>Pengaturan WAHA</CardTitle>
                <CardDescription>
                  Gunakan nama session WAHA yang sama dengan session yang ingin dipakai sebagai pengirim reminder.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-2">
                  <Label htmlFor="waha-api-url">WAHA API URL</Label>
                  <Input
                    id="waha-api-url"
                    value={settings.WAHA_API_URL}
                    onChange={(event) => setSettings((prev) => ({ ...prev, WAHA_API_URL: event.target.value }))}
                    placeholder="http://localhost:3000"
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="waha-session-name">Nama Session WAHA</Label>
                  <Input
                    id="waha-session-name"
                    value={settings.WAHA_SESSION_NAME}
                    onChange={(event) => setSettings((prev) => ({ ...prev, WAHA_SESSION_NAME: event.target.value }))}
                    placeholder="superadmin"
                  />
                  <p className="text-muted-foreground text-xs">
                    Contoh: `superadmin`, `default`, atau nama session yang sudah ada di server WAHA.
                  </p>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="waha-api-key">WAHA API Key</Label>
                  <Input
                    id="waha-api-key"
                    type="password"
                    value={settings.WAHA_API_KEY}
                    onChange={(event) => setSettings((prev) => ({ ...prev, WAHA_API_KEY: event.target.value }))}
                    placeholder="Masukkan API key WAHA"
                  />
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button onClick={() => saveSettings.mutate()} disabled={saveSettings.isPending}>
                    {saveSettings.isPending ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
                    Simpan
                  </Button>
                  <Button variant="outline" onClick={() => startSession.mutate()} disabled={startSession.isPending}>
                    {startSession.isPending ? (
                      <Loader2 className="size-4 animate-spin" />
                    ) : (
                      <QrCode className="size-4" />
                    )}
                    Mulai Sesi
                  </Button>
                  <Button variant="outline" onClick={loadQr} disabled={qrQuery.isFetching}>
                    {qrQuery.isFetching ? <Loader2 className="size-4 animate-spin" /> : <QrCode className="size-4" />}
                    Ambil QR
                  </Button>
                  <Button
                    variant="destructive"
                    onClick={() => logoutSession.mutate()}
                    disabled={logoutSession.isPending}
                  >
                    {logoutSession.isPending ? (
                      <Loader2 className="size-4 animate-spin" />
                    ) : (
                      <LogOut className="size-4" />
                    )}
                    Logout
                  </Button>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>QR Login</CardTitle>
                <CardDescription>Scan dengan WhatsApp untuk menghubungkan nomor pengirim.</CardDescription>
              </CardHeader>
              <CardContent>
                {qrQuery.data?.dataUrl ? (
                  <div className="grid place-items-center rounded-md border bg-white p-4">
                    <Image
                      src={qrQuery.data.dataUrl}
                      alt="QR WhatsApp login"
                      width={256}
                      height={256}
                      unoptimized
                      className="h-64 w-64 object-contain"
                    />
                  </div>
                ) : (
                  <div className="grid h-72 place-items-center rounded-md border border-dashed text-center text-muted-foreground text-sm">
                    QR belum dimuat.
                  </div>
                )}
                {qrQuery.error ? (
                  <p className="mt-3 text-destructive text-sm">
                    {getErrorMessage(qrQuery.error, "Gagal mengambil QR WhatsApp")}
                  </p>
                ) : null}
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Kirim Tes</CardTitle>
              <CardDescription>Gunakan nomor format Indonesia, misalnya 08123456789 atau 628123456789.</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4 lg:grid-cols-[260px_minmax(0,1fr)_auto] lg:items-end">
              <div className="grid gap-2">
                <Label htmlFor="test-recipient">Nomor tujuan</Label>
                <Input
                  id="test-recipient"
                  value={testForm.recipient}
                  onChange={(event) => setTestForm((prev) => ({ ...prev, recipient: event.target.value }))}
                  placeholder="08123456789"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="test-message">Pesan</Label>
                <Input
                  id="test-message"
                  value={testForm.message}
                  onChange={(event) => setTestForm((prev) => ({ ...prev, message: event.target.value }))}
                />
              </div>
              <Button
                onClick={() => sendTest.mutate()}
                disabled={sendTest.isPending || !testForm.recipient || !testForm.message}
              >
                {sendTest.isPending ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />}
                Kirim
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="templates" className="grid gap-4 lg:grid-cols-[320px_minmax(0,1fr)]">
          <Card>
            <CardHeader>
              <CardTitle>Daftar Template</CardTitle>
              <CardDescription>Pilih event pesan yang ingin diedit.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              {(templatesQuery.data || []).map((template) => (
                <button
                  key={template.code}
                  type="button"
                  onClick={() => setSelectedTemplateCode(template.code)}
                  className={`w-full rounded-md border px-3 py-2 text-left transition hover:bg-accent ${
                    selectedTemplateCode === template.code ? "border-primary bg-accent" : "border-border"
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-medium text-sm">{template.title}</span>
                    <Badge variant={template.audience === "ADMIN" ? "secondary" : "outline"}>{template.audience}</Badge>
                  </div>
                  <div className="mt-1 truncate text-muted-foreground text-xs">{template.code}</div>
                </button>
              ))}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>{selectedTemplate?.title || "Template"}</CardTitle>
              <CardDescription>{selectedTemplate?.code || "Pilih template untuk mulai mengedit."}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex flex-wrap gap-2">
                {(selectedTemplate?.variables || []).map((variable) => (
                  <Badge key={variable} variant="outline">
                    {`{{${variable}}}`}
                  </Badge>
                ))}
              </div>
              <Textarea
                value={templateBody}
                onChange={(event) => setTemplateBody(event.target.value)}
                className="min-h-72 font-mono text-sm"
                placeholder="Isi template pesan"
              />
              <div className="flex justify-end">
                <Button
                  onClick={() => saveTemplate.mutate()}
                  disabled={saveTemplate.isPending || !selectedTemplateCode}
                >
                  {saveTemplate.isPending ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
                  Simpan Template
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="logs" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Filter Riwayat</CardTitle>
              <CardDescription>Lacak pesan sukses, gagal, dan alasan kegagalan pengiriman.</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-3 md:grid-cols-4">
              <Select
                value={logFilters.status}
                onValueChange={(value) => setLogFilters((prev) => ({ ...prev, status: value, page: 1 }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">Semua status</SelectItem>
                  <SelectItem value="PENDING">Pending</SelectItem>
                  <SelectItem value="SENT">Terkirim</SelectItem>
                  <SelectItem value="FAILED">Gagal</SelectItem>
                </SelectContent>
              </Select>
              <Select
                value={logFilters.templateCode}
                onValueChange={(value) => setLogFilters((prev) => ({ ...prev, templateCode: value, page: 1 }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Template" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">Semua template</SelectItem>
                  {(templatesQuery.data || []).map((template) => (
                    <SelectItem key={template.code} value={template.code}>
                      {template.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Input
                value={logFilters.recipient}
                onChange={(event) => setLogFilters((prev) => ({ ...prev, recipient: event.target.value, page: 1 }))}
                placeholder="Cari nomor tujuan"
              />
              <Input
                type="date"
                value={logFilters.date}
                onChange={(event) => setLogFilters((prev) => ({ ...prev, date: event.target.value, page: 1 }))}
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between gap-4">
              <div>
                <CardTitle>Riwayat Pengiriman</CardTitle>
                <CardDescription>{logsQuery.data?.paging?.total_items || 0} pesan tercatat.</CardDescription>
              </div>
              <Button variant="outline" onClick={() => logsQuery.refetch()} disabled={logsQuery.isFetching}>
                {logsQuery.isFetching ? <Loader2 className="size-4 animate-spin" /> : <RefreshCw className="size-4" />}
                Refresh
              </Button>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Waktu</TableHead>
                      <TableHead>Template</TableHead>
                      <TableHead>Tujuan</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Error</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {logs.map((log) => (
                      <TableRow key={log.id}>
                        <TableCell className="whitespace-nowrap">{dateTimeLabel(log.createdAt)}</TableCell>
                        <TableCell>
                          <div className="font-medium">{log.templateCode || log.type}</div>
                          <div className="max-w-md truncate text-muted-foreground text-xs">{log.message}</div>
                        </TableCell>
                        <TableCell className="whitespace-nowrap">{log.recipient}</TableCell>
                        <TableCell>
                          <Badge variant={statusVariant(log.status)}>{log.status}</Badge>
                        </TableCell>
                        <TableCell className="max-w-xs truncate text-muted-foreground text-xs">
                          {log.errorMessage || "-"}
                        </TableCell>
                      </TableRow>
                    ))}
                    {!logs.length && (
                      <TableRow>
                        <TableCell colSpan={5} className="h-24 text-center text-muted-foreground">
                          Belum ada riwayat pengiriman.
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
              <div className="mt-4 flex items-center justify-end gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={logFilters.page <= 1}
                  onClick={() => setLogFilters((prev) => ({ ...prev, page: Math.max(1, prev.page - 1) }))}
                >
                  Sebelumnya
                </Button>
                <span className="text-muted-foreground text-sm">
                  Halaman {logFilters.page} / {totalLogPages}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={logFilters.page >= totalLogPages}
                  onClick={() => setLogFilters((prev) => ({ ...prev, page: prev.page + 1 }))}
                >
                  Berikutnya
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
