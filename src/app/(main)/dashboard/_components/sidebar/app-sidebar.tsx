"use client";

import Image from "next/image";
import Link from "next/link";
import { useShallow } from "zustand/react/shallow";

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import { sidebarItems } from "@/navigation/sidebar/sidebar-items";
import { usePreferencesStore } from "@/stores/preferences/preferences-provider";
import { useSession } from "@/lib/auth-client";

import { NavMain } from "./nav-main";
import { NavUser } from "./nav-user";

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const { data: session } = useSession();
  const { sidebarVariant, sidebarCollapsible, isSynced } = usePreferencesStore(
    useShallow((s) => ({
      sidebarVariant: s.sidebarVariant,
      sidebarCollapsible: s.sidebarCollapsible,
      isSynced: s.isSynced,
    })),
  );

  const variant = isSynced ? sidebarVariant : props.variant;
  const collapsible = isSynced ? sidebarCollapsible : props.collapsible;

  // Filter sidebar items based on user role
  const userRole = session?.user?.role || "USER";
  const filteredSidebarItems = sidebarItems.map(group => ({
    ...group,
    items: group.items
      .filter(item => !item.roles || item.roles.includes(userRole))
      .map(item => ({
        ...item,
        subItems: item.subItems?.filter(sub => !sub.roles || sub.roles.includes(userRole))
      }))
      .filter(item => !item.subItems || item.subItems.length > 0)
  })).filter(group => group.items.length > 0);

  const userData = session?.user ? {
    name: session.user.name,
    email: session.user.email,
    avatar: session.user.image || undefined,
  } : {
    name: "Tamu",
    email: "Belum masuk",
    avatar: undefined,
  };

  return (
    <Sidebar {...props} variant={variant} collapsible={collapsible}>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <Link
              prefetch={false}
              href="/dashboard/dashboard"
              className="flex h-14 items-center justify-center rounded-2xl border border-sidebar-border bg-sidebar-accent/60 px-3 transition hover:bg-sidebar-accent group-data-[collapsible=icon]:h-10 group-data-[collapsible=icon]:px-1.5"
            >
              <Image
                src="/logo.png"
                alt="MyHome"
                width={160}
                height={40}
                className="h-8 w-auto object-contain group-data-[collapsible=icon]:h-6"
                priority
              />
            </Link>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        <NavMain items={filteredSidebarItems} />
      </SidebarContent>
      <SidebarFooter>
        <NavUser user={userData} />
      </SidebarFooter>
    </Sidebar>
  );
}
