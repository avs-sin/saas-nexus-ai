import { SignUp } from "@clerk/nextjs";

export default function SignUpPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-muted/30">
      <SignUp 
        appearance={{
          elements: {
            rootBox: "mx-auto",
            card: "bg-card border-border shadow-sm",
          }
        }}
      />
    </div>
  );
}
