// The vocabulary of the legal documents screen, in one place.
//
// `doc_type` and `status` are backend enums (`LegalDocumentType`,
// `LegalDocumentStatus` in app/common/enums.py) and the character limits are the
// schema's (`app/features/legal/schemas.py`). They are written here rather than
// read from the API because the legal service has no metadata route; if either
// changes on the server, this file is the panel's half of the same rule.

/** The two documents the public landing pages render. `page` is where a published
 *  version of this type becomes readable, so the screen can link an operator to
 *  the thing they just changed. */
export const DOC_TYPE_OPTIONS = [
  {
    value: 'privacy_policy',
    label: 'Privacy Policy',
    page: '/landing/privacyPolicy',
    heading: 'Privacy Policy',
  },
  {
    value: 'terms_and_conditions',
    label: 'Terms & Conditions',
    page: '/landing/termCondition',
    heading: 'Terms and Conditions',
  },
];

export const docTypeLabel = (value) =>
  DOC_TYPE_OPTIONS.find((option) => option.value === value)?.label || value || '—';

export const docTypePage = (value) =>
  DOC_TYPE_OPTIONS.find((option) => option.value === value)?.page || null;

/** Mirrors `LegalDocumentStatus`. Only a draft can be written on: a published
 *  row is the text customers were shown, and an archived one is the text they
 *  were shown before it. `service.update` refuses both, so the screen does too
 *  instead of letting an operator discover it by pressing Save. */
export const STATUS_LABELS = {
  draft: 'Draft',
  published: 'Published',
  archived: 'Archived',
};

export const STATUS_TONES = {
  draft: 'bg-slate-100 text-slate-700',
  published: 'bg-emerald-50 text-emerald-700',
  archived: 'bg-amber-50 text-amber-800',
};

/** The marker set `parse_legal_sections()` implements, printed to the operator in
 *  the paste box. Keep this in step with that function: the box promises these
 *  rules and the backend applies them. */
export const TEXT_MARKERS = [
  ['1. Introduction', 'starts a numbered section — the number stays in the heading'],
  ['A. Personal information', 'starts a subsection inside the section above it'],
  ['# Introduction', 'starts a section without a number'],
  ['## Security', 'starts a subsection without a letter'],
  ['- Name and email address', 'is one bullet point'],
  ['> We keep it only as long as needed', 'is the closing note under a section'],
  ['anything else', 'is a paragraph'],
  ['a blank line', 'is ignored'],
];

// The schema's own limits, so a box can stop typing rather than fail on Save.
export const LIMITS = {
  title: 255,
  summary: 2000,
  sectionTitle: 255,
  footer: 4000,
  // `MAX_CONTENT_TEXT_CHARS` in app/features/legal/sections.py.
  contentText: 200000,
};

export const blankSection = () => ({
  title: '',
  paragraphs: [''],
  bullets: [],
  subsections: [],
  footer: '',
});

export const blankSubsection = () => ({ title: '', paragraphs: [], bullets: [''] });

/** Backend `content` in, editor state out.
 *
 * Every list is filled and every string is defaulted because the editor binds
 * directly to these values, and a `undefined` in a textarea renders as an empty
 * box the operator cannot tell apart from one they cleared.
 */
export const toEditor = (content) =>
  (Array.isArray(content) ? content : []).map((section) => ({
    title: section?.title || '',
    paragraphs: (section?.paragraphs || []).length
      ? [...section.paragraphs]
      : [''],
    bullets: [...(section?.bullets || [])],
    subsections: (section?.subsections || []).map((sub) => ({
      title: sub?.title || '',
      paragraphs: [...(sub?.paragraphs || [])],
      bullets: [...(sub?.bullets || [])],
    })),
    footer: section?.footer || '',
  }));

/** Editor state, out to the API.
 *
 * Blank boxes are dropped rather than sent: an empty paragraph is an editor row
 * someone has not filled in yet, not a paragraph of the policy, and storing it
 * would put a gap in the published page. A section with no title is *not*
 * dropped — `validateDraft` reports it, because losing a heading the operator
 * typed content under is worse than a named error.
 */
export const toWire = (sections) =>
  (sections || []).map((section) => ({
    title: (section.title || '').trim(),
    paragraphs: (section.paragraphs || []).map((p) => p.trim()).filter(Boolean),
    bullets: (section.bullets || []).map((b) => b.trim()).filter(Boolean),
    subsections: (section.subsections || []).map((sub) => ({
      title: (sub.title || '').trim(),
      paragraphs: (sub.paragraphs || []).map((p) => p.trim()).filter(Boolean),
      bullets: (sub.bullets || []).map((b) => b.trim()).filter(Boolean),
    })),
    footer: (section.footer || '').trim() || null,
  }));

/** What is wrong with this draft, as sentences a Save button can show.
 *
 * Mirrors the schema so the operator sees the reason before the request, but the
 * backend still gets to be the one that refuses — this list is a convenience,
 * not the rule.
 */
export const validateDraft = (form) => {
  const problems = [];

  if (!(form.title || '').trim()) problems.push('The document needs a title.');
  if ((form.title || '').length > LIMITS.title)
    problems.push(`The title is over ${LIMITS.title} characters.`);
  if (!(form.docType || '').trim()) problems.push('Choose which document this is.');
  if ((form.summary || '').length > LIMITS.summary)
    problems.push(`The summary is over ${LIMITS.summary} characters.`);

  if (!(form.sections || []).length)
    problems.push('The document has no sections yet — write one, or paste the text.');

  (form.sections || []).forEach((section, index) => {
    const at = `Section ${index + 1}`;
    const title = (section.title || '').trim();
    if (!title) problems.push(`${at} has no heading.`);
    if (title.length > LIMITS.sectionTitle)
      problems.push(`${at} has a heading over ${LIMITS.sectionTitle} characters.`);
    if ((section.footer || '').length > LIMITS.footer)
      problems.push(`${at} has a closing note over ${LIMITS.footer} characters.`);

    const body =
      (section.paragraphs || []).filter((p) => p.trim()).length +
      (section.bullets || []).filter((b) => b.trim()).length +
      (section.subsections || []).length +
      (section.footer || '').trim().length;
    if (title && !body)
      problems.push(`${at} ("${title}") has a heading and nothing under it.`);

    (section.subsections || []).forEach((sub, subIndex) => {
      if (!(sub.title || '').trim())
        problems.push(`${at}, subsection ${subIndex + 1}, has no heading.`);
    });
  });

  return problems;
};

/** The counts the screen prints, so "17 sections" is measured and not remembered. */
export const documentCounts = (sections) => {
  let paragraphs = 0;
  let bullets = 0;
  let subsections = 0;
  let words = 0;

  const countWords = (text) => (text || '').trim().split(/\s+/).filter(Boolean).length;

  (sections || []).forEach((section) => {
    subsections += (section.subsections || []).length;
    (section.paragraphs || []).forEach((p) => {
      if (p.trim()) {
        paragraphs += 1;
        words += countWords(p);
      }
    });
    (section.bullets || []).forEach((b) => {
      if (b.trim()) {
        bullets += 1;
        words += countWords(b);
      }
    });
    (section.subsections || []).forEach((sub) => {
      (sub.paragraphs || []).forEach((p) => {
        if (p.trim()) {
          paragraphs += 1;
          words += countWords(p);
        }
      });
      (sub.bullets || []).forEach((b) => {
        if (b.trim()) {
          bullets += 1;
          words += countWords(b);
        }
      });
      words += countWords(sub.title);
    });
    words += countWords(section.title) + countWords(section.footer);
  });

  return {
    sections: (sections || []).length,
    paragraphs,
    bullets,
    subsections,
    words,
  };
};

/** The published row of each type, so the list can say which version is live and
 *  offer "new version from this" without the operator hunting for the code. */
export const publishedByType = (documents) => {
  const live = {};
  (documents || []).forEach((doc) => {
    if (doc.status === 'published') live[doc.doc_type] = doc;
  });
  return live;
};

export const highestVersion = (documents, docType) =>
  (documents || [])
    .filter((doc) => doc.doc_type === docType)
    .reduce((top, doc) => Math.max(top, Number(doc.version) || 0), 0);
