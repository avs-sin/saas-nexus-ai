// Convex auth configuration for Clerk
// This configures Convex to validate Clerk JWTs
// 
// IMPORTANT: Make sure you've created a JWT Template in Clerk Dashboard:
// 1. Go to Clerk Dashboard → JWT Templates
// 2. Click "New template" → Select "Convex"
// 3. The template should automatically set:
//    - Name: "convex"
//    - Issuer: Your Clerk Frontend API URL
//    - Audience: "convex"
// 4. Save the template

export default {
  providers: [
    {
      // The domain is your Clerk Frontend API URL
      // Found in Clerk Dashboard → API Keys → Frontend API URL
      // Update this to match your Clerk instance
      domain: "https://thorough-ant-79.clerk.accounts.dev",
      // The applicationID must match the "aud" claim in the JWT
      // For Clerk's Convex template, this should be "convex"
      applicationID: "convex",
    },
  ],
};
