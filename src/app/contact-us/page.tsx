import type { Metadata } from "next";
import { ContactPage } from "@/components/landing/contact-page";

export const metadata: Metadata = {
  title: "Contact Us",
  description:
    "Get in touch with TrackEzz for product support, billing questions, and privacy requests.",
};

export default function ContactUsPage() {
  return <ContactPage />;
}
