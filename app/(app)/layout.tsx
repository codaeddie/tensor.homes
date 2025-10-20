/**
 * Layout for protected app routes (dashboard, editor).
 *
 * SERVER COMPONENT - checks auth and redirects if not signed in.
 * Provides navigation header with user menu and sign-out functionality.
 */

export const runtime = "nodejs"; // Required for Clerk auth

import { auth } from "@clerk/nextjs/server";
import { UserButton } from "@clerk/nextjs";
import { redirect } from "next/navigation";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const { userId } = await auth();
  
  // Protect this entire route group - redirect to signin if not authenticated
  if (!userId) {
    redirect("/signin");
  }

  return (
    <div className="relative min-h-screen">
      {/* Floating user button */}
      <div className="fixed right-6 top-6 z-50">
        <UserButton />
      </div>
      <main>{children}</main>
    </div>
  );
}
