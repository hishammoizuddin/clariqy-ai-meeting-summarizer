import React, { useEffect, useRef } from 'react'
import { X, Shield, FileText, ChevronRight } from 'lucide-react'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type PolicyType = 'privacy' | 'terms'

interface PolicyModalProps {
  open: PolicyType | null
  onClose: () => void
}

// ---------------------------------------------------------------------------
// Content helpers
// ---------------------------------------------------------------------------

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mb-8">
      <h2 className="text-base font-bold text-black mb-3 pb-2 border-b border-gray-100">{title}</h2>
      <div className="space-y-3 text-sm text-gray-600 leading-relaxed">{children}</div>
    </section>
  )
}

function Sub({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mt-4">
      <h3 className="text-sm font-semibold text-gray-800 mb-1.5">{title}</h3>
      <div className="space-y-2 text-sm text-gray-600 leading-relaxed">{children}</div>
    </div>
  )
}

function Bullet({ children }: { children: React.ReactNode }) {
  return (
    <li className="flex gap-2">
      <ChevronRight size={13} className="mt-0.5 shrink-0 text-gray-400" />
      <span>{children}</span>
    </li>
  )
}

function Bullets({ items }: { items: string[] }) {
  return (
    <ul className="space-y-1.5 mt-2">
      {items.map((item, i) => <Bullet key={i}>{item}</Bullet>)}
    </ul>
  )
}

function Callout({ children }: { children: React.ReactNode }) {
  return (
    <div className="bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm text-gray-700 leading-relaxed">
      {children}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Privacy Policy content
// ---------------------------------------------------------------------------

function PrivacyContent() {
  return (
    <>
      <p className="text-sm text-gray-500 mb-6">
        <strong className="text-gray-700">Effective Date:</strong> May 26, 2026 &nbsp;·&nbsp;
        <strong className="text-gray-700">Last Updated:</strong> May 26, 2026
      </p>

      <p className="text-sm text-gray-600 leading-relaxed mb-8">
        Aisynch Labs ("we," "us," or "our") operates ClarIQy, an AI-powered meeting transcription and summarization
        platform (the "Service"). This Privacy Policy explains in detail what personal information we collect, how we
        use and protect it, who we share it with, and what rights and choices you have. By using ClarIQy you agree to
        the practices described here. If you do not agree, please discontinue use of the Service.
      </p>

      <Section title="1. Information We Collect">
        <Sub title="1.1 Account Information">
          <p>When you register for ClarIQy, we collect:</p>
          <Bullets items={[
            'Full name and email address',
            'Encrypted password (we never store passwords in plain text)',
            'Optional profile details: phone number, country of residence, and profile avatar image',
            'Account creation and last-updated timestamps',
          ]} />
        </Sub>

        <Sub title="1.2 Audio and Video Content">
          <p>
            The core function of ClarIQy involves processing audio and video content you choose to upload or record.
            This includes:
          </p>
          <Bullets items={[
            'Audio files you upload (MP3, WAV, M4A, OGG, and others)',
            'Video files you upload (MP4, MOV, WebM, MKV, and others), from which audio is extracted',
            'Live audio captured directly through your device microphone during live recording sessions',
            'Compressed and chunked versions of your files created for AI processing purposes',
          ]} />
          <p className="mt-2">
            <strong className="text-gray-800">Important:</strong> You are solely responsible for obtaining all necessary
            consents from every participant before uploading or recording any conversation. See Section 5 for full
            details on recording consent obligations.
          </p>
        </Sub>

        <Sub title="1.3 AI-Generated Content">
          <p>We store the output produced by our AI processing pipeline, including:</p>
          <Bullets items={[
            'Full text transcriptions of your audio and video content',
            'Speaker-diarized transcript segments with speaker labels (A, B, C, etc.) and timestamps',
            'AI-generated meeting summaries, key points, decisions, and action items',
            'Vector embeddings of your transcript content stored in our semantic search index',
            'Speaker profiles including inferred labels, sample text snippets, and turn-count data',
          ]} />
        </Sub>

        <Sub title="1.4 Usage and Interaction Data">
          <Bullets items={[
            'Meeting metadata: title, creation date, duration, source type (upload or live recording), and language',
            'Speaker assignment edits you make manually after AI processing',
            'Questions you ask through the semantic Q&A feature and the answers generated',
            'PDF summary documents downloaded or generated',
            'Actions taken within the platform (e.g., renaming meetings, deleting records)',
          ]} />
        </Sub>

        <Sub title="1.5 Technical and Device Data">
          <Bullets items={[
            'Browser type, version, and operating system (collected via standard HTTP headers)',
            'IP address and approximate geographic location at the time of requests',
            "Authentication tokens (JSON Web Tokens) stored in your browser's local storage",
            'Application error logs and performance data used for debugging and service improvement',
          ]} />
        </Sub>

        <Sub title="1.6 Information We Do NOT Collect">
          <Bullets items={[
            'We do not use tracking cookies or third-party advertising cookies',
            'We do not collect payment card or banking information (no payments are processed directly by us)',
            'We do not build advertising profiles or sell your data to data brokers',
            "We do not access your device's contacts, camera (beyond explicit recording consent), or file system beyond what you voluntarily upload",
          ]} />
        </Sub>
      </Section>

      <Section title="2. How We Use Your Information">
        <p>We use the information we collect exclusively to operate, maintain, and improve the Service:</p>
        <Bullets items={[
          'Authenticating your identity and securing your account',
          'Transcribing, diarizing, and summarizing the audio and video content you submit',
          'Generating vector embeddings of your transcripts to power the semantic Q&A feature',
          'Associating all meeting data, files, and AI outputs with your account for retrieval and history',
          'Exporting summaries to PDF upon your request',
          'Sending transactional communications related to your account (e.g., password resets) — we do not send marketing emails without your explicit opt-in',
          'Diagnosing technical problems, monitoring system health, and preventing abuse',
          'Complying with applicable legal obligations',
        ]} />
        <p className="mt-3">
          We do <strong className="text-gray-800">not</strong> use your meeting content to train AI models, create
          advertising profiles, or share your data with third parties for their own commercial purposes.
        </p>
      </Section>

      <Section title="3. AI Processing and Third-Party Services">
        <Callout>
          <strong>Transparency Notice:</strong> ClarIQy relies on third-party AI infrastructure to deliver its core
          functionality. Your audio, video, and text content is transmitted to these services for processing. By using
          ClarIQy you acknowledge and consent to this transmission.
        </Callout>

        <Sub title="3.1 Google Gemini API (Google LLC)">
          <p>
            Your audio and video files are uploaded to and processed by Google's Gemini AI service for transcription,
            speaker diarization, summarization, and embedding generation. Google may process this data in accordance
            with Google's own privacy policies. Aisynch Labs has configured these integrations to minimize data
            retention on Google's servers (files are deleted after processing where possible), but we cannot guarantee
            Google's data handling independently of our instructions.
          </p>
          <p className="mt-2">
            Google's Privacy Policy: <span className="text-gray-500">policies.google.com/privacy</span>
          </p>
        </Sub>

        <Sub title="3.2 Pinecone (Pinecone Systems Inc.)">
          <p>
            Vector embeddings derived from your meeting transcripts are stored in Pinecone, a managed vector database
            service. These embeddings are mathematical representations of your content used for semantic search and
            Q&A. They are tagged with your meeting ID and are inaccessible to other users.
          </p>
          <p className="mt-2">
            Pinecone's Privacy Policy: <span className="text-gray-500">pinecone.io/privacy</span>
          </p>
        </Sub>

        <Sub title="3.3 Aiven (Aiven Ltd.)">
          <p>
            Your account information and meeting metadata are stored in a PostgreSQL database hosted and managed by
            Aiven on cloud infrastructure. Data is encrypted in transit (SSL/TLS) and at rest.
          </p>
          <p className="mt-2">
            Aiven's Privacy Policy: <span className="text-gray-500">aiven.io/privacy</span>
          </p>
        </Sub>

        <Sub title="3.4 Server File Storage">
          <p>
            Uploaded and recorded media files, compressed audio files, and generated PDF documents are stored on
            server infrastructure operated by Aisynch Labs. Access is restricted to your authenticated account.
          </p>
        </Sub>
      </Section>

      <Section title="4. Data Storage, Security, and Retention">
        <Sub title="4.1 Security Measures">
          <Bullets items={[
            'All passwords are hashed using bcrypt before storage — we cannot recover your plain-text password',
            'Authentication uses signed JSON Web Tokens (JWT) with a seven-day expiry',
            'All data in transit is encrypted using TLS 1.2 or higher',
            'Database connections use SSL certificate verification',
            'Meeting data is access-controlled: you can only access meetings linked to your own account',
            'File storage paths include randomised identifiers to prevent enumeration',
          ]} />
        </Sub>

        <Sub title="4.2 Data Retention">
          <Bullets items={[
            'Your meeting data, transcripts, summaries, and media files are retained for as long as your account is active',
            'When you delete a meeting, we permanently delete the associated transcript, summary, vector embeddings, media files, and metadata from all systems',
            'When you delete your account, all data associated with your account is scheduled for permanent deletion within 30 days',
            'Anonymised, aggregated usage statistics (containing no personal or meeting content) may be retained indefinitely for service improvement purposes',
            'Backup copies may persist for up to 90 days before being permanently purged',
          ]} />
        </Sub>

        <Sub title="4.3 Data Breach Notification">
          <p>
            In the event of a data breach that affects your personal information, Aisynch Labs will notify affected
            users by email within 72 hours of becoming aware of the breach, where feasible, and will take immediate
            steps to contain and remediate the incident.
          </p>
        </Sub>
      </Section>

      <Section title="5. Recording Consent and Legal Compliance">
        <Callout>
          <strong>Critical Notice:</strong> Recording conversations without the consent of all participants may be
          illegal in your jurisdiction. You are solely and entirely responsible for ensuring your use of ClarIQy
          complies with all applicable wiretapping, eavesdropping, surveillance, and privacy laws wherever you and the
          participants are located.
        </Callout>
        <p className="mt-3">
          Recording consent laws vary widely. Many jurisdictions — including California, Florida, Illinois, Maryland,
          and Massachusetts in the United States, as well as countries across the European Union, United Kingdom,
          Canada, and Australia — require the explicit consent of all parties to a conversation before it may be
          recorded. Violating these laws can result in criminal penalties and civil liability.
        </p>
        <p className="mt-3">
          Before recording or uploading any conversation using ClarIQy, you must:
        </p>
        <Bullets items={[
          'Inform all participants that the meeting is being recorded and will be processed by AI',
          'Obtain explicit consent from all participants as required by the laws of all applicable jurisdictions',
          'Not record any conversation in which you do not have legal authority to do so',
          'Ensure participants are aware their speech will be transcribed and summarised by third-party AI services',
        ]} />
        <p className="mt-3">
          Aisynch Labs bears no responsibility or liability for your failure to comply with applicable recording laws.
          Use of ClarIQy for illegal recording is strictly prohibited and may result in immediate account termination.
        </p>
      </Section>

      <Section title="6. Your Rights and Choices">
        <p>Depending on where you are located, you may have the following rights regarding your personal data:</p>
        <Bullets items={[
          'Right of Access: Request a copy of the personal data we hold about you',
          'Right of Rectification: Correct inaccurate or incomplete personal data',
          'Right of Erasure ("Right to be Forgotten"): Request deletion of your personal data — you can delete individual meetings at any time from the dashboard, or request full account deletion',
          'Right of Data Portability: Request your data in a structured, machine-readable format',
          'Right to Object: Object to processing of your personal data in certain circumstances',
          'Right to Restrict Processing: Request that we limit how we use your data',
          'Right to Withdraw Consent: Where processing is based on consent, withdraw it at any time without affecting prior processing',
        ]} />
        <p className="mt-3">
          To exercise any of these rights, contact us at{' '}
          <a href="mailto:hello@aisynchlabs.com" className="text-black font-medium underline underline-offset-2">
            hello@aisynchlabs.com
          </a>. We will respond within 30 days. We may need to verify your identity before processing your request.
        </p>
      </Section>

      <Section title="7. International Data Transfers">
        <p>
          Aisynch Labs operates globally. Your data may be processed and stored in the United States and other
          countries where our third-party service providers operate. These countries may have data protection laws
          that differ from those in your home country. By using the Service, you consent to the transfer of your
          information to these countries.
        </p>
        <p className="mt-3">
          Where required by law (e.g., for users in the European Economic Area), we rely on appropriate safeguards
          such as Standard Contractual Clauses to govern international data transfers.
        </p>
      </Section>

      <Section title="8. Children's Privacy">
        <p>
          ClarIQy is not directed at children under the age of 13. We do not knowingly collect personal information
          from children under 13. If you are a parent or guardian and believe your child has provided us with personal
          information, please contact us immediately at{' '}
          <a href="mailto:hello@aisynchlabs.com" className="text-black font-medium underline underline-offset-2">
            hello@aisynchlabs.com
          </a>{' '}
          and we will take steps to delete that information promptly.
        </p>
        <p className="mt-3">
          Users between the ages of 13 and 18 may only use ClarIQy with the documented consent of a parent or legal
          guardian.
        </p>
      </Section>

      <Section title="9. Changes to This Privacy Policy">
        <p>
          We may update this Privacy Policy from time to time to reflect changes in our practices, technology, legal
          requirements, or other factors. When we make material changes, we will update the "Last Updated" date at the
          top of this policy and, where feasible, notify registered users by email. Your continued use of the Service
          after the revised policy becomes effective constitutes your acceptance of the changes. We encourage you to
          review this policy periodically.
        </p>
      </Section>

      <Section title="10. Contact Us">
        <p>If you have any questions, concerns, or requests regarding this Privacy Policy or our data practices, please reach out:</p>
        <div className="mt-3 bg-gray-50 border border-gray-200 rounded-xl px-4 py-4 space-y-1 text-sm">
          <p><strong className="text-gray-800">Aisynch Labs</strong></p>
          <p>Email: <a href="mailto:hello@aisynchlabs.com" className="text-black underline underline-offset-2">hello@aisynchlabs.com</a></p>
          <p>Website: <a href="https://www.aisynchlabs.com" target="_blank" rel="noopener noreferrer" className="text-black underline underline-offset-2">www.aisynchlabs.com</a></p>
        </div>
      </Section>
    </>
  )
}

// ---------------------------------------------------------------------------
// Terms of Service content
// ---------------------------------------------------------------------------

function TermsContent() {
  return (
    <>
      <p className="text-sm text-gray-500 mb-6">
        <strong className="text-gray-700">Effective Date:</strong> May 26, 2026 &nbsp;·&nbsp;
        <strong className="text-gray-700">Last Updated:</strong> May 26, 2026
      </p>

      <p className="text-sm text-gray-600 leading-relaxed mb-8">
        These Terms of Service ("Terms") constitute a legally binding agreement between you ("User," "you," or "your")
        and Aisynch Labs ("we," "us," or "our") governing your access to and use of ClarIQy, our AI-powered meeting
        transcription and summarization platform, and all related services, features, and content (collectively, the
        "Service"). Please read these Terms carefully before using the Service.
      </p>

      <Callout>
        <strong>By creating an account, uploading content, or otherwise using ClarIQy, you confirm that you have
        read, understood, and agree to be bound by these Terms in their entirety.</strong> If you do not agree,
        you must immediately discontinue use of the Service.
      </Callout>

      <div className="mt-8">

      <Section title="1. Acceptance of Terms">
        <p>
          These Terms apply to all visitors, registered users, and others who access or use the Service. Your use of
          the Service is also governed by our Privacy Policy, which is incorporated into these Terms by reference.
          Together, these documents form the complete and exclusive agreement between you and Aisynch Labs regarding
          the Service.
        </p>
        <p className="mt-3">
          If you are accepting these Terms on behalf of a company, organisation, or other legal entity, you represent
          and warrant that you have the authority to bind that entity to these Terms, and all references to "you"
          shall refer to that entity.
        </p>
      </Section>

      <Section title="2. Description of Service">
        <p>ClarIQy provides the following core features:</p>
        <Bullets items={[
          'Audio and video file upload with AI-powered transcription',
          'Live microphone recording with real-time transcription and post-recording diarized summaries',
          'Automatic speaker detection and diarization, with user-controlled speaker labelling',
          'AI-generated meeting summaries adapted to different meeting types (interviews, standups, planning sessions, etc.)',
          'Semantic question-and-answer functionality over your meeting transcripts',
          'PDF export of meeting summaries',
          'Secure user account management including profile customisation',
          'Meeting history, search, and management dashboard',
        ]} />
        <p className="mt-3">
          Aisynch Labs reserves the right to modify, add, suspend, or remove features of the Service at any time
          with or without notice. We will make reasonable efforts to notify users of significant changes.
        </p>
      </Section>

      <Section title="3. Eligibility and Account Registration">
        <Sub title="3.1 Eligibility">
          <p>To use ClarIQy, you must:</p>
          <Bullets items={[
            'Be at least 13 years of age (or the minimum age of digital consent in your jurisdiction, whichever is higher)',
            'If between 13 and 18, have documented parental or guardian consent',
            'Have the legal capacity to enter into a binding contract',
            'Not be prohibited from using the Service under any applicable law',
          ]} />
        </Sub>

        <Sub title="3.2 Account Registration">
          <Bullets items={[
            'You must provide accurate, current, and complete information during registration',
            'You are responsible for maintaining the confidentiality of your login credentials',
            'You are responsible for all activity that occurs under your account',
            'You must notify Aisynch Labs immediately at hello@aisynchlabs.com if you suspect unauthorised access to your account',
            'You may not create multiple accounts to circumvent restrictions or bans',
            'You may not share your account credentials with third parties',
            'Aisynch Labs reserves the right to refuse registration or cancel accounts at its sole discretion',
          ]} />
        </Sub>
      </Section>

      <Section title="4. Recording Consent and Legal Compliance">
        <Callout>
          <strong>This section contains critical legal obligations. Failure to comply may expose you to criminal
          prosecution and civil liability. Read it carefully.</strong>
        </Callout>

        <Sub title="4.1 Your Legal Responsibility">
          <p>
            Recording laws vary significantly across jurisdictions. Many countries and states require the explicit,
            informed consent of all parties to a conversation before it may be recorded. You — not Aisynch Labs —
            are solely and entirely responsible for ensuring that your use of ClarIQy fully complies with all
            applicable laws and regulations in every jurisdiction where you and the participants are located.
          </p>
        </Sub>

        <Sub title="4.2 Mandatory Obligations Before Recording">
          <p>Before using ClarIQy to record or upload any conversation, you must:</p>
          <Bullets items={[
            'Notify all participants clearly that the conversation is being or will be recorded',
            'Inform all participants that the recording will be processed by artificial intelligence systems, including third-party AI services',
            'Obtain the explicit, informed consent of all participants to the recording and AI processing, as required by applicable law',
            'Ensure participants understand their speech will be transcribed, diarized, and summarised',
            'Retain evidence of consent where required by law',
            'Comply with any applicable workplace, sector-specific, or contractual obligations related to recording',
          ]} />
        </Sub>

        <Sub title="4.3 Jurisdictions with Multi-Party Consent Requirements">
          <p>
            Without limitation, the following jurisdictions are known to impose all-party or multi-party consent
            requirements for recording private communications: California, Connecticut, Florida, Illinois, Maryland,
            Massachusetts, Michigan, Montana, Nevada, New Hampshire, Oregon, Pennsylvania, and Washington in the
            United States; Canada (under PIPEDA); Germany, France, and other EU member states (under GDPR and
            national law); the United Kingdom; and Australia. This list is not exhaustive. You must independently
            verify the laws applicable to your specific situation.
          </p>
        </Sub>

        <Sub title="4.4 Prohibited Recording Activities">
          <p>You expressly agree not to use ClarIQy to:</p>
          <Bullets items={[
            'Record any conversation without the required consent of all parties',
            'Record conversations for illegal surveillance, stalking, harassment, or intimidation',
            'Record minors without the explicit consent of their parent or legal guardian',
            'Record legally privileged communications (e.g., attorney-client, medical, or therapy sessions) without proper authorisation',
            'Conduct covert surveillance of employees, household members, or any individual',
          ]} />
        </Sub>

        <Sub title="4.5 Indemnification for Recording Violations">
          <p>
            You agree to indemnify, defend, and hold harmless Aisynch Labs and its officers, directors, employees,
            agents, and affiliates from and against any and all claims, damages, fines, penalties, costs, and expenses
            (including reasonable legal fees) arising out of or relating to your violation of any recording consent
            law or your unlawful recording of any person.
          </p>
        </Sub>
      </Section>

      <Section title="5. User Content and Intellectual Property">
        <Sub title="5.1 Ownership of Your Content">
          <p>
            You retain full ownership of all audio, video, and other content you upload or record using ClarIQy
            ("User Content"). These Terms do not transfer any intellectual property rights from you to Aisynch Labs.
          </p>
        </Sub>

        <Sub title="5.2 Licence You Grant to Aisynch Labs">
          <p>
            By submitting User Content to the Service, you grant Aisynch Labs a limited, non-exclusive,
            royalty-free, worldwide licence to access, process, store, transmit to third-party AI services, and
            generate derivative works (transcripts, summaries, embeddings) from your User Content, solely for the
            purpose of providing the Service to you. This licence terminates when you delete the relevant content or
            close your account, subject to retention periods described in the Privacy Policy.
          </p>
        </Sub>

        <Sub title="5.3 AI-Generated Outputs">
          <p>
            Transcriptions, summaries, speaker labels, and other AI-generated content produced by the Service
            ("AI Outputs") are provided to you for your own use. Aisynch Labs makes no claim of ownership over AI
            Outputs derived from your User Content. However, AI Outputs are generated using third-party AI models
            subject to their own terms of service, which may impose additional restrictions on your use of those
            outputs.
          </p>
        </Sub>

        <Sub title="5.4 Aisynch Labs Intellectual Property">
          <p>
            All software, code, algorithms, interfaces, design, trademarks, logos, and other intellectual property
            belonging to Aisynch Labs remain the exclusive property of Aisynch Labs. You may not copy, reverse
            engineer, decompile, disassemble, or create derivative works of any part of the Service without our
            prior written consent.
          </p>
        </Sub>

        <Sub title="5.5 Content You Are Responsible For">
          <p>You represent and warrant that:</p>
          <Bullets items={[
            'You own or have the necessary rights, licences, and consents to submit all User Content',
            'Your User Content does not infringe any copyright, trademark, patent, trade secret, or other intellectual property right of any third party',
            'Your User Content does not contain material that is defamatory, obscene, hateful, or otherwise unlawful',
            'All persons whose voices, likenesses, or personal information appear in your User Content have consented to its recording and AI processing',
          ]} />
        </Sub>
      </Section>

      <Section title="6. Prohibited Uses">
        <p>You agree not to use the Service to:</p>
        <Bullets items={[
          'Violate any applicable local, national, or international law or regulation',
          'Upload or transmit content that is unlawful, harmful, threatening, abusive, harassing, defamatory, vulgar, obscene, or otherwise objectionable',
          'Infringe the intellectual property rights, privacy rights, or other rights of any third party',
          'Conduct any form of illegal surveillance, wiretapping, or unauthorised interception of communications',
          'Upload content containing malicious code, viruses, or any software intended to damage or interfere with any system',
          'Attempt to gain unauthorised access to any part of the Service, other user accounts, or our infrastructure',
          'Scrape, crawl, or systematically extract data from the Service without our express written consent',
          'Use automated bots, scripts, or other automated means to interact with the Service',
          'Circumvent, disable, or interfere with security-related features of the Service',
          'Impersonate any person or entity or misrepresent your affiliation with any person or entity',
          'Commercially exploit or resell the Service or any part of it without our express written consent',
          'Use the Service to process classified, top-secret, or government-restricted information',
          'Upload or process content that violates the rights of individuals protected under GDPR, HIPAA, CCPA, or other data protection regulations',
        ]} />
      </Section>

      <Section title="7. AI-Generated Content — Accuracy Disclaimer">
        <Callout>
          <strong>Important:</strong> AI-generated transcriptions, speaker labels, and summaries are produced
          automatically and may contain errors, omissions, or inaccuracies.
        </Callout>
        <p className="mt-3">You acknowledge and agree that:</p>
        <Bullets items={[
          'AI transcriptions are not verbatim legal records and should not be used as such without independent verification',
          'Speaker diarization and labelling is automated and may misidentify or confuse speakers',
          "AI summaries reflect the model\'s interpretation of content and may omit, distort, or misrepresent information",
          'Aisynch Labs does not guarantee the accuracy, completeness, or fitness for any purpose of AI-generated outputs',
          'You are solely responsible for reviewing and verifying AI-generated outputs before relying on them for any purpose, including legal, medical, financial, or commercial decisions',
          'AI outputs should never be used as the sole basis for significant decisions without human review',
        ]} />
      </Section>

      <Section title="8. Privacy and Data Processing">
        <p>
          Your use of the Service is also governed by our Privacy Policy, which is incorporated into these Terms by
          reference. By using the Service, you consent to our collection, use, and sharing of your information as
          described in the Privacy Policy. You acknowledge that the Service transmits your audio, video, and text
          content to third-party AI providers (Google Gemini API, Pinecone) for processing, and that these providers
          have their own privacy policies governing their handling of such data.
        </p>
      </Section>

      <Section title="9. Service Availability and Modifications">
        <Bullets items={[
          'Aisynch Labs does not guarantee that the Service will be available at all times, uninterrupted, or error-free',
          'We reserve the right to modify, suspend, or discontinue the Service (or any part thereof) at any time, with or without notice',
          'We may perform scheduled or emergency maintenance that temporarily renders the Service unavailable',
          'We are not liable to you or any third party for any modification, suspension, or discontinuation of the Service',
          'Aisynch Labs reserves the right to impose usage limits, rate limits, or file size restrictions at any time to protect service quality for all users',
        ]} />
      </Section>

      <Section title="10. Account Termination">
        <Sub title="10.1 Termination by You">
          <p>
            You may close your account at any time by contacting us at hello@aisynchlabs.com. Upon closure, your
            account data will be permanently deleted in accordance with our Privacy Policy.
          </p>
        </Sub>

        <Sub title="10.2 Termination by Aisynch Labs">
          <p>We may suspend or permanently terminate your account, with or without notice, if:</p>
          <Bullets items={[
            'You violate these Terms or our Privacy Policy',
            'You engage in illegal activity through the Service',
            'You provide false or misleading information during registration',
            'Your use of the Service creates legal risk or reputational harm to Aisynch Labs',
            'Your account has been inactive for an extended period (we will provide advance notice before deleting inactive accounts)',
            'We are required to do so by applicable law or court order',
          ]} />
        </Sub>

        <Sub title="10.3 Effect of Termination">
          <p>
            Upon termination, your right to use the Service immediately ceases. Aisynch Labs may delete all data
            associated with your account. Sections of these Terms that by their nature should survive termination
            (including Sections 4.5, 5, 7, 11, 12, 13, and 14) shall survive.
          </p>
        </Sub>
      </Section>

      <Section title="11. Disclaimer of Warranties">
        <p>
          THE SERVICE IS PROVIDED ON AN "AS IS" AND "AS AVAILABLE" BASIS WITHOUT WARRANTIES OF ANY KIND, EITHER
          EXPRESS OR IMPLIED. TO THE FULLEST EXTENT PERMITTED BY APPLICABLE LAW, AISYNCH LABS EXPRESSLY DISCLAIMS
          ALL WARRANTIES, INCLUDING BUT NOT LIMITED TO:
        </p>
        <Bullets items={[
          'IMPLIED WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE, AND NON-INFRINGEMENT',
          'WARRANTIES THAT THE SERVICE WILL MEET YOUR REQUIREMENTS OR BE AVAILABLE WITHOUT INTERRUPTION',
          'WARRANTIES THAT AI-GENERATED OUTPUTS WILL BE ACCURATE, COMPLETE, RELIABLE, OR ERROR-FREE',
          'WARRANTIES REGARDING THE SECURITY OF DATA TRANSMITTED THROUGH THE SERVICE',
          'WARRANTIES THAT DEFECTS WILL BE CORRECTED',
        ]} />
        <p className="mt-3">
          Some jurisdictions do not allow the exclusion of implied warranties. In such jurisdictions, the above
          exclusions apply to the maximum extent permitted by law.
        </p>
      </Section>

      <Section title="12. Limitation of Liability">
        <p>
          TO THE MAXIMUM EXTENT PERMITTED BY APPLICABLE LAW, IN NO EVENT SHALL AISYNCH LABS OR ITS OFFICERS,
          DIRECTORS, EMPLOYEES, AGENTS, AFFILIATES, OR SERVICE PROVIDERS BE LIABLE FOR ANY:
        </p>
        <Bullets items={[
          'INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, PUNITIVE, OR EXEMPLARY DAMAGES',
          'LOSS OF PROFITS, REVENUE, DATA, BUSINESS, OR GOODWILL',
          'COST OF SUBSTITUTE GOODS OR SERVICES',
          'DAMAGES ARISING FROM UNAUTHORISED ACCESS TO OR ALTERATION OF YOUR CONTENT',
          'DAMAGES ARISING FROM YOUR RELIANCE ON AI-GENERATED OUTPUTS',
          'DAMAGES ARISING FROM YOUR VIOLATION OF RECORDING CONSENT LAWS',
        ]} />
        <p className="mt-3">
          WHETHER BASED ON WARRANTY, CONTRACT, TORT (INCLUDING NEGLIGENCE), STRICT LIABILITY, OR ANY OTHER LEGAL
          THEORY, EVEN IF AISYNCH LABS HAS BEEN ADVISED OF THE POSSIBILITY OF SUCH DAMAGES.
        </p>
        <p className="mt-3">
          TO THE EXTENT AISYNCH LABS IS FOUND LIABLE DESPITE THE FOREGOING, OUR TOTAL CUMULATIVE LIABILITY TO YOU
          FOR ALL CLAIMS ARISING OUT OF OR RELATING TO THESE TERMS OR THE SERVICE SHALL NOT EXCEED THE GREATER OF
          (A) THE AMOUNT YOU PAID TO AISYNCH LABS IN THE TWELVE MONTHS PRECEDING THE CLAIM, OR (B) ONE HUNDRED US
          DOLLARS (USD $100).
        </p>
      </Section>

      <Section title="13. Indemnification">
        <p>
          You agree to indemnify, defend (at Aisynch Labs' option), and hold harmless Aisynch Labs and its officers,
          directors, employees, agents, licensors, and service providers from and against any claims, liabilities,
          damages, judgments, awards, losses, costs, expenses, or fees (including reasonable attorneys' fees) arising
          out of or relating to:
        </p>
        <Bullets items={[
          'Your violation of these Terms',
          'Your User Content',
          'Your violation of any applicable law, including recording consent laws',
          "Your violation of any third party\'s rights, including intellectual property rights and privacy rights",
          'Any claim that your use of the Service caused harm to a third party',
        ]} />
      </Section>

      <Section title="14. Governing Law and Dispute Resolution">
        <p>
          These Terms shall be governed by and construed in accordance with applicable law. Any dispute arising out
          of or in connection with these Terms or the Service shall first be submitted to good-faith negotiation
          between the parties. If the dispute cannot be resolved through negotiation within 30 days, it may be
          submitted to binding arbitration or litigation in the appropriate jurisdiction, as determined by Aisynch
          Labs at its discretion.
        </p>
        <p className="mt-3">
          Nothing in this section shall prevent either party from seeking emergency injunctive or other equitable
          relief in any court of competent jurisdiction to prevent irreparable harm.
        </p>
      </Section>

      <Section title="15. General Provisions">
        <Sub title="15.1 Entire Agreement">
          <p>
            These Terms, together with the Privacy Policy, constitute the entire agreement between you and Aisynch
            Labs regarding the Service and supersede all prior agreements and understandings.
          </p>
        </Sub>
        <Sub title="15.2 Severability">
          <p>
            If any provision of these Terms is found to be unenforceable or invalid, that provision shall be limited
            or eliminated to the minimum extent necessary so that these Terms shall otherwise remain in full force
            and effect.
          </p>
        </Sub>
        <Sub title="15.3 No Waiver">
          <p>
            Our failure to enforce any right or provision of these Terms shall not be considered a waiver of those
            rights. A waiver of any provision will only be effective if made in writing and signed by an authorised
            representative of Aisynch Labs.
          </p>
        </Sub>
        <Sub title="15.4 Assignment">
          <p>
            You may not assign or transfer these Terms or any rights or obligations hereunder without our prior
            written consent. Aisynch Labs may assign these Terms freely, including in connection with a merger,
            acquisition, or sale of assets.
          </p>
        </Sub>
        <Sub title="15.5 Changes to These Terms">
          <p>
            Aisynch Labs reserves the right to update these Terms at any time. Material changes will be communicated
            to registered users by email and by updating the "Last Updated" date. Your continued use of the Service
            after updated Terms become effective constitutes your acceptance. If you do not agree to the updated
            Terms, you must stop using the Service.
          </p>
        </Sub>
      </Section>

      <Section title="16. Contact Information">
        <p>For any questions, concerns, or notices relating to these Terms, please contact:</p>
        <div className="mt-3 bg-gray-50 border border-gray-200 rounded-xl px-4 py-4 space-y-1 text-sm">
          <p><strong className="text-gray-800">Aisynch Labs</strong></p>
          <p>Email: <a href="mailto:hello@aisynchlabs.com" className="text-black underline underline-offset-2">hello@aisynchlabs.com</a></p>
          <p>Website: <a href="https://www.aisynchlabs.com" target="_blank" rel="noopener noreferrer" className="text-black underline underline-offset-2">www.aisynchlabs.com</a></p>
        </div>
      </Section>

      </div>
    </>
  )
}

// ---------------------------------------------------------------------------
// Modal shell
// ---------------------------------------------------------------------------

export default function PolicyModal({ open, onClose }: PolicyModalProps) {
  const overlayRef = useRef<HTMLDivElement>(null)
  const scrollRef = useRef<HTMLDivElement>(null)

  // Close on Escape
  useEffect(() => {
    if (!open) return
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [open, onClose])

  // Lock body scroll while open
  useEffect(() => {
    if (open) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => { document.body.style.overflow = '' }
  }, [open])

  // Reset scroll position when switching policies
  useEffect(() => {
    if (open && scrollRef.current) scrollRef.current.scrollTop = 0
  }, [open])

  if (!open) return null

  const isPrivacy = open === 'privacy'

  return (
    <div
      ref={overlayRef}
      onClick={(e) => { if (e.target === overlayRef.current) onClose() }}
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4"
      style={{ backgroundColor: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(4px)' }}
    >
      <div className="relative w-full sm:max-w-2xl bg-white sm:rounded-3xl shadow-2xl flex flex-col max-h-screen sm:max-h-[90vh]">

        {/* Header */}
        <div className="flex items-center gap-3 px-6 pt-6 pb-4 border-b border-gray-100 shrink-0">
          <div className="p-2 rounded-xl bg-black text-white shrink-0">
            {isPrivacy ? <Shield size={16} /> : <FileText size={16} />}
          </div>
          <div className="min-w-0 flex-1">
            <h2 className="text-base font-bold text-black tracking-tight">
              {isPrivacy ? 'Privacy Policy' : 'Terms of Service'}
            </h2>
            <p className="text-xs text-gray-400 mt-0.5">Aisynch Labs · ClarIQy</p>
          </div>
          <button
            onClick={onClose}
            aria-label="Close"
            className="p-2 rounded-xl text-gray-400 hover:text-black hover:bg-gray-100 transition-colors shrink-0"
          >
            <X size={18} />
          </button>
        </div>

        {/* Scrollable body */}
        <div ref={scrollRef} className="overflow-y-auto flex-1 px-6 py-6">
          {isPrivacy ? <PrivacyContent /> : <TermsContent />}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-100 shrink-0 flex items-center justify-between gap-4 bg-gray-50/80 sm:rounded-b-3xl">
          <p className="text-xs text-gray-400">
            Questions?{' '}
            <a href="mailto:hello@aisynchlabs.com" className="text-black font-medium underline underline-offset-2">
              hello@aisynchlabs.com
            </a>
          </p>
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-black text-white text-sm font-semibold hover:bg-gray-800 transition-colors shrink-0"
          >
            Close
          </button>
        </div>

      </div>
    </div>
  )
}
