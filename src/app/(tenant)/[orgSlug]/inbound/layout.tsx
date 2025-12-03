import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Nexus Inbound",
  description: "Inbound logistics management - receiving, discrepancies, and vendor scorecards",
};

export default function InboundLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}








