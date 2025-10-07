import React from 'react';

export default function TermsOfUse() {
  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <h1 className="text-3xl font-bold text-[#2E2E2E]" style={{ fontFamily: 'Poppins, sans-serif' }}>Terms of Use</h1>
      <p className="text-gray-600">Effective Date: {new Date().toISOString().slice(0,10)}</p>

      <section className="space-y-2">
        <h2 className="text-xl font-semibold text-[#2E2E2E]">Agreement</h2>
        <p className="text-[#2E2E2E]">By using this portal, you agree to comply with company policies and these Terms. If you do not agree, do not use the portal.</p>
      </section>

      <section className="space-y-2">
        <h2 className="text-xl font-semibold text-[#2E2E2E]">Acceptable Use</h2>
        <ul className="list-disc pl-6 text-[#2E2E2E]">
          <li>Use only for authorized business purposes.</li>
          <li>Do not attempt to bypass security controls or access others’ data.</li>
          <li>Do not upload unlawful, confidential, or malicious content.</li>
        </ul>
      </section>

      <section className="space-y-2">
        <h2 className="text-xl font-semibold text-[#2E2E2E]">Accounts & Security</h2>
        <p className="text-[#2E2E2E]">You are responsible for safeguarding your account. Notify IT immediately of suspected compromise.</p>
      </section>

      <section className="space-y-2">
        <h2 className="text-xl font-semibold text-[#2E2E2E]">Intellectual Property</h2>
        <p className="text-[#2E2E2E]">All content and software are proprietary to the company or its licensors and may not be copied or redistributed without authorization.</p>
      </section>

      <section className="space-y-2">
        <h2 className="text-xl font-semibold text-[#2E2E2E]">Governing Law</h2>
        <p className="text-[#2E2E2E]">These Terms are governed by applicable local laws and internal company policies.</p>
      </section>

      <section className="space-y-2">
        <h2 className="text-xl font-semibold text-[#2E2E2E]">Contact</h2>
        <p className="text-[#2E2E2E]">HR: hr-support@techmahindra.com • IT: it-support@techmahindra.com</p>
      </section>
    </div>
  );
}


