import {
  ArrowLeftRight,
  Banknote,
  Bed,
  Handbag,
  HomeIcon,
  LayoutDashboard,
  type LucideIcon,
  Mail,
  MapPin,
  MessageSquare,
  PlusCircle,
  Users,
  Wallet,
} from "lucide-react";

export interface NavSubItem {
  title: string;
  url: string;
  icon?: LucideIcon;
  roles?: string[];
  comingSoon?: boolean;
  newTab?: boolean;
  isNew?: boolean;
}

export interface NavMainItem {
  title: string;
  url: string;
  icon?: LucideIcon;
  roles?: string[];
  subItems?: NavSubItem[];
  comingSoon?: boolean;
  newTab?: boolean;
  isNew?: boolean;
}

export interface NavGroup {
  id: number;
  label?: string;
  items: NavMainItem[];
}

export const sidebarItems: NavGroup[] = [
  {
    id: 1,
    label: "Dashboard",
    items: [
      {
        title: "Dashboard",
        url: "/dashboard/dashboard",
        icon: LayoutDashboard,
        roles: ["SUPERADMIN", "ADMIN"],
      },
      {
        title: "Daftar Kota",
        url: "/dashboard/city",
        icon: MapPin,
        roles: ["SUPERADMIN"],
      },
      {
        title: "Daftar Unit",
        url: "/dashboard/properties",
        icon: HomeIcon,
        roles: ["SUPERADMIN", "ADMIN"],
      },
      {
        title: "Daftar Kamar",
        url: "/dashboard/rooms",
        icon: Bed,
        roles: ["ADMIN"],
        subItems: [
          {
            title: "Tambah",
            url: "/dashboard/rooms/add",
            icon: PlusCircle,
            roles: ["ADMIN"],
          },
          {
            title: "List Kamar",
            url: "/dashboard/rooms",
            icon: Bed,
            roles: ["ADMIN"],
          },
        ],
      },
      {
        title: "Daftar Penghuni",
        url: "/dashboard/tenants",
        icon: Banknote,
        roles: ["ADMIN"],
      },
      {
        title: "Daftar Kamar",
        url: "/dashboard/rooms",
        icon: Bed,
        roles: ["SUPERADMIN"],
      },
      {
        title: "Order & Transaksi",
        url: "/dashboard/order",
        icon: Handbag,
        roles: ["SUPERADMIN", "ADMIN"],
      },
      {
        title: "Pesanan Saya",
        url: "/my-bookings",
        icon: ArrowLeftRight,
        roles: ["USER"],
      },
      {
        title: "Pencairan Dana",
        url: "/dashboard/approval-withdraw",
        icon: Wallet,
        roles: ["SUPERADMIN"],
      },
      {
        title: "Penarikan Dana",
        url: "/dashboard/withdraw",
        icon: Wallet,
        roles: ["ADMIN"],
      },
    ],
  },
  {
    id: 2,
    label: "Pengaturan",
    items: [
      {
        title: "Whatsapp",
        url: "/dashboard/coming-soon",
        icon: Mail,
        roles: ["SUPERADMIN"],
        comingSoon: true,
      },
      {
        title: "Obrolan",
        url: "/dashboard/coming-soon",
        icon: MessageSquare,
        comingSoon: true,
      },
      {
        title: "Pengguna",
        url: "/dashboard/user",
        icon: Users,
        roles: ["SUPERADMIN"],
      },
    ],
  },
];
