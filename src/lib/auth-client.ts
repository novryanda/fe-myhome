import { createAuthClient } from "better-auth/react";
import { adminClient } from "better-auth/client/plugins";

const authBaseURL =
    typeof window !== "undefined"
        ? window.location.origin
        : process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

export const authClient = createAuthClient({
    baseURL: authBaseURL,
    plugins: [
        adminClient(),
    ],
});

export const { signIn, signUp, useSession } = authClient;
