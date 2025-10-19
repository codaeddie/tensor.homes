/**
 * Landing page for tensor.homes.
 *
 * Simple marketing page with call-to-action to sign in or get started.
 */

import { auth } from "@clerk/nextjs/server";
import Link from "next/link";
import { redirect } from "next/navigation";

export default async function HomePage() {
  const { userId } = await auth();

  // Redirect to dashboard if already signed in
  if (userId) {
    redirect("/dashboard");
  }

  return (
    <div className="flex min-h-screen flex-col">
      {/* Header */}
      <header className="border-b bg-white">
        <div className="container mx-auto flex h-16 items-center justify-between px-4">
          <h1 className="text-xl font-bold">tensor.homes</h1>
          <Link
            href="/signin"
            className="rounded-lg bg-blue-600 px-4 py-2 text-white hover:bg-blue-700"
          >
            Sign In
          </Link>
        </div>
      </header>

      {/* Hero */}
      <main className="flex flex-1 items-center justify-center bg-gradient-to-b from-white to-gray-50">
        <div className="container mx-auto px-4 text-center">
          <h2 className="mb-6 text-5xl font-bold">
            Create, Edit, and Share
            <br />
            Interactive Drawings
          </h2>
          <p className="mb-8 text-xl text-gray-600">
            A collaborative drawing platform powered by tldraw.
            <br />
            Build your visual ideas in the browser and share them with the
            world.
          </p>
          <div className="flex justify-center gap-4">
            <Link
              href="/signin"
              className="rounded-lg bg-blue-600 px-6 py-3 text-lg font-medium text-white hover:bg-blue-700"
            >
              Get Started
            </Link>
            <a
              href="#features"
              className="rounded-lg border border-gray-300 bg-white px-6 py-3 text-lg font-medium text-gray-700 hover:bg-gray-50"
            >
              Learn More
            </a>
          </div>
        </div>
      </main>

      {/* Features */}
      <section id="features" className="bg-white py-20">
        <div className="container mx-auto px-4">
          <h3 className="mb-12 text-center text-3xl font-bold">Features</h3>
          <div className="grid gap-8 md:grid-cols-3">
            <div className="rounded-lg border p-6">
              <h4 className="mb-3 text-xl font-semibold">Backstage</h4>
              <p className="text-gray-600">
                Manage all your projects in one place. View thumbnails, search,
                and organize your creative work.
              </p>
            </div>
            <div className="rounded-lg border p-6">
              <h4 className="mb-3 text-xl font-semibold">Main Stage</h4>
              <p className="text-gray-600">
                Full-featured tldraw editor with auto-save. Create and edit
                drawings with powerful tools and controls.
              </p>
            </div>
            <div className="rounded-lg border p-6">
              <h4 className="mb-3 text-xl font-semibold">Show Stage</h4>
              <p className="text-gray-600">
                Share your published work with read-only views and collaborative
                comments from viewers.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t bg-gray-50 py-8">
        <div className="container mx-auto px-4 text-center text-gray-600">
          <p>&copy; 2025 tensor.homes. Built with Next.js and tldraw.</p>
        </div>
      </footer>
    </div>
  );
}
