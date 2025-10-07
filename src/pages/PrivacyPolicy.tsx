import React from 'react';

export default function PrivacyPolicy() {
  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <h1 className="text-3xl font-bold text-[#2E2E2E]" style={{ fontFamily: 'Poppins, sans-serif' }}>Privacy Policy</h1>
      <p className="text-gray-600">Effective Date: {new Date().toISOString().slice(0,10)}</p>

      <p className="text-[#2E2E2E]">We are committed to protecting your privacy. This policy explains what data we collect, why we collect it, and how we protect it.</p>

      <section className="space-y-2">
        <h2 className="text-xl font-semibold text-[#2E2E2E]">Information We Collect</h2>
        <ul className="list-disc pl-6 text-[#2E2E2E]">
          <li>Account data: name, corporate email, employee ID, department.</li>
          <li>Operational data: attendance records, leave requests, notifications.</li>
          <li>Technical data: IP address, device/user agent, usage metadata.</li>
        </ul>
      </section>

      <section className="space-y-2">
        <h2 className="text-xl font-semibold text-[#2E2E2E]">How We Use Information</h2>
        <ul className="list-disc pl-6 text-[#2E2E2E]">
          <li>Provide and improve attendance, leave, and HR self‑service features.</li>
          <li>Security, auditing, and fraud prevention.</li>
          <li>Compliance, reporting, and support operations.</li>
        </ul>
      </section>

      <section className="space-y-2">
        <h2 className="text-xl font-semibold text-[#2E2E2E]">Sharing and Disclosure</h2>
        <p className="text-[#2E2E2E]">We may share information with internal HR/IT teams and approved service providers under appropriate confidentiality and data processing terms, and when required by law.</p>
      </section>

      <section className="space-y-2">
        <h2 className="text-xl font-semibold text-[#2E2E2E]">Data Security</h2>
        <p className="text-[#2E2E2E]">We implement administrative, technical, and physical safeguards appropriate to the sensitivity of the data. No system is 100% secure; report suspected issues to IT Support.</p>
      </section>

      <section className="space-y-2">
        <h2 className="text-xl font-semibold text-[#2E2E2E]">Your Rights</h2>
        <p className="text-[#2E2E2E]">Subject to company policy and applicable law, you may request access, correction, or deletion of your data through HR.</p>
      </section>

      <section className="space-y-2">
        <h2 className="text-xl font-semibold text-[#2E2E2E]">Contact</h2>
        <p className="text-[#2E2E2E]">HR: hr-support@techmahindra.com • IT: it-support@techmahindra.com</p>
      </section>
    </div>
  );
}


