import { useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useWorkspace } from '../state/workspace';
import { useToast } from '../components/ui/Toast';
import { Icon } from '../components/ui/Icons';
import {
  Callout,
  CopyButton,
  EmptyState,
  PageHeader,
  SearchField,
  SectionCard,
  SegmentedControl,
} from '../components/ui/primitives';
import { Field, Select, TextInput } from '../components/ui/forms';
import type { MetadataPackage, Platform, Tone } from '../lib/types';
import { PLATFORM_LABELS, PLATFORM_SHORT_LABELS, PLATFORMS, SCHEMA_VERSION, TONES } from '../lib/types';
import {
  PLATFORM_CONVENTIONS,
  buildChapters,
  buildLocalMetadata,
  chaptersToText,
  hashtagsToInput,
  makeMetadataPackage,
  metadataPackageToText,
  parseHashtags,
} from '../lib/metadataTemplates';
import { buildMetadataExport, downloadPayload, exportFilename } from '../lib/interchange';
import { BatchStudio } from '../components/metadata/BatchStudio';
import { metadataContext } from '../lib/aiContext';
import { parseMetadataPlatforms, describeAiError } from '../lib/aiSchemas';
import { runOperation, isAbortError } from '../services/apiClient';
import { newId, nowIso, parseListInput } from '../lib/utils';
type Draft = {
  id: string;
  title: string;
  caption: string;
  description: string;
  opening_overlay: string;
  thumbnail_concept: string;
  pinned_comment: string;
  call_to_action: string;
  search_phrases: string;
  hashtags: string;
  alternative_hooks: string;
  suggested_duration_seconds: string;
  recommended_excerpt: string;
  accessibility_notes: string;
  rationale: string;
  status: 'draft' | 'final';
};

function draftFromPackage(pkg: MetadataPackage): Draft {
  return {
    id: pkg.id,
    title: pkg.title,
    caption: pkg.caption,
    description: pkg.description ?? '',
    opening_overlay: pkg.opening_overlay ?? '',
    thumbnail_concept: pkg.thumbnail_concept ?? '',
    pinned_comment: pkg.pinned_comment ?? '',
    call_to_action: pkg.call_to_action ?? '',
    search_phrases: (pkg.search_phrases ?? []).join('\n'),
    hashtags: hashtagsToInput(pkg.hashtags),
    alternative_hooks: (pkg.alternative_hooks ?? []).join('\n'),
    suggested_duration_seconds: pkg.suggested_duration_seconds ? String(pkg.suggested_duration_seconds) : '',
    recommended_excerpt: pkg.recommended_excerpt ?? '',
    accessibility_notes: pkg.accessibility_notes ?? '',
    rationale: pkg.rationale ?? '',
    status: pkg.status ?? 'draft',
  };
}

function buildPackageFromDraft(
  draft: Draft,
  context: {
    ideaId: string;
    songId: string | null;
    platform: Platform;
    tone: Tone;
    existing?: MetadataPackage | null;
    status: 'draft' | 'final';
    source?: MetadataPackage['source'];
  },
): MetadataPackage {
  const now = nowIso();
  const existing = context.existing ?? null;
  return {
    id: draft.id || newId('meta'),
    content_idea_id: context.ideaId,
    song_id: context.songId,
    platform: context.platform,
    tone: context.tone,
    title: draft.title,
    caption: draft.caption,
    description: draft.description.trim() || null,
    search_phrases: parseListInput(draft.search_phrases),
    hashtags: parseHashtags(draft.hashtags, existing?.hashtags ?? []),
    call_to_action: draft.call_to_action.trim() || null,
    pinned_comment: draft.pinned_comment.trim() || null,
    thumbnail_concept: draft.thumbnail_concept.trim() || null,
    opening_overlay: draft.opening_overlay.trim() || null,
    alternative_hooks: parseListInput(draft.alternative_hooks),
    suggested_duration_seconds: draft.suggested_duration_seconds
      ? Number(draft.suggested_duration_seconds) || null
      : null,
    recommended_excerpt: draft.recommended_excerpt.trim() || null,
    accessibility_notes: draft.accessibility_notes.trim() || null,
    rationale: draft.rationale.trim() || null,
    source: context.source ?? existing?.source ?? 'manual',
    status: context.status,
    is_demo: existing?.is_demo ?? false,
    created_at: existing?.created_at ?? now,
    updated_at: now,
    schema_version: SCHEMA_VERSION,
  };
}

export default function MetadataStudioPage() {
  const { data, upsertMetadata, removeMetadata, integrations } = useWorkspace();
  const { toast } = useToast();
  const [searchParams, setSearchParams] = useSearchParams();

  const [query, setQuery] = useState('');
  const [ideaId, setIdeaId] = useState<string>('');
  const [platform, setPlatform] = useState<Platform>('youtube-shorts');
  const [tone, setTone] = useState<Tone>(data.preferences.default_tone);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [dirty, setDirty] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [mode, setMode] = useState<'single' | 'batch'>('single');
  const [aiError, setAiError] = useState<string | null>(null);

  const ideas = useMemo(() => {
    const term = query.trim().toLowerCase();
    return data.content_ideas
      .filter((idea) =>
        term ? `${idea.title} ${idea.hook} ${idea.concept_description}`.toLowerCase().includes(term) : true,
      )
      .sort((a, b) => b.updated_at.localeCompare(a.updated_at));
  }, [data.content_ideas, query]);

  // Deep links: ?package=<id> or ?idea=<id>
  useEffect(() => {
    const packageId = searchParams.get('package');
    const ideaParam = searchParams.get('idea');
    if (packageId) {
      const pkg = data.metadata_packages.find((item) => item.id === packageId);
      if (pkg) {
        setIdeaId(pkg.content_idea_id ?? '');
        setPlatform(pkg.platform);
        setTone(pkg.tone);
        setDraft(draftFromPackage(pkg));
        setDirty(false);
      }
    } else if (ideaParam) {
      setIdeaId(ideaParam);
    }
  }, [data.metadata_packages, searchParams]);

  const idea = data.content_ideas.find((item) => item.id === ideaId) ?? null;
  const song = data.songs.find((item) => item.id === idea?.song_id) ?? null;
  const preset = data.presets.find((item) => item.id === idea?.source_preset_id) ?? null;
  const existing = data.metadata_packages.find(
    (pkg) => pkg.content_idea_id === ideaId && pkg.platform === platform,
  );

  useEffect(() => {
    if (existing) {
      setDraft(draftFromPackage(existing));
      setTone(existing.tone);
      setDirty(false);
    } else {
      setDraft(null);
      setDirty(false);
    }
  }, [existing?.id, ideaId, platform]); // eslint-disable-line react-hooks/exhaustive-deps

  const selectIdea = (nextId: string) => {
    setIdeaId(nextId);
    setAiError(null);
    const next = new URLSearchParams(searchParams);
    next.delete('package');
    next.set('idea', nextId);
    setSearchParams(next, { replace: true });
  };

  const updateDraft = <K extends keyof Draft>(key: K, value: Draft[K]) => {
    setDraft((current) => (current ? { ...current, [key]: value } : current));
    setDirty(true);
  };

  const generateLocal = async (allPlatforms: boolean) => {
    if (!idea) return;
    setGenerating(true);
    try {
      const targets = allPlatforms ? [...PLATFORMS] : [platform];
      const packages: MetadataPackage[] = targets.map((target) => {
        const draftLocal = buildLocalMetadata({ idea, song, preset, platform: target, tone });
        const current = data.metadata_packages.find(
          (pkg) => pkg.content_idea_id === idea.id && pkg.platform === target,
        );
        return {
          ...makeMetadataPackage(draftLocal),
          ...(current
            ? {
                id: current.id,
                created_at: current.created_at,
                status: current.status ?? 'draft',
                is_demo: current.is_demo ?? false,
              }
            : {}),
          id: current?.id ?? newId('meta'),
          platform: target,
          updated_at: nowIso(),
        };
      });
      await upsertMetadata(packages);
      const selected = packages.find((pkg) => pkg.platform === platform);
      if (selected) {
        setDraft(draftFromPackage(selected));
        setDirty(false);
      }
      toast(
        allPlatforms
          ? `${targets.length} platform drafts created`
          : `${PLATFORM_LABELS[platform]} draft created`,
        {
          tone: 'success',
          description: 'Built from your saved idea and song fields. Not trend research, and not AI output.',
        },
      );
    } catch {
      toast('The drafts could not be saved', { tone: 'error' });
    } finally {
      setGenerating(false);
    }
  };

  const generateWithAi = async () => {
    if (!idea) return;
    setGenerating(true);
    setAiError(null);
    const controller = new AbortController();
    try {
      const result = await runOperation<Record<string, unknown>>(
        'generate-metadata',
        metadataContext(idea, song, preset, tone, [platform]),
        { signal: controller.signal },
      );
      if (result.mock) {
        throw new Error('The server is using the mock AI provider, so no usable content was returned.');
      }
      const parsed = parseMetadataPlatforms(result.data);
      const target = parsed[0]!;
      const current = data.metadata_packages.find(
        (pkg) => pkg.content_idea_id === idea.id && pkg.platform === target.platform,
      );
      const pkg: MetadataPackage = {
        id: current?.id ?? newId('meta'),
        content_idea_id: idea.id,
        song_id: idea.song_id ?? null,
        platform: target.platform,
        tone,
        title: target.title,
        caption: target.caption,
        description: target.description,
        search_phrases: target.search_phrases,
        hashtags: target.hashtags,
        call_to_action: target.call_to_action,
        pinned_comment: target.pinned_comment,
        thumbnail_concept: target.thumbnail_concept,
        opening_overlay: target.opening_overlay,
        alternative_hooks: target.alternative_hooks,
        suggested_duration_seconds: target.suggested_duration_seconds,
        recommended_excerpt: target.recommended_excerpt,
        accessibility_notes: target.accessibility_notes,
        rationale: target.rationale,
        source: 'ai',
        status: 'draft',
        is_demo: false,
        created_at: current?.created_at ?? nowIso(),
        updated_at: nowIso(),
        schema_version: SCHEMA_VERSION,
      };
      await upsertMetadata([pkg]);
      setPlatform(pkg.platform);
      setDraft(draftFromPackage(pkg));
      setDirty(false);
      toast('AI package saved as a draft', {
        tone: 'success',
        description: result.meta.model ? `Model: ${result.meta.model}. Review before publishing.` : undefined,
      });
    } catch (error) {
      if (isAbortError(error)) {
        toast('AI request cancelled', { tone: 'info' });
      } else {
        setAiError(describeAiError(error));
      }
    } finally {
      setGenerating(false);
    }
  };

  const saveDraft = async (status: 'draft' | 'final' = draft?.status ?? 'draft') => {
    if (!draft || !idea) return;
    const pkg = buildPackageFromDraft(draft, {
      ideaId: idea.id,
      songId: idea.song_id ?? null,
      platform,
      tone,
      existing,
      status,
    });
    await upsertMetadata([pkg]);
    setDraft(draftFromPackage(pkg));
    setDirty(false);
    toast(status === 'final' ? 'Package marked final' : 'Draft saved', { tone: 'success' });
  };

  const regenerateField = (field: keyof Draft) => {
    if (!idea || !draft) return;
    const local = buildLocalMetadata({ idea, song, preset, platform, tone });
    const map: Partial<Record<keyof Draft, string>> = {
      title: local.title,
      caption: local.caption,
      description: local.description ?? '',
      opening_overlay: local.opening_overlay ?? '',
      thumbnail_concept: local.thumbnail_concept ?? '',
      pinned_comment: local.pinned_comment ?? '',
      call_to_action: local.call_to_action ?? '',
      search_phrases: (local.search_phrases ?? []).join('\n'),
      hashtags: hashtagsToInput(local.hashtags),
      alternative_hooks: (local.alternative_hooks ?? []).join('\n'),
      suggested_duration_seconds: local.suggested_duration_seconds
        ? String(local.suggested_duration_seconds)
        : '',
      recommended_excerpt: local.recommended_excerpt ?? '',
      accessibility_notes: local.accessibility_notes ?? '',
      rationale: local.rationale ?? '',
    };
    const value = map[field];
    if (typeof value === 'string') {
      updateDraft(field, value as never);
      toast('Field regenerated', {
        tone: 'success',
        description: 'Replaced with a fresh local template value. Your other edits are untouched.',
      });
    }
  };

  const deletePackage = async () => {
    if (!existing) return;
    await removeMetadata([existing.id]);
    setDraft(null);
    setDirty(false);
    toast('Package deleted', { tone: 'success' });
  };

  const exportPackages = () => {
    if (!idea) return;
    const list = data.metadata_packages.filter((pkg) => pkg.content_idea_id === idea.id);
    if (!list.length) {
      toast('No packages to export yet', { tone: 'error' });
      return;
    }
    const payload = buildMetadataExport(list);
    const name = downloadPayload(payload, exportFilename(payload, `${idea.title}-metadata`));
    toast('Packages exported', { tone: 'success', description: name });
  };

  const conventions = PLATFORM_CONVENTIONS[platform];
  const chapters = useMemo(
    () =>
      conventions.chapters && idea
        ? buildChapters({ idea, song, preset })
        : [],
    [conventions.chapters, idea, song, preset],
  );
  const packagesForIdea = data.metadata_packages.filter((pkg) => pkg.content_idea_id === ideaId);

  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow="Metadata Studio"
        title="Platform-specific publishing packages"
        description="A different package per surface — Shorts, Reels, TikTok and long-form YouTube — not one caption copied around. Written from your saved idea — no invented links, trends or statistics."
        actions={
          <>
            <SegmentedControl
              ariaLabel="Metadata mode"
              value={mode}
              onChange={(value) => setMode(value)}
              options={[
                { value: 'single', label: 'One idea' },
                { value: 'batch', label: 'Batch' },
              ]}
            />
            <button type="button" className="btn-secondary" onClick={exportPackages} disabled={!idea || mode === 'batch'}>
              <Icon name="download" size={15} />
              Export packages
            </button>
            {idea ? (
              <Link to={`/ideas/${idea.id}`} className="btn-secondary">
                <Icon name="edit" size={15} />
                Edit idea
              </Link>
            ) : null}
          </>
        }
      />

      {data.content_ideas.length === 0 ? (
        <EmptyState
          icon="tag"
          title="No content ideas yet"
          description="Metadata is generated from a saved idea, so that titles and captions match what the video actually shows."
          actions={
            <Link to="/library?pick=1" className="btn-primary btn-sm">
              Create an idea
            </Link>
          }
        />
      ) : (
        mode === 'batch' ? (
          <BatchStudio />
        ) : (
        <div className="grid gap-4 lg:grid-cols-[300px_minmax(0,1fr)]">
          <div className="space-y-2">
            <SearchField value={query} onChange={setQuery} label="Search ideas" placeholder="Find an idea…" />
            <ul className="max-h-[60vh] space-y-1 overflow-y-auto pr-1 scroll-thin">
              {ideas.map((item) => {
                const count = data.metadata_packages.filter((pkg) => pkg.content_idea_id === item.id).length;
                return (
                  <li key={item.id}>
                    <button
                      type="button"
                      onClick={() => selectIdea(item.id)}
                      className={`w-full rounded-lg border px-3 py-2 text-left transition-colors ${
                        item.id === ideaId
                          ? 'border-accent/40 bg-accent-dim/30'
                          : 'border-white/[0.06] bg-white/[0.022] hover:border-white/[0.10]'
                      }`}
                      aria-pressed={item.id === ideaId}
                    >
                      <span className="block truncate text-sm text-slate-text">{item.title}</span>
                      <span className="mt-0.5 block truncate text-2xs text-slate-faint">
                        {data.songs.find((s) => s.id === item.song_id)?.title ?? 'No song'} · {count} package
                        {count === 1 ? '' : 's'}
                      </span>
                    </button>
                  </li>
                );
              })}
              {ideas.length === 0 ? (
                <li className="rounded-lg border border-dashed border-white/[0.10] px-3 py-4 text-center text-xs text-slate-faint">
                  No ideas match “{query}”.
                </li>
              ) : null}
            </ul>
          </div>

          <div className="space-y-4">
            {!idea ? (
              <EmptyState
                icon="tag"
                title="Choose an idea"
                description="Pick an idea on the left to build its publishing packages."
              />
            ) : (
              <>
                <SectionCard
                  title={idea.title}
                  description={
                    <span className="flex flex-wrap items-center gap-2">
                      <span>{song ? song.title : 'No song linked'}</span>
                      <span>·</span>
                      <span>
                        {packagesForIdea.length
                          ? `${packagesForIdea.length} package${packagesForIdea.length === 1 ? '' : 's'} saved`
                          : 'No packages yet'}
                      </span>
                    </span>
                  }
                  actions={
                    <SegmentedControl
                      ariaLabel="Platform package"
                      value={platform}
                      onChange={(value) => {
                        setPlatform(value);
                        const next = new URLSearchParams(searchParams);
                        next.delete('package');
                        setSearchParams(next, { replace: true });
                      }}
                      options={PLATFORMS.map((value) => ({
                        value,
                        label: PLATFORM_SHORT_LABELS[value],
                      }))}
                    />
                  }
                >
                  <div className="grid gap-4 sm:grid-cols-2">
                    <Select
                      label="Tone"
                      value={tone}
                      onChange={(event) => setTone(event.target.value as Tone)}
                      options={TONES.map((value) => ({ value, label: value }))}
                      hint="Tone only affects locally generated drafts. Your edits are never overwritten automatically."
                    />
                    <div className="flex flex-wrap items-end gap-2">
                      <button
                        type="button"
                        className="btn-primary btn-sm"
                        onClick={() => generateLocal(true)}
                        disabled={generating}
                      >
                        <Icon name="sparkle" size={13} />
                        Generate all {PLATFORMS.length}
                      </button>
                      <button
                        type="button"
                        className="btn-secondary btn-sm"
                        onClick={() => generateLocal(false)}
                        disabled={generating}
                      >
                        Generate {PLATFORM_LABELS[platform]} only
                      </button>
                      <button
                        type="button"
                        className="btn-secondary btn-sm"
                        onClick={generateWithAi}
                        disabled={generating || !integrations?.ai.configured}
                        title={
                          integrations?.ai.configured
                            ? 'Use the configured AI provider'
                            : 'No AI provider is configured on the server'
                        }
                      >
                        <Icon name="bulb" size={13} />
                        Use AI
                      </button>
                    </div>
                  </div>

                  <p className="mt-3 text-2xs leading-relaxed text-slate-faint">{conventions.notes}</p>
                  {!integrations?.ai.configured ? (
                    <p className="mt-2 text-2xs text-slate-faint">
                      AI generation is off. Local generation works fully offline and is labelled as a template draft.
                    </p>
                  ) : null}
                  {aiError ? (
                    <Callout tone="warning" title="AI generation failed">
                      <p>{aiError}</p>
                      <p className="mt-1 text-slate-faint">Nothing was saved. You can retry or use the local draft.</p>
                    </Callout>
                  ) : null}
                </SectionCard>

                {!draft ? (
                  <EmptyState
                    icon="tag"
                    title={`No ${PLATFORM_LABELS[platform]} package yet`}
                    description="Generate a draft from your idea, then edit every field. Nothing is published by this app."
                    actions={
                      <button type="button" className="btn-primary btn-sm" onClick={() => generateLocal(false)} disabled={generating}>
                        {generating ? 'Generating…' : 'Generate local draft'}
                      </button>
                    }
                  />
                ) : (
                  <>
                    <SectionCard
                      title="Package content"
                      description={
                        conventions.longForm
                          ? `${PLATFORM_LABELS[platform]} · title ≤ ${conventions.titleLimit}, description ≤ ${conventions.captionLimit.toLocaleString()} · ${conventions.chapters ? 'chapters (3+ timestamps, first at 0:00, 10s apart)' : ''}`
                          : `${PLATFORM_LABELS[platform]} · character guidance: title ≤ ${conventions.titleLimit}, caption ≤ ${conventions.captionLimit}`
                      }
                      actions={
                        <>
                          <span className="chip">{draft.status}</span>
                          <span className="chip">
                            {draft.title.length}{' '}
                            {draft.title.length > conventions.titleLimit ? '⚠️' : ''}
                          </span>
                        </>
                      }
                    >
                      <div className="space-y-4">
                        <div className="flex flex-wrap items-end gap-2">
                          <div className="min-w-0 flex-1">
                            <TextInput
                              label={conventions.titleLabel}
                              value={draft.title}
                              onChange={(event) => updateDraft('title', event.target.value)}
                              hint={`${draft.title.length}/${conventions.titleLimit} characters recommended`}
                            />
                          </div>
                          <CopyButton text={draft.title} label="Copy" />
                          <button type="button" className="btn-ghost btn-sm" onClick={() => regenerateField('title')}>
                            Regenerate
                          </button>
                        </div>

                        <div>
                          <div className="mb-1.5 flex items-center justify-between">
                            <span className="field-label mb-0">
                              {conventions.longForm ? 'Description' : 'Caption'}
                            </span>
                            <div className="flex gap-1">
                              <CopyButton text={draft.caption} label="Copy" className="btn-ghost btn-sm" />
                              <button type="button" className="btn-ghost btn-sm" onClick={() => regenerateField('caption')}>
                                Regenerate
                              </button>
                            </div>
                          </div>
                          <textarea
                            className="input"
                            rows={6}
                            value={draft.caption}
                            onChange={(event) => updateDraft('caption', event.target.value)}
                          />
                          {conventions.longForm ? (
                            <div className="mt-2 space-y-2">
                              <p className="text-2xs text-slate-faint">
                                {draft.caption.length.toLocaleString()} of{' '}
                                {conventions.captionLimit.toLocaleString()} recommended · first{' '}
                                {conventions.visibleCaptionHint} characters show before “more”
                              </p>
                              {chapters.length > 0 ? (
                                <div className="rounded-lg border border-line bg-surface-raised/60 p-2.5">
                                  <div className="mb-1.5 flex flex-wrap items-center justify-between gap-2">
                                    <span className="field-label mb-0">Chapter block</span>
                                    <CopyButton
                                      text={chaptersToText(chapters)}
                                      label="Copy chapters"
                                      className="btn-ghost btn-sm"
                                    />
                                  </div>
                                  <pre className="overflow-x-auto text-2xs text-slate">{
                                    chaptersToText(chapters)
                                  }</pre>
                                  <p className="mt-1 text-2xs text-slate-faint">
                                    Paste into the description. YouTube needs a 0:00 entry, at least three
                                    timestamps and 10 seconds between each.
                                  </p>
                                </div>
                              ) : null}
                            </div>
                          ) : (
                            <p className="mt-1 text-2xs text-slate-faint">
                              {draft.caption.split(/\n/)[0]?.length ?? 0} characters in the first line ·{' '}
                              {draft.caption.length} total
                            </p>
                          )}
                        </div>

                        <div>
                          <div className="mb-1.5 flex items-center justify-between">
                            <span className="field-label mb-0">
                              Description{' '}
                              {conventions.longForm
                                ? '(paste the same block here if you keep description and caption separate)'
                                : platform !== 'youtube-shorts'
                                  ? '(optional)'
                                  : ''}
                            </span>
                            <button type="button" className="btn-ghost btn-sm" onClick={() => regenerateField('description')}>
                              Regenerate
                            </button>
                          </div>
                          <textarea
                            className="input"
                            rows={5}
                            value={draft.description}
                            onChange={(event) => updateDraft('description', event.target.value)}
                            placeholder={
                              conventions.longForm
                                ? 'Chapters, credits and links — YouTube shows up to 5,000 characters here'
                                : platform === 'youtube-shorts'
                                  ? 'Context plus the real song link, if you have one stored'
                                  : 'Optional. Most platforms do not surface a separate description.'
                            }
                          />
                        </div>

                        <div className="grid gap-4 sm:grid-cols-2">
                          <div className="flex items-end gap-2">
                            <TextInput
                              label="Opening text overlay"
                              fieldClassName="flex-1"
                              value={draft.opening_overlay}
                              onChange={(event) => updateDraft('opening_overlay', event.target.value)}
                            />
                            <button type="button" className="btn-ghost btn-sm" onClick={() => regenerateField('opening_overlay')}>
                              Regenerate
                            </button>
                          </div>
                          <div className="flex items-end gap-2">
                            <TextInput
                              label="Call to action"
                              fieldClassName="flex-1"
                              value={draft.call_to_action}
                              onChange={(event) => updateDraft('call_to_action', event.target.value)}
                            />
                            <button type="button" className="btn-ghost btn-sm" onClick={() => regenerateField('call_to_action')}>
                              Regenerate
                            </button>
                          </div>
                          <TextInput
                            label="Pinned comment suggestion"
                            optional
                            value={draft.pinned_comment}
                            onChange={(event) => updateDraft('pinned_comment', event.target.value)}
                          />
                          <TextInput
                            label="Cover / thumbnail concept"
                            optional
                            value={draft.thumbnail_concept}
                            onChange={(event) => updateDraft('thumbnail_concept', event.target.value)}
                          />
                          <TextInput
                            label="Suggested clip duration (seconds)"
                            optional
                            inputMode="numeric"
                            value={draft.suggested_duration_seconds}
                            onChange={(event) => updateDraft('suggested_duration_seconds', event.target.value)}
                          />
                          <TextInput
                            label="Recommended song excerpt"
                            optional
                            value={draft.recommended_excerpt}
                            onChange={(event) => updateDraft('recommended_excerpt', event.target.value)}
                          />
                        </div>

                        <div className="grid gap-4 sm:grid-cols-2">
                          <Field label="Search phrases" hint="One per line. How a listener might search for this.">
                            <textarea
                              className="input"
                              rows={4}
                              value={draft.search_phrases}
                              onChange={(event) => updateDraft('search_phrases', event.target.value)}
                            />
                          </Field>
                          <Field
                            label="Hashtags"
                            hint={`${conventions.hashtagTarget} relevant tags is usually enough. Tags never guarantee reach.`}
                          >
                            <textarea
                              className="input"
                              rows={4}
                              value={draft.hashtags}
                              onChange={(event) => updateDraft('hashtags', event.target.value)}
                            />
                          </Field>
                        </div>

                        <Field label="Alternative hooks" hint="One per line. Test one against another.">
                          <textarea
                            className="input"
                            rows={3}
                            value={draft.alternative_hooks}
                            onChange={(event) => updateDraft('alternative_hooks', event.target.value)}
                          />
                        </Field>

                        <Field label="Accessibility notes">
                          <textarea
                            className="input"
                            rows={3}
                            value={draft.accessibility_notes}
                            onChange={(event) => updateDraft('accessibility_notes', event.target.value)}
                          />
                        </Field>

                        <Field label="Rationale" hint="Why these choices were made for this platform.">
                          <textarea
                            className="input"
                            rows={3}
                            value={draft.rationale}
                            onChange={(event) => updateDraft('rationale', event.target.value)}
                          />
                        </Field>

                        <div className="flex flex-wrap items-center gap-2 border-t border-white/[0.06] pt-3">
                          <button type="button" className="btn-primary btn-sm" onClick={() => saveDraft('draft')} disabled={!dirty}>
                            {dirty ? 'Save draft' : 'Saved'}
                          </button>
                          <button type="button" className="btn-secondary btn-sm" onClick={() => saveDraft('final')}>
                            Mark final
                          </button>
                          <CopyButton
                            label="Copy package"
                            getText={() =>
                              metadataPackageToText(
                                buildPackageFromDraft(draft, {
                                  ideaId: idea.id,
                                  songId: idea.song_id ?? null,
                                  platform,
                                  tone,
                                  existing,
                                  status: draft.status,
                                }),
                              )
                            }
                          />
                          {existing ? (
                            <button type="button" className="btn-ghost btn-sm text-danger" onClick={deletePackage}>
                              Delete package
                            </button>
                          ) : null}
                        </div>
                      </div>
                    </SectionCard>

                    <SectionCard title="Hashtags and reasons">
                      {parseHashtags(draft.hashtags).length ? (
                        <ul className="flex flex-wrap gap-1.5">
                          {parseHashtags(draft.hashtags, existing?.hashtags ?? []).map((tag) => (
                            <li key={tag.tag} className="chip" title={tag.reason ?? undefined}>
                              {tag.tag}
                            </li>
                          ))}
                        </ul>
                      ) : (
                        <p className="text-sm text-slate-faint">No hashtags in this package.</p>
                      )}
                      <p className="mt-3 text-2xs leading-relaxed text-slate-faint">
                        Relevance is explained for generated tags. Adding hashtags does not make a video trend, and this
                        app has no live hashtag data.
                      </p>
                    </SectionCard>
                  </>
                )}
              </>
            )}
          </div>
        </div>
        )
      )}

      <p className="text-2xs text-slate-faint">
        Platform conventions change. Verify current limits in the platform itself before publishing.
      </p>
    </div>
  );
}
