import type { Metadata } from "next";
import Link from "next/link";
import { MarketingShell } from "@/components/landing/marketing-shell";
import {
  LegalDocument,
  LegalSection,
} from "@/components/landing/legal-document";
import { SITE_NAME, SUPPORT_EMAIL } from "@/lib/marketing/site";

export const metadata: Metadata = {
  title: "Refund Policy",
  description: `Cancellation, refunds, and billing practices for ${SITE_NAME} paid subscriptions.`,
};

export default function RefundPolicyPage() {
  return (
    <MarketingShell>
        <LegalDocument
          title="Refund Policy"
          description="How cancellations and refunds will work for paid subscriptions."
        >
          <p>
            This Refund Policy describes how billing, cancellations, and refunds
            will work for {SITE_NAME} (&quot;TrackEzz&quot;) paid subscriptions
            when they become available. The Free plan does not involve charges.
          </p>

          <LegalSection title="1. Paid subscriptions and trials">
            <p>
              When Pro or other paid plans launch, they may be offered as
              recurring subscriptions billed monthly or annually. Free trials may
              be offered at checkout. During a trial, you will not be charged
              unless you remain subscribed after the trial ends.
            </p>
            <p>
              When a trial ends, your payment method on file will be charged for
              the selected billing interval unless you cancel before the trial
              expires.
            </p>
          </LegalSection>

          <LegalSection title="2. Managing your subscription">
            <p>
              Organization owners will be able to upgrade, downgrade, or cancel
              paid plans from <strong>Settings → Billing</strong> in the
              dashboard. You may also use our billing portal (when available) to
              update payment methods, view invoices, and cancel renewal.
            </p>
            <p>
              Cancellation stops future renewals. You will retain paid-plan
              access through the end of your current billing period unless
              otherwise stated at cancellation.
            </p>
          </LegalSection>

          <LegalSection title="3. Refunds">
            <p>
              Except where required by applicable law, subscription fees are
              generally <strong>non-refundable</strong> once a billing period
              has started. We do not provide prorated refunds for partial months
              or years, unused features, or downgrades mid-cycle.
            </p>
            <p>We may issue a refund or credit at our discretion when:</p>
            <ul>
              <li>You were charged in error or duplicate charges occurred</li>
              <li>
                A technical issue on our side prevented meaningful use of a paid
                plan and we cannot resolve it promptly
              </li>
              <li>Applicable consumer protection law requires a refund</li>
            </ul>
          </LegalSection>

          <LegalSection title="4. Chargebacks and disputes">
            <p>
              If you believe a charge is incorrect, please contact us at{" "}
              <a href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</a> before
              initiating a chargeback. We will work in good faith to resolve
              billing issues quickly.
            </p>
          </LegalSection>

          <LegalSection title="5. Plan changes">
            <p>
              Moving from a paid plan to Free takes effect at the end of the
              current billing period. Your workspace will then be subject to Free
              plan limits (for example, member and AI usage caps). Data already
              stored may remain accessible subject to those limits.
            </p>
          </LegalSection>

          <LegalSection title="6. Taxes">
            <p>
              Prices shown on our <Link href="/pricing">Pricing</Link> page are
              in U.S. dollars unless stated otherwise. Applicable taxes may be
              added at checkout based on your location.
            </p>
          </LegalSection>

          <LegalSection title="7. Contact">
            <p>
              For billing questions or refund requests, email{" "}
              <a href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</a> with your
              organization name and the email used for billing. You can also
              reach us through our <Link href="/contact-us">Contact Us</Link>{" "}
              page.
            </p>
          </LegalSection>
        </LegalDocument>
    </MarketingShell>
  );
}
