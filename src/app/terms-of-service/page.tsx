import type { Metadata } from "next";
import Link from "next/link";
import { MarketingShell } from "@/components/landing/marketing-shell";
import {
  LegalDocument,
  LegalSection,
} from "@/components/landing/legal-document";
import { SITE_NAME, SUPPORT_EMAIL } from "@/lib/marketing/site";

export const metadata: Metadata = {
  title: "Terms of Service",
  description: `Terms of Service for ${SITE_NAME} — the rules for using our project management platform.`,
};

export default function TermsOfServicePage() {
  return (
    <MarketingShell>
        <LegalDocument
          title="Terms of Service"
          description="Please read these terms carefully before using TrackEzz."
        >
          <p>
            These Terms of Service (&quot;Terms&quot;) govern your access to and
            use of {SITE_NAME} (&quot;TrackEzz,&quot; &quot;we,&quot;
            &quot;us,&quot; or &quot;our&quot;), including our website,
            applications, and related services (collectively, the
            &quot;Service&quot;). By creating an account or using the Service,
            you agree to these Terms.
          </p>

          <LegalSection title="1. Eligibility">
            <p>
              You must be at least 16 years old and able to form a binding
              contract to use the Service. If you use TrackEzz on behalf of an
              organization, you represent that you have authority to bind that
              organization to these Terms.
            </p>
          </LegalSection>

          <LegalSection title="2. Accounts and organizations">
            <p>
              You are responsible for maintaining the confidentiality of your
              account credentials and for all activity under your account. When
              you create or join an organization workspace, you agree to use the
              Service in compliance with your organization&apos;s policies and
              applicable law.
            </p>
          </LegalSection>

          <LegalSection title="3. Plans and billing">
            <p>
              TrackEzz currently offers a Free plan with the limits described on
              our <Link href="/pricing">Pricing</Link> page. Paid plans, including
              Pro, may be introduced in the future. When available, pricing and
              billing terms will be shown at checkout and in workspace settings.
            </p>
            <p>
              Paid subscriptions, when offered, are processed by our payment
              provider. By subscribing, you authorize recurring charges until you
              cancel. Organization owners and authorized billing contacts may
              manage subscriptions in workspace settings. See our{" "}
              <Link href="/refund-policy">Refund Policy</Link> for cancellation
              and refund details.
            </p>
          </LegalSection>

          <LegalSection title="4. Acceptable use">
            <p>You agree not to:</p>
            <ul>
              <li>Violate any law or third-party rights</li>
              <li>Upload malware, spam, or abusive content</li>
              <li>
                Attempt to gain unauthorized access to the Service or other
                accounts
              </li>
              <li>
                Reverse engineer, scrape, or overload the Service except as
                permitted by law
              </li>
              <li>
                Use the Service to store or transmit unlawful or infringing
                material
              </li>
            </ul>
            <p>
              We may suspend or terminate access if we reasonably believe you
              have violated these Terms or pose a risk to the Service or other
              users.
            </p>
          </LegalSection>

          <LegalSection title="5. Your content">
            <p>
              You retain ownership of issues, comments, files, and other content
              you submit (&quot;Customer Content&quot;). You grant TrackEzz a
              limited license to host, process, and display Customer Content
              solely to operate and improve the Service — including AI features
              you choose to use, such as triage suggestions, summaries, and the
              project assistant.
            </p>
            <p>
              You are responsible for Customer Content and must have the rights
              needed to submit it. Do not submit sensitive personal data unless
              your organization has assessed the risks and configured the Service
              appropriately.
            </p>
          </LegalSection>

          <LegalSection title="6. AI features">
            <p>
              AI-powered features may generate suggestions or text based on your
              workspace data. Outputs may be inaccurate or incomplete. You are
              responsible for reviewing AI suggestions before applying them.
              Usage limits may apply on the Free plan as described on our{" "}
              <Link href="/pricing">Pricing</Link> page.
            </p>
          </LegalSection>

          <LegalSection title="7. Intellectual property">
            <p>
              TrackEzz and its branding, software, and documentation are owned by
              us or our licensors and are protected by intellectual property
              laws. These Terms do not grant you any rights to our trademarks
              or proprietary technology except the limited right to use the
              Service as provided.
            </p>
          </LegalSection>

          <LegalSection title="8. Third-party services">
            <p>
              The Service may integrate with third-party tools (for example,
              Google sign-in, payment processors, or MCP-compatible clients). Your
              third-party services is subject to their terms and privacy
              policies.
            </p>
          </LegalSection>

          <LegalSection title="9. Disclaimers">
            <p>
              THE SERVICE IS PROVIDED &quot;AS IS&quot; AND &quot;AS
              AVAILABLE.&quot; TO THE MAXIMUM EXTENT PERMITTED BY LAW, WE
              DISCLAIM ALL WARRANTIES, EXPRESS OR IMPLIED, INCLUDING
              MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE, AND
              NON-INFRINGEMENT. WE DO NOT GUARANTEE UNINTERRUPTED OR ERROR-FREE
              OPERATION.
            </p>
          </LegalSection>

          <LegalSection title="10. Limitation of liability">
            <p>
              TO THE MAXIMUM EXTENT PERMITTED BY LAW, TRACKEZZ AND ITS
              AFFILIATES WILL NOT BE LIABLE FOR ANY INDIRECT, INCIDENTAL,
              SPECIAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES, OR ANY LOSS OF
              PROFITS, DATA, OR GOODWILL, ARISING FROM YOUR USE OF THE SERVICE.
              OUR TOTAL LIABILITY FOR ANY CLAIM RELATING TO THE SERVICE IS
              LIMITED TO THE AMOUNTS YOU PAID US IN THE TWELVE (12) MONTHS
              BEFORE THE EVENT GIVING RISE TO THE CLAIM, OR ONE HUNDRED U.S.
              DOLLARS ($100), WHICHEVER IS GREATER.
            </p>
          </LegalSection>

          <LegalSection title="11. Changes">
            <p>
              We may update these Terms from time to time. If changes are
              material, we will provide reasonable notice (for example, by email
              or in-app notice). Continued use after the effective date
              constitutes acceptance of the updated Terms.
            </p>
          </LegalSection>

          <LegalSection title="12. Termination">
            <p>
              You may stop using the Service at any time. We may suspend or
              terminate the Service or your account as described in these Terms
              or where required by law. Provisions that by their nature should
              survive termination (including ownership, disclaimers, and
              limitations of liability) will survive.
            </p>
          </LegalSection>

          <LegalSection title="13. Governing law">
            <p>
              These Terms are governed by the laws of the State of Delaware,
              United States, without regard to conflict-of-law principles, except
              where mandatory consumer protection laws in your jurisdiction
              provide otherwise.
            </p>
          </LegalSection>

          <LegalSection title="14. Contact">
            <p>
              Questions about these Terms? Contact us at{" "}
              <a href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</a> or via
              our <Link href="/contact-us">Contact Us</Link> page.
            </p>
          </LegalSection>
        </LegalDocument>
    </MarketingShell>
  );
}
