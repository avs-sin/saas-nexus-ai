// Convex auth configuration for Clerk
// This configures Convex to validate Clerk JWTs

const authConfig = {
  providers: [
    {
      // The domain of your Clerk app (from the Clerk Dashboard)
      // Format: https://<your-clerk-subdomain>.clerk.accounts.dev
      domain: "https://thorough-ant-79.clerk.accounts.dev",
      // The application ID - use "convex" as the identifier
      applicationID: "convex",
    },
  ],
};

export default authConfig;
