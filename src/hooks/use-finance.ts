import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { api } from "@/lib/api";

export function useFinanceSummary() {
  return useQuery({
    queryKey: ["finance-summary"],
    queryFn: async () => {
      const { data } = await api.get("/api/finance/summary");
      return data.data;
    },
  });
}

export function useWithdrawals(query?: { status?: string; search?: string; page?: number; size?: number }) {
  return useQuery({
    queryKey: ["finance-withdrawals", query],
    queryFn: async () => {
      const params = new URLSearchParams(
        Object.entries(query || {}).reduce<Record<string, string>>((acc, [key, value]) => {
          if (value !== undefined && value !== null && value !== "") {
            acc[key] = String(value);
          }
          return acc;
        }, {}),
      ).toString();

      const { data } = await api.get(params ? `/api/finance/withdrawals?${params}` : "/api/finance/withdrawals");
      return data;
    },
  });
}

export function useBankAccount() {
  return useQuery({
    queryKey: ["finance-bank-account"],
    queryFn: async () => {
      const { data } = await api.get("/api/finance/bank-account");
      return data.data;
    },
  });
}

export function useUpdateBankAccount() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (body: any) => {
      const { data } = await api.post("/api/finance/bank-account", body);
      return data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["finance-bank-account"] });
    },
  });
}

export function useCreateWithdrawal() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (body: any) => {
      const { data } = await api.post("/api/finance/withdrawals", body);
      return data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["finance-withdrawals"] });
      queryClient.invalidateQueries({ queryKey: ["finance-summary"] });
    },
  });
}

export function useUpdateWithdrawalStatus() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...body }: any) => {
      const { data } = await api.patch(`/api/finance/withdrawals/${id}/status`, body);
      return data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["finance-withdrawals"] });
      queryClient.invalidateQueries({ queryKey: ["finance-summary"] });
    },
  });
}
