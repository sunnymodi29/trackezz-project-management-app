"use client";

import { useState } from "react";
import Link from "next/link";
import { Mail, MessageSquare, CreditCard, Shield } from "lucide-react";
import { Button } from "@/components/ui";
import { MarketingShell } from "@/components/landing/marketing-shell";

const CONTACT_CHANNELS = [
  {
    icon: MessageSquare,
    title: "General support",
    email: "support@trackezz.com",
    description: "Product questions, bugs, and account help.",
    response: "Within 1–2 business days",
  },
  {
    icon: CreditCard,
    title: "Billing & subscriptions",
    email: "billing@trackezz.com",
    description: "Invoices, plan changes, and payment issues.",
    response: "Within 1–2 business days",
  },
  {
    icon: Shield,
    title: "Privacy & data requests",
    email: "privacy@trackezz.com",
    description: "Privacy inquiries, data export, or deletion requests.",
    response: "Within 30 days for formal requests",
  },
] as const;

export function ContactPage() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const body = [
      `Name: ${name}`,
      `Email: ${email}`,
      "",
      message,
    ].join("\n");
    const mailto = `mailto:support@trackezz.com?subject=${encodeURIComponent(subject || "TrackEzz contact")}&body=${encodeURIComponent(body)}`;
    window.location.href = mailto;
  }

  return (
    <MarketingShell>
      <header className="mb-10 text-center">
        <h1 className="text-3xl font-bold tracking-tight md:text-4xl">Contact us</h1>
        <p className="mx-auto mt-3 max-w-xl text-muted-foreground leading-relaxed">
          We&apos;re here to help with product support, billing, and privacy questions.
          Choose the channel that fits, or send us a message below.
        </p>
      </header>

      <div className="mb-10 grid gap-4 sm:grid-cols-3">
        {CONTACT_CHANNELS.map(({ icon: Icon, title, email, description, response }) => (
          <div
            key={email}
            className="rounded-xl border border-border bg-card p-5"
          >
            <div className="mb-3 flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <Icon className="h-4 w-4" />
            </div>
            <h2 className="text-sm font-semibold">{title}</h2>
            <p className="mt-1 text-xs text-muted-foreground leading-relaxed">
              {description}
            </p>
            <a
              href={`mailto:${email}`}
              className="mt-3 inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:underline"
            >
              <Mail className="h-3.5 w-3.5" />
              {email}
            </a>
            <p className="mt-2 text-[11px] text-muted-foreground">{response}</p>
          </div>
        ))}
      </div>

      <div className="rounded-2xl border border-border bg-card p-6 md:p-8">
        <h2 className="text-lg font-semibold">Send a message</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          This opens your default email client addressed to{" "}
          <a href="mailto:support@trackezz.com" className="text-primary hover:underline">
            support@trackezz.com
          </a>
          .
        </p>

        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block space-y-1.5">
              <span className="text-sm font-medium">Name</span>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm outline-none ring-primary/30 focus:ring-2"
                placeholder="Your name"
              />
            </label>
            <label className="block space-y-1.5">
              <span className="text-sm font-medium">Email</span>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm outline-none ring-primary/30 focus:ring-2"
                placeholder="you@company.com"
              />
            </label>
          </div>
          <label className="block space-y-1.5">
            <span className="text-sm font-medium">Subject</span>
            <input
              type="text"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm outline-none ring-primary/30 focus:ring-2"
              placeholder="How can we help?"
            />
          </label>
          <label className="block space-y-1.5">
            <span className="text-sm font-medium">Message</span>
            <textarea
              required
              rows={5}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              className="w-full resize-y rounded-md border border-border bg-background px-3 py-2 text-sm outline-none ring-primary/30 focus:ring-2"
              placeholder="Tell us more about your question or issue…"
            />
          </label>
          <Button type="submit" className="w-full sm:w-auto">
            Open email to send
          </Button>
        </form>
      </div>

      <p className="mt-8 text-center text-sm text-muted-foreground">
        For legal terms, see our{" "}
        <Link href="/terms-of-service" className="text-primary hover:underline">
          Terms of Service
        </Link>{" "}
        and{" "}
        <Link href="/privacy-policy" className="text-primary hover:underline">
          Privacy Policy
        </Link>
        .
      </p>
    </MarketingShell>
  );
}
