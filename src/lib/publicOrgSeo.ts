import { Organization } from "../types";

export interface OrgFaqItem {
  question: string;
  answer: string;
}

const ORG_PROFILE_FALLBACK_KEYS: Array<keyof Organization> = [
  "alternate_name",
  "contact_email",
  "contact_phone",
  "service_area",
  "key_activities",
  "target_beneficiaries",
  "membership_info",
  "registration_authority",
  "seo_keywords",
  "ai_summary",
  "faq_items",
  "country",
  "province",
  "district",
  "sector",
  "founded_date",
  "founders",
  "registration_number",
  "website",
  "facebook_url",
  "twitter_url",
  "linkedin_url",
  "employee_count",
];

/**
 * Hydrate organization fields from localStorage fallbacks in case the database
 * migration (update.sql) has not been executed yet and columns were pruned.
 */
export function hydrateOrgProfileFallbacks(org: Organization): Organization {
  if (!org || !org.id || typeof window === "undefined") return org;
  const enriched: Record<string, any> = { ...org };

  for (const key of ORG_PROFILE_FALLBACK_KEYS) {
    const current = enriched[key];
    const isEmpty =
      current === undefined ||
      current === null ||
      current === "" ||
      (Array.isArray(current) && current.length === 0);

    if (isEmpty) {
      try {
        const raw = localStorage.getItem(`impacto_org_${String(key)}_${org.id}`);
        if (raw !== null && raw !== "") {
          if (key === "faq_items") {
            const parsed = JSON.parse(raw);
            if (Array.isArray(parsed)) enriched[key] = parsed;
          } else {
            enriched[key] = raw;
          }
        }
      } catch {
        // Ignore malformed local fallback
      }
    }
  }

  return enriched as Organization;
}

export function getCanonicalPublicOrgUrl(slug: string): string {
  const cleanSlug = (slug || "workspace").replace(/^@/, "").trim();
  return `https://app.impacto.rw/@${cleanSlug}`;
}

export function getLiveShareableOrgUrl(slug: string): string {
  const cleanSlug = (slug || "workspace").replace(/^@/, "").trim();
  if (typeof window !== "undefined" && window.location?.origin) {
    return `${window.location.origin}/@${cleanSlug}`;
  }
  return getCanonicalPublicOrgUrl(cleanSlug);
}

export function getOrgDisplayLocation(org: Partial<Organization>): string {
  if (org.location_name && org.location_name.trim()) {
    return org.location_name.trim();
  }
  const parts = [org.sector, org.district, org.province, org.country || "Rwanda"]
    .map((p) => (p || "").trim())
    .filter(Boolean);
  if (parts.length > 0) {
    // Deduplicate consecutive identical parts (e.g., Kigali, Kigali)
    return parts.filter((p, i) => i === 0 || p.toLowerCase() !== parts[i - 1].toLowerCase()).join(", ");
  }
  return "Rwanda";
}

export function getOrgShortLocation(org: Partial<Organization>): string {
  const district = (org.district || "").trim();
  const country = (org.country || "Rwanda").trim();
  if (district) return `${district}, ${country}`;
  if (org.location_name && org.location_name.trim()) return org.location_name.trim();
  return country;
}

export function getOrgActivitiesList(org: Partial<Organization>): string[] {
  if (!org.key_activities || !org.key_activities.trim()) return [];
  return org.key_activities
    .split(/[\n,;]+/)
    .map((s) => s.trim())
    .filter(Boolean);
}

export function getOrgContactSummary(org: Partial<Organization>): {
  email: string;
  phone: string;
  combined: string;
} {
  const email = (org.contact_email || (org as any).email || "").trim();
  const phone = (
    org.contact_phone ||
    (org as any).phone ||
    (org.donation_mtn_number ? `+250 ${org.donation_mtn_number}` : "") ||
    (org.dues_mtn_number ? `+250 ${org.dues_mtn_number}` : "")
  ).trim();

  const rawContactUs = (org.contact_us || "").trim();
  const isDefaultPlaceholder =
    !rawContactUs ||
    rawContactUs.toLowerCase().includes("contact@ourorganization.org") ||
    rawContactUs.includes("788 123 456");

  if (email && phone) {
    return { email, phone, combined: `${email} / ${phone}` };
  }
  if (email) {
    return { email, phone, combined: email };
  }
  if (phone) {
    return { email, phone, combined: phone };
  }
  if (!isDefaultPlaceholder) {
    return { email: "", phone: "", combined: rawContactUs };
  }
  return { email: "", phone: "", combined: "" };
}

function truncateCleanly(text: string, maxLength: number): string {
  const clean = text.replace(/\s+/g, " ").trim();
  if (clean.length <= maxLength) return clean;
  const sliced = clean.slice(0, maxLength - 1);
  const lastSpace = sliced.lastIndexOf(" ");
  return (lastSpace > maxLength * 0.6 ? sliced.slice(0, lastSpace) : sliced).trim() + "…";
}

export function buildOrgMetaTags(org: Partial<Organization>) {
  const name = (org.name || "Organization").trim();
  const category = (org.org_category || "Organization").trim();
  const location = getOrgShortLocation(org);
  const descRaw = (org.description || org.tagline || "").trim();
  const activities = getOrgActivitiesList(org);

  // Title tag (max 60 chars) including org name + category + Rwanda
  const fullTitle = `${name} — ${category} in Rwanda`;
  const title =
    fullTitle.length <= 60
      ? fullTitle
      : truncateCleanly(`${name} | ${category} Rwanda`, 60);

  // Meta description (max 155 chars) with CTA
  const baseSummary = descRaw
    ? descRaw
    : activities.length > 0
    ? `focused on ${activities.slice(0, 2).join(" and ")}`
    : "serving its community";

  const descriptionCandidate = `Explore ${name}, a ${category} in ${location} ${
    descRaw ? `— ${baseSummary}` : baseSummary
  }. View verified impact and connect today.`;
  const description = truncateCleanly(descriptionCandidate, 155);

  // 8–10 SEO keywords
  const customKeywords = (org.seo_keywords || "")
    .split(",")
    .map((k) => k.trim())
    .filter(Boolean);

  const generatedKeywords = [
    name,
    `${name} Rwanda`,
    org.district ? `${name} ${org.district}` : `${name} ${location}`,
    `${category} in ${org.district || "Rwanda"}`,
    ...activities.slice(0, 3).map((a) => `${a} ${org.district || "Rwanda"}`),
    `registered ${category} Rwanda`,
    `${name} membership`,
    `${name} Impacto`,
  ].filter(Boolean);

  const keywords = Array.from(
    new Set(customKeywords.length > 0 ? [...customKeywords, ...generatedKeywords] : generatedKeywords)
  ).slice(0, 10);

  return {
    title,
    description,
    keywords,
  };
}

export function buildDefaultOrgFaqs(org: Partial<Organization>): OrgFaqItem[] {
  const name = (org.name || "this organization").trim();
  const category = (org.org_category || "organization").trim();
  const location = getOrgDisplayLocation(org);
  const publicUrl = getCanonicalPublicOrgUrl(org.slug || "");
  const activities = getOrgActivitiesList(org);
  const contact = getOrgContactSummary(org);

  const q1AnswerParts = [
    `${name} is a ${category} operating in ${location}`,
    org.description?.trim()
      ? `, dedicated to ${org.description.trim().replace(/\.$/, "")}.`
      : org.tagline?.trim()
      ? ` (${org.tagline.trim()}).`
      : ".",
  ];
  if (activities.length > 0) {
    q1AnswerParts.push(` Its key activities include ${activities.join(", ")}.`);
  }
  if (org.target_beneficiaries?.trim()) {
    q1AnswerParts.push(` It serves ${org.target_beneficiaries.trim().replace(/\.$/, "")}.`);
  }

  const q2Answer = `${name} is based in ${location}${
    org.service_area?.trim() ? ` and serves ${org.service_area.trim()}` : ""
  }. Official location details and updates are available on its public Impacto portal at ${publicUrl}.`;

  const q3Answer = org.membership_info?.trim()
    ? `${org.membership_info.trim().replace(/\.$/, "")}. Prospective members can also request to join directly on ${publicUrl}.`
    : org.allow_public_joining !== false
    ? `You can request to join ${name} online via the "Join Organization" button on its public Impacto page at ${publicUrl}${
        contact.combined ? `, or contact the team at ${contact.combined}` : ""
      }.`
    : `Membership inquiries for ${name} can be submitted through the organization's administration${
        contact.combined ? ` at ${contact.combined}` : ` via ${publicUrl}`
      }.`;

  const q4Answer = contact.combined
    ? `You can contact ${name} directly via ${contact.combined}${
        org.website?.trim() ? ` or visit ${org.website.trim()}` : ""
      }. You can also find official contact details on ${publicUrl}.`
    : `Official inquiries for ${name} can be directed through its verified public page at ${publicUrl}${
        org.website?.trim() ? ` or its website at ${org.website.trim()}` : ""
      }.`;

  const regParts: string[] = [];
  if (org.registration_number?.trim()) {
    regParts.push(
      `${name} holds registration reference ${org.registration_number.trim()}${
        org.registration_authority?.trim() ? ` with ${org.registration_authority.trim()}` : " in Rwanda"
      }.`
    );
  } else if (org.registration_authority?.trim()) {
    regParts.push(`${name} is registered under ${org.registration_authority.trim()} in Rwanda.`);
  } else {
    regParts.push(`${name} operates as a ${category} in ${location}.`);
  }
  if (org.verification_status === "verified") {
    regParts.push(`Its authenticity and credentials are verified on Impacto (${publicUrl}).`);
  } else {
    regParts.push(`Credential and registration updates can be reviewed on its Impacto page at ${publicUrl}.`);
  }

  return [
    {
      question: `What is ${name}?`,
      answer: q1AnswerParts.join("").trim(),
    },
    {
      question: `Where is ${name} located?`,
      answer: q2Answer,
    },
    {
      question: `How can I join ${name}?`,
      answer: q3Answer,
    },
    {
      question: `How do I contact ${name}?`,
      answer: q4Answer,
    },
    {
      question: `Is ${name} a registered organization in Rwanda?`,
      answer: regParts.join(" "),
    },
  ];
}

export function getEffectiveOrgFaqs(org: Partial<Organization>): OrgFaqItem[] {
  if (Array.isArray(org.faq_items)) {
    const validCustom = org.faq_items.filter(
      (item) => item && item.question?.trim() && item.answer?.trim()
    );
    if (validCustom.length > 0) return validCustom;
  }
  return buildDefaultOrgFaqs(org);
}

export function buildOrgAiSnippet(org: Partial<Organization>): string {
  if (org.ai_summary && org.ai_summary.trim()) {
    return org.ai_summary.trim();
  }
  const name = (org.name || "Organization").trim();
  const category = (org.org_category || "organization").trim();
  const location = getOrgShortLocation(org);
  const publicUrl = getCanonicalPublicOrgUrl(org.slug || "");
  const desc = (org.description || org.tagline || "").trim().replace(/\.$/, "");
  const activities = getOrgActivitiesList(org);

  const sentence1 = desc
    ? `${name} is a ${category} based in ${location}, dedicated to ${desc}.`
    : `${name} is a ${category} operating in ${location}.`;

  const sentence2 =
    activities.length > 0
      ? `Its core initiatives include ${activities.slice(0, 4).join(", ")}.`
      : `It coordinates community initiatives, member programs, and transparent impact reporting.`;

  const sentence3 = `Official details, goals, news, and verified credentials are published on its Impacto public page at ${publicUrl}.`;

  return `${sentence1} ${sentence2} ${sentence3}`;
}

export function buildOrgStructuredData(org: Partial<Organization>) {
  const name = (org.name || "Organization").trim();
  const publicUrl = getCanonicalPublicOrgUrl(org.slug || "");
  const contact = getOrgContactSummary(org);
  const sameAs = [
    org.website?.trim(),
    org.facebook_url?.trim(),
    org.twitter_url?.trim(),
    org.linkedin_url?.trim(),
  ].filter((u): u is string => Boolean(u && /^https?:\/\//i.test(u)));

  const orgSchema: Record<string, any> = {
    "@context": "https://schema.org",
    "@type": "Organization",
    name,
    url: publicUrl,
    category: (org.org_category || "Organization").trim(),
    address: {
      "@type": "PostalAddress",
      ...(org.sector?.trim() ? { streetAddress: org.sector.trim() } : {}),
      ...(org.district?.trim()
        ? { addressLocality: org.district.trim() }
        : org.location_name?.trim()
        ? { addressLocality: org.location_name.trim() }
        : {}),
      ...(org.province?.trim() ? { addressRegion: org.province.trim() } : {}),
      addressCountry: org.country?.trim() || "Rwanda",
    },
    isPartOf: {
      "@type": "WebSite",
      name: "Impacto",
      url: "https://www.impacto.rw",
    },
  };

  if (org.alternate_name?.trim()) {
    orgSchema.alternateName = org.alternate_name.trim();
  }
  if ((org.description || org.tagline)?.trim()) {
    orgSchema.description = (org.description || org.tagline)?.trim();
  }
  if (org.logo_url?.trim() && /^https?:\/\//i.test(org.logo_url.trim())) {
    orgSchema.logo = org.logo_url.trim();
  }
  if (contact.email || contact.phone) {
    orgSchema.contactPoint = {
      "@type": "ContactPoint",
      contactType: "public inquiries",
      ...(contact.email ? { email: contact.email } : {}),
      ...(contact.phone ? { telephone: contact.phone } : {}),
      availableLanguage: ["en", "fr", "rw"],
    };
  }
  if (sameAs.length > 0) {
    orgSchema.sameAs = sameAs;
  }

  const faqs = getEffectiveOrgFaqs(org);
  const faqSchema = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqs.map((item) => ({
      "@type": "Question",
      name: item.question,
      acceptedAnswer: {
        "@type": "Answer",
        text: item.answer,
      },
    })),
  };

  return { orgSchema, faqSchema, faqs };
}
