import { Link } from "react-router-dom";

function PolicyShell({title,intro,children}:{title:string;intro:string;children:React.ReactNode}) {
  return <div className="mx-auto max-w-3xl pb-28 md:pb-12">
    <div className="rounded-[2rem] border border-black/[.06] bg-white p-5 shadow-card sm:p-8">
      <p className="text-xs font-semibold uppercase tracking-[.14em] text-brand-dark">POSSARA trust center</p>
      <h1 className="mt-2 text-3xl font-bold text-ink">{title}</h1>
      <p className="mt-3 text-sm leading-7 text-ink-light">{intro}</p>
      <p className="mt-2 text-xs text-ink-faint">Effective 21 September 2026 · Last updated 21 September 2026</p>
      <div className="mt-8 space-y-7 text-sm leading-7 text-ink-light">{children}</div>
      <div className="mt-8 flex flex-wrap gap-3 border-t border-paper-dim pt-5 text-sm">
        <Link to="/privacy" className="font-semibold text-brand-dark">Privacy</Link>
        <Link to="/terms" className="font-semibold text-brand-dark">Terms</Link>
        <Link to="/security" className="font-semibold text-brand-dark">Security</Link>
        <Link to="/settings" className="font-semibold text-brand-dark">Account settings</Link>
      </div>
    </div>
  </div>;
}

function Section({title,children}:{title:string;children:React.ReactNode}) {
  return <section><h2 className="text-lg font-semibold text-ink">{title}</h2><div className="mt-2 space-y-2">{children}</div></section>;
}

export function PrivacyPolicy() {
  return <PolicyShell title="Privacy Policy" intro="This policy explains what information POSSARA handles, why it is used, what may be public, and the choices available to members.">
    <Section title="Information you provide">
      <p>POSSARA can store account and profile information such as your name, username, profile photo, biography, location, education or professional information, interests, skills, social links and preferences. Optional birthday information is stored without a birth year.</p>
      <p>When you use community, organization, opportunity, study or hiring features, POSSARA may also store posts, comments, reactions, Moments, messages, saved items, applications, screening or assessment responses, uploaded documents, organization membership and other information you choose to submit.</p>
    </Section>
    <Section title="What is public and what is private">
      <p>Public profile fields, public posts, public organizations, approved opportunities and visible community interactions may be seen by other people. Sensitive account state, ban reasons, email-verification state, private birthday settings and hidden activity data are not intended to be public.</p>
      <p>Private messages and message media are restricted to conversation participants. Applicant documents and hiring responses are restricted to the applicant and authorized recruiters for the relevant organization. Verification documents are restricted to authorized moderation roles.</p>
    </Section>
    <Section title="How information is used">
      <p>Information is used to operate accounts, personalize discovery, display profiles and content, support messaging and organizations, process applications, provide learning features, prevent abuse, moderate content, maintain security, investigate incidents and improve reliability.</p>
    </Section>
    <Section title="Service providers">
      <p>POSSARA uses infrastructure and service providers to operate the platform. These may include Supabase for database, authentication, storage and Edge Functions; Cloudflare for web delivery and bot protection; Google for optional Google sign-in; Brevo or another approved transactional provider for account email; and deployment providers used by the project. Providers receive only the information needed for the service they perform and remain subject to their own terms and privacy obligations.</p>
    </Section>
    <Section title="Security and retention">
      <p>POSSARA uses row-level authorization, private storage for sensitive files, server-side access checks, rate limits, browser security headers, audit controls and release validation. No internet service can promise absolute security.</p>
      <p>Account data is retained while needed to provide the service. After a deletion request, POSSARA will remove or anonymize information according to the deletion process, while limited records may be retained where necessary for fraud prevention, dispute handling, security, legal obligations or integrity of other users&apos; records.</p>
    </Section>
    <Section title="Your choices and rights">
      <p>You can edit your profile and privacy preferences in Settings. Signed-in members can download an account-linked data export and request account deletion from Settings. A pending deletion request can be canceled before processing begins.</p>
      <p>If applicable law gives you additional access, correction, deletion, restriction, objection or portability rights, contact the POSSARA platform administrator through the official support or project channel and identify the account involved.</p>
    </Section>
    <Section title="Children and local law">
      <p>Members must use POSSARA in accordance with the laws that apply to them. Where local law requires parental or guardian consent for a young person to use an online service or provide personal information, that consent must be obtained before use.</p>
    </Section>
    <Section title="Changes">
      <p>This policy may be updated as POSSARA changes. Material changes should be reflected on this page with a new update date.</p>
    </Section>
  </PolicyShell>;
}

export function TermsOfUse() {
  return <PolicyShell title="Terms of Use" intro="These terms set the basic rules for using POSSARA responsibly. By using the service, you agree to follow them and the laws that apply to you.">
    <Section title="Accounts">
      <p>Provide accurate account information, protect your credentials and use only accounts and organization identities you are authorized to control. You are responsible for activity performed through your account unless access was unauthorized and promptly reported.</p>
    </Section>
    <Section title="Community conduct">
      <p>Do not use POSSARA for fraud, impersonation, harassment, threats, illegal activity, spam, malware, credential theft, unauthorized surveillance, exploitation, deceptive recruitment or attempts to bypass platform security. Do not upload material you do not have the right to share.</p>
    </Section>
    <Section title="Organizations, jobs and opportunities">
      <p>Organizations and recruiters are responsible for the accuracy and legality of their listings, screening processes and applicant handling. A POSSARA verification indicator is a platform trust signal, not a guarantee of identity, employment, scholarship, payment, safety or outcome.</p>
      <p>Members should independently evaluate opportunities before sending money, sensitive documents or personal information. POSSARA may remove, flag or restrict listings that appear unsafe, misleading, expired or non-compliant.</p>
    </Section>
    <Section title="Content and permissions">
      <p>You keep ownership of content you create. By publishing content to a public or shared POSSARA surface, you give POSSARA the limited permission necessary to host, process, display, distribute and technically adapt that content to operate the service. You may delete or edit content where the product provides that control, subject to safety, audit and legal retention needs.</p>
    </Section>
    <Section title="Moderation and enforcement">
      <p>POSSARA may investigate reports, limit reach, remove content, suspend accounts or restrict organizations when necessary to protect users, comply with law, prevent abuse or enforce these terms. Administrative actions may be logged for accountability.</p>
    </Section>
    <Section title="Service availability">
      <p>POSSARA is continually developed. Features may change, be unavailable temporarily or depend on third-party services. POSSARA does not promise that a listing, connection, application, learning result or commercial outcome will succeed.</p>
    </Section>
    <Section title="Security">
      <p>Do not probe or exploit POSSARA in a way that accesses other users&apos; data, degrades availability or causes harm. Good-faith vulnerability reports should follow the Security page and the repository security policy.</p>
    </Section>
    <Section title="Changes and termination">
      <p>These terms may be updated as the service develops. You may stop using POSSARA and can request account deletion from Settings. Serious abuse or security risk may result in access being restricted or terminated.</p>
    </Section>
  </PolicyShell>;
}

export function SecurityPage() {
  return <PolicyShell title="Security" intro="POSSARA uses layered controls so trust does not depend on the browser alone. This page describes the current security model and how good-faith issues should be reported.">
    <Section title="Core controls">
      <p>Authorization is enforced in PostgreSQL Row Level Security and privileged server functions, not only in React screens. Sensitive storage such as messages, applicant documents, verification documents and Moments uses access policies. Account verification is enforced server-side for member write operations.</p>
      <p>Authentication endpoints use rate limiting and are designed for bot verification when production Turnstile credentials are configured. Password recovery uses a destination allowlist and non-enumerating responses. Browser delivery uses HTTPS security headers including CSP, HSTS and anti-clickjacking controls.</p>
    </Section>
    <Section title="Software supply chain">
      <p>Release candidates are built and linted in CI. Dependency auditing and automated update monitoring are part of the release hardening process. Secrets are kept out of public client code and service-role credentials remain server-side.</p>
    </Section>
    <Section title="Responsible disclosure">
      <p>Do not publish credentials, personal data or exploit details in a public issue. Report a vulnerability privately to the project maintainer through the repository owner or the official POSSARA support channel. Include the affected feature, impact and minimal reproducible steps using test data.</p>
      <p>Please avoid denial-of-service testing, destructive actions, accessing another person&apos;s real information, spam, phishing or social engineering. Independent penetration testing should use authorized test accounts and an agreed test scope.</p>
    </Section>
    <Section title="Security is continuous">
      <p>No security page or automated scan is a certification. POSSARA treats independent review, remediation, regression testing, monitoring and incident response as ongoing work.</p>
    </Section>
  </PolicyShell>;
}
