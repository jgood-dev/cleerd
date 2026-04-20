export default function PrivacyPage() {
  return (
    <div className="mx-auto max-w-3xl px-6 py-16">
      <h1 className="mb-2 text-3xl font-bold text-gray-900">Privacy Policy</h1>
      <p className="mb-8 text-sm text-gray-500">Last updated: April 20, 2026</p>

      <div className="prose prose-gray max-w-none space-y-6 text-gray-700">
        <section>
          <h2 className="text-xl font-semibold text-gray-900">1. Information We Collect</h2>
          <p>We collect information you provide directly to us when you create an account, use our services, or contact us for support. This includes:</p>
          <ul className="ml-6 list-disc space-y-1">
            <li>Account information (name, email address, business name)</li>
            <li>Inspection data (photos, notes, checklists, reports)</li>
            <li>Usage data (how you interact with our service)</li>
            <li>Payment information (processed securely by our payment provider — we do not store card details)</li>
          </ul>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-gray-900">2. How We Use Your Information</h2>
          <p>We use the information we collect to:</p>
          <ul className="ml-6 list-disc space-y-1">
            <li>Provide, maintain, and improve our services</li>
            <li>Generate AI-powered quality reports from your inspection data</li>
            <li>Send you service-related communications</li>
            <li>Respond to your comments and questions</li>
            <li>Monitor and analyze usage patterns to improve the product</li>
          </ul>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-gray-900">3. Data Storage and Security</h2>
          <p>Your data is stored securely using Supabase, a SOC 2 compliant database provider. Inspection photos are stored in encrypted cloud storage. We implement industry-standard security measures to protect your information.</p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-gray-900">4. Data Sharing</h2>
          <p>We do not sell your personal information. We may share your information with:</p>
          <ul className="ml-6 list-disc space-y-1">
            <li>Service providers who assist in operating our platform (Supabase, Anthropic AI, Vercel)</li>
            <li>Payment processors for billing purposes</li>
            <li>Law enforcement when required by law</li>
          </ul>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-gray-900">5. AI Processing</h2>
          <p>CleanCheck uses Anthropic's Claude AI to generate inspection reports. Inspection photos and notes you submit may be processed by Anthropic's API to generate reports. Anthropic's privacy policy governs their handling of this data.</p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-gray-900">6. Your Rights</h2>
          <p>You may request to access, correct, or delete your personal data at any time by contacting us at josh@cleancheck.io. We will respond within 30 days.</p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-gray-900">7. Cookies</h2>
          <p>We use essential cookies to maintain your login session. We do not use tracking or advertising cookies.</p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-gray-900">8. Changes to This Policy</h2>
          <p>We may update this policy from time to time. We will notify you of significant changes by email or through the application.</p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-gray-900">9. Contact</h2>
          <p>For privacy-related questions, contact us at <a href="mailto:josh@cleancheck.io" className="text-blue-600 hover:underline">josh@cleancheck.io</a>.</p>
        </section>
      </div>
    </div>
  )
}
