import type { Metadata } from "next";
import Link from "next/link";
import { MarketingShell } from "@/components/landing/marketing-shell";
import {
  LegalDocument,
  LegalSection,
} from "@/components/landing/legal-document";
import { SITE_NAME, SUPPORT_EMAIL } from "@/lib/marketing/site";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description: `How ${SITE_NAME} collects, uses, and protects your information.`,
};

export default function PrivacyPolicyPage() {
  return (
    <MarketingShell>
        <LegalDocument
          title="Privacy Policy"
          description="How we collect, use, and protect your information."
        >
          <p>
            This Privacy Policy explains how {SITE_NAME} (&quot;TrackEzz,&quot;
            &quot;we,&quot; &quot;us,&quot; or &quot;our&quot;) collects, uses,
            and shares information when you use our website, applications, and
            related services (the &quot;Service&quot;).
          </p>

          <LegalSection title="1. Information we collect">
            <p>
              <strong>Account and profile information.</strong> When you register
              or are invited to a workspace, we collect information such as your
              name, email address, password (stored in hashed form), and
              organization membership. If you sign in with Google, we receive
              basic profile information from Google according to your OAuth
              consent.
            </p>
            <p>
              <strong>Workspace content.</strong> We process content you and your
              teammates create in TrackEzz, including projects, issues,
              comments, labels, sprints, attachments, and activity history. This
              content is used to provide core product features and, when you use
              AI features, to generate context-aware responses and suggestions.
            </p>
            <p>
              <strong>Usage and billing data.</strong> We collect information
              about how you use the Service (for example, feature usage, AI
              message counts, and analytics events) to operate the product,
              enforce plan limits, and improve reliability. If you subscribe to
              Pro, payment details are handled by our payment provider; we receive
              subscription status, billing period, and limited payment metadata —
              not full card numbers.
            </p>
            <p>
              <strong>Technical data.</strong> We automatically collect device
              and log information such as IP address, browser type, timestamps,
              and error logs to secure and maintain the Service.
            </p>
          </LegalSection>

          <LegalSection title="2. How we use information">
            <p>We use the information we collect to:</p>
            <ul>
              <li>Provide, maintain, and improve the Service</li>
              <li>
                Authenticate users and manage organizations, projects, and
                invitations
              </li>
              <li>Process subscriptions and communicate about billing</li>
              <li>
                Operate AI features you request (triage, summaries, assistant
                chat, and similar tools)
              </li>
              <li>Monitor usage against plan limits and prevent abuse</li>
              <li>
                Send service-related messages (for example, invitations and
                security notices)
              </li>
              <li>Comply with legal obligations and enforce our Terms</li>
            </ul>
          </LegalSection>

          <LegalSection title="3. AI processing">
            <p>
              When you use AI features, relevant workspace context (such as issue
              titles, descriptions, comments, and project metadata) may be sent
              to AI model providers to generate responses. We design these
              features to use only the context needed for the request. Do not
              submit information you are not authorized to share with your AI
              provider configuration.
            </p>
          </LegalSection>

          <LegalSection title="4. How we share information">
            <p>We may share information:</p>
            <ul>
              <li>
                <strong>Within your organization:</strong> with teammates in
                workspaces you belong to, according to project permissions
              </li>
              <li>
                <strong>Service providers:</strong> with vendors that help us
                host, email, bill, analyze, or secure the Service (for example,
                cloud hosting, payment processors, and email delivery providers)
              </li>
              <li>
                <strong>Legal and safety:</strong> when required by law or to
                protect rights, safety, and integrity of the Service
              </li>
              <li>
                <strong>Business transfers:</strong> in connection with a
                merger, acquisition, or asset sale, subject to appropriate
                safeguards
              </li>
            </ul>
            <p>We do not sell your personal information.</p>
          </LegalSection>

          <LegalSection title="5. Data retention">
            <p>
              We retain account and workspace data while your account or
              organization is active and for a reasonable period afterward to
              comply with legal obligations, resolve disputes, and enforce
              agreements. You may request deletion of your account subject to
              organizational policies and legal requirements.
            </p>
          </LegalSection>

          <LegalSection title="6. Security">
            <p>
              We implement technical and organizational measures designed to
              protect your information, including encryption in transit, access
              controls, and monitoring. No method of transmission or storage is
              completely secure; please use strong passwords and protect your
              credentials.
            </p>
          </LegalSection>

          <LegalSection title="7. Your choices and rights">
            <p>
              Depending on your location, you may have rights to access, correct,
              delete, or export personal information, or to object to certain
              processing. Organization owners manage member access and
              invitations. To exercise rights or ask questions, contact us at{" "}
              <a href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</a>.
            </p>
          </LegalSection>

          <LegalSection title="8. International users">
            <p>
              If you access the Service from outside the United States, your
              information may be processed in the United States or other
              countries where we or our providers operate. We take steps designed
              to protect information in accordance with this Policy.
            </p>
          </LegalSection>

          <LegalSection title="9. Children">
            <p>
              The Service is not directed to children under 16, and we do not
              knowingly collect personal information from them. Contact us if you
              believe a child has provided us information.
            </p>
          </LegalSection>

          <LegalSection title="10. Changes to this Policy">
            <p>
              We may update this Privacy Policy from time to time. We will post
              the revised Policy with an updated date and, where appropriate,
              provide additional notice of material changes.
            </p>
          </LegalSection>

          <LegalSection title="11. Contact">
            <p>
              For privacy questions or requests, email{" "}
              <a href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</a> or visit
              our <Link href="/contact-us">Contact Us</Link> page.
            </p>
          </LegalSection>
        </LegalDocument>
    </MarketingShell>
  );
}
