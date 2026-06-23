import type { Metadata } from "next";
import { LandingPage } from "@/components/landing/landing-page";

export const metadata: Metadata = {
  title: "TrackEzz — AI-Powered Project Management",
  description:
    "Plan sprints, track issues, and ship faster with an AI Project Assistant, Smart Triage, Duplicate Detection, and Comment Intelligence — all in one workspace.",
};

export default function Page() {
  return <LandingPage />;
}
