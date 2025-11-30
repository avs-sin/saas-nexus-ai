# Nexus AI - Standard Fiber Operations Platform

A production-ready, multi-tenant B2B SaaS platform for manufacturing and warehouse operations. Built for Standard Fiber.

## Tech Stack

- **Framework**: Next.js 15 (App Router)
- **Language**: TypeScript (strict mode)
- **Styling**: Tailwind CSS + shadcn/ui
- **Authentication**: Clerk (Organization-based multi-tenancy)
- **Backend/Database**: Convex
- **Email**: AgentMail
- **Hosting**: Vercel

## Architecture

### Multi-Tenancy Model

Each customer (tenant) is a separate Clerk Organization. This provides:

- **Complete data isolation**: All database queries are scoped by tenant ID
- **Organization-based routing**: URLs follow the pattern `/:orgSlug/*`
- **Role-based access**: Users have roles (admin, manager, operator, viewer) per tenant

### Project Structure

```
src/
├── app/
│   ├── (auth)/                 # Public auth routes (sign-in, sign-up)
│   ├── (tenant)/[orgSlug]/     # Protected tenant routes
│   ├── layout.tsx              # Root layout with ClerkProvider
│   └── page.tsx                # Landing page
├── components/
│   ├── ui/                     # shadcn/ui components
│   ├── layout/                 # Sidebar, Topbar, Navigation
│   ├── dashboard/              # Dashboard widgets
│   └── providers/              # Context providers
├── lib/
│   ├── utils.ts                # Utility functions
│   └── agentmail.ts            # Email notifications
└── types/
    └── index.ts                # TypeScript types

convex/
├── schema.ts                   # Database schema
├── auth.config.ts              # Clerk authentication config
├── tenants.ts                  # Tenant queries/mutations
├── users.ts                    # User queries/mutations
├── warehouses.ts               # Warehouse queries/mutations
├── activity.ts                 # Activity log
└── helpers/
    └── tenantScope.ts          # Tenant isolation helpers
```

## Getting Started

### Prerequisites

- Node.js 18+
- npm or pnpm
- Clerk account
- Convex account

### Installation

1. Clone the repository:
   ```bash
   git clone <repository-url>
   cd saas-nexus-ai
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Set up environment variables:
   ```bash
   cp .env.local.example .env.local
   ```

4. Configure your `.env.local`:
   ```env
   # Clerk Authentication
   NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=your_clerk_publishable_key
   CLERK_SECRET_KEY=your_clerk_secret_key
   
   # Clerk Routes
   NEXT_PUBLIC_CLERK_SIGN_IN_URL=/sign-in
   NEXT_PUBLIC_CLERK_SIGN_UP_URL=/sign-up
   NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL=/
   NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL=/
   
   # Convex
   NEXT_PUBLIC_CONVEX_URL=your_convex_deployment_url
   
   # AgentMail
   AGENTMAIL_API_KEY=your_agentmail_api_key
   AGENTMAIL_INBOX_ID=nexus-inbound@lexiesevents.com
   ```

5. Initialize Convex:
   ```bash
   npx convex dev
   ```

6. Start the development server:
   ```bash
   npm run dev
   ```

7. Open [http://localhost:3000](http://localhost:3000)

### First-Time Setup

1. Sign up for an account
2. Create a new Organization in Clerk
3. You'll be redirected to your organization's dashboard
4. Start exploring the platform!

## User Roles

| Role | Description |
|------|-------------|
| Admin | Full access to all features and settings |
| Manager | Can manage inventory, orders, and view reports |
| Operator | Can update inventory and process orders |
| Viewer | Read-only access to dashboards and reports |

## Database Schema

### Tables

- **tenants**: Organization data linked to Clerk
- **users**: User profiles with tenant-scoped roles
- **warehouses**: Warehouse locations and capacity
- **activityLog**: Audit trail for all actions

### Tenant Isolation

All queries use the `getCurrentTenantId()` helper to ensure data isolation:

```typescript
import { requireTenantId } from "./helpers/tenantScope";

export const list = query({
  handler: async (ctx) => {
    const tenantId = await requireTenantId(ctx);
    return ctx.db
      .query("warehouses")
      .withIndex("by_tenantId", (q) => q.eq("tenantId", tenantId))
      .collect();
  },
});
```

## Deployment

### Vercel (Recommended)

1. Push your code to GitHub
2. Import the project in Vercel
3. Configure environment variables in Vercel dashboard
4. Deploy!

### Environment Variables for Production

Set these in your Vercel project settings:

- `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`
- `CLERK_SECRET_KEY`
- `NEXT_PUBLIC_CONVEX_URL`
- `AGENTMAIL_API_KEY`
- `AGENTMAIL_INBOX_ID`

## Phase 1 Deliverables

- [x] Next.js 15 + TypeScript strict mode
- [x] Clerk Organizations for multi-tenancy
- [x] Convex backend with tenant-scoped schema
- [x] shadcn/ui component library
- [x] Dashboard layout (sidebar + topbar)
- [x] Organization-based routing
- [x] Placeholder dashboard widgets
- [x] AgentMail email integration
- [x] Vercel deployment ready

## Coming in Phase 2

- Inventory management (CRUD, tracking)
- Production order management
- Warehouse operations
- Reporting and analytics
- User invitation flow
- Settings and preferences

## License

Proprietary - Standard Fiber

## Support

For support, contact the development team or open an issue in the repository.
