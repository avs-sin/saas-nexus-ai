import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { SignedIn, SignedOut, UserButton, CreateOrganization } from "@clerk/nextjs";

export default async function HomePage() {
  const { userId, orgSlug } = await auth();

  // If user is signed in and has an org, redirect to their dashboard
  if (userId && orgSlug) {
    redirect(`/${orgSlug}`);
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="border-b border-border px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-foreground rounded-lg flex items-center justify-center">
              <span className="text-background font-bold text-sm">N</span>
            </div>
            <span className="font-semibold text-foreground text-lg">Nexus AI</span>
          </div>
          <nav className="flex items-center gap-4">
            <SignedOut>
              <Link 
                href="/sign-in" 
                className="text-muted-foreground hover:text-foreground transition-colors text-sm"
              >
                Sign In
              </Link>
              <Link 
                href="/sign-up" 
                className="bg-primary hover:bg-primary/90 text-primary-foreground px-4 py-2 rounded-lg text-sm font-medium transition-colors"
              >
                Get Started
              </Link>
            </SignedOut>
            <SignedIn>
              <UserButton 
                appearance={{
                  elements: {
                    avatarBox: "h-9 w-9",
                  },
                }}
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
            <div className="inline-flex items-center gap-2 bg-muted border border-border rounded-full px-4 py-1.5 mb-6">
              <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></span>
              <span className="text-muted-foreground text-sm">Standard Fiber Operations Platform</span>
            </div>
            <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold text-foreground mb-6 leading-tight">
              Manufacturing & Warehouse
              <span className="text-primary"> Intelligence</span>
            </h1>
            <p className="text-muted-foreground text-lg mb-8 max-w-2xl mx-auto">
              Streamline your operations with real-time inventory tracking, production order management, 
              and warehouse utilization analytics. Built for multi-tenant B2B enterprises.
            </p>
            <div className="flex items-center justify-center gap-4">
              <Link 
                href="/sign-up"
                className="bg-primary hover:bg-primary/90 text-primary-foreground px-6 py-3 rounded-lg font-medium transition-colors"
              >
                Start Free Trial
              </Link>
              <Link 
                href="/sign-in"
                className="bg-secondary hover:bg-accent text-foreground px-6 py-3 rounded-lg font-medium transition-colors border border-border"
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
              <div className="w-16 h-16 bg-primary rounded-2xl flex items-center justify-center mx-auto mb-6">
                <span className="text-primary-foreground font-bold text-2xl">N</span>
              </div>
              <h1 className="text-2xl font-bold text-foreground mb-2">
                Create Your Organization
              </h1>
              <p className="text-muted-foreground">
                Set up your company to start managing operations with Nexus AI.
              </p>
            </div>
            <CreateOrganization
              appearance={{
                elements: {
                  rootBox: "w-full",
                  card: "bg-card border-border shadow-sm",
                  headerTitle: "text-foreground",
                  headerSubtitle: "text-muted-foreground",
                  formFieldLabel: "text-foreground",
                  formFieldInput: "bg-background border-input text-foreground",
                  formButtonPrimary: "bg-primary hover:bg-primary/90 text-primary-foreground",
                  footer: "hidden",
                },
              }}
              routing="hash"
              skipInvitationScreen={true}
            />
          </div>
        </SignedIn>
      </main>

      {/* Footer */}
      <footer className="border-t border-border px-6 py-4">
        <div className="max-w-7xl mx-auto text-center text-muted-foreground text-sm">
          © {new Date().getFullYear()} Standard Fiber. All rights reserved.
        </div>
      </footer>
    </div>
  );
}
