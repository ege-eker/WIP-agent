import fs from 'fs';
import path from 'path';
import PDFDocument from 'pdfkit';
import { Document, Packer, Paragraph, TextRun, HeadingLevel } from 'docx';
import * as XLSX from 'xlsx';

const BASE = path.resolve(__dirname, '../documents');

// ── Types ──────────────────────────────────────────────────────────
interface SeedDoc {
  name: string;
  content: string;
  /** For .xlsx/.xls files: array of sheets with name and rows */
  sheets?: { name: string; data: (string | number)[][] }[];
}
interface SeedCategory {
  dir: string;
  files: SeedDoc[];
}

// ── Helpers ────────────────────────────────────────────────────────
function createTxt(filePath: string, content: string): void {
  fs.writeFileSync(filePath, content, 'utf-8');
}

function createPdf(filePath: string, title: string, content: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ margin: 50 });
    const chunks: Buffer[] = [];
    doc.on('data', (chunk: Buffer) => chunks.push(chunk));
    doc.on('end', () => {
      try {
        fs.writeFileSync(filePath, Buffer.concat(chunks));
        resolve();
      } catch (err) {
        reject(err);
      }
    });
    doc.on('error', reject);
    doc.fontSize(18).text(title, { underline: true });
    doc.moveDown();
    doc.fontSize(11).text(content);
    doc.end();
  });
}

async function createDocx(filePath: string, title: string, content: string): Promise<void> {
  const paragraphs = content.split('\n').map(
    (line) =>
      new Paragraph({
        children: [new TextRun(line)],
        ...(line === '' ? {} : {}),
      }),
  );

  const doc = new Document({
    sections: [
      {
        children: [
          new Paragraph({ text: title, heading: HeadingLevel.HEADING_1 }),
          ...paragraphs,
        ],
      },
    ],
  });

  const buffer = await Packer.toBuffer(doc);
  fs.writeFileSync(filePath, buffer);
}

function createXlsx(filePath: string, sheets: { name: string; data: (string | number)[][] }[]): void {
  const workbook = XLSX.utils.book_new();
  for (const sheet of sheets) {
    const worksheet = XLSX.utils.aoa_to_sheet(sheet.data);
    XLSX.utils.book_append_sheet(workbook, worksheet, sheet.name);
  }
  XLSX.writeFile(workbook, filePath);
}

function generateLargeProductCatalog(rowCount: number): (string | number)[][] {
  const categories = ['Elektronik', 'Giyim', 'Gıda', 'Mobilya', 'Otomotiv', 'Kozmetik', 'Kitap', 'Spor', 'Oyuncak', 'Bahçe'];
  const adjectives = ['Premium', 'Ekonomik', 'Profesyonel', 'Standart', 'Lüks', 'Organik', 'Dijital', 'Klasik', 'Modern', 'Endüstriyel'];
  const items = ['Widget', 'Aksesuar', 'Modül', 'Sistem', 'Ürün', 'Parça', 'Set', 'Paket', 'Araç', 'Cihaz'];
  const brands = ['AcmeTech', 'TürkStar', 'İnovasyon', 'MegaPro', 'ŞirinMarka', 'GüçlüTek', 'YeşilÜrün', 'AltınKalite', 'ÖzgürTasarım', 'BüyükDepo'];

  const rows: (string | number)[][] = [
    ['ÜRÜN KODU', 'ÜRÜN ADI', 'KATEGORİ', 'MARKA', 'FİYAT (TL)', 'STOK', 'AÇIKLAMA'],
  ];

  for (let i = 1; i <= rowCount; i++) {
    const cat = categories[i % categories.length];
    const adj = adjectives[i % adjectives.length];
    const item = items[Math.floor(i / 10) % items.length];
    const brand = brands[Math.floor(i / 100) % brands.length];
    const price = Math.round((10 + Math.sin(i) * 500 + i * 0.5) * 100) / 100;
    const stock = Math.abs(Math.floor(Math.sin(i * 7) * 1000));

    rows.push([
      `PRD-${String(i).padStart(6, '0')}`,
      `${adj} ${item} ${cat} ${i}`,
      cat,
      brand,
      price,
      stock,
      `${brand} marka ${adj.toLowerCase()} ${item.toLowerCase()} - ${cat} kategorisinde yüksek kaliteli ürün. Detaylı teknik özellikler ve garanti bilgisi için ürün sayfasını ziyaret ediniz.`,
    ]);
  }

  return rows;
}

function generateTransactionLog(rowCount: number): (string | number)[][] {
  const statuses = ['Tamamlandı', 'İptal Edildi', 'Beklemede', 'İade', 'Kargoda'];
  const cities = ['İstanbul', 'Ankara', 'İzmir', 'Bursa', 'Antalya', 'Adana', 'Gaziantep', 'Konya', 'Mersin', 'Diyarbakır',
    'Kayseri', 'Eskişehir', 'Samsun', 'Denizli', 'Şanlıurfa', 'Trabzon', 'Malatya', 'Erzurum', 'Çanakkale', 'Muğla'];

  const rows: (string | number)[][] = [
    ['İŞLEM NO', 'TARİH', 'MÜŞTERİ ADI', 'ŞEHİR', 'ÜRÜN KODU', 'ADET', 'TUTAR (TL)', 'DURUM'],
  ];

  for (let i = 1; i <= rowCount; i++) {
    const month = ((i % 12) + 1).toString().padStart(2, '0');
    const day = ((i % 28) + 1).toString().padStart(2, '0');
    const city = cities[i % cities.length];
    const status = statuses[i % statuses.length];
    const qty = (i % 10) + 1;
    const amount = Math.round((qty * (50 + Math.sin(i) * 200)) * 100) / 100;

    rows.push([
      `TXN-2025-${String(i).padStart(7, '0')}`,
      `2025-${month}-${day}`,
      `Müşteri ${i}`,
      city,
      `PRD-${String((i * 3) % 10000).padStart(6, '0')}`,
      qty,
      Math.abs(amount),
      status,
    ]);
  }

  return rows;
}

// ── Document Data ──────────────────────────────────────────────────
const docs: SeedCategory[] = [
  // ─── Engineering ───────────────────────────────────────────────
  {
    dir: 'Engineering/2022',
    files: [
      { name: 'system-design-review-2022.pdf', content: 'System Design Review 2022\n\nOverview: Annual review of system architecture and infrastructure.\n\nKey Findings:\n- Monolithic architecture is reaching scalability limits\n- Database response times increased 23% year-over-year\n- API gateway handling 15M requests/day\n\nRecommendations:\n1. Begin planning microservices migration\n2. Implement read replicas for primary database\n3. Add CDN layer for static assets\n4. Evaluate Kubernetes for container orchestration' },
      { name: 'tech-stack-evaluation-2022.txt', content: 'Technology Stack Evaluation 2022\n\nCurrent Stack:\n- Backend: Node.js (Express)\n- Frontend: React 17\n- Database: PostgreSQL 13\n- Cache: Redis 6\n- CI/CD: GitHub Actions\n\nEvaluation Results:\n- Node.js performance adequate for current load\n- React 17 should be upgraded to React 18 for concurrent features\n- PostgreSQL 13 upgrade to 15 recommended for performance improvements\n- Redis serving well for session management and caching\n\nNew Technologies Under Consideration:\n- TypeScript migration (approved for 2023)\n- GraphQL for mobile API\n- Terraform for infrastructure as code' },
      { name: 'incident-report-q3-2022.docx', content: 'Incident Report Q3 2022\n\nIncident ID: INC-2022-0847\nDate: August 14, 2022\nSeverity: P1\nDuration: 3 hours 22 minutes\n\nSummary: Production database failover triggered during peak traffic due to connection pool exhaustion.\n\nRoot Cause: Connection pool max was set to 100, insufficient for traffic spike during product launch.\n\nResolution: Increased pool size to 300, added connection pooling middleware (PgBouncer).\n\nAction Items:\n- Implement auto-scaling for connection pools\n- Add alerting for connection pool utilization > 70%\n- Load test before all major launches' },
    ],
  },
  {
    dir: 'Engineering/2023',
    files: [
      { name: 'architecture-decisions-2023.pdf', content: 'Architecture Decision Records 2023\n\nADR-001: Migration to Microservices\nStatus: Accepted\nDate: 2023-03-15\n\nWe will migrate the monolithic backend to a microservices architecture using Kubernetes. This decision is driven by scaling requirements and the need for independent deployment of services.\n\nADR-002: Database Strategy\nStatus: Accepted\nDate: 2023-06-20\n\nPostgreSQL will remain the primary database. Redis will be used for caching. MongoDB for document storage where schema flexibility is needed.\n\nADR-003: Event-Driven Architecture\nStatus: Accepted\nDate: 2023-09-01\n\nAdopt Apache Kafka for inter-service communication. This enables async processing and decouples services.' },
      { name: 'api-guidelines-2023.txt', content: 'API Design Guidelines 2023\n\n1. Use RESTful conventions\n2. Version APIs using URL path (v1, v2)\n3. Use JSON for request/response bodies\n4. Implement pagination for list endpoints\n5. Use appropriate HTTP status codes\n6. Include request ID in all responses\n7. Rate limit all public endpoints\n8. Document all endpoints with OpenAPI 3.0\n9. Use snake_case for JSON field names\n10. Support filtering and sorting via query params' },
      { name: 'typescript-migration-plan-2023.docx', content: 'TypeScript Migration Plan 2023\n\nObjective: Migrate entire backend codebase from JavaScript to TypeScript.\n\nPhase 1 (Q1): Set up TypeScript config, migrate utility modules\nPhase 2 (Q2): Migrate API routes and middleware\nPhase 3 (Q3): Migrate database models and services\nPhase 4 (Q4): Migrate tests, enable strict mode\n\nGuidelines:\n- Use strict TypeScript configuration\n- No use of "any" type without explicit justification\n- All new code must be TypeScript\n- Minimum 80% type coverage target' },
    ],
  },
  {
    dir: 'Engineering/2024',
    files: [
      { name: 'cloud-migration-report-2024.pdf', content: 'Cloud Migration Report 2024\n\nMigration Status: Phase 2 Complete\n\nServices Migrated: 18 of 24 microservices\nUptime During Migration: 99.97%\nCost Reduction: 18% compared to on-premise\n\nKey Achievements:\n- Zero-downtime migration for critical services\n- Automated CI/CD pipelines for all migrated services\n- Infrastructure as Code coverage: 95%\n\nRemaining Work:\n- Legacy payment service (requires PCI compliance review)\n- Batch processing jobs (scheduled for Q3)\n- Data warehouse migration (Q4)' },
      { name: 'performance-benchmarks-2024.txt', content: 'Performance Benchmarks 2024\n\nAPI Response Times (p95):\n- User Service: 45ms (target: <100ms) ✓\n- Order Service: 120ms (target: <200ms) ✓\n- Search Service: 230ms (target: <300ms) ✓\n- Report Service: 1.2s (target: <2s) ✓\n\nThroughput:\n- Peak: 45,000 req/sec\n- Average: 12,000 req/sec\n\nDatabase:\n- Read latency p95: 8ms\n- Write latency p95: 15ms\n- Connection pool utilization: 42%' },
      { name: 'security-audit-2024.docx', content: 'Security Audit Report 2024\n\nAudit Period: January - March 2024\nAuditor: SecureCode Inc.\n\nFindings Summary:\n- Critical: 0\n- High: 2\n- Medium: 5\n- Low: 12\n\nHigh Severity Issues:\n1. JWT tokens not rotated on password change\n   Remediation: Implement token blacklist on password reset\n2. SQL injection vulnerability in legacy report endpoint\n   Remediation: Migrate to parameterized queries\n\nAll high and medium issues resolved by April 15, 2024.' },
    ],
  },
  {
    dir: 'Engineering/2025',
    files: [
      { name: 'ai-integration-roadmap-2025.pdf', content: 'AI Integration Roadmap 2025\n\nVision: Embed AI capabilities across the product platform.\n\nQ1: RAG-based document search (internal knowledge base)\nQ2: AI-powered customer support chatbot\nQ3: Predictive analytics for user behavior\nQ4: Automated code review assistant\n\nTech Stack:\n- LLM: Claude API (Anthropic)\n- Vector DB: Pinecone\n- Embeddings: text-embedding-3-small\n- Orchestration: LangChain\n\nBudget: $180,000 for API costs and infrastructure' },
      { name: 'platform-scalability-plan-2025.txt', content: 'Platform Scalability Plan 2025\n\nCurrent Scale: 2M monthly active users\nTarget: 10M monthly active users by Q4 2025\n\nInfrastructure Changes:\n1. Multi-region deployment (US-East, EU-West, AP-Southeast)\n2. Database sharding for user and order data\n3. Edge caching with Cloudflare Workers\n4. Event streaming upgrade to Kafka Streams\n\nEstimated Infrastructure Cost Increase: 65%\nExpected Revenue Growth: 300%' },
      { name: 'devex-improvements-2025.docx', content: 'Developer Experience Improvements 2025\n\nGoals:\n- Reduce local dev setup time from 45 min to 5 min\n- Achieve <10 min CI pipeline for all services\n- 100% TypeScript strict mode compliance\n\nInitiatives:\n1. Dev containers with pre-built images\n2. Shared ESLint/Prettier/TSConfig packages\n3. Monorepo migration (Turborepo)\n4. Automated dependency updates (Renovate)\n5. Internal CLI tool for common dev tasks\n6. Standardized logging and tracing across services' },
    ],
  },

  // ─── HR ────────────────────────────────────────────────────────
  {
    dir: 'HR/2022',
    files: [
      { name: 'employee-handbook-2022.pdf', content: 'Employee Handbook 2022\n\nWelcome to Acme Corp. This handbook outlines company policies and procedures.\n\nCode of Conduct:\n- Treat all colleagues with respect and professionalism\n- Maintain confidentiality of company information\n- Report any ethical concerns to HR or anonymous hotline\n\nWork Hours: Standard hours are 9 AM - 6 PM, flexible within core hours 10 AM - 4 PM.\n\nDress Code: Business casual. Client-facing meetings require business formal.\n\nPerformance Reviews: Conducted bi-annually in June and December.' },
      { name: 'onboarding-checklist-2022.txt', content: 'New Employee Onboarding Checklist 2022\n\nDay 1:\n- [ ] Complete I-9 and W-4 forms\n- [ ] Receive laptop and access badges\n- [ ] Set up email and Slack accounts\n- [ ] Meet with HR for benefits enrollment\n\nWeek 1:\n- [ ] Complete security awareness training\n- [ ] Meet team members and manager\n- [ ] Review team documentation and processes\n- [ ] Set up development environment (Engineering)\n\nMonth 1:\n- [ ] Complete all compliance training modules\n- [ ] Set 90-day goals with manager\n- [ ] Schedule 1:1 with skip-level manager' },
      { name: 'diversity-report-2022.docx', content: 'Diversity & Inclusion Report 2022\n\nWorkforce Demographics:\n- Gender: 42% Female, 55% Male, 3% Non-binary\n- Underrepresented minorities: 28%\n- Age distribution: 22-30 (35%), 31-40 (40%), 41-50 (18%), 51+ (7%)\n\nKey Initiatives:\n1. Blind resume screening implemented\n2. Employee Resource Groups (ERGs) expanded to 6\n3. Inclusive leadership training for all managers\n4. Partnership with 3 HBCUs for internship pipeline\n\n2023 Goals:\n- Increase female representation in engineering to 35%\n- Launch mentorship program for underrepresented groups' },
    ],
  },
  {
    dir: 'HR/2023',
    files: [
      { name: 'employee-handbook-2023.txt', content: 'Employee Handbook 2023\n\nChapter 1: Company Policies\n\nAll employees are expected to adhere to the company code of conduct. This includes maintaining professional behavior, respecting colleagues, and following workplace safety guidelines.\n\nChapter 2: Benefits\n\nFull-time employees are eligible for health insurance, dental coverage, and 401k matching up to 6%. Vacation days start at 15 per year and increase with tenure.\n\nChapter 3: Remote Work Policy\n\nEmployees may work remotely up to 3 days per week with manager approval. A stable internet connection and dedicated workspace are required.' },
      { name: 'leave-policy-2023.pdf', content: 'Leave Policy 2023\n\nAnnual Leave: 15-25 days based on tenure\nSick Leave: 10 days per year\nParental Leave: 16 weeks paid\nBereavement Leave: 5 days\n\nAll leave requests must be submitted through the HR portal at least 2 weeks in advance for planned absences.\n\nNew in 2023:\n- Mental health days: 3 per year (no documentation required)\n- Volunteer days: 2 per year for approved organizations\n- Sabbatical: 4 weeks paid after 5 years of service' },
      { name: 'training-catalog-2023.docx', content: 'Training & Development Catalog 2023\n\nTechnical Skills:\n- Advanced TypeScript (16 hours)\n- Cloud Architecture on AWS (24 hours)\n- Data Engineering Fundamentals (20 hours)\n- Machine Learning for Engineers (32 hours)\n\nLeadership:\n- New Manager Bootcamp (16 hours)\n- Effective Communication (8 hours)\n- Conflict Resolution (4 hours)\n\nCompliance:\n- Security Awareness (2 hours, mandatory)\n- Anti-Harassment (1 hour, mandatory)\n- Data Privacy & GDPR (2 hours, mandatory)\n\nBudget: $2,500 per employee per year for external training.' },
    ],
  },
  {
    dir: 'HR/2024',
    files: [
      { name: 'compensation-review-2024.pdf', content: 'Compensation Review 2024\n\nAnnual salary adjustments will take effect January 1, 2024. The average increase across the organization is 4.5%. Performance-based bonuses range from 5-20% of base salary.\n\nKey changes:\n- Engineering band levels updated\n- New equity refresh program for senior employees\n- Cost of living adjustment for remote workers in high-cost areas\n- Sign-on bonus increased to $15,000 for senior roles\n\nTotal Compensation Philosophy:\nWe target the 75th percentile of market rates for all roles, with top performers reaching 90th percentile through bonuses and equity.' },
      { name: 'employee-satisfaction-survey-2024.txt', content: 'Employee Satisfaction Survey Results 2024\n\nResponse Rate: 87% (412 of 474 employees)\n\nOverall Satisfaction: 4.1/5.0 (up from 3.8 in 2023)\n\nTop Positive Areas:\n- Team collaboration: 4.5/5.0\n- Work-life balance: 4.3/5.0\n- Manager support: 4.2/5.0\n\nAreas for Improvement:\n- Career growth clarity: 3.4/5.0\n- Cross-team communication: 3.5/5.0\n- Office facilities: 3.6/5.0\n\nAction Items:\n1. Launch career pathing framework by Q2\n2. Monthly all-hands with Q&A\n3. Office renovation for floors 3 and 4' },
      { name: 'remote-work-policy-update-2024.docx', content: 'Remote Work Policy Update 2024\n\nEffective: March 1, 2024\n\nChanges from 2023 Policy:\n1. Remote work expanded to 4 days/week (was 3)\n2. Quarterly in-person team gatherings (mandatory)\n3. Home office stipend increased to $1,500/year (was $1,000)\n4. Co-working space reimbursement: up to $300/month\n\nEligibility: All employees after 90-day probation period.\n\nEquipment Provided:\n- Laptop (company standard)\n- Monitor (up to $500)\n- Keyboard and mouse\n- Headset for video calls\n\nEmployees must maintain a dedicated workspace and reliable internet (min 50 Mbps).' },
    ],
  },
  {
    dir: 'HR/2025',
    files: [
      { name: 'hiring-plan-2025.pdf', content: 'Hiring Plan 2025\n\nTotal Headcount Target: 85 new hires\n\nBy Department:\n- Engineering: 35 (15 backend, 10 frontend, 5 ML, 5 DevOps)\n- Sales: 20 (12 AE, 5 SDR, 3 SE)\n- Marketing: 10 (4 content, 3 demand gen, 2 product marketing, 1 brand)\n- Product: 8 (5 PM, 3 designers)\n- Operations: 7 (3 support, 2 IT, 2 finance)\n- HR: 5 (2 recruiters, 2 HRBP, 1 L&D)\n\nRecruiting Budget: $425,000\nAverage Time-to-Fill Target: 35 days\nOffer Acceptance Rate Target: 85%' },
      { name: 'wellness-program-2025.txt', content: 'Employee Wellness Program 2025\n\nNew Benefits:\n- Free therapy sessions: 12 per year (up from 6)\n- Gym membership subsidy: $100/month\n- Wellness Fridays: Half-day every last Friday of month\n- Meditation app subscription (Headspace)\n- Ergonomic assessment for home offices\n\nWellness Challenges:\n- Q1: Step challenge (10,000 steps/day)\n- Q2: Mindfulness month\n- Q3: Healthy eating challenge\n- Q4: Digital detox week\n\nWellness Budget: $850 per employee per year' },
      { name: 'dei-strategy-2025.docx', content: 'Diversity, Equity & Inclusion Strategy 2025\n\nPillar 1: Inclusive Hiring\n- Structured interviews with standardized rubrics\n- Diverse interview panels (minimum 2 underrepresented members)\n- Partner with 10 diversity-focused organizations\n\nPillar 2: Belonging\n- Launch 3 new Employee Resource Groups\n- Inclusive language guidelines for all communications\n- Cultural celebration calendar\n\nPillar 3: Equity\n- Annual pay equity audit (3rd party)\n- Transparent promotion criteria\n- Sponsorship program for high-potential underrepresented talent\n\nMetrics: Quarterly DEI dashboard shared company-wide.' },
    ],
  },

  // ─── Finance ───────────────────────────────────────────────────
  {
    dir: 'Finance/2022',
    files: [
      { name: 'annual-financial-report-2022.pdf', content: 'Annual Financial Report 2022\n\nRevenue: $18.2M (up 22% YoY)\nGross Margin: 72%\nOperating Expenses: $14.1M\nNet Income: $1.8M\nCash Position: $8.5M\n\nRevenue Breakdown:\n- SaaS Subscriptions: $14.5M (80%)\n- Professional Services: $2.7M (15%)\n- Training & Support: $1.0M (5%)\n\nKey Metrics:\n- ARR: $16.8M\n- Net Revenue Retention: 112%\n- Customer Count: 342\n- Average Contract Value: $49,100' },
      { name: 'expense-policy-2022.txt', content: 'Expense Policy 2022\n\nTravel:\n- Flights: Economy class for domestic, premium economy for 6+ hour flights\n- Hotels: Up to $200/night domestic, $300/night international\n- Meals: $75/day domestic, $100/day international\n\nSoftware & Tools:\n- Under $50/month: Manager approval\n- $50-$500/month: Director approval\n- Over $500/month: VP approval + procurement review\n\nClient Entertainment: Up to $150/person, requires pre-approval.\n\nAll expenses must be submitted within 30 days with receipts.' },
      { name: 'budget-planning-2022.docx', content: 'Budget Planning Guidelines 2022\n\nTimeline:\n- October 1: Budget templates distributed\n- October 31: Department submissions due\n- November 15: Finance review complete\n- December 1: Executive approval\n- December 15: Final budgets communicated\n\nGuidelines:\n- Assume 15% revenue growth\n- Headcount growth capped at 25%\n- Infrastructure costs: plan for cloud migration costs\n- Marketing: allocate 12% of projected revenue\n\nCapex vs Opex:\n- All cloud services classified as opex\n- Hardware purchases over $5,000 classified as capex' },
    ],
  },
  {
    dir: 'Finance/2023',
    files: [
      { name: 'q2-financial-summary-2023.pdf', content: 'Q2 2023 Financial Summary\n\nRevenue: $6.1M (Q2), $11.8M (H1)\nGrowth: 28% YoY\nBurn Rate: $1.2M/month\nRunway: 14 months\n\nHighlights:\n- Closed 3 enterprise deals >$200K ACV\n- Expansion revenue up 35%\n- Churn reduced to 4.2% (was 6.1% in Q2 2022)\n\nConcerns:\n- Sales cycle lengthening (avg 68 days, was 52)\n- Professional services margins declining (45% vs 52% target)\n- Infrastructure costs 12% over budget due to migration' },
      { name: 'tax-compliance-guide-2023.txt', content: 'Tax Compliance Guide 2023\n\nFederal Tax:\n- Corporate tax rate: 21%\n- Estimated quarterly payments due: Apr 15, Jun 15, Sep 15, Dec 15\n- R&D tax credit: Estimated $420,000\n\nState Tax:\n- Delaware franchise tax: $180,000\n- California: 8.84% corporate tax rate\n- Multi-state nexus considerations for remote employees\n\nInternational:\n- Transfer pricing documentation updated\n- UK subsidiary VAT registration complete\n- OECD Pillar Two minimum tax considerations\n\nKey Deadlines:\n- Form 1120 due: October 15 (extended)\n- State returns: Varies by jurisdiction' },
      { name: 'vendor-payment-procedures-2023.docx', content: 'Vendor Payment Procedures 2023\n\nPayment Terms:\n- Standard: Net 30\n- Preferred vendors: Net 45\n- Small vendors (<$10K annual): Net 15\n\nApproval Matrix:\n- Under $5,000: Manager\n- $5,000 - $25,000: Director\n- $25,000 - $100,000: VP Finance\n- Over $100,000: CFO + CEO\n\nProcess:\n1. PO created in procurement system\n2. Goods/services received and verified\n3. Invoice matched to PO (3-way match)\n4. Approval workflow triggered\n5. Payment processed on next payment run (weekly)\n\nPayment Methods: ACH (preferred), Wire (international), Check (exception only)' },
    ],
  },
  {
    dir: 'Finance/2024',
    files: [
      { name: 'budget-q1-2024.pdf', content: 'Q1 2024 Budget Summary\n\nTotal Budget: $2,450,000\n\nBreakdown:\n- Personnel: $1,800,000 (73%)\n- Infrastructure: $320,000 (13%)\n- Software Licenses: $180,000 (7%)\n- Marketing: $100,000 (4%)\n- Training: $50,000 (2%)\n\nKey initiatives:\n- Cloud migration phase 2\n- New hire onboarding program\n- Customer success platform implementation\n\nVariance from Plan: -2.3% (under budget)\nForecast: On track for annual targets' },
      { name: 'revenue-forecast-2024.txt', content: 'Revenue Forecast 2024\n\nAnnual Target: $32M\n\nQuarterly Breakdown:\n- Q1: $7.2M (actual: $7.5M) ✓\n- Q2: $7.8M (forecast)\n- Q3: $8.2M (forecast)\n- Q4: $8.8M (forecast)\n\nGrowth Drivers:\n- Enterprise segment: +45% (3 deals in pipeline >$500K)\n- Mid-market: +25% (new sales team ramping)\n- SMB: +10% (self-serve improvements)\n\nRisks:\n- Enterprise deal slippage\n- Competitive pressure in mid-market\n- FX headwinds on international revenue (8% of total)' },
    ],
  },
  {
    dir: 'Finance/2025',
    files: [
      { name: 'annual-budget-2025.pdf', content: 'Annual Budget 2025\n\nTotal Budget: $28.5M\n\nDepartment Allocations:\n- Engineering: $12.2M (43%)\n- Sales & Marketing: $8.1M (28%)\n- G&A: $4.8M (17%)\n- Product: $2.1M (7%)\n- Operations: $1.3M (5%)\n\nCapital Expenditures: $2.1M\n- Office expansion: $1.2M\n- Hardware refresh: $600K\n- Security infrastructure: $300K\n\nKey Assumptions:\n- Revenue: $42M (31% growth)\n- Headcount: 560 (from 475)\n- Gross margin: 75%' },
      { name: 'investor-relations-q1-2025.txt', content: 'Investor Relations Update Q1 2025\n\nBoard Meeting Summary - March 28, 2025\n\nFinancial Highlights:\n- Q1 Revenue: $10.2M (14% above plan)\n- ARR: $41M (crossing $40M milestone)\n- Gross Margin: 76% (up from 72%)\n- Net Revenue Retention: 125%\n\nOperational Metrics:\n- Customer Count: 520 (up from 425)\n- Enterprise Customers: 45 (up from 28)\n- Average ACV: $78,800\n\nFundraising:\n- Series C discussions initiated\n- Target: $50M at $400M+ valuation\n- Expected close: Q3 2025' },
      { name: 'procurement-policy-2025.docx', content: 'Procurement Policy 2025\n\nNew Requirements:\n1. All software purchases must go through IT security review\n2. Minimum 3 vendor quotes for purchases >$25,000\n3. Annual vendor risk assessments for critical suppliers\n4. Sustainability criteria added to vendor evaluation\n\nPreferred Vendor Program:\n- AWS (cloud infrastructure)\n- Salesforce (CRM)\n- Workday (HR/Finance)\n- Slack (communication)\n- GitHub (development)\n\nContract Management:\n- All contracts stored in DocuSign CLM\n- Auto-renewal alerts 90 days before expiry\n- Annual spend review for all vendors >$50K' },
    ],
  },

  // ─── Test: Large Excel ────────────────────────────────────────
  {
    dir: 'Finance/2025',
    files: [
      {
        name: 'urun-katalogu-2025.xlsx',
        content: '',
        sheets: [
          { name: 'Ürün Kataloğu', data: generateLargeProductCatalog(10000) },
          { name: 'İşlem Geçmişi', data: generateTransactionLog(5000) },
          {
            name: 'Özet',
            data: [
              ['RAPOR ÖZETİ'],
              ['Toplam Ürün Sayısı', 10000],
              ['Toplam İşlem Sayısı', 5000],
              ['Rapor Tarihi', '2025-02-10'],
              ['Hazırlayan', 'Sistem Otomatik'],
              ['Açıklama', 'Bu dosya büyük veri seti testi için otomatik oluşturulmuştur. Türkçe karakter desteği: İışğüöçŞĞÜÖÇ'],
            ],
          },
        ],
      },
    ],
  },

  // ─── Legal ─────────────────────────────────────────────────────
  {
    dir: 'Legal/2022',
    files: [
      { name: 'terms-of-service-2022.pdf', content: 'Terms of Service 2022\n\nEffective Date: January 1, 2022\n\n1. Acceptance of Terms\nBy accessing or using Acme Corp services, you agree to be bound by these Terms.\n\n2. Service Description\nAcme Corp provides a cloud-based project management and collaboration platform.\n\n3. User Accounts\nUsers must provide accurate registration information. Users are responsible for maintaining password security.\n\n4. Intellectual Property\nAll content, features, and functionality are owned by Acme Corp and protected by copyright, trademark, and other laws.\n\n5. Limitation of Liability\nAcme Corp shall not be liable for any indirect, incidental, special, or consequential damages.\n\n6. Governing Law\nThese Terms shall be governed by the laws of the State of Delaware.' },
      { name: 'privacy-policy-2022.txt', content: 'Privacy Policy 2022\n\nData We Collect:\n- Account information (name, email, company)\n- Usage data (features used, session duration)\n- Device information (browser, OS, IP address)\n\nHow We Use Data:\n- Provide and improve our services\n- Send service-related communications\n- Analyze usage patterns for product development\n\nData Sharing:\n- We do not sell personal data\n- Third-party processors: AWS, Stripe, SendGrid\n- Law enforcement: Only with valid legal process\n\nData Retention: Account data retained for 2 years after account closure.\n\nContact: privacy@acmecorp.com' },
    ],
  },
  {
    dir: 'Legal/2023',
    files: [
      { name: 'data-processing-agreement-2023.pdf', content: 'Data Processing Agreement 2023\n\nBetween: Acme Corp (Processor) and Customer (Controller)\n\n1. Scope: This DPA applies to all personal data processed by Acme Corp on behalf of Customer.\n\n2. Processing Details:\n- Purpose: Providing SaaS platform services\n- Categories of data: Employee names, emails, project data\n- Data subjects: Customer employees and contractors\n\n3. Security Measures:\n- AES-256 encryption at rest\n- TLS 1.3 in transit\n- SOC 2 Type II certified\n- Annual penetration testing\n\n4. Sub-processors:\n- AWS (US-East, EU-West)\n- Stripe (payment processing)\n- SendGrid (email delivery)\n\n5. Data Breach Notification: Within 72 hours of discovery.' },
      { name: 'intellectual-property-policy-2023.txt', content: 'Intellectual Property Policy 2023\n\n1. Company IP: All work product created during employment belongs to Acme Corp.\n\n2. Pre-existing IP: Employees must disclose pre-existing IP before using it in company projects.\n\n3. Open Source:\n- Use of open source requires legal review for licenses: GPL, AGPL, SSPL\n- Permissive licenses (MIT, Apache 2.0, BSD) pre-approved\n- Contributions to open source require VP Engineering approval\n\n4. Patents:\n- Invention disclosure process: Submit to legal within 30 days\n- Patent bonus: $2,500 for filed patent, $5,000 for granted patent\n\n5. Trade Secrets: Proprietary algorithms, customer data, and business strategies are trade secrets. NDA required for all employees.' },
      { name: 'compliance-checklist-2023.docx', content: 'Compliance Checklist 2023\n\nSOC 2 Type II:\n- [x] Annual audit scheduled (March)\n- [x] Control testing documentation updated\n- [x] Access reviews completed quarterly\n- [x] Incident response plan tested\n\nGDPR:\n- [x] Data Protection Officer appointed\n- [x] Privacy Impact Assessments for new features\n- [x] Cookie consent updated\n- [x] Data subject request process documented\n\nHIPAA (BAA customers):\n- [x] PHI inventory updated\n- [x] Employee HIPAA training completed\n- [x] Encryption verified for all PHI data flows\n\nCCPA:\n- [x] Do Not Sell page updated\n- [x] Consumer request process tested' },
    ],
  },
  {
    dir: 'Legal/2024',
    files: [
      { name: 'ai-usage-policy-2024.pdf', content: 'AI Usage Policy 2024\n\nEffective: April 1, 2024\n\n1. Approved AI Tools:\n- GitHub Copilot (engineering)\n- Claude (all departments, via approved interface)\n- Jasper (marketing content)\n\n2. Prohibited Uses:\n- Inputting customer PII into AI tools\n- Using AI for final legal document generation without review\n- Automated decision-making affecting employment\n\n3. Data Protection:\n- No confidential data in public AI models\n- Enterprise agreements required for all AI vendors\n- AI-generated code must pass standard code review\n\n4. Disclosure:\n- AI-generated content for customers must be disclosed\n- Internal AI use does not require disclosure' },
      { name: 'contract-templates-update-2024.docx', content: 'Contract Templates Update 2024\n\nUpdated Templates:\n1. Master Services Agreement (MSA) - v4.2\n   - Added AI/ML data processing clause\n   - Updated limitation of liability cap to 12 months fees\n   - Added force majeure for pandemic events\n\n2. Non-Disclosure Agreement (NDA) - v3.1\n   - Extended term to 3 years (was 2)\n   - Added carve-out for AI training data\n\n3. Statement of Work (SOW) - v2.8\n   - Added milestone-based payment option\n   - Included change request process\n\n4. Vendor Agreement - v2.0\n   - Added security questionnaire requirement\n   - Supply chain risk assessment clause\n   - Data residency requirements' },
    ],
  },
  {
    dir: 'Legal/2025',
    files: [
      { name: 'regulatory-compliance-roadmap-2025.pdf', content: 'Regulatory Compliance Roadmap 2025\n\nNew Regulations:\n1. EU AI Act (effective August 2025)\n   - Risk classification of AI systems\n   - Transparency requirements for AI-generated content\n   - Action: Complete AI system inventory by June\n\n2. US State Privacy Laws\n   - 5 new state laws effective in 2025\n   - Action: Update consent mechanisms by March\n\n3. SEC Cybersecurity Rules\n   - Material incident reporting within 4 business days\n   - Annual cybersecurity governance disclosure\n   - Action: Update incident response playbook\n\nBudget: $350,000 for compliance tools and external counsel' },
      { name: 'data-retention-schedule-2025.txt', content: 'Data Retention Schedule 2025\n\nCustomer Data:\n- Active account data: Duration of service + 90 days\n- Deleted account data: 30 days (soft delete), then permanent\n- Usage logs: 12 months\n- Support tickets: 3 years\n\nEmployee Data:\n- Active employee records: Duration of employment\n- Terminated employee records: 7 years\n- Payroll data: 7 years\n- Interview records: 1 year\n\nFinancial Records:\n- Invoices and receipts: 7 years\n- Tax documents: 7 years\n- Audit reports: 10 years\n\nLegal:\n- Contracts: Duration + 6 years\n- Litigation files: 10 years after resolution\n- Board minutes: Permanent' },
      { name: 'vendor-security-requirements-2025.docx', content: 'Vendor Security Requirements 2025\n\nAll vendors handling company or customer data must:\n\n1. Security Certifications:\n   - SOC 2 Type II or ISO 27001 (mandatory)\n   - HIPAA BAA (if handling health data)\n\n2. Technical Controls:\n   - Encryption at rest (AES-256 minimum)\n   - Encryption in transit (TLS 1.2 minimum)\n   - Multi-factor authentication\n   - Regular vulnerability scanning\n\n3. Operational Controls:\n   - Incident response plan with 24-hour notification\n   - Annual penetration testing\n   - Employee background checks\n   - Security awareness training\n\n4. Assessment Process:\n   - Initial security questionnaire (100 questions)\n   - Annual reassessment\n   - Right to audit clause in all contracts' },
    ],
  },

  // ─── Marketing ─────────────────────────────────────────────────
  {
    dir: 'Marketing/2022',
    files: [
      { name: 'brand-guidelines-2022.pdf', content: 'Brand Guidelines 2022\n\nLogo:\n- Primary: Acme wordmark in Navy (#1B2A4A)\n- Secondary: Icon-only mark for small contexts\n- Minimum clear space: 2x the height of the "A"\n- Never stretch, rotate, or recolor the logo\n\nColors:\n- Primary: Navy #1B2A4A, Sky Blue #4A90D9\n- Secondary: Coral #FF6B6B, Mint #4ECDC4\n- Neutral: Slate #64748B, Light Gray #F1F5F9\n\nTypography:\n- Headlines: Inter Bold\n- Body: Inter Regular\n- Code: JetBrains Mono\n\nVoice & Tone:\n- Professional but approachable\n- Clear and concise\n- Empowering, not condescending' },
      { name: 'marketing-strategy-2022.txt', content: 'Marketing Strategy 2022\n\nGoals:\n- Increase brand awareness by 40%\n- Generate 5,000 MQLs\n- Achieve 2.5% website conversion rate\n\nChannels:\n1. Content Marketing: 4 blog posts/week, 2 whitepapers/quarter\n2. Paid Search: $15K/month budget (Google Ads)\n3. Social Media: LinkedIn (primary), Twitter, YouTube\n4. Events: 3 industry conferences, 6 webinars\n5. Email: Weekly newsletter, drip campaigns\n\nKey Campaigns:\n- Q1: Product launch campaign\n- Q2: Customer success stories series\n- Q3: Industry report sponsorship\n- Q4: Year-end promotion' },
    ],
  },
  {
    dir: 'Marketing/2023',
    files: [
      { name: 'content-calendar-2023.docx', content: 'Content Calendar 2023\n\nJanuary:\n- Blog: "Top 10 Project Management Trends for 2023"\n- Whitepaper: "The State of Remote Collaboration"\n- Webinar: "Kickstart Your Year with Better Workflows"\n\nFebruary:\n- Blog: "How to Reduce Meeting Overload"\n- Case Study: TechStart Inc. (50% productivity gain)\n- Social: Valentine\'s Day team appreciation campaign\n\nMarch:\n- Blog: "Enterprise Security Best Practices"\n- Webinar: "Scaling Teams Without Losing Culture"\n- Email: Spring product update announcement\n\nContent Performance Targets:\n- Blog posts: 5,000 avg monthly views\n- Webinars: 200+ registrations\n- Whitepapers: 500+ downloads' },
      { name: 'seo-report-2023.txt', content: 'SEO Performance Report 2023\n\nOrganic Traffic: 125,000 monthly sessions (up 34% YoY)\n\nTop Ranking Keywords:\n1. "project management software" - Position 8\n2. "team collaboration tool" - Position 5\n3. "remote work platform" - Position 12\n4. "task management app" - Position 6\n5. "agile project management" - Position 15\n\nDomain Authority: 52 (up from 45)\nBacklinks: 2,340 referring domains\nPage Speed Score: 92/100\n\nTop Performing Pages:\n- /features/collaboration - 18,000 visits/month\n- /blog/remote-work-guide - 12,000 visits/month\n- /pricing - 9,500 visits/month\n\nStrategy for 2024:\n- Target long-tail keywords\n- Build topic clusters around core features\n- Increase video content for YouTube SEO' },
    ],
  },
  {
    dir: 'Marketing/2024',
    files: [
      { name: 'campaign-performance-2024.pdf', content: 'Campaign Performance Report 2024\n\nQ1-Q2 Results:\n\nPaid Campaigns:\n- Google Ads: $92K spent, 1,200 MQLs, $77 CPL\n- LinkedIn Ads: $45K spent, 380 MQLs, $118 CPL\n- Meta Ads: $18K spent, 220 MQLs, $82 CPL\n\nOrganic Campaigns:\n- Blog traffic: 180,000 monthly sessions\n- Webinar series: 1,800 total registrations\n- Email campaigns: 32% open rate, 4.1% CTR\n\nConversion Funnel:\n- Website visitors: 450,000\n- Free trials: 8,200\n- Qualified opportunities: 1,100\n- Closed won: 220\n- Trial-to-paid conversion: 2.7%' },
      { name: 'product-launch-plan-2024.txt', content: 'Product Launch Plan - AI Features 2024\n\nLaunch Date: September 15, 2024\n\nProduct: AI-powered project insights and automation\n\nPre-Launch (8 weeks before):\n- Teaser campaign on social media\n- Beta program with 50 key customers\n- Press briefings with 5 industry analysts\n- Landing page with waitlist\n\nLaunch Week:\n- Keynote webinar with CEO and CPO\n- Product Hunt launch\n- Blog post: "Introducing AI-Powered Projects"\n- Email to full customer base\n- Social media blitz (20 posts across platforms)\n\nPost-Launch (4 weeks):\n- Customer testimonial videos\n- Technical deep-dive blog series\n- Paid campaign targeting AI-curious PMOs' },
      { name: 'competitive-analysis-2024.docx', content: 'Competitive Analysis 2024\n\nPrimary Competitors:\n\n1. CompetitorA (Series D, $120M raised)\n   Strengths: Strong enterprise sales, SOC 2 + HIPAA\n   Weaknesses: Dated UI, slow feature development\n   Our Advantage: Superior UX, faster innovation\n\n2. CompetitorB (Public, $800M market cap)\n   Strengths: Brand recognition, large customer base\n   Weaknesses: Complex pricing, poor support ratings\n   Our Advantage: Transparent pricing, 4.8 support rating\n\n3. CompetitorC (Series B, $40M raised)\n   Strengths: AI-first approach, modern tech stack\n   Weaknesses: Limited enterprise features, small team\n   Our Advantage: Enterprise readiness, compliance certs\n\nWin Rate vs Competitors: 62% overall (up from 55% in 2023)' },
    ],
  },
  {
    dir: 'Marketing/2025',
    files: [
      { name: 'annual-marketing-plan-2025.pdf', content: 'Annual Marketing Plan 2025\n\nBudget: $3.2M (up 28% from 2024)\n\nPriorities:\n1. Enterprise demand generation (40% of budget)\n2. Brand building and thought leadership (25%)\n3. Product-led growth optimization (20%)\n4. Community and events (15%)\n\nTarget Metrics:\n- MQLs: 12,000 (up from 8,500)\n- Pipeline influenced: $25M\n- Website traffic: 3M annual visits\n- Brand awareness: 35% aided recall (target market)\n\nNew Initiatives:\n- Acme Community platform launch\n- Annual customer conference ("AcmeConnect")\n- Podcast: "The Future of Work"\n- AI-powered content personalization' },
      { name: 'social-media-strategy-2025.txt', content: 'Social Media Strategy 2025\n\nPlatform Focus:\n- LinkedIn: Primary B2B channel (post 5x/week)\n- YouTube: Video content (2 videos/week)\n- Twitter/X: Thought leadership and engagement (daily)\n- TikTok: Employer branding (3x/week)\n\nContent Mix:\n- 40% Educational/thought leadership\n- 25% Product updates and tips\n- 20% Customer stories and social proof\n- 15% Culture and employer branding\n\nInfluencer Program:\n- Partner with 15 B2B influencers\n- Budget: $150K for sponsored content\n- Focus: Project management and AI productivity\n\nMetrics:\n- LinkedIn followers: 50K target (from 32K)\n- YouTube subscribers: 10K target (from 3K)\n- Engagement rate: >3% across platforms' },
    ],
  },

  // ─── Operations ────────────────────────────────────────────────
  {
    dir: 'Operations/2023',
    files: [
      { name: 'it-infrastructure-plan-2023.pdf', content: 'IT Infrastructure Plan 2023\n\nCurrent State:\n- 3 on-premise servers (aging, 5+ years)\n- AWS for production workloads\n- Office network: 1Gbps fiber\n\nPlanned Improvements:\n1. Migrate remaining on-prem servers to AWS\n2. Implement Zero Trust network architecture\n3. Deploy MDM solution for all company devices\n4. Upgrade office WiFi to WiFi 6E\n\nSecurity Enhancements:\n- SSO via Okta for all applications\n- Hardware security keys (YubiKey) for admin accounts\n- Endpoint Detection and Response (CrowdStrike)\n\nBudget: $420,000\nTimeline: Q1-Q3 2023' },
      { name: 'disaster-recovery-plan-2023.txt', content: 'Disaster Recovery Plan 2023\n\nRTO (Recovery Time Objective): 4 hours\nRPO (Recovery Point Objective): 1 hour\n\nBackup Strategy:\n- Database: Continuous replication to standby region\n- File storage: Daily incremental, weekly full backup\n- Configuration: Infrastructure as Code in Git\n\nFailover Procedures:\n1. Automated health checks every 30 seconds\n2. DNS failover to secondary region (Route53)\n3. Database promotion to standby replica\n4. Notification to on-call team via PagerDuty\n\nTesting Schedule:\n- Tabletop exercise: Quarterly\n- Partial failover test: Semi-annually\n- Full DR test: Annually (October)\n\nEscalation:\n- P1: On-call engineer → Engineering Manager → VP Eng → CTO\n- Communication: Status page updated within 15 minutes' },
      { name: 'office-operations-handbook-2023.docx', content: 'Office Operations Handbook 2023\n\nOffice Hours: 7 AM - 9 PM (building access)\nReception: 9 AM - 5 PM\n\nFacilities:\n- 3 floors, 45,000 sq ft total\n- Capacity: 300 employees\n- 12 conference rooms (bookable via Envoy)\n- 2 phone booths per floor\n- Kitchen on each floor (stocked weekly)\n\nServices:\n- Mail room: Packages held at reception\n- Printing: Follow-me printing on all floors\n- IT help desk: Floor 2, Room 201\n- Parking: Garage access with badge\n\nEmergency Procedures:\n- Fire: Evacuate via nearest stairwell, meet at parking lot B\n- Medical: Call 911, then notify reception\n- Security: Contact building security at ext. 5555' },
    ],
  },
  {
    dir: 'Operations/2024',
    files: [
      { name: 'vendor-management-review-2024.pdf', content: 'Vendor Management Review 2024\n\nTotal Active Vendors: 87\nAnnual Vendor Spend: $4.2M\n\nTop Vendors by Spend:\n1. AWS: $1.8M (infrastructure)\n2. Salesforce: $320K (CRM)\n3. Workday: $280K (HR/Finance)\n4. Snowflake: $180K (data warehouse)\n5. Slack: $95K (communication)\n\nVendor Performance:\n- 92% of vendors meeting SLA targets\n- 3 vendors flagged for performance issues\n- 5 vendor contracts renegotiated (avg 15% savings)\n\nConsolidation Opportunities:\n- Merge 3 overlapping analytics tools → Snowflake\n- Replace 2 legacy monitoring tools → Datadog\n- Estimated annual savings: $180,000' },
      { name: 'business-continuity-update-2024.txt', content: 'Business Continuity Plan Update 2024\n\nKey Changes from 2023:\n1. Added multi-region active-active setup (US-East + EU-West)\n2. RTO improved to 2 hours (was 4)\n3. RPO improved to 15 minutes (was 1 hour)\n\nNew Scenarios Covered:\n- Ransomware attack response\n- Key personnel loss\n- Supply chain disruption\n- Prolonged cloud provider outage\n\nCommunication Plan:\n- Internal: Slack → Email → Phone tree\n- Customers: Status page → Email → Account managers\n- Media: All inquiries to PR team only\n\nInsurance:\n- Cyber liability: $5M coverage\n- Business interruption: $2M coverage\n- D&O: $10M coverage' },
      { name: 'sustainability-report-2024.docx', content: 'Sustainability Report 2024\n\nCarbon Footprint:\n- Total emissions: 420 tCO2e (down 18% from 2023)\n- Scope 1: 15 tCO2e (office heating/cooling)\n- Scope 2: 85 tCO2e (electricity)\n- Scope 3: 320 tCO2e (cloud, travel, commuting)\n\nInitiatives:\n1. 100% renewable energy for office (Green-e certified)\n2. Carbon offsets for all business travel\n3. Cloud optimization reduced compute emissions 25%\n4. E-waste recycling program (98% diversion rate)\n\nGoals for 2025:\n- Achieve carbon neutral certification\n- Reduce Scope 3 by 20%\n- Implement sustainable procurement policy\n- Plant 1,000 trees through reforestation partner' },
    ],
  },
  {
    dir: 'Operations/2025',
    files: [
      { name: 'operational-excellence-plan-2025.pdf', content: 'Operational Excellence Plan 2025\n\nFocus Areas:\n\n1. Process Automation\n- Automate 50% of manual IT operations\n- Implement AI-powered ticket routing\n- Self-service portal for common requests\n\n2. Cost Optimization\n- Cloud spend optimization: target 20% reduction\n- License management: reclaim unused seats\n- Vendor consolidation: reduce vendor count by 15%\n\n3. Reliability\n- 99.99% uptime target (from 99.95%)\n- Chaos engineering program\n- Automated incident response playbooks\n\n4. Employee Productivity\n- Internal tool suite modernization\n- Reduce manual reporting by 80%\n- AI assistant for internal knowledge base\n\nBudget: $1.3M' },
      { name: 'global-expansion-ops-2025.txt', content: 'Global Expansion Operations Plan 2025\n\nNew Regions:\n- EU Office: Dublin, Ireland (Q2 opening)\n- APAC Presence: Singapore (Q3, remote team)\n\nInfrastructure:\n- EU data residency: AWS eu-west-1\n- APAC: AWS ap-southeast-1\n- Global CDN: Cloudflare Enterprise\n\nCompliance:\n- GDPR: EU DPO appointment\n- Singapore PDPA: Data protection registration\n- Local employment law: External counsel retained\n\nIT Setup:\n- Local network connectivity via SD-WAN\n- Okta SSO extended globally\n- Regional IT support (follow-the-sun model)\n\nTimeline:\n- Q1: Legal entity setup, hiring begins\n- Q2: Dublin office operational\n- Q3: Singapore team onboarded\n- Q4: Full operational maturity' },
    ],
  },

  // ─── Sales ─────────────────────────────────────────────────────
  {
    dir: 'Sales/2023',
    files: [
      { name: 'sales-playbook-2023.pdf', content: 'Sales Playbook 2023\n\nIdeal Customer Profile:\n- Company size: 100-5,000 employees\n- Industry: Technology, Financial Services, Healthcare\n- Pain points: Scattered tools, poor visibility, compliance needs\n\nSales Process:\n1. Discovery call (30 min) - Qualify BANT\n2. Product demo (45 min) - Tailored to use case\n3. Technical evaluation (2 weeks) - POC or trial\n4. Business case presentation - ROI calculator\n5. Negotiation and close\n\nPricing:\n- Starter: $12/user/month\n- Professional: $29/user/month\n- Enterprise: Custom (min $50K ACV)\n\nDiscount Authority:\n- Up to 10%: AE\n- 10-20%: Sales Manager\n- 20%+: VP Sales approval' },
      { name: 'territory-plan-2023.txt', content: 'Territory Plan 2023\n\nRegions:\n\n1. US Northeast\n   - AEs: 4\n   - Target accounts: 120\n   - Pipeline goal: $4.2M\n   - Key verticals: Financial services, healthcare\n\n2. US West\n   - AEs: 3\n   - Target accounts: 95\n   - Pipeline goal: $3.5M\n   - Key verticals: Technology, SaaS\n\n3. US Central/South\n   - AEs: 2\n   - Target accounts: 60\n   - Pipeline goal: $2.1M\n   - Key verticals: Manufacturing, energy\n\n4. EMEA\n   - AEs: 2\n   - Target accounts: 45\n   - Pipeline goal: $1.8M\n   - Key verticals: Technology, consulting\n\nTotal Pipeline Target: $11.6M' },
      { name: 'customer-success-framework-2023.docx', content: 'Customer Success Framework 2023\n\nOnboarding (0-90 days):\n- Kickoff call with CS Manager\n- Implementation plan with milestones\n- Admin training (2 sessions)\n- End-user training (self-paced + live)\n- Go-live support\n\nAdoption (90-180 days):\n- Weekly check-ins\n- Feature adoption tracking\n- Best practices workshops\n- Executive business review (90-day)\n\nExpansion (180+ days):\n- Quarterly business reviews\n- Upsell/cross-sell identification\n- Reference program enrollment\n- Annual renewal planning (90 days before)\n\nHealth Score:\n- Product usage: 40%\n- Support ticket sentiment: 20%\n- Engagement: 20%\n- Contract value trend: 20%' },
    ],
  },
  {
    dir: 'Sales/2024',
    files: [
      { name: 'annual-sales-report-2024.pdf', content: 'Annual Sales Report 2024\n\nResults:\n- Total Revenue: $32.4M (target: $32M) ✓\n- New Business: $14.2M\n- Expansion: $12.8M\n- Renewal: $5.4M\n\nWin/Loss Analysis:\n- Win rate: 28% (up from 24%)\n- Average deal size: $68K (up from $52K)\n- Sales cycle: 62 days (down from 68)\n\nTop Deals:\n1. MegaCorp Inc. - $420K ACV (3-year)\n2. FinanceHub - $310K ACV (2-year)\n3. HealthFirst - $280K ACV (3-year)\n\nChurn:\n- Gross churn: 8.2%\n- Net revenue retention: 118%\n- Top churn reasons: Budget cuts (35%), competitor (28%), low usage (22%)' },
      { name: 'partner-program-2024.txt', content: 'Partner Program 2024\n\nPartner Tiers:\n\n1. Referral Partner\n   - Commission: 15% of first year ACV\n   - Requirements: Signed partner agreement\n   - Benefits: Partner portal access, co-marketing materials\n\n2. Solution Partner\n   - Commission: 20% of first year ACV + 5% renewal\n   - Requirements: 2 certified consultants, 5 deals/year\n   - Benefits: Lead sharing, joint marketing fund ($10K)\n\n3. Strategic Partner\n   - Commission: 25% of first year ACV + 10% renewal\n   - Requirements: 5 certified consultants, $500K annual revenue\n   - Benefits: Dedicated partner manager, $50K marketing fund, roadmap input\n\nCurrent Partners: 28 (target: 50 by end 2024)\nPartner-Sourced Revenue: $2.8M (target: $5M)' },
    ],
  },
  {
    dir: 'Sales/2025',
    files: [
      { name: 'sales-strategy-2025.pdf', content: 'Sales Strategy 2025\n\nRevenue Target: $42M (30% growth)\n\nStrategic Pillars:\n\n1. Enterprise Upmarket Motion\n- Hire 5 enterprise AEs\n- Target: 20 deals >$200K ACV\n- Solution engineering team expansion\n- Custom implementation packages\n\n2. Product-Led Growth\n- Self-serve for teams <50 users\n- In-app upgrade prompts\n- Usage-based expansion triggers\n- Target: 40% of SMB revenue from self-serve\n\n3. International Expansion\n- EU sales team: 4 AEs in Dublin\n- APAC: 2 AEs in Singapore\n- Localized pricing for key markets\n\n4. Partner Ecosystem\n- Target: 75 active partners\n- Partner-sourced: 20% of pipeline\n- Technology partnerships: Slack, Teams, Jira integrations' },
      { name: 'enterprise-account-plan-2025.txt', content: 'Enterprise Account Plan 2025\n\nTarget Accounts:\n\n1. GlobalBank Corp (Financial Services)\n   - Employees: 45,000\n   - Opportunity: $1.2M ACV\n   - Champion: VP of PMO\n   - Stage: Technical Evaluation\n   - Next step: Security review meeting (Feb 15)\n\n2. HealthStar Networks (Healthcare)\n   - Employees: 12,000\n   - Opportunity: $580K ACV\n   - Champion: CTO\n   - Stage: Business Case\n   - Next step: CFO presentation (March 1)\n\n3. AutoDrive Systems (Manufacturing)\n   - Employees: 28,000\n   - Opportunity: $850K ACV\n   - Champion: Director of Engineering\n   - Stage: Discovery\n   - Next step: Stakeholder mapping workshop\n\nTotal Enterprise Pipeline: $8.5M' },
      { name: 'customer-retention-playbook-2025.docx', content: 'Customer Retention Playbook 2025\n\nEarly Warning System:\n- Health score < 60: Automated alert to CS Manager\n- No login for 14 days: Re-engagement email sequence\n- Support satisfaction < 3/5: Manager escalation\n- Usage decline > 30%: Proactive outreach\n\nSave Plays:\n\n1. Price Sensitivity\n   - Offer annual commitment discount (15%)\n   - Rightsizing to appropriate tier\n   - Show ROI with usage data\n\n2. Low Adoption\n   - Free training sessions (up to 5)\n   - Dedicated implementation support\n   - Executive sponsor pairing\n\n3. Competitive Threat\n   - Executive-to-executive engagement\n   - Custom feature roadmap briefing\n   - Flexible contract terms\n\nRetention Target: 95% gross, 120% net revenue retention' },
    ],
  },

  // ─── Product ───────────────────────────────────────────────────
  {
    dir: 'Product/2023',
    files: [
      { name: 'product-roadmap-2023.pdf', content: 'Product Roadmap 2023\n\nQ1: Foundation\n- Workspace redesign (new navigation)\n- Performance improvements (50% faster page loads)\n- Mobile app v2 launch\n\nQ2: Collaboration\n- Real-time collaborative editing\n- @mentions and notifications overhaul\n- Guest access for external collaborators\n\nQ3: Automation\n- Workflow automation builder\n- Custom field types (formula, lookup)\n- Recurring task templates\n\nQ4: Enterprise\n- SAML SSO\n- Audit log\n- Custom roles and permissions\n- API rate limit increase for enterprise plans\n\nSuccess Metrics:\n- NPS: 45 → 55\n- Feature adoption rate: 60%\n- Time-to-value: <7 days' },
      { name: 'user-research-findings-2023.txt', content: 'User Research Findings 2023\n\nStudy: 45 customer interviews, 1,200 survey responses\n\nTop Pain Points:\n1. "I can\'t find information across projects" (78%)\n2. "Status updates take too long to compile" (65%)\n3. "Onboarding new team members is painful" (58%)\n4. "Integrations with our tools are limited" (52%)\n\nMost Requested Features:\n1. Cross-project search and reporting\n2. AI-powered status summaries\n3. Better Jira/Slack integration\n4. Time tracking built-in\n5. Resource management / capacity planning\n\nUser Segments:\n- Power Users (15%): Use daily, 20+ projects, want advanced features\n- Regular Users (55%): Use 3-4x/week, 5-10 projects\n- Occasional Users (30%): Use weekly, 1-3 projects, need simplicity\n\nKey Insight: Users want AI to reduce manual reporting overhead.' },
      { name: 'design-system-spec-2023.docx', content: 'Design System Specification 2023\n\nDesign System: "AcmeUI"\n\nFoundation:\n- Grid: 8px base unit, 12-column layout\n- Breakpoints: Mobile (320px), Tablet (768px), Desktop (1024px), Wide (1440px)\n- Spacing scale: 4, 8, 12, 16, 24, 32, 48, 64px\n\nComponents:\n- Button: Primary, Secondary, Ghost, Danger variants\n- Input: Text, Select, Checkbox, Radio, Toggle\n- Card: Default, Elevated, Interactive\n- Modal: Small, Medium, Large, Full-screen\n- Table: Sortable, Filterable, Paginated\n- Toast: Success, Error, Warning, Info\n\nAccessibility:\n- WCAG 2.1 AA compliance\n- Minimum contrast ratio: 4.5:1\n- Focus indicators on all interactive elements\n- Screen reader support for all components\n\nImplementation: React component library with Storybook documentation.' },
    ],
  },
  {
    dir: 'Product/2024',
    files: [
      { name: 'ai-features-prd-2024.pdf', content: 'Product Requirements Document: AI Features 2024\n\nFeature: AI-Powered Project Insights\n\nProblem: Project managers spend 5+ hours/week on status reporting and risk identification.\n\nSolution: AI that automatically generates project summaries, identifies risks, and suggests actions.\n\nRequirements:\n1. Auto-generated weekly status summary\n   - Pull data from tasks, comments, and activity\n   - Highlight blockers and at-risk items\n   - Compare progress to milestones\n\n2. Risk Detection\n   - Identify tasks likely to miss deadlines\n   - Flag resource over-allocation\n   - Detect scope creep patterns\n\n3. Smart Suggestions\n   - Task assignment based on workload and skills\n   - Priority recommendations\n   - Similar past project comparisons\n\nSuccess Metrics:\n- 60% reduction in time spent on status reports\n- Risk identification 2 weeks earlier than manual\n- 40% feature adoption within 6 months' },
      { name: 'competitive-feature-matrix-2024.txt', content: 'Competitive Feature Matrix 2024\n\n                        Acme    CompA   CompB   CompC\nReal-time collab        ✓       ✓       ✓       ✗\nAI summaries            ✓       ✗       ✗       ✓\nCustom workflows        ✓       ✓       ✓       ✓\nTime tracking           ✓       ✓       ✗       ✗\nResource management     ✓       ✓       ✓       ✗\nSAML SSO                ✓       ✓       ✓       ✗\nAudit log               ✓       ✓       ✓       ✗\nAPI access              ✓       ✓       ✓       ✓\nMobile app              ✓       ✓       ✓       ✓\nOn-premise option       ✗       ✓       ✗       ✗\nFree tier               ✓       ✗       ✓       ✓\nGantt charts            ✓       ✓       ✓       ✗\nKanban boards           ✓       ✓       ✓       ✓\n\nOur Differentiators:\n- Only platform with AI summaries + enterprise security\n- Best-in-class API and webhooks\n- Fastest onboarding (avg 3 days vs industry 14 days)' },
    ],
  },
  {
    dir: 'Product/2025',
    files: [
      { name: 'product-vision-2025.pdf', content: 'Product Vision 2025\n\nMission: Make every team\'s work visible, connected, and effortless.\n\nVision: An AI-native work platform that anticipates needs and automates busywork.\n\nStrategic Themes:\n\n1. AI-Native Experience\n- Natural language task creation\n- Predictive project planning\n- Automated progress tracking\n- AI meeting notes → action items\n\n2. Connected Work Graph\n- Cross-project dependencies\n- Organization-wide search\n- Knowledge graph of decisions and context\n- Auto-linking related items\n\n3. Platform Ecosystem\n- Marketplace for integrations\n- Developer SDK and CLI\n- Custom app builder (no-code)\n- Embedded analytics\n\n4. Enterprise Scale\n- Multi-entity support\n- Advanced compliance controls\n- Custom data residency\n- White-label option for partners\n\nNorth Star Metric: Weekly Active Teams (target: 50K)' },
      { name: 'analytics-dashboard-spec-2025.txt', content: 'Analytics Dashboard Specification 2025\n\nOverview: Self-service analytics for project and portfolio insights.\n\nDashboard Types:\n\n1. Project Dashboard\n- Task completion rate and trend\n- Burndown/burnup charts\n- Team velocity\n- Blocker analysis\n- Time spent by category\n\n2. Portfolio Dashboard\n- Project health overview (RAG status)\n- Resource utilization across projects\n- Budget vs actual spend\n- Milestone timeline\n- Risk heat map\n\n3. Team Dashboard\n- Individual workload distribution\n- Sprint velocity comparison\n- Focus time vs meeting time\n- Skill utilization map\n\nTechnical Requirements:\n- Real-time data (max 5-min delay)\n- Exportable to PDF and CSV\n- Shareable via link (with permissions)\n- Embeddable in external tools via iframe\n- Mobile-responsive charts' },
      { name: 'accessibility-roadmap-2025.docx', content: 'Accessibility Roadmap 2025\n\nCurrent State: WCAG 2.1 AA (85% compliant)\nTarget: WCAG 2.2 AA (100% compliant by Q4)\n\nQ1: Audit and Foundation\n- Full accessibility audit by external firm\n- Fix all critical and high issues\n- Establish automated accessibility testing in CI\n\nQ2: Component Updates\n- Update all form components for better screen reader support\n- Improve keyboard navigation across all views\n- Add skip links and landmark regions\n\nQ3: Advanced Features\n- Screen reader optimization for Kanban boards\n- Accessible drag-and-drop alternative\n- High contrast theme\n- Reduced motion mode\n\nQ4: Compliance and Certification\n- VPAT (Voluntary Product Accessibility Template) publication\n- Third-party verification\n- Accessibility statement on website\n\nOngoing:\n- Accessibility champion in each product team\n- All new features must pass accessibility review\n- User testing with assistive technology users quarterly' },
    ],
  },
];

// ── Main ───────────────────────────────────────────────────────────
async function seed() {
  // Clean existing documents
  if (fs.existsSync(BASE)) {
    fs.rmSync(BASE, { recursive: true });
  }

  let created = 0;

  for (const { dir, files } of docs) {
    const dirPath = path.join(BASE, dir);
    fs.mkdirSync(dirPath, { recursive: true });

    for (const file of files) {
      const filePath = path.join(dirPath, file.name);
      const ext = path.extname(file.name).toLowerCase();
      const title = file.name.replace(/\.[^.]+$/, '').replace(/[-_]/g, ' ');

      if (ext === '.xlsx' || ext === '.xls') {
        if (file.sheets) {
          createXlsx(filePath, file.sheets);
        }
      } else if (ext === '.pdf') {
        await createPdf(filePath, title, file.content);
      } else if (ext === '.docx') {
        await createDocx(filePath, title, file.content);
      } else {
        createTxt(filePath, file.content);
      }

      created++;
      console.log(`[${created}] ${dir}/${file.name}`);
    }
  }

  console.log(`\nDone! ${created} documents created in ./documents/`);
}

seed().catch((err) => {
  console.error('Seed failed:', err);
  process.exit(1);
});
