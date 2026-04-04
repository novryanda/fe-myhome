"use client";

import { useEffect, useState } from "react";

import { BadgeCheck, Bell, CreditCard, LogOut } from "lucide-react";
import Link from "next/link";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn, getInitials } from "@/lib/utils";
import { authClient, useSession } from "@/lib/auth-client";

export function AccountSwitcher({
  users: staticUsers,
}: {
  readonly users: ReadonlyArray<{
    readonly id: string;
    readonly name: string;
    readonly email: string;
    readonly avatar?: string | null;
    readonly role: string;
  }>;
}) {
  const { data: session } = useSession();

  // Transform static users to match the session user structure
  const [activeUser, setActiveUser] = useState<any>(null);

  useEffect(() => {
    if (session?.user && !activeUser) {
      setActiveUser({
        id: session.user.id,
        name: session.user.name,
        email: session.user.email,
        avatar: session.user.image,
        role: session.user.role || "USER",
      });
    }
  }, [session, activeUser]);

  // If no session yet and no active user, use session as primary fallback, then first static user, then defaults
  const currentUser = activeUser || {
    id: session?.user?.id || staticUsers[0]?.id || "guest",
    name: session?.user?.name || staticUsers[0]?.name || "Guest",
    email: session?.user?.email || staticUsers[0]?.email || "Not logged in",
    avatar: session?.user?.image || staticUsers[0]?.avatar || undefined,
    role: session?.user?.role || staticUsers[0]?.role || "USER",
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Avatar className="size-9 rounded-lg cursor-pointer">
          <AvatarImage src={currentUser.avatar || undefined} alt={currentUser.name} className="object-cover" />
          <AvatarFallback className="rounded-lg">{getInitials(currentUser.name)}</AvatarFallback>
        </Avatar>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="min-w-56 space-y-1 rounded-lg" side="bottom" align="end" sideOffset={4}>
        {/* Active Session User Section */}
        {session?.user && (
          <DropdownMenuItem
            className={cn("p-0", currentUser.id === session.user.id && "border-l-2 border-l-primary bg-accent/50")}
            onClick={() => setActiveUser({
              id: session.user.id,
              name: session.user.name,
              email: session.user.email,
              avatar: session.user.image,
              role: session.user.role || "USER",
            })}
          >
            <div className="flex w-full items-center justify-between gap-2 px-1 py-1.5">
              <Avatar className="size-9 rounded-lg">
                <AvatarImage src={session.user.image || undefined} alt={session.user.name} className="object-cover" />
                <AvatarFallback className="rounded-lg">{getInitials(session.user.name)}</AvatarFallback>
              </Avatar>
              <div className="grid flex-1 text-left text-sm leading-tight">
                <span className="truncate font-semibold">{session.user.name}</span>
                <span className="truncate text-xs capitalize">{session.user.role}</span>
              </div>
            </div>
          </DropdownMenuItem>
        )}

        <DropdownMenuSeparator />

        {/* Static Users for switching (Demo) */}
        {staticUsers.map((user) => (
          <DropdownMenuItem
            key={user.email}
            className={cn("p-0", user.id === currentUser.id && "border-l-2 border-l-primary bg-accent/50")}
            onClick={() => setActiveUser(user)}
          >
            <div className="flex w-full items-center justify-between gap-2 px-1 py-1.5">
              <Avatar className="size-9 rounded-lg">
                <AvatarImage src={user.avatar || undefined} alt={user.name} className="object-cover" />
                <AvatarFallback className="rounded-lg">{getInitials(user.name)}</AvatarFallback>
              </Avatar>
              <div className="grid flex-1 text-left text-sm leading-tight">
                <span className="truncate font-semibold">{user.name}</span>
                <span className="truncate text-xs capitalize">{user.role}</span>
              </div>
            </div>
          </DropdownMenuItem>
        ))}
        <DropdownMenuSeparator />
        <DropdownMenuGroup>
          <Link href="/dashboard/profile" className="w-full">
            <DropdownMenuItem>
              <BadgeCheck />
              Account
            </DropdownMenuItem>
          </Link>
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={async () => {
          await authClient.signOut({
            fetchOptions: {
              onSuccess: () => {
                window.location.href = "/auth/login";
              }
            }
          });
        }} className="cursor-pointer text-destructive focus:text-destructive">
          <LogOut />
          Log out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
