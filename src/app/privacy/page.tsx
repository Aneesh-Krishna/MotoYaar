export default function PrivacyPage() {
  return (
    <div className="max-w-2xl mx-auto px-4 py-8 prose">
      <h1>Privacy Policy</h1>
      <p><strong>Last updated:</strong> March 2026</p>

      <h2>What we store</h2>
      <p>
        MotoYaar stores vehicle documents you upload, expense records, and trip logs.
        Documents are stored securely in encrypted cloud storage (Cloudflare R2).
      </p>

      <h2>How we use your data</h2>
      <p>
        Your data is used solely to provide MotoYaar&apos;s features. We do not sell or share
        your data with third parties except where required for service delivery (e.g. email
        sending via Resend).
      </p>

      <h2>Auto-deletion</h2>
      <p>
        Expired document files are automatically deleted 10 days after their expiry date.
        You can also delete all stored files at any time from Settings → Privacy &amp; Data.
      </p>

      <h2>Account deletion</h2>
      <p>
        You can permanently delete your account and all associated data from
        Settings → Privacy &amp; Data → Delete my account.
      </p>

      <h2>Contact</h2>
      <p>
        Questions? Email{" "}
        <a href="mailto:privacy@motoyaar.app">privacy@motoyaar.app</a>
      </p>
    </div>
  );
}
