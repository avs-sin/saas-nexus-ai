import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { SignedIn, SignedOut, UserButton, CreateOrganization } from "@clerk/nextjs";
import { dark } from "@clerk/themes";

export default async function HomePage() {
  const { userId, orgSlug } = await auth();

  // If user is signed in and has an org, redirect to their dashboard
  if (userId && orgSlug) {
    redirect(`/${orgSlug}`);
  }

  return (
    <div className="min-h-screen bg-zinc-950 flex flex-col">
      {/* Header */}
      <header className="border-b border-zinc-800 px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-orange-500 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-sm">N</span>
            </div>
            <span className="font-semibold text-zinc-100 text-lg">Nexus AI</span>
          </div>
          <nav className="flex items-center gap-4">
            <SignedOut>
              <Link 
                href="/sign-in" 
                className="text-zinc-400 hover:text-zinc-100 transition-colors text-sm"
              >
                Sign In
              </Link>
              <Link 
                href="/sign-up" 
                className="bg-orange-500 hover:bg-orange-600 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
              >
                Get Started
              </Link>
            </SignedOut>
            <SignedIn>
              <UserButton 
                appearance={{
                  baseTheme: dark,
                  elements: {
                    avatarBox: "h-9 w-9",
                  },
                }}
                afterSignOutUrl="/"
              />
            </SignedIn>
          </nav>
        </div>
      </header>

      {/* Content */}
      <main className="flex-1 flex items-center justify-center px-6">
        <SignedOut>
          {/* Landing page for non-authenticated users */}
          <div className="max-w-3xl mx-auto text-center">
            <div className="inline-flex items-center gap-2 bg-zinc-900 border border-zinc-800 rounded-full px-4 py-1.5 mb-6">
              <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
              <span className="text-zinc-400 text-sm">Standard Fiber Operations Platform</span>
            </div>
            <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold text-zinc-100 mb-6 leading-tight">
              Manufacturing & Warehouse
              <span className="text-orange-500"> Intelligence</span>
            </h1>
            <p className="text-zinc-400 text-lg mb-8 max-w-2xl mx-auto">
              Streamline your operations with real-time inventory tracking, production order management, 
              and warehouse utilization analytics. Built for multi-tenant B2B enterprises.
            </p>
            <div className="flex items-center justify-center gap-4">
              <Link 
                href="/sign-up"
                className="bg-orange-500 hover:bg-orange-600 text-white px-6 py-3 rounded-lg font-medium transition-colors"
              >
                Start Free Trial
              </Link>
              <Link 
                href="/sign-in"
                className="bg-zinc-800 hover:bg-zinc-700 text-zinc-100 px-6 py-3 rounded-lg font-medium transition-colors border border-zinc-700"
              >
                Sign In
              </Link>
            </div>
          </div>
        </SignedOut>

        <SignedIn>
          {/* Organization creation for signed-in users without an org */}
          <div className="max-w-lg mx-auto">
            <div className="text-center mb-8">
              <div className="w-16 h-16 bg-orange-500 rounded-2xl flex items-center justify-center mx-auto mb-6">
                <span className="text-white font-bold text-2xl">N</span>
              </div>
              <h1 className="text-2xl font-bold text-zinc-100 mb-2">
                Create Your Organization
              </h1>
              <p className="text-zinc-400">
                Set up your company to start managing operations with Nexus AI.
              </p>
            </div>
            <CreateOrganization
              appearance={{
                baseTheme: dark,
                elements: {
                  rootBox: "w-full",
                  card: "bg-zinc-900 border-zinc-800 shadow-xl",
                  headerTitle: "text-zinc-100",
                  headerSubtitle: "text-zinc-400",
                  formFieldLabel: "text-zinc-300",
                  formFieldInput: "bg-zinc-800 border-zinc-700 text-zinc-100",
                  formButtonPrimary: "bg-orange-500 hover:bg-orange-600",
                  footer: "hidden",
                },
              }}
              afterCreateOrganizationUrl="/:slug"
              skipInvitationScreen={true}
            />
          </div>
        </SignedIn>
      </main>

      {/* Footer */}
      <footer className="border-t border-zinc-800 px-6 py-4">
        <div className="max-w-7xl mx-auto text-center text-zinc-500 text-sm">
          © {new Date().getFullYear()} Standard Fiber. All rights reserved.
        </div>
      </footer>
    </div>
  );
}
