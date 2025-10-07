import React from 'react';

export default function Support() {
  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <h1 className="text-3xl font-bold text-[#2E2E2E]" style={{ fontFamily: 'Poppins, sans-serif' }}>Contact HR / IT Support</h1>

      <section className="space-y-2">
        <h2 className="text-xl font-semibold text-[#2E2E2E]">Human Resources</h2>
        <ul className="text-[#2E2E2E]">
          <li>Email: hr-support@techmahindra.com</li>
          <li>Phone: +91-00000-00000</li>
          <li>Office Hours: Mon–Fri, 9:30–18:00 IST</li>
        </ul>
      </section>

      <section className="space-y-2">
        <h2 className="text-xl font-semibold text-[#2E2E2E]">IT Service Desk</h2>
        <ul className="text-[#2E2E2E]">
          <li>Email: it-support@techmahindra.com</li>
          <li>Phone: +91-11111-11111</li>
          <li>Office Hours: 24x7 for critical incidents</li>
        </ul>
      </section>

      <section className="space-y-2">
        <h2 className="text-xl font-semibold text-[#2E2E2E]">Emergency</h2>
        <p className="text-[#2E2E2E]">For urgent matters outside office hours, call the IT hotline above and follow the incident prompts.</p>
      </section>
    </div>
  );
}


