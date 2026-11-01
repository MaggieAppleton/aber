export const NOVEL_EVIDENCE_VERSION = 'novel-evidence-v1';
export const novelEvidenceProvenance = 'Three additional synthetic, independent evidence observations authored on 1 November 2026. They preserve the original 28 fixtures and labels, avoid seeded events, and test unambiguous new evidence. No personal material or observed real-world facts are claimed.';

export const novelEvidenceFixtures = [
  {
    id: 'e4-novel', version: NOVEL_EVIDENCE_VERSION, theoryId: 't3', stance: 'undermines',
    gist: "Cedar Assistant's 12 October 2026 production audit followed 2,000 active accounts for 120 days: every account's agent memory was forcibly reset after 30 days. After each reset, assistants cannot recall any saved project decision from the previous month. A separate retention test confirmed that no project context survived into a second month.",
  },
  {
    id: 'e7-novel', version: NOVEL_EVIDENCE_VERSION, theoryId: 't5', stance: 'supports',
    gist: "A September 2026 census of 12,000 newly built software tools across 400 organisations found that 74% were commissioned and used by exactly one named person, up from 18% in 2024. Repository ownership and usage logs confirmed each tool was personal software tailored to that one person's tasks rather than a shared general-purpose product.",
  },
  {
    id: 'e8-novel', version: NOVEL_EVIDENCE_VERSION, theoryId: 't5', stance: 'undermines',
    gist: 'An October 2026 repeat census of 20,000 newly built software products found that the share of bespoke personal software made for one user fell from 38% in 2024 to 6%; 94% were shared general-purpose products serving many users. Teams replaced failed audience-of-one projects with shared standard applications. The decline persisted when the same product-counting method was used in both years.',
  },
] as const;
