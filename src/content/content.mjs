// Hand-authored copy. Catalog data (products, prices, courses) comes from
// ./data (the catalog source of truth); this file holds marketing copy, keyword
// targeting and evergreen guide content.

export const LMS = ['Moodle', 'Canvas', 'Cornerstone', 'TalentLMS', 'Absorb LMS', 'Blackboard', 'Docebo', 'SAP SuccessFactors', 'Workday Learning', 'LearnUpon', 'iSpring Learn', 'SCORM Cloud'];

export const home = {
  seoTitle: 'OSHA SCORM Courses | SCORM-Compliant Safety Training for LMS',
  seoDescription:
    '{{TOTAL}} OSHA-compliant SCORM 1.2 & 2004 safety courses for your LMS: HAZWOPER, NFPA 70E, DOT hazmat, RCRA & more. IACET accredited, white-label, 24h delivery.',
  eyebrow: 'SCORM 1.2 & 2004 · LMS-ready · IACET accredited',
  h1: 'OSHA-compliant <em>SCORM safety training</em> courses for your LMS',
  lead:
    'Empower your workforce with ready-to-deploy SCORM packages for HAZWOPER, NFPA 70E, DOT Hazmat, RCRA, EM 385-1-1 and {{TOTAL}} more topics. Upload the ZIP to any SCORM-compliant LMS, assign learners, and track completion — no course building required.',
  proof: ['Delivered within 24 hours', 'White-label options', 'English & Spanish', '30-day money-back guarantee'],
  audiences: [
    {
      title: 'Training providers & course resellers',
      text: 'You run a training business or LMS and want ready-to-sell compliance courses without building content from scratch. Expand your catalog instantly and deliver OSHA, DOT and EPA training under your own brand or licensing model.',
      icon: 'store',
    },
    {
      title: 'Corporate L&D, HR & EHS teams',
      text: 'You manage employee training and compliance internally. Our SCORM courses integrate directly into your LMS so you can assign training, track completion, and keep your workforce compliant with OSHA and other regulatory requirements.',
      icon: 'users',
    },
    {
      title: 'LMS owners & platform operators',
      text: 'You operate an LMS and need plug-and-play content. Our SCORM packages work with all major platforms: upload, assign, and start tracking learner progress immediately.',
      icon: 'layers',
    },
  ],
  steps: [
    { title: 'Select courses', text: 'Choose from our compliance library with transparent per-seat pricing.' },
    { title: 'Set seat count & order', text: 'Pick learner seats — licensed per user, per year — and check out securely.' },
    { title: 'Receive your SCORM ZIP', text: 'Your SCORM 1.2 or SCORM 2004 package is emailed within 24 hours of purchase.' },
    { title: 'Upload to your LMS', text: 'Import the ZIP into your LMS. No technical setup or customization required.' },
    { title: 'Assign & track', text: 'Assign the course to learners and track progress, scores and completions.' },
  ],
  pillars: [
    {
      title: 'Ready to deploy',
      text: 'One of the largest libraries of SCORM-compliant safety training — HAZWOPER, RCRA, OSHA, DOT, HAZMAT, MSHA, NFPA 70E and more — prepackaged for upload into any learning management system.',
      icon: 'rocket',
    },
    {
      title: 'Fully white-labeled',
      text: 'Brand trainings as your own while staying OSHA-aligned. Courses include quizzes, tracking and completion certificates to support audits and employee records. Custom-branded packages ship within 7 business days.',
      icon: 'badge',
    },
    {
      title: 'SCORM 1.2 & 2004 compatible',
      text: 'Whether you use Moodle, TalentLMS, Cornerstone, Blackboard or any SCORM-based LMS, you get enterprise licensing, seamless SCORM 1.2 and 2004 integration, ongoing updates and bulk licensing support.',
      icon: 'plug',
    },
  ],
  guarantee: [
    { title: 'Guaranteed delivery', text: 'On-time delivery within 24 hours after successful payment. If we miss the deadline, your order is free.' },
    { title: 'Guaranteed value', text: 'Find a lower price elsewhere within 30 days of purchase and we’ll refund the difference — and then some.' },
    { title: 'Guaranteed happiness', text: 'Not 100% satisfied? We’ll make it right or refund your money — your choice.' },
  ],
  testimonials: [
    { name: 'Kelvin Sidaway', role: 'Managing Director', text: 'Industrial Certified Training’s vast library of 1500+ SCORM-compliant courses is a game-changer for safety and compliance. Their user-friendly platform and proactive customer support make managing our training programs a breeze. We’ve seen significant improvements in employee knowledge and confidence since implementing their OSHA, DOT, EPA, and HAZMAT courses.' },
    { name: 'Tamara Parris', role: 'International HSE/Risk Leader', text: 'Industrial Certified Training’s pre-built SCORM courses have revolutionized our training efficiency. Their QHSSE content is engaging and informative, leading to improved employee performance. We appreciate their dedicated customer support team who has been a valuable resource.' },
    { name: 'Daryl Kellenberger', role: 'Global Vice President', text: 'Industrial Certified Training has exceeded our expectations in providing top-notch HSSE and HSSEQ training. Their SCORM-compatible courses are easy to implement and have made a measurable impact on our safety performance. The customer support team is knowledgeable and always goes the extra mile.' },
    { name: 'Craig Paton', role: 'Corporate Safety Director', text: 'Industrial Certified Training has been instrumental in enhancing our safety culture. Their comprehensive range of SCORM-based OHS, HSE, EHS, and SHE courses ensures our workforce is fully prepared. The platform’s easy integration and exceptional customer support have streamlined our training process.' },
    { name: 'Heather Beach', role: 'Director HSE Compliance', text: 'As a partner in safety, Industrial Certified Training has been invaluable. Their extensive library of SCORM-based courses, including OSHA, DOT, EPA, and HAZMAT, ensures our compliance and protects our workforce. Their proactive customer support fosters a strong partnership.' },
    { name: 'Steven Harris', role: 'Division Manager', text: 'Industrial Certified Training offers a comprehensive solution for our training needs. Their 1500+ SCORM courses cover OSHA, DOT, EPA, HAZMAT, and other essential topics. The platform’s ease of use and exceptional customer support make it a top choice for organizations seeking efficient and effective training.' },
  ],
  // Extra FAQs targeting high-intent questions (added to the synced ones).
  faqs: [
    {
      q: 'What is the difference between SCORM 1.2 and SCORM 2004?',
      a: '<p>SCORM 1.2 is the most widely supported version and tracks a single lesson status (passed, failed, completed, incomplete), score and up to 4,096 characters of bookmark data. SCORM 2004 (we deliver 4th Edition) separates completion status from success status, stores up to 64,000 characters of suspend data, and adds sequencing and navigation rules. Choose SCORM 2004 if your LMS supports it; choose SCORM 1.2 for maximum compatibility. <a href="/pages/what-is-scorm#scorm-1-2-vs-2004">Read the full comparison</a>.</p>',
    },
    {
      q: 'How does seat-based pricing work?',
      a: '<p>Each course has one price per learner seat for a 12-month (365-day) license. Your total is simply that price × the number of seats you need (minimum 10). Every course page shows the per-seat price and totals for common seat counts. Need an enterprise library license or purchase-order billing? <a href="/pages/contact">Contact us</a>.</p>',
    },
    {
      q: 'Are the courses OSHA-compliant and accredited?',
      a: '<p>Courses are developed to align with the OSHA, EPA, DOT, NFPA and USACE standards cited on each course page, and our training is IACET accredited. Each course includes knowledge checks, a final exam and a certificate of completion to support recordkeeping and audits. Note: OSHASCORM.org is a private company and is not affiliated with OSHA or the U.S. Department of Labor.</p>',
    },
    {
      q: 'Can I white-label or rebrand the SCORM courses?',
      a: '<p>Yes. White-labeling options let you brand the training as your own. Standard packages ship within 24 hours; custom-branded SCORM packages take up to 7 business days after you place your order.</p>',
    },
    {
      q: 'What if I need fewer than 10 seats?',
      a: '<p>Our SCORM licenses start at 10 seats. For individual learners or small teams, most courses are also available for direct online enrollment through our partner, <a href="https://hazwoper-osha.com/">HAZWOPER OSHA Training</a> — look for the “fewer than 10 seats” link on each course page.</p>',
    },
  ],
};

// Per-collection copy. Collections without an entry fall back to the
// collection description in data/collections.json plus data-driven copy.
export const collectionCopy = {
  'hazwoper-training-29-cfr-1910-120': {
    h1: 'HAZWOPER Training SCORM Courses (OSHA 29 CFR 1910.120)',
    kw: 'HAZWOPER training',
    cite: ['29 CFR 1910.120(e)', '29 CFR 1910.120(p)', '29 CFR 1910.120(q)', '29 CFR 1926.65'],
  },
  'rcra-hazardous-waste-management': {
    h1: 'RCRA Hazardous Waste Management Training — SCORM Courses',
    kw: 'RCRA training',
    cite: ['40 CFR 262.17(a)(7)', '40 CFR 265.16', '40 CFR Parts 260–273'],
  },
  'nfpa-70e-electrical-arc-flash-safety': {
    h1: 'NFPA 70E & Arc Flash Training — SCORM Courses for Your LMS',
    kw: 'NFPA 70E training',
    cite: ['NFPA 70E (2024 edition)', '29 CFR 1910.332', '29 CFR 1910.269'],
  },
  'osha-construction-safety-training-series': {
    h1: 'OSHA Construction Safety Training — SCORM Course Series',
    kw: 'OSHA construction safety training',
    cite: ['29 CFR 1926'],
  },
  'ammonia-refrigeration-training': {
    h1: 'Ammonia Refrigeration Training — SCORM Courses',
    kw: 'ammonia refrigeration training',
    cite: ['29 CFR 1910.119 (PSM)', '40 CFR Part 68 (RMP)', 'IIAR standards'],
  },
  'hazmat-training-dot-iata-imdg-transportation': {
    h1: 'DOT Hazmat Training (49 CFR, IATA, IMDG) — SCORM Courses',
    kw: 'DOT hazmat training',
    cite: ['49 CFR 172.704', 'IATA Dangerous Goods Regulations', 'IMDG Code'],
  },
  'confined-space-trainings': {
    h1: 'Confined Space Training — SCORM Courses (29 CFR 1910.146)',
    kw: 'confined space training',
    cite: ['29 CFR 1910.146', '29 CFR 1926 Subpart AA'],
    intro: 'Confined spaces — tanks, vaults, pits, silos, manholes and pipelines — are not designed for continuous occupancy and can hide toxic or oxygen-deficient atmospheres, engulfment and entrapment hazards. These SCORM courses train entrants, attendants and entry supervisors on permit-required confined space programs, atmospheric testing, isolation and rescue planning under OSHA 29 CFR 1910.146 and the construction standard, 29 CFR 1926 Subpart AA.',
    audience: ['Authorized entrants', 'Attendants and hole watches', 'Entry supervisors', 'Rescue and emergency services teams', 'Maintenance, utility and plant personnel'],
  },
  'em385-trainings': {
    h1: 'EM 385-1-1 Training — USACE Safety Manual SCORM Courses',
    kw: 'EM 385-1-1 training',
    cite: ['USACE EM 385-1-1'],
    intro: 'The U.S. Army Corps of Engineers Safety and Health Requirements Manual, EM 385-1-1, governs safety on USACE and many other federal construction projects. These SCORM courses prepare Site Safety and Health Officers (SSHOs), superintendents, quality control managers and crews to meet EM 385-1-1 requirements, from accident prevention plans and activity hazard analyses to fall protection, excavation and equipment safety.',
    audience: ['Site Safety and Health Officers (SSHOs)', 'Federal and military construction contractors', 'Superintendents and QC managers', 'Subcontractor crews on USACE projects'],
  },
  'cdl-entry-level-driver-training-eldt': {
    h1: 'CDL Entry-Level Driver Training (ELDT) Theory — SCORM Courses',
    kw: 'ELDT theory training',
    cite: ['49 CFR Part 380, Subpart F'],
    intro: 'Since February 7, 2022, FMCSA requires Entry-Level Driver Training before a first-time Class A or Class B CDL, a CDL upgrade, or a passenger (P), school bus (S) or hazardous materials (H) endorsement. These SCORM courses deliver the ELDT theory curriculum defined in 49 CFR Part 380, Subpart F so training providers and fleets listed on the FMCSA Training Provider Registry can deliver it in their own LMS.',
    audience: ['CDL schools and training providers', 'Motor carriers and fleets', 'Driver onboarding programs', 'Community colleges and workforce boards'],
  },
  'competent-person-training': {
    h1: 'OSHA Competent Person Training — SCORM Courses',
    kw: 'competent person training',
    cite: ['29 CFR 1926.32(f)', '29 CFR 1926 Subpart P', '29 CFR 1926.451'],
    intro: 'OSHA defines a competent person (29 CFR 1926.32(f)) as someone capable of identifying existing and predictable hazards who has authority to take prompt corrective measures. Many construction standards — excavations, scaffolds, fall protection, cranes and more — require one on site. These SCORM courses build the knowledge supervisors and leads need to fill that role.',
    audience: ['Foremen and site supervisors', 'Excavation and trenching leads', 'Scaffold and fall protection supervisors', 'Safety coordinators'],
  },
  'ergonomics-training': {
    h1: 'Workplace Ergonomics Training — SCORM Courses',
    kw: 'ergonomics training',
    cite: ['OSH Act General Duty Clause, Section 5(a)(1)'],
    intro: 'Musculoskeletal disorders from lifting, repetitive motion and awkward postures are among the most common workplace injuries. OSHA addresses ergonomic hazards under the General Duty Clause. These SCORM courses teach workers and supervisors to recognize ergonomic risk factors and apply practical controls in offices, warehouses and production environments.',
    audience: ['Office and remote employees', 'Warehouse and manufacturing workers', 'Supervisors and EHS coordinators'],
  },
  'hazard-communication-hazcom-ghs': {
    h1: 'Hazard Communication (HazCom) & GHS Training — SCORM Course',
    kw: 'HazCom training',
    cite: ['29 CFR 1910.1200', 'GHS'],
    intro: 'OSHA’s Hazard Communication Standard (29 CFR 1910.1200) requires employers to train workers on the hazardous chemicals in their work area, labels, Safety Data Sheets and protective measures, using the Globally Harmonized System (GHS) of classification and labeling. This SCORM course covers those requirements for your LMS.',
    audience: ['Any employee exposed to hazardous chemicals', 'Supervisors and HazCom program owners', 'New-hire orientation programs'],
  },
  'healthcare-industry-training': {
    h1: 'Healthcare Safety & OSHA Compliance Training — SCORM Courses',
    kw: 'healthcare safety training',
    cite: ['29 CFR 1910.1030 (Bloodborne Pathogens)'],
  },
  'hydrogen-sulfide-h2s-training': {
    h1: 'Hydrogen Sulfide (H2S) Safety Training — SCORM Courses',
    kw: 'H2S training',
    cite: ['29 CFR 1910.1000', 'ANSI/ASSP Z390.1'],
    intro: 'Hydrogen sulfide is a toxic, flammable gas found in oil and gas production, wastewater, pulp and paper, and agriculture. These SCORM courses cover H2S properties and health effects, gas detection and monitoring, respiratory protection, and emergency response and rescue procedures.',
    audience: ['Oil and gas field workers', 'Wastewater and utility operators', 'Refinery and plant personnel', 'Emergency responders'],
  },
  'lithium-battery-shipping-training': {
    h1: 'Lithium Battery Shipping Training (DOT & IATA) — SCORM Courses',
    kw: 'lithium battery shipping training',
    cite: ['49 CFR 173.185', 'IATA DGR Packing Instructions 965–970'],
    intro: 'Lithium ion and lithium metal batteries (UN3480, UN3481, UN3090, UN3091) are regulated dangerous goods. Anyone who prepares them for transport must be trained under 49 CFR and, for air shipments, the IATA Dangerous Goods Regulations. These SCORM courses cover classification, packaging, marking, labeling and documentation.',
    audience: ['Shippers and warehouse staff', 'E-commerce and logistics teams', 'Manufacturers and repair centers'],
  },
  'mold-inspection-remediation-certification': {
    h1: 'Mold Inspection & Remediation Training — SCORM Courses',
    kw: 'mold remediation certification',
    cite: ['EPA mold remediation guidance', 'IICRC S520'],
    intro: 'These SCORM courses train inspectors, remediation contractors and facility staff to identify mold growth and moisture sources, plan sampling and assessment, and carry out safe containment and remediation with the right PPE.',
    audience: ['Mold inspectors and assessors', 'Remediation contractors', 'Facility and property managers', 'Restoration technicians'],
  },
  'osha-10-30-hour-outreach-training': {
    h1: 'OSHA 10 & 30 Hour Safety Training — SCORM Courses',
    kw: 'OSHA 10 and 30 hour training',
    cite: ['29 CFR 1910', '29 CFR 1926'],
    intro: '10-hour and 30-hour safety awareness courses covering the core OSHA construction and general industry topics: hazard recognition, worker rights, fall protection, electrical safety, PPE and more — packaged as SCORM for delivery in your LMS.',
    audience: ['Entry-level workers', 'Supervisors and safety leads', 'Employers building a baseline safety curriculum'],
  },
  'osha-general-safety-training-series': {
    h1: 'OSHA General Industry Safety Training — SCORM Course Series',
    kw: 'OSHA general industry training',
    cite: ['29 CFR 1910'],
    intro: 'A library of OSHA general industry courses aligned with 29 CFR 1910 — from lockout/tagout, machine guarding and walking-working surfaces to PPE, fire safety and powered industrial trucks — delivered as SCORM-ready packages for your LMS.',
    audience: ['Manufacturing and warehouse employees', 'Maintenance and facilities teams', 'Supervisors and EHS managers'],
  },
  'osha-safety-training-in-spanish': {
    h1: 'OSHA Safety Training in Spanish — SCORM Courses (Capacitación en Español)',
    kw: 'OSHA training in Spanish',
    cite: [],
    intro: 'Most of our SCORM safety courses are available in both English and Spanish, so bilingual workforces can train in the language they understand best. Every course below is available in Español — select it at checkout or ask us for the Spanish SCORM package.',
    audience: ['Spanish-speaking crews and workers', 'Bilingual construction and industrial teams', 'Employers with multilingual training requirements'],
    spanish: true,
  },
  'radiation-series': {
    h1: 'Radiation Safety Training — SCORM Courses',
    kw: 'radiation safety training',
    cite: ['29 CFR 1910.1096'],
  },
  'stormwater-planning-for-construction': {
    h1: 'Stormwater (SWPPP) Training for Construction — SCORM Courses',
    kw: 'SWPPP training',
    cite: ['EPA NPDES Construction General Permit'],
    intro: 'Construction sites that disturb one acre or more generally need NPDES permit coverage and a Stormwater Pollution Prevention Plan (SWPPP). These SCORM courses cover SWPPP development and implementation, erosion and sediment control BMPs, inspections and recordkeeping — including Qualified SWPPP Developer (QSD) and Practitioner (QSP) roles.',
    audience: ['SWPPP developers and practitioners', 'Site superintendents', 'Civil and environmental consultants', 'Construction inspectors'],
  },
  'epa-regulated-trainings': { h1: 'EPA Regulated Training — SCORM Courses', kw: 'EPA training', cite: [] },
  'best-selling-courses': {
    h1: 'Best-Selling SCORM Safety Training Courses',
    kw: 'best SCORM safety courses',
    cite: [],
    intro: 'The SCORM safety courses organizations buy most — HAZWOPER, NFPA 70E arc flash, DOT hazmat, SWPPP and EM 385-1-1 — ready to upload to your LMS and assign today.',
  },
};

// Evergreen guide targeting "what is scorm", "scorm file", "scorm package",
// "scorm 1.2 vs 2004", "xapi vs scorm", "scorm compliant lms".
export const scormGuide = {
  handle: 'what-is-scorm',
  seoTitle: 'What Is SCORM? Files, Packages & SCORM 1.2 vs 2004 Explained',
  seoDescription:
    'What a SCORM file and package are, SCORM 1.2 vs SCORM 2004, xAPI and cmi5, what “SCORM-compliant” means, and how to upload a SCORM package to your LMS.',
  h1: 'What is SCORM? A practical guide for training teams',
  lead: 'SCORM is the standard that lets one online course run, and report results, in almost any learning management system. Here’s what it is, how SCORM packages work, and which version to choose.',
  published: '2026-11-06',
  sections: [
    {
      id: 'what-is-scorm',
      h2: 'What is SCORM?',
      html: `<p><strong>SCORM (Sharable Content Object Reference Model)</strong> is a set of technical standards for eLearning, published by the Advanced Distributed Learning (ADL) Initiative of the U.S. Department of Defense. It defines how online training content is packaged and how it communicates with a <strong>learning management system (LMS)</strong>.</p>
<p>Because SCORM is the de facto interoperability standard, a course built to the specification can be uploaded to Moodle, Cornerstone, TalentLMS, Canvas, Absorb, Docebo and hundreds of other platforms — and it will report completion, scores and time spent the same way in each one. SCORM is purely technical: it says nothing about instructional design or content quality.</p>`,
    },
    {
      id: 'scorm-file',
      h2: 'What is a SCORM file (SCORM package)?',
      html: `<p>A <strong>SCORM package</strong> is a single <code>.zip</code> file. At its root is an XML file called <code>imsmanifest.xml</code> that describes the course structure, its launchable units (called SCOs, or Sharable Content Objects) and every file the course needs. The rest of the ZIP holds the HTML, JavaScript, video, images and quiz logic.</p>
<ul>
<li><strong>Packaging:</strong> the manifest tells the LMS what to import and which page to launch.</li>
<li><strong>Run-time communication:</strong> when a learner opens the course, its JavaScript finds the LMS’s SCORM API and reports progress — status, score, bookmark location and interactions.</li>
<li><strong>Sequencing (SCORM 2004 only):</strong> rules that control the order in which learners move through multiple SCOs.</li>
</ul>
<p>Every OSHASCORM.org course is delivered this way: you receive a SCORM 1.2 or SCORM 2004 ZIP and upload it as-is — do not unzip it first.</p>`,
    },
    {
      id: 'scorm-1-2-vs-2004',
      h2: 'SCORM 1.2 vs SCORM 2004: which should you use?',
      html: `<p>Both versions are widely used. SCORM 1.2 (2001) is the most broadly supported; SCORM 2004 (latest: 4th Edition, 2009) adds richer tracking and sequencing.</p>
<div class="table-scroll"><table>
<thead><tr><th scope="col">Feature</th><th scope="col">SCORM 1.2</th><th scope="col">SCORM 2004 (4th Ed.)</th></tr></thead>
<tbody>
<tr><td>LMS support</td><td>Near-universal</td><td>Most modern LMSs</td></tr>
<tr><td>Status tracking</td><td>One field: <code>cmi.core.lesson_status</code> (passed, failed, completed, incomplete…)</td><td>Separate completion (<code>cmi.completion_status</code>) and success (<code>cmi.success_status</code>)</td></tr>
<tr><td>Bookmark / suspend data</td><td>4,096 characters</td><td>64,000 characters</td></tr>
<tr><td>Sequencing &amp; navigation rules</td><td>No</td><td>Yes</td></tr>
<tr><td>Interaction (quiz answer) detail</td><td>Basic</td><td>Richer, with descriptions and learner responses</td></tr>
</tbody></table></div>
<p><strong>Rule of thumb:</strong> choose SCORM 2004 if your LMS supports it, because it reports completion and pass/fail independently. Choose SCORM 1.2 for older or lightweight platforms. Not sure? Download our free sample SCORM 1.2 package from any course page and test it in your LMS first.</p>`,
    },
    {
      id: 'xapi-vs-scorm',
      h2: 'xAPI vs SCORM (and where cmi5 fits)',
      html: `<p><strong>xAPI</strong> (Experience API, also called Tin Can, released by ADL in 2013) records learning as simple “actor–verb–object” statements sent to a Learning Record Store (LRS). It can track learning outside a browser or LMS — simulations, mobile apps, on-the-job tasks.</p>
<p><strong>SCORM</strong> runs inside a browser session launched by an LMS and tracks a defined set of data. For assigning and tracking compliance courses inside an LMS, SCORM remains the most compatible choice.</p>
<p><strong>cmi5</strong> is a profile of xAPI that adds LMS launch and packaging rules — effectively “xAPI with SCORM-style structure.” It is growing, but SCORM support is still far more universal across LMS platforms.</p>`,
    },
    {
      id: 'scorm-compliant',
      h2: 'What does “SCORM-compliant” mean?',
      html: `<p>A <strong>SCORM-compliant course</strong> is packaged and communicates exactly as the specification requires, so any conformant LMS can import, launch and track it. A <strong>SCORM-compliant LMS</strong> can import SCORM packages, provide the run-time API, and store the data courses send (status, score, time, bookmarks).</p>
<p>Most LMS platforms support SCORM 1.2, and most also support SCORM 2004. Before you buy, check which versions your LMS supports — or test our free sample package. Tools such as SCORM Cloud can also be used to verify how a package behaves.</p>`,
    },
    {
      id: 'upload-scorm-to-lms',
      h2: 'How to upload a SCORM package to your LMS',
      html: `<ol>
<li><strong>Download</strong> the SCORM ZIP we email after purchase. Keep it zipped.</li>
<li>In your LMS, <strong>create a new course or activity</strong> and choose the SCORM / “eLearning package” content type.</li>
<li><strong>Upload the ZIP.</strong> The LMS reads <code>imsmanifest.xml</code> and imports the course.</li>
<li><strong>Set completion rules</strong> — for example, require a passing score on the final exam.</li>
<li><strong>Enroll or assign learners</strong>, then track progress, scores and certificates in your LMS reports.</li>
</ol>
<p>Need help? Our support team assists with installation at no charge for one year from purchase — call 1-866-429-6742 or email info@oshascorm.org.</p>`,
    },
  ],
  faqs: [
    { q: 'What does SCORM stand for?', a: '<p>SCORM stands for Sharable Content Object Reference Model — a set of eLearning standards published by the Advanced Distributed Learning (ADL) Initiative.</p>' },
    { q: 'Is a SCORM file just a ZIP file?', a: '<p>Yes. A SCORM package is a ZIP file containing an <code>imsmanifest.xml</code> manifest at its root plus the course’s HTML, JavaScript and media. Upload the ZIP to your LMS without extracting it.</p>' },
    { q: 'Is SCORM 2004 better than SCORM 1.2?', a: '<p>SCORM 2004 tracks more data and separates completion from pass/fail, but SCORM 1.2 is supported by more platforms. Use SCORM 2004 if your LMS supports it, otherwise SCORM 1.2.</p>' },
    { q: 'Will SCORM courses work on mobile devices?', a: '<p>Yes. Our SCORM courses are HTML5-based and run in modern desktop and mobile browsers through any LMS that supports mobile delivery.</p>' },
  ],
};
