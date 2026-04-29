"use client";

import { useState } from "react";

import { useRouter, useSearchParams } from "next/navigation";

import { zodResolver } from "@hookform/resolvers/zod";
import { Building2, Loader2, UserRound } from "lucide-react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";

import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { api } from "@/lib/api";
import { authClient } from "@/lib/auth-client";
import { getPostAuthPath } from "@/lib/auth-landing";

const userSchema = z
  .object({
    name: z.string().min(2, { message: "Nama minimal 2 karakter." }),
    email: z.string().email({ message: "Email tidak valid." }),
    password: z.string().min(6, { message: "Password minimal 6 karakter." }),
    confirmPassword: z.string().min(6, { message: "Konfirmasi password minimal 6 karakter." }),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Konfirmasi password tidak sama.",
    path: ["confirmPassword"],
  });

const adminSchema = z
  .object({
    managerName: z.string().min(2, { message: "Nama pengelola minimal 2 karakter." }),
    businessEmail: z.string().email({ message: "Email bisnis tidak valid." }),
    password: z.string().min(6, { message: "Password minimal 6 karakter." }),
    confirmPassword: z.string().min(6, { message: "Konfirmasi password minimal 6 karakter." }),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Konfirmasi password tidak sama.",
    path: ["confirmPassword"],
  });

type RegisterAccountType = "USER" | "ADMIN";
type UserFormValues = z.infer<typeof userSchema>;
type AdminFormValues = z.infer<typeof adminSchema>;
type RegisterFormValues = UserFormValues | AdminFormValues;

export function RegisterForm({ accountType }: { accountType: RegisterAccountType }) {
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();
  const searchParams = useSearchParams();

  const isAdmin = accountType === "ADMIN";
  const schema = isAdmin ? adminSchema : userSchema;

  const form = useForm<RegisterFormValues>({
    resolver: zodResolver(schema),
    defaultValues: isAdmin
      ? {
          managerName: "",
          businessEmail: "",
          password: "",
          confirmPassword: "",
        }
      : {
          name: "",
          email: "",
          password: "",
          confirmPassword: "",
        },
  });

  const onSubmit = async (values: RegisterFormValues) => {
    const redirectTo = searchParams.get("redirect");
    setIsLoading(true);
    try {
      let error: { message?: string } | null = null;

      if (isAdmin) {
        const adminValues = values as AdminFormValues;
        await api.post("/api/v1/public/register/admin", {
          email: adminValues.businessEmail,
          password: adminValues.password,
          name: adminValues.managerName,
        });

        const result = await authClient.signIn.email({
          email: adminValues.businessEmail,
          password: adminValues.password,
          callbackURL: redirectTo || "/dashboard",
        });

        error = result.error;
      } else {
        const userValues = values as UserFormValues;
        const result = await authClient.signUp.email({
          email: userValues.email,
          password: userValues.password,
          name: userValues.name,
          callbackURL: redirectTo || "/",
        });
        error = result.error;
      }

      if (error) {
        toast.error(error.message || "Gagal membuat akun.");
      } else {
        toast.success(isAdmin ? "Akun mitra berhasil dibuat." : "Registrasi berhasil.");
        const session = await authClient.getSession();
        router.push(getPostAuthPath(session.data?.user?.role, redirectTo));
      }
    } catch (error: unknown) {
      const message =
        typeof error === "object" && error !== null && "response" in error
          ? ((error as { response?: { data?: { message?: string; error?: string } } }).response?.data?.message ??
            (error as { response?: { data?: { message?: string; error?: string } } }).response?.data?.error)
          : undefined;
      toast.error(message || "Terjadi kesalahan saat registrasi.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <div
          className={`rounded-2xl border p-4 ${isAdmin ? "border-blue-200 bg-blue-50/80" : "border-zinc-200 bg-zinc-50/80"}`}
        >
          <div className="flex items-start gap-3">
            <div className={`rounded-2xl p-2 ${isAdmin ? "bg-blue-700 text-white" : "bg-zinc-900 text-white"}`}>
              {isAdmin ? <Building2 className="h-4 w-4" /> : <UserRound className="h-4 w-4" />}
            </div>
            <div>
              <div className="font-semibold text-zinc-950">
                {isAdmin ? "Registrasi Mitra / Owner" : "Registrasi Pencari Kos"}
              </div>
              <div className="mt-1 text-sm text-zinc-600 leading-6">
                {isAdmin
                  ? "Gunakan akun ini untuk mengelola properti, kamar, transaksi, dan pencairan dana."
                  : "Gunakan akun ini untuk booking kamar, membayar sewa, dan memantau pesanan Anda."}
              </div>
            </div>
          </div>
        </div>

        {isAdmin ? (
          <>
            <FormField
              control={form.control}
              name="managerName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nama Pengelola</FormLabel>
                  <FormControl>
                    <Input id="managerName" placeholder="Nama pemilik / pengelola kos" autoComplete="name" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="businessEmail"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Email Bisnis</FormLabel>
                  <FormControl>
                    <Input
                      id="businessEmail"
                      type="email"
                      placeholder="owner@myhome.co.id"
                      autoComplete="email"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </>
        ) : (
          <>
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nama Lengkap</FormLabel>
                  <FormControl>
                    <Input id="name" placeholder="Nama Anda" autoComplete="name" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Email</FormLabel>
                  <FormControl>
                    <Input id="email" type="email" placeholder="you@example.com" autoComplete="email" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </>
        )}

        <FormField
          control={form.control}
          name="password"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Password</FormLabel>
              <FormControl>
                <Input
                  id={`${accountType}-password`}
                  type="password"
                  placeholder="••••••••"
                  autoComplete="new-password"
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="confirmPassword"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Konfirmasi Password</FormLabel>
              <FormControl>
                <Input
                  id={`${accountType}-confirmPassword`}
                  type="password"
                  placeholder="••••••••"
                  autoComplete="new-password"
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <Button
          className={`w-full text-white ${isAdmin ? "bg-blue-700 hover:bg-blue-800" : "bg-zinc-900 hover:bg-zinc-800"}`}
          type="submit"
          disabled={isLoading}
        >
          {isLoading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Memproses...
            </>
          ) : isAdmin ? (
            "Daftar Sebagai Mitra"
          ) : (
            "Daftar Sebagai User"
          )}
        </Button>
      </form>
    </Form>
  );
}
