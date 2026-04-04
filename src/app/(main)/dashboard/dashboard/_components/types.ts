export type DashboardRange = "7d" | "30d" | "90d";

export type DashboardTrend = "up" | "down" | "neutral";

export type DashboardKpi = {
  key: string;
  label: string;
  helper: string;
  value: number;
  formattedValue: string;
  currentPeriodValue: number;
  previousPeriodValue: number;
  changePercent: number;
  changeLabel: string;
  trend: DashboardTrend;
  details: {
    title: string;
    description: string;
    items: Array<{
      label: string;
      value: string;
    }>;
  };
};

export type DashboardChartPoint = {
  date: string;
  users: number;
  transactions: number;
  failedTransactions: number;
};

export type DashboardOverview = {
  scope: "ADMIN" | "SUPERADMIN";
  range: DashboardRange;
  generatedAt: string;
  kpis: DashboardKpi[];
  chart: DashboardChartPoint[];
};

export type DashboardUsersResponse = {
  data: DashboardUserRow[];
  paging: {
    current_page: number;
    size: number;
    total_page: number;
    total_items: number;
  };
};

export type DashboardTransactionsResponse = {
  data: DashboardTransactionRow[];
  paging: {
    current_page: number;
    size: number;
    total_page: number;
    total_items: number;
  };
};

export type DashboardUserRow = {
  id: string;
  name: string;
  email: string;
  role: string;
  status: "ACTIVE" | "SUSPENDED";
  createdAt: string;
  totalBookings: number;
  latestBookingAt: string | null;
  latestPropertyName: string | null;
};

export type DashboardTransactionRow = {
  id: string;
  bookingCode: string;
  tenantName: string;
  propertyName: string;
  roomNumber: string;
  category: string;
  status: string;
  paymentType: string | null;
  amount: number;
  createdAt: string;
  paidAt: string | null;
  expiredAt: string | null;
};
