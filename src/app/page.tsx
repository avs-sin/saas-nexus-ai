import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import {
  SignedIn,
  SignedOut,
  UserButton,
  CreateOrganization,
} from "@clerk/nextjs";
import {
  NexusBeamDemo,
  ModuleShowcase,
  BenefitsMarquee,
} from "@/components/marketing";
import BlurText from "@/components/ui/blur-text";
import { ArrowRight } from "lucide-react";

export default async function HomePage() {
  const { userId, orgSlug } = await auth();

  // If user is signed in and has an org, redirect to their dashboard
  if (userId && orgSlug) {
    redirect(`/${orgSlug}`);
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-border bg-background/80 backdrop-blur-md px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 bg-foreground rounded-lg flex items-center justify-center">
              <span className="text-background font-bold text-sm">N</span>
            </div>
            <span className="font-semibold text-foreground text-lg tracking-tight">
              Nexus AI
            </span>
          </div>
          <nav className="flex items-center gap-4">
            <SignedOut>
              <Link
                href="/sign-in"
                className="text-muted-foreground hover:text-foreground transition-colors text-sm font-medium"
              >
                Sign In
              </Link>
              <Link
                href="/sign-up"
                className="bg-foreground hover:bg-foreground/90 text-background px-4 py-2 rounded-lg text-sm font-medium transition-colors"
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
      <main className="flex-1">
        <SignedOut>
          {/* Hero Section */}
          <section className="relative px-6 pt-20 pb-16 overflow-hidden">
            {/* Subtle grid background */}
            <div
              className="absolute inset-0 -z-10"
              style={{
                backgroundImage: `radial-gradient(circle at 1px 1px, hsl(var(--muted-foreground) / 0.07) 1px, transparent 0)`,
                backgroundSize: "40px 40px",
              }}
            />

            <div className="max-w-7xl mx-auto">
              <div className="flex flex-col lg:flex-row items-center gap-12 lg:gap-16">
                {/* Left: Text content */}
                <div className="flex-1 text-center lg:text-left">
                  <div className="inline-flex items-center gap-2 bg-muted border border-border rounded-full px-4 py-1.5 mb-6">
                    <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
                    <span className="text-muted-foreground text-sm">
                      Standard Fiber Operations Platform
                    </span>
                  </div>

                  <BlurText
                    text="Manufacturing & Warehouse Intelligence"
                    className="text-4xl sm:text-5xl lg:text-6xl font-bold text-foreground mb-6 leading-tight justify-center lg:justify-start"
                    delay={80}
                    animateBy="words"
                  />

                  <p className="text-muted-foreground text-lg mb-8 max-w-xl mx-auto lg:mx-0">
                    Streamline operations with real-time inventory tracking,
                    production order management, and AI-powered suggestions.
                    Built for multi-tenant B2B enterprises.
                  </p>

                  <div className="flex items-center justify-center lg:justify-start gap-4">
                    <Link
                      href="/sign-up"
                      className="group bg-foreground hover:bg-foreground/90 text-background px-6 py-3 rounded-lg font-medium transition-all flex items-center gap-2"
                    >
                      Get Started
                      <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                    </Link>
                    <Link
                      href="/sign-in"
                      className="bg-card hover:bg-accent text-foreground px-6 py-3 rounded-lg font-medium transition-colors border border-border"
                    >
                      Sign In
                    </Link>
                  </div>
                </div>

                {/* Right: Beam visualization */}
                <div className="flex-1 flex justify-center">
                  <NexusBeamDemo className="w-full max-w-lg" />
                </div>
              </div>
            </div>
          </section>

          {/* Benefits Marquee */}
          <BenefitsMarquee />

          {/* Module Showcase */}
          <ModuleShowcase />

          {/* Footer CTA */}
          <section className="py-20 px-6">
            <div className="max-w-3xl mx-auto text-center">
              <h2 className="text-3xl font-bold text-foreground mb-4">
                Ready to streamline your operations?
              </h2>
              <p className="text-lg text-muted-foreground mb-8">
                Join the internal teams already using Nexus AI to transform
                manufacturing and warehouse workflows.
              </p>
              <Link
                href="/sign-up"
                className="group inline-flex items-center gap-2 bg-foreground hover:bg-foreground/90 text-background px-8 py-4 rounded-xl font-medium text-lg transition-all"
              >
                Start Using Nexus AI
                <ArrowRight className="h-5 w-5 transition-transform group-hover:translate-x-1" />
              </Link>
            </div>
          </section>
        </SignedOut>

        <SignedIn>
          {/* Organization creation for signed-in users without an org */}
          <div className="flex-1 flex items-center justify-center px-6 py-20">
            <div className="max-w-lg mx-auto">
              <div className="text-center mb-8">
                <div className="w-16 h-16 bg-foreground rounded-2xl flex items-center justify-center mx-auto mb-6">
                  <span className="text-background font-bold text-2xl">N</span>
                </div>
                <h1 className="text-2xl font-bold text-foreground mb-2">
                  Create Your Organization
                </h1>
                <p className="text-muted-foreground">
                  Set up your company to start managing operations with Nexus
                  AI.
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
                    formButtonPrimary:
                      "bg-foreground hover:bg-foreground/90 text-background",
                    footer: "hidden",
                  },
                }}
                routing="hash"
                skipInvitationScreen={true}
              />
            </div>
          </div>
        </SignedIn>
      </main>

      {/* Footer */}
      <footer className="border-t border-border px-6 py-6">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 bg-foreground rounded flex items-center justify-center">
              <span className="text-background font-bold text-xs">N</span>
            </div>
            <span className="text-sm text-muted-foreground">
              Nexus AI by Standard Fiber
            </span>
          </div>
          <p className="text-muted-foreground text-sm">
            © {new Date().getFullYear()} Standard Fiber. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
}
