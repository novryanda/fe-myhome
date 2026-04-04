"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";
import { useState } from "react";
import { Building2, Loader2, UserRound } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { authClient } from "@/lib/auth-client";
import { useRouter, useSearchParams } from "next/navigation";
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

export function RegisterForm({ accountType }: { accountType: RegisterAccountType }) {
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();
  const searchParams = useSearchParams();

  const isAdmin = accountType === "ADMIN";
  const schema = isAdmin ? adminSchema : userSchema;

  const form = useForm<any>({
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

  const onSubmit = async (values: any) => {
    const redirectTo = searchParams.get("redirect");
    setIsLoading(true);
    try {
      const payload = isAdmin
        ? {
            email: values.businessEmail,
            password: values.password,
            name: values.managerName,
            role: "ADMIN",
            callbackURL: redirectTo || "/dashboard",
          }
        : {
            email: values.email,
            password: values.password,
            name: values.name,
            role: "USER",
            callbackURL: redirectTo || "/",
          };

      const { error } = await authClient.signUp.email(payload as any);

      if (error) {
        toast.error(error.message || "Gagal membuat akun.");
      } else {
        toast.success(isAdmin ? "Akun mitra berhasil dibuat." : "Registrasi berhasil.");
        const session = await authClient.getSession();
        router.push(getPostAuthPath(session.data?.user?.role, redirectTo));
      }
    } catch {
      toast.error("Terjadi kesalahan saat registrasi.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <div className={`rounded-2xl border p-4 ${isAdmin ? "border-blue-200 bg-blue-50/80" : "border-zinc-200 bg-zinc-50/80"}`}>
          <div className="flex items-start gap-3">
            <div className={`rounded-2xl p-2 ${isAdmin ? "bg-blue-700 text-white" : "bg-zinc-900 text-white"}`}>
              {isAdmin ? <Building2 className="h-4 w-4" /> : <UserRound className="h-4 w-4" />}
            </div>
            <div>
              <div className="font-semibold text-zinc-950">
                {isAdmin ? "Registrasi Mitra / Owner" : "Registrasi Pencari Kos"}
              </div>
              <div className="mt-1 text-sm leading-6 text-zinc-600">
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
                    <Input id="businessEmail" type="email" placeholder="owner@myhome.co.id" autoComplete="email" {...field} />
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
                <Input id={`${accountType}-password`} type="password" placeholder="••••••••" autoComplete="new-password" {...field} />
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
