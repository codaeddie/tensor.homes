/**
 * Sign-up page using Clerk authentication.
 *
 * Provides a centered sign-up form for new users.
 */

import { SignUp } from "@clerk/nextjs";

export default function SignUpPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50">
      <SignUp
        routing="hash"
        appearance={{
          elements: {
            rootBox: "mx-auto",
            card: "shadow-lg",
          },
        }}
        signInUrl="/signin"
        forceRedirectUrl="/dashboard"
      />
    </div>
  );
}
