'use client';

import { useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  ArrowDown,
  ArrowUp,
  Copy,
  FileText,
  ListPlus,
  Pilcrow,
  Plus,
  Quote,
  Save,
  Send,
  Trash2,
  Upload,
} from 'lucide-react';
import {
  Badge,
  Button,
  Card,
  ConfirmDialog,
  EmptyState,
  Field,
  cx,
  inputCls,
} from '@/components/ui';
import { useApp } from '@/components/ui/AppContext';
import { num } from '@/lib/format';
import {
  DOC_TYPE_OPTIONS,
  LIMITS,
  STATUS_LABELS,
  STATUS_TONES,
  TEXT_MARKERS,
  blankSection,
  blankSubsection,
  documentCounts,
  docTypeLabel,
  docTypePage,
  highestVersion,
  publishedByType,
  toEditor,
  validateDraft,
} from '@/config/legalDocuments';
import {
  archiveDocument,
  deleteDocument,
  importDocument,
  publishDocument,
  saveDocument,
} from '@/app/super-admin/legal-documents/actions';

const blankForm = {
  title: '',
  docType: 'privacy_policy',
  summary: '',
  effectiveFrom: '',
  sections: [],
};

const dayOf = (value) => (value ? String(value).slice(0, 10) : '');

const fmtDateTime = (value) =>
  value
    ? new Date(value).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })
    : '—';

// ---------------------------------------------------------------- list helpers

const swap = (list, index, delta) => {
  const to = index + delta;
  if (to < 0 || to >= list.length) return list;
  const copy = [...list];
  [copy[index], copy[to]] = [copy[to], copy[index]];
  return copy;
};

const removeFrom = (list, index) => list.filter((_, position) => position !== index);

const asText = (value) => String(value ?? '');

// ------------------------------------------------------------------ row group

/** One editable list of sentences, used for paragraphs, bullets and the lists
 *  inside a subsection.
 *
 *  A row is a box, a move pair and a delete. Rows are keyed by position because
 *  their content is the thing being typed; a key made of the text itself would
 *  remount the input on every keystroke and lose the caret.
 */
function TextRows({
  label,
  items,
  onChange,
  placeholder,
  multiline = false,
  addLabel,
  readOnly = false,
}) {
  const set = (index, value) =>
    onChange(items.map((item, position) => (position === index ? value : item)));

  const Input = multiline ? 'textarea' : 'input';

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</p>
        {readOnly ? null : (
          <Button
            variant="outline"
            type="button"
            className="px-2 py-1 text-xs"
            onClick={() => onChange([...items, ''])}
          >
            <Plus size={13} aria-hidden />
            {addLabel}
          </Button>
        )}
      </div>

      {items.length === 0 ? (
        <p className="text-xs text-slate-500">
          {readOnly
            ? `No ${label.toLowerCase()} in this version.`
            : `None yet — use ${addLabel.toLowerCase()} to add one.`}
        </p>
      ) : null}

      {items.map((item, index) => (
        <div key={index} className="flex items-start gap-2">
          <Input
            className={cx(inputCls, multiline ? 'min-h-[76px] leading-6' : 'py-1.5')}
            value={item}
            rows={multiline ? 3 : undefined}
            placeholder={placeholder}
            aria-label={`${label} ${index + 1}`}
            readOnly={readOnly}
            onChange={(event) => set(index, event.target.value)}
          />
          {readOnly ? null : (
            <div className="flex shrink-0 gap-1 pt-1">
              <button
                type="button"
                className="rounded-md p-1.5 text-slate-500 hover:bg-slate-100 disabled:opacity-30"
                title="Move up"
                aria-label={`Move ${label.toLowerCase()} ${index + 1} up`}
                disabled={index === 0}
                onClick={() => onChange(swap(items, index, -1))}
              >
                <ArrowUp size={14} aria-hidden />
              </button>
              <button
                type="button"
                className="rounded-md p-1.5 text-slate-500 hover:bg-slate-100 disabled:opacity-30"
                title="Move down"
                aria-label={`Move ${label.toLowerCase()} ${index + 1} down`}
                disabled={index === items.length - 1}
                onClick={() => onChange(swap(items, index, 1))}
              >
                <ArrowDown size={14} aria-hidden />
              </button>
              <button
                type="button"
                className="rounded-md p-1.5 text-red-600 hover:bg-red-50"
                title="Remove"
                aria-label={`Remove ${label.toLowerCase()} ${index + 1}`}
                onClick={() => onChange(removeFrom(items, index))}
              >
                <Trash2 size={14} aria-hidden />
              </button>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------- subsection

function SubsectionCard({ subsection, onPatch, onRemove, readOnly = false }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-slate-50/70 p-3">
      <div className="flex items-start gap-2">
        <div className="grow">
          <input
            className={inputCls}
            value={subsection.title}
            maxLength={LIMITS.sectionTitle}
            readOnly={readOnly}
            placeholder="A. Personal and contact information"
            aria-label="Subsection heading"
            onChange={(event) => onPatch({ title: event.target.value })}
          />
        </div>
        {readOnly ? null : (
          <button
            type="button"
            className="mt-1 rounded-md p-1.5 text-red-600 hover:bg-red-50"
            title="Remove this subsection"
            aria-label="Remove subsection"
            onClick={onRemove}
          >
            <Trash2 size={15} aria-hidden />
          </button>
        )}
      </div>

      <div className="mt-3 space-y-3 pl-1">
        <TextRows
          label="Paragraphs"
          items={subsection.paragraphs}
          addLabel="Add paragraph"
          placeholder="One or two sentences of plain English."
          multiline
          readOnly={readOnly}
          onChange={(paragraphs) => onPatch({ paragraphs })}
        />
        <TextRows
          label="Bullet points"
          items={subsection.bullets}
          addLabel="Add bullet"
          placeholder="Each bullet becomes one line of the list."
          readOnly={readOnly}
          onChange={(bullets) => onPatch({ bullets })}
        />
      </div>
    </div>
  );
}

// -------------------------------------------------------------------- section

function SectionCard({ section, index, total, onPatch, onMove, onRemove, readOnly = false }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex items-start gap-2">
        <span className="mt-2 w-6 shrink-0 text-right text-sm font-semibold text-slate-400">
          {index + 1}
        </span>
        <div className="grow">
          <input
            className={cx(inputCls, 'font-semibold')}
            value={section.title}
            maxLength={LIMITS.sectionTitle}
            readOnly={readOnly}
            placeholder="1. Information We May Collect"
            aria-label={`Heading of section ${index + 1}`}
            onChange={(event) => onPatch({ title: event.target.value })}
          />
          <p className="mt-1 text-xs text-slate-500">
            This is the heading customers see in the contents list on the left of the page.
          </p>
        </div>
        {readOnly ? null : (
          <div className="flex shrink-0 gap-1 pt-1">
            <button
              type="button"
              className="rounded-md p-1.5 text-slate-500 hover:bg-slate-100 disabled:opacity-30"
              title="Move section up"
              aria-label={`Move section ${index + 1} up`}
              disabled={index === 0}
              onClick={() => onMove(-1)}
            >
              <ArrowUp size={15} aria-hidden />
            </button>
            <button
              type="button"
              className="rounded-md p-1.5 text-slate-500 hover:bg-slate-100 disabled:opacity-30"
              title="Move section down"
              aria-label={`Move section ${index + 1} down`}
              disabled={index === total - 1}
              onClick={() => onMove(1)}
            >
              <ArrowDown size={15} aria-hidden />
            </button>
            <button
              type="button"
              className="rounded-md p-1.5 text-red-600 hover:bg-red-50"
              title="Delete this section"
              aria-label={`Delete section ${index + 1}`}
              onClick={onRemove}
            >
              <Trash2 size={15} aria-hidden />
            </button>
          </div>
        )}
      </div>

      <div className="mt-4 space-y-4 pl-8">
        <TextRows
          label="Paragraphs"
          items={section.paragraphs}
          addLabel="Add paragraph"
          placeholder="Write it the way you would say it."
          multiline
          readOnly={readOnly}
          onChange={(paragraphs) => onPatch({ paragraphs })}
        />

        <TextRows
          label="Bullet points"
          items={section.bullets}
          addLabel="Add bullet"
          placeholder="Each bullet becomes one line of the list."
          readOnly={readOnly}
          onChange={(bullets) => onPatch({ bullets })}
        />

        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              Subsections
            </p>
            {readOnly ? null : (
              <Button
                variant="outline"
                type="button"
                className="px-2 py-1 text-xs"
                onClick={() =>
                  onPatch({ subsections: [...section.subsections, blankSubsection()] })
                }
              >
                <Pilcrow size={13} aria-hidden />
                Add subsection
              </Button>
            )}
          </div>

          {section.subsections.length === 0 ? (
            <p className="text-xs text-slate-500">
              None. Use a subsection when a heading needs a titled list under it — “A. Personal
              information”, “B. Business information”.
            </p>
          ) : null}

          {section.subsections.map((subsection, subIndex) => (
            <SubsectionCard
              key={subIndex}
              subsection={subsection}
              readOnly={readOnly}
              onPatch={(patch) =>
                onPatch({
                  subsections: section.subsections.map((item, position) =>
                    position === subIndex ? { ...item, ...patch } : item,
                  ),
                })
              }
              onRemove={() =>
                onPatch({ subsections: removeFrom(section.subsections, subIndex) })
              }
            />
          ))}
        </div>

        <div>
          <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-slate-500">
            Closing note
          </p>
          <textarea
            className={cx(inputCls, 'min-h-[60px] leading-6')}
            value={section.footer}
            rows={2}
            maxLength={LIMITS.footer}
            readOnly={readOnly}
            aria-label={`Closing note of section ${index + 1}`}
            placeholder="Optional. The grey sentence under the section — “We will collect only information reasonably necessary.”"
            onChange={(event) => onPatch({ footer: event.target.value })}
          />
        </div>
      </div>
    </div>
  );
}

// -------------------------------------------------------------------- preview

/** The document as the public page will lay it out.
 *
 *  This mirrors `app/landing/privacyPolicy/page.js` and `termCondition/page.js`:
 *  heading, paragraphs, subsection boxes, bullets, then the note. It is a
 *  reading check, not a pixel match — the page owns its own styling, and a
 *  document only becomes public when it is published.
 */
function Preview({ form }) {
  const page = docTypePage(form.docType);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 pb-3">
        <h3 className="text-lg font-bold text-[#102c55]">{form.title || 'Untitled document'}</h3>
        <p className="text-xs text-slate-500">
          {docTypeLabel(form.docType)}
          {form.effectiveFrom ? ` · effective ${form.effectiveFrom}` : ''}
          {page ? (
            <a
              className="ml-2 text-brand underline"
              href={page}
              target="_blank"
              rel="noreferrer"
            >
              open the live page
            </a>
          ) : null}
        </p>
      </div>

      {form.summary ? (
        <p className="rounded-lg bg-slate-50 p-3 text-sm text-slate-600">
          <span className="mr-1 text-xs font-semibold uppercase tracking-wide text-slate-500">
            Summary (this list only, not on the page)
          </span>
          {form.summary}
        </p>
      ) : null}

      {form.sections.length === 0 ? (
        <p className="text-sm text-slate-500">
          Nothing to preview yet. Add a section, or paste the document and convert it.
        </p>
      ) : null}

      {form.sections.map((section, index) => (
        <article key={index} className="rounded-xl border border-slate-200 p-4">
          <h4 className="border-b border-slate-100 pb-2 text-base font-bold text-[#102c55]">
            {section.title || <span className="text-red-600">(section without a heading)</span>}
          </h4>
          <div className="mt-3 space-y-3 text-sm leading-7 text-slate-600">
            {section.paragraphs.filter((item) => item.trim()).map((item, position) => (
              <p key={position}>{item}</p>
            ))}

            {section.subsections.map((subsection, position) => (
              <div key={position} className="rounded-lg border border-slate-100 bg-slate-50/70 p-3">
                <h5 className="font-semibold text-[#102c55]">
                  {subsection.title || (
                    <span className="text-red-600">(subsection without a heading)</span>
                  )}
                </h5>
                {subsection.paragraphs.filter((item) => item.trim()).map((item, pi) => (
                  <p key={pi} className="mt-2">
                    {item}
                  </p>
                ))}
                <ul className="mt-2 space-y-1">
                  {subsection.bullets.filter((item) => item.trim()).map((item, bi) => (
                    <li key={bi} className="flex items-start gap-2">
                      <span className="mt-[10px] h-1.5 w-1.5 shrink-0 rounded-full bg-[#0878d1]" />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}

            <ul className="space-y-1.5 pl-1">
              {section.bullets.filter((item) => item.trim()).map((item, bi) => (
                <li key={bi} className="flex items-start gap-2">
                  <span className="mt-[10px] h-1.5 w-1.5 shrink-0 rounded-full bg-[#0878d1]" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>

            {section.footer.trim() ? (
              <p className="rounded-lg bg-slate-50 p-3 text-slate-600">{section.footer}</p>
            ) : null}
          </div>
        </article>
      ))}
    </div>
  );
}

// ----------------------------------------------------------------------- main

export default function LegalDocumentStudio({ data }) {
  const router = useRouter();
  const { toast } = useApp();

  const documents = useMemo(() => data?.documents || [], [data]);
  const published = useMemo(() => publishedByType(documents), [documents]);

  const [filterType, setFilterType] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterQ, setFilterQ] = useState('');
  const [code, setCode] = useState(null);
  const [form, setForm] = useState(blankForm);
  const [mode, setMode] = useState('sections');
  const [pasted, setPasted] = useState('');
  const [dirty, setDirty] = useState(false);
  const [busy, setBusy] = useState(false);
  const [confirm, setConfirm] = useState(null);
  const [showPreview, setShowPreview] = useState(false);
  const editorTop = useRef(null);

  const current = documents.find((doc) => doc.doc_code === code) || null;
  const readOnly = Boolean(current) && current.status !== 'draft';
  const problems = useMemo(() => validateDraft(form), [form]);
  const counts = useMemo(() => documentCounts(form.sections), [form.sections]);
  const live = published[form.docType] || null;

  const set = (patch) => {
    setForm((prev) => ({ ...prev, ...patch }));
    setDirty(true);
  };

  const patchSection = (index, patch) =>
    set({
      sections: form.sections.map((section, position) =>
        position === index ? { ...section, ...patch } : section,
      ),
    });

  const moveSection = (index, delta) => set({ sections: swap(form.sections, index, delta) });

  const removeSection = (index) => set({ sections: removeFrom(form.sections, index) });

  const addSection = () => {
    set({ sections: [...form.sections, blankSection()] });
    editorTop.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  };

  const startNew = (docType = form.docType) => {
    setCode(null);
    setMode('sections');
    setPasted('');
    setDirty(false);
    setShowPreview(false);
    setForm({ ...blankForm, docType, sections: [blankSection()] });
  };

  // Every box is filled from the row itself, never from the list's display
  // columns: the table shows "3 sections" and a date, and writing those back
  // into a document would replace a policy with a label.
  const open = (doc) => {
    setCode(doc.doc_code);
    setMode('sections');
    setPasted('');
    setDirty(false);
    setShowPreview(false);
    setForm({
      title: doc.title || '',
      docType: doc.doc_type,
      summary: doc.summary || '',
      effectiveFrom: dayOf(doc.effective_from),
      sections: toEditor(doc.content),
    });
  };

  // The way an operator actually amends a policy: read what is published, then
  // write the next version. Copying is client-side because the API has no
  // "clone" route - and it should not need one; the new draft is a create with
  // the body carried over.
  const copyIntoNewDraft = (doc) => {
    setCode(null);
    setMode('sections');
    setPasted('');
    setDirty(true);
    setShowPreview(false);
    setForm({
      title: doc.title || '',
      docType: doc.doc_type,
      summary: doc.summary || '',
      effectiveFrom: dayOf(doc.effective_from),
      sections: toEditor(doc.content),
    });
    toast(`Version ${doc.version} opened as a new draft. Saving creates version ${
      highestVersion(documents, doc.doc_type) + 1
    }.`);
  };

  // Switching documents while the boxes still hold unsaved words is how an hour
  // of typing disappears, so the swap waits for a yes first.
  const withGuard = (action) => {
    if (!dirty) {
      action();
      return;
    }
    setConfirm({ kind: 'discard', doc: current, pending: action });
  };

  const run = async (action, done) => {
    setBusy(true);
    try {
      const res = await action();
      if (res.error) {
        toast(res.error, 'error');
        return null;
      }
      done?.(res);
      router.refresh();
      return res;
    } finally {
      setBusy(false);
    }
  };

  const save = () => {
    if (problems.length) {
      toast(problems[0], 'error');
      return;
    }

    run(() => saveDocument(code, form), (res) => {
      if (res.document) {
        setCode(res.document.doc_code);
        open(res.document);
      }
      setDirty(false);
      toast(
        res.document
          ? `Saved. This is version ${res.document.version}; publishing is what puts it on the page.`
          : 'Saved.',
      );
    });
  };

  const convert = () => {
    if (!asText(pasted).trim()) {
      toast('Paste the document first.', 'error');
      return;
    }

    run(
      () => importDocument(code, form, pasted),
      (res) => {
        if (res.document) {
          setCode(res.document.doc_code);
          open(res.document);
          setPasted('');
          toast(
            `Turned your text into ${res.document.content.length} section${
              res.document.content.length === 1 ? '' : 's'
            } and saved them into ${res.document.doc_code}. Fix any heading the parser read as a sentence, then Publish.`,
          );
        }
      },
    );
  };

  const publish = (doc) =>
    run(
      () => publishDocument(doc.doc_code),
      () => toast(`Version ${doc.version} is what the page serves now.`),
    );

  const archive = (doc) =>
    run(
      () => archiveDocument(doc.doc_code),
      () => toast('Taken down. It stays readable in this list.'),
    );

  const remove = (doc) =>
    run(
      () => deleteDocument(doc.doc_code),
      () => {
        if (doc.doc_code === code) startNew(doc.doc_type);
        toast('Deleted.');
      },
    );

  const needle = asText(filterQ).trim().toLowerCase();
  const rows = documents.filter(
    (doc) =>
      (!filterType || doc.doc_type === filterType) &&
      (!filterStatus || doc.status === filterStatus) &&
      (!needle ||
        asText(doc.title).toLowerCase().includes(needle) ||
        asText(doc.doc_code).toLowerCase().includes(needle) ||
        asText(doc.summary).toLowerCase().includes(needle)),
  );

  const publishMessage = (doc) => {
    const previous = published[doc.doc_type];
    const replaces =
      previous && previous.doc_code !== doc.doc_code
        ? `Version ${previous.version}${
            previous.published_at ? `, published ${fmtDateTime(previous.published_at)}` : ''
          }, leaves the page and becomes history.`
        : 'Nothing of this type is published yet, so this becomes the live text.';
    return `Version ${doc.version} of the ${docTypeLabel(
      doc.doc_type,
    )} goes onto ${docTypePage(doc.doc_type) || 'the public page'} for every visitor. ${replaces} The version number is the only thing that says which words the page served, so a published version never changes its text.`;
  };

  return (
    <>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Legal Documents</h1>
          <p className="text-sm text-slate-600">
            The privacy policy and the terms your landing pages serve. Write them in plain English —
            one box per paragraph — or paste the document and have it turned into sections. Nothing
            here asks for JSON.
          </p>
        </div>
        {data?.error ? (
          <p className="text-sm text-red-600" role="alert">
            {data.error}
          </p>
        ) : null}
      </div>

      <div className="grid items-start gap-4 lg:grid-cols-[320px_minmax(0,1fr)]">
        {/* ------------------------------------------------------------- list */}
        <Card
          title={
            <span className="flex items-center gap-2">
              <FileText size={16} aria-hidden />
              Versions
            </span>
          }
        >
          <div className="space-y-2">
            <Field label="Find">
              <input
                className={inputCls}
                value={filterQ}
                placeholder="Title, document code or summary"
                aria-label="Find a version by title or code"
                onChange={(event) => setFilterQ(event.target.value)}
              />
            </Field>
            <Field label="Document">
              <select
                className={inputCls}
                value={filterType}
                onChange={(event) => setFilterType(event.target.value)}
              >
                <option value="">Both types</option>
                {DOC_TYPE_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="State">
              <select
                className={inputCls}
                value={filterStatus}
                onChange={(event) => setFilterStatus(event.target.value)}
              >
                <option value="">Any state</option>
                {Object.entries(STATUS_LABELS).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </Field>
          </div>

          <div className="mt-3 flex gap-2">
            {DOC_TYPE_OPTIONS.map((option) => (
              <Button
                key={option.value}
                variant="outline"
                className="grow px-2 py-1.5 text-xs"
                onClick={() => withGuard(() => startNew(option.value))}
              >
                <ListPlus size={14} aria-hidden />
                New {option.label.split(' ')[0]}
              </Button>
            ))}
          </div>

          {rows.length === 0 ? (
            <EmptyState
              text={
                documents.length
                  ? 'No version matches the search or the two dropdowns.'
                  : 'No legal document has been saved yet. Start a new one, or paste your existing policy and convert it.'
              }
            />
          ) : (
            <ul className="mt-3 max-h-[70vh] space-y-2 overflow-y-auto pr-1">
              {rows.map((doc) => {
                const selected = doc.doc_code === code;
                return (
                  <li
                    key={doc.doc_code}
                    className={cx(
                      'rounded-lg border p-2.5',
                      selected ? 'border-brand bg-blue-50/60' : 'border-slate-200',
                    )}
                  >
                    <button
                      type="button"
                      className="block w-full text-left"
                      onClick={() => withGuard(() => open(doc))}
                    >
                      <p className="text-sm font-semibold text-slate-900">{doc.title}</p>
                      <p className="mt-0.5 flex flex-wrap items-center gap-1.5 text-xs text-slate-500">
                        <span
                          className={cx(
                            'rounded-md px-1.5 py-0.5 font-medium',
                            STATUS_TONES[doc.status] || 'bg-slate-100 text-slate-700',
                          )}
                        >
                          {STATUS_LABELS[doc.status] || doc.status}
                        </span>
                        <span>{docTypeLabel(doc.doc_type)}</span>
                        <span>· v{doc.version}</span>
                        <span>· {(doc.content || []).length} sections</span>
                      </p>
                      {doc.effective_from ? (
                        <p className="mt-1 text-xs text-slate-500">
                          Effective {dayOf(doc.effective_from)}
                          {doc.published_at ? ` · published ${fmtDateTime(doc.published_at)}` : ''}
                        </p>
                      ) : null}
                    </button>

                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {doc.status === 'draft' ? (
                        <Button
                          variant="outline"
                          className="px-2 py-1 text-xs"
                          disabled={busy || !(doc.content || []).length}
                          title={
                            (doc.content || []).length
                              ? 'Make this the version the page serves'
                              : 'A document with no sections cannot be published'
                          }
                          onClick={() => setConfirm({ kind: 'publish', doc })}
                        >
                          <Send size={13} aria-hidden />
                          Publish
                        </Button>
                      ) : null}
                      {doc.status === 'published' ? (
                        <Button
                          variant="outline"
                          className="px-2 py-1 text-xs"
                          disabled={busy}
                          onClick={() => setConfirm({ kind: 'archive', doc })}
                        >
                          Take down
                        </Button>
                      ) : null}
                      {doc.status !== 'draft' ? (
                        <Button
                          variant="outline"
                          className="px-2 py-1 text-xs"
                          onClick={() => withGuard(() => copyIntoNewDraft(doc))}
                        >
                          <Copy size={13} aria-hidden />
                          New version from this
                        </Button>
                      ) : null}
                      {doc.status !== 'published' ? (
                        <Button
                          variant="outline"
                          className="px-2 py-1 text-xs"
                          disabled={busy}
                          onClick={() => setConfirm({ kind: 'delete', doc })}
                        >
                          <Trash2 size={13} aria-hidden />
                          Delete
                        </Button>
                      ) : null}
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </Card>

        {/* ----------------------------------------------------------- editor */}
        <div className="space-y-4">
          <Card
            title={
              <span className="flex items-center gap-2">
                {code ? `Editing ${code}` : 'New draft'}
                {current ? (
                  <Badge value={STATUS_LABELS[current.status] || current.status} />
                ) : null}
              </span>
            }
            action={
              <Button variant="outline" onClick={() => withGuard(() => startNew())}>
                Start another
              </Button>
            }
          >
            {readOnly ? (
              <p className="mb-3 rounded-lg bg-amber-50 p-3 text-sm text-amber-900">
                This version is <b>{STATUS_LABELS[current.status].toLowerCase()}</b>, so its text is
                read-only: it is the wording the page served, and rewriting it would leave the version
                number pointing at different words. Use <b>New version from this</b> to amend it, or{' '}
                <b>Take down</b> to stop serving it.
              </p>
            ) : null}

            <div className="grid gap-4 md:grid-cols-2">
              <Field label="Title" hint="The heading of the public page.">
                <input
                  className={inputCls}
                  value={form.title}
                  maxLength={LIMITS.title}
                  readOnly={readOnly}
                  placeholder="Privacy Policy"
                  onChange={(event) => set({ title: event.target.value })}
                />
              </Field>

              <Field
                label="Which document is this?"
                hint={
                  code
                    ? 'Fixed once the draft exists: the landing page reads by type, and each type keeps its own version line.'
                    : 'The type decides which public page this text appears on.'
                }
              >
                <select
                  className={inputCls}
                  value={form.docType}
                  disabled={Boolean(code)}
                  onChange={(event) => set({ docType: event.target.value })}
                >
                  {DOC_TYPE_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </Field>

              <Field
                label="Summary"
                hint={`One or two sentences. It is shown in lists and to whoever reviews the change — not on the policy page itself. Max ${LIMITS.summary} characters.`}
              >
                <textarea
                  className={cx(inputCls, 'min-h-[64px]')}
                  rows={2}
                  value={form.summary}
                  maxLength={LIMITS.summary}
                  readOnly={readOnly}
                  placeholder="Adds the grievance-officer email required by the DPDP Rules."
                  onChange={(event) => set({ summary: event.target.value })}
                />
              </Field>

              <Field
                label="Effective from"
                hint={
                  <>
                    The date the terms start applying to readers. Leave it empty to say{' '}
                    <em>from publication</em>.
                  </>
                }
              >
                <input
                  type="date"
                  className={inputCls}
                  value={form.effectiveFrom}
                  readOnly={readOnly}
                  onChange={(event) => set({ effectiveFrom: event.target.value })}
                />
              </Field>

              <p className="text-xs text-slate-500 md:col-span-2">
                {current
                  ? `Version ${current.version} · ${counts.sections} sections · ${counts.words.toLocaleString(
                      'en-IN',
                    )} words · last changed ${fmtDateTime(current.updated_at)}${
                      current.updated_by ? ` by ${current.updated_by}` : ''
                    }.`
                  : `Version numbers are assigned when a draft is saved — the next ${docTypeLabel(
                      form.docType,
                    )} will be version ${highestVersion(documents, form.docType) + 1}.`
                }
                {live ? ` Version ${live.version} is live on ${live.title}.` : ''}
                {dirty ? ' Unsaved changes.' : ''}
              </p>
            </div>
          </Card>

          {/* ------------------------------------------------------- body tabs */}
          <Card>
            <div
              className="flex flex-wrap items-center justify-between gap-2"
              role="tablist"
              aria-label="How to write the document"
            >
              <div className="flex gap-1">
                {[
                  ['sections', 'Write in sections'],
                  ['text', 'Paste plain English'],
                ].map(([value, label]) => (
                  <button
                    key={value}
                    type="button"
                    role="tab"
                    aria-selected={mode === value}
                    className={cx(
                      'rounded-lg px-3 py-1.5 text-sm font-semibold',
                      mode === value
                        ? 'bg-brand text-white'
                        : 'text-slate-600 hover:bg-slate-100',
                    )}
                    onClick={() => setMode(value)}
                  >
                    {label}
                  </button>
                ))}
              </div>
              <Button
                variant="outline"
                className="px-2 py-1 text-xs"
                onClick={() => setShowPreview((prev) => !prev)}
              >
                {showPreview ? 'Back to the editor' : 'Preview the page'}
              </Button>
            </div>

            {showPreview ? (
              <div className="mt-4 border-t border-slate-200 pt-4">
                <p className="mb-3 text-xs text-slate-500">
                  How this reads on the public page. The page adds its own layout and the contents
                  list; publishing is what makes it live.
                </p>
                <Preview form={form} />
              </div>
            ) : mode === 'text' ? (
              <div className="mt-4 space-y-3 border-t border-slate-200 pt-4">
                <p className="text-sm text-slate-600">
                  Paste the policy exactly as it reads — out of Word, out of the old page, out of a
                  mail. The backend turns it into sections you can then fix word by word. These are
                  the markers it looks for:
                </p>

                <ul className="grid gap-1.5 text-xs sm:grid-cols-2">
                  {TEXT_MARKERS.map(([marker, meaning]) => (
                    <li key={marker} className="flex gap-2">
                      <code className="shrink-0 rounded bg-slate-100 px-1.5 py-0.5 font-mono text-[11px] text-slate-700">
                        {marker}
                      </code>
                      <span className="text-slate-600">{meaning}</span>
                    </li>
                  ))}
                </ul>

                <textarea
                  className={cx(inputCls, 'min-h-[260px] font-mono text-xs leading-6')}
                  value={pasted}
                  maxLength={LIMITS.contentText}
                  readOnly={readOnly}
                  aria-label="The document in plain English"
                  placeholder={'1. Introduction\n\nSmartHub Pay respects your privacy.\n\n2. What We Collect\n\nA. Contact details\n\n- Name\n- Mobile number\n> We keep only what we need.'}
                  onChange={(event) => setPasted(event.target.value)}
                />

                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-xs text-slate-500">
                    {num(asText(pasted).length)} of {LIMITS.contentText.toLocaleString('en-IN')}{' '}
                    characters. Converting replaces the sections already in this draft.
                  </p>
                  <Button disabled={busy || readOnly} onClick={convert}>
                    <Upload size={15} aria-hidden />
                    Convert to sections
                  </Button>
                </div>

                {readOnly ? (
                  <p className="text-xs text-slate-500">
                    This version is not a draft, so pasting cannot change it — start a new version
                    instead.
                  </p>
                ) : null}
              </div>
            ) : (
              <div ref={editorTop} className="mt-4 space-y-4 border-t border-slate-200 pt-4">
                {form.sections.length === 0 ? (
                  <div className="space-y-3 py-4 text-center">
                    <p className="text-sm text-slate-600">
                      {readOnly
                        ? 'This version has no sections stored, which is why the public page shows only its title.'
                        : 'This document has no sections yet. Add one and write it in sentences, or paste the whole policy under Paste plain English and convert it.'}
                    </p>
                    {readOnly ? null : (
                      <Button onClick={addSection}>
                        <Plus size={15} aria-hidden />
                        Add the first section
                      </Button>
                    )}
                  </div>
                ) : (
                  <>
                    {form.sections.map((section, index) => (
                      <SectionCard
                        key={index}
                        index={index}
                        total={form.sections.length}
                        section={section}
                        readOnly={readOnly}
                        onPatch={(patch) => patchSection(index, patch)}
                        onMove={(delta) => moveSection(index, delta)}
                        onRemove={() => removeSection(index)}
                      />
                    ))}

                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <Button variant="outline" disabled={readOnly} onClick={addSection}>
                        <Plus size={15} aria-hidden />
                        Add section
                      </Button>
                      <Button
                        variant="outline"
                        disabled={readOnly}
                        onClick={() =>
                          set({
                            sections: [
                              ...form.sections,
                              { ...blankSection(), title: '', footer: '' },
                            ],
                          })
                        }
                      >
                        <Quote size={15} aria-hidden />
                        Add a section with a closing note
                      </Button>
                      <p className="text-xs text-slate-500">
                        {counts.sections} sections · {counts.paragraphs} paragraphs ·{' '}
                        {counts.bullets} bullets · {counts.subsections} subsections ·{' '}
                        {num(counts.words)} words
                      </p>
                    </div>
                  </>
                )}

                {readOnly ? (
                  <p className="text-xs text-slate-500">
                    Shown for reading: a published or archived version keeps no add, move or delete
                    controls, because the wording already served cannot change afterwards. Use{' '}
                    <b>New version from this</b> to amend it.
                  </p>
                ) : null}
              </div>
            )}
          </Card>

          {/* ----------------------------------------------------- save bar */}
          {problems.length && mode === 'sections' && !showPreview && !readOnly ? (
            <Card>
              <p className="text-sm font-semibold text-slate-900">
                {problems.length === 1 ? 'One thing to fix before this saves:' : 'Fix these before this saves:'}
              </p>
              <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-red-700">
                {problems.slice(0, 6).map((problem) => (
                  <li key={problem}>{problem}</li>
                ))}
                {problems.length > 6 ? (
                  <li className="list-none text-slate-500">
                    …and {problems.length - 6} more.
                  </li>
                ) : null}
              </ul>
            </Card>
          ) : null}

          <div className="sticky bottom-0 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white/95 p-3 shadow-sm backdrop-blur">
            <p className="text-xs text-slate-500">
              {code
                ? `Draft ${code} · saving writes the row, publishing is what writes the page.`
                : 'Nothing is stored until you save — a saved draft is not public until it is published.'}
            </p>
            <div className="flex flex-wrap gap-2">
              <Button disabled={busy || readOnly || problems.length > 0} onClick={save}>
                <Save size={15} aria-hidden />
                {code ? 'Save draft' : 'Create draft'}
              </Button>
              {current && current.status === 'draft' ? (
                <Button
                  disabled={busy || dirty || !(current.content || []).length}
                  title={
                    dirty
                      ? 'Publish sends what is stored, not what is on the screen. Save the draft first.'
                      : undefined
                  }
                  onClick={() => setConfirm({ kind: 'publish', doc: current })}
                >
                  <Send size={15} aria-hidden />
                  Publish
                </Button>
              ) : null}
              {current && current.status === 'published' ? (
                <Button
                  variant="danger"
                  disabled={busy}
                  onClick={() => setConfirm({ kind: 'archive', doc: current })}
                >
                  Take down
                </Button>
              ) : null}
            </div>
          </div>
        </div>
      </div>

      {confirm ? (
        <ConfirmDialog
          busy={busy}
          title={
            confirm.kind === 'publish'
              ? `Publish version ${confirm.doc.version}?`
              : confirm.kind === 'archive'
                ? `Take version ${confirm.doc.version} down?`
                : confirm.kind === 'discard'
                  ? 'Discard what you have typed?'
                  : 'Delete this version?'
          }
          message={
            confirm.kind === 'publish'
              ? publishMessage(confirm.doc)
              : confirm.kind === 'archive'
                ? `The page stops serving this text at once and no document of the ${docTypeLabel(
                    confirm.doc.doc_type,
                  )} type is published until another one is. The row stays here, and stays the wording the page served while it was live.`
                : confirm.kind === 'discard'
                  ? `Nothing on screen is stored${
                      code ? ` in ${code}` : ' yet'
                    }. Opening another version, or starting a new draft, replaces every box with its own text. Save first if the words matter.`
                  : 'The row and its version number go with it. A published document cannot be deleted — take it down first. Use “Take down” for anything that only needs hiding.'
          }
          confirmLabel={
            confirm.kind === 'delete'
              ? 'Delete'
              : confirm.kind === 'archive'
                ? 'Take down'
                : confirm.kind === 'discard'
                  ? 'Discard and switch'
                  : 'Publish'
          }
          danger={confirm.kind !== 'publish'}
          onCancel={() => setConfirm(null)}
          onConfirm={() => {
            const { kind, doc, pending } = confirm;
            setConfirm(null);
            if (kind === 'publish') publish(doc);
            if (kind === 'archive') archive(doc);
            if (kind === 'delete') remove(doc);
            if (kind === 'discard') pending();
          }}
        />
      ) : null}
    </>
  );
}
