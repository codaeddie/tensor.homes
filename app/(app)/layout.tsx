/**
 * Layout for protected app routes (dashboard, editor).
 *
 * SERVER COMPONENT - checks auth and redirects if not signed in.
 * Provides navigation header with user menu and sign-out functionality.
 */

export const runtime = "nodejs"; // Required for Clerk auth

import { auth } from "@clerk/nextjs/server";
import { UserButton } from "@clerk/nextjs";
import Link from "next/link";
import { redirect } from "next/navigation";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const { userId } = await auth();
  
  // Protect this entire route group - redirect to signin if not authenticated
  if (!userId) {
    redirect("/signin");
  }

  return (
    <div className="flex min-h-screen flex-col">
      <header className="border-b bg-white">
        <div className="container mx-auto flex h-16 items-center justify-between px-4">
          <div className="flex items-center gap-6">
            <Link href="/dashboard" className="text-xl font-bold">
              tensor.homes
            </Link>
            <nav className="flex gap-4">
              <Link
                href="/dashboard"
                className="text-sm text-gray-600 hover:text-gray-900"
              >
                Dashboard
              </Link>
              <Link
                href="/editor"
                className="text-sm text-gray-600 hover:text-gray-900"
              >
                New Project
              </Link>
            </nav>
          </div>
          <UserButton />
        </div>
      </header>
      <main className="flex-1">{children}</main>
    </div>
  );
}
