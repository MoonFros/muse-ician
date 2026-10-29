import type { Preset } from '../lib/types';

/**
 * Long-form YouTube presets.
 *
 * A visualiser, a full lyric video or a live session is a *destination*: people
 * arrive from search, a playlist or a link, and they sit through it. That is a
 * different craft problem from a 20-second hook, so these presets carry their
 * own runtimes, shot lists and metadata rules (chapters, description-first copy,
 * a custom thumbnail that survives at 320 px).
 *
 * Kept in their own module so the short-form library stays readable; both are
 * concatenated into `SEED_PRESETS` and regenerated into the downloadable pack.
 */

type SeedPreset = Omit<Preset, 'created_at' | 'updated_at' | 'schema_version' | 'preset_version'>;

export const LONG_FORM_PRESETS_RAW: SeedPreset[] = [
  {
    id: 'preset-visualiser-loop',
    title: 'Official visualiser',
    summary: 'A full-length, slow-moving visual loop that gives the song somewhere to live on YouTube.',
    description:
      'A visualiser is not a music video and should not pretend to be. Its job is to be pleasant enough to leave running: one strong texture, a slow camera move or a looping animation, the song title appearing once near the start and once near the end, and no cuts that demand attention. Because it runs for the full song, the work is front-loaded — build the loop once, then make sure it never repeats visibly enough to distract. Treat the description as the real product: title, chapters, links, credits.',
    objectives: ['song-promotion', 'artist-identity', 'discovery'],
    secondary_objectives: ['artist-identity'],
    platforms: ['youtube-long'],
    duration_seconds: { min: 150, max: 300 },
    difficulty: 'moderate',
    budget: 'minimal',
    filming_methods: ['animation', 'hybrid'],
    face_visibility: 'none',
    equipment: ['phone-or-camera', 'editing-software'],
    tags: ['visualiser', 'loop', 'long-form', 'ambient', 'no-face'],
    genre_tags: ['ambient', 'lo-fi', 'r&b', 'electronic', 'indie'],
    mood_tags: ['dreamy', 'melancholy', 'calm'],
    campaign_stage: 'release-week',
    song_context_required: 'The final mix, plus one visual texture you already own (footage, photo, illustration or shader).',
    hook_examples: [
      'A slow drive through a town you left',
      'One window, one lamp, four minutes of weather',
      'The artwork, breathing',
    ],
    execution_steps: [
      'Export the full song with no fade-outs you do not want preserved.',
      'Choose one texture and commit: a single location, a looping animation, or the cover art with slow movement.',
      'Build a 15–30 second loop, then repeat it for the full runtime with one change every 45–60 seconds so it never reads as a freeze.',
      'Put the song title and artist name on screen for 4 seconds at 0:00–0:05, then again in the last 10 seconds with the release date.',
      'Render at 1080p or higher, 24 or 30 fps, with a flat, dark background that survives YouTube compression.',
      'Write the description with chapters, a listen link and credits, then set a custom 1280×720 thumbnail.',
    ],
    shot_list: [
      'Opening frame: title card over the visual texture',
      'Loop A: 15–30 seconds of the base texture',
      'Loop A variant: one element changed (light, colour, movement)',
      'Closing frame: song title, artist, release date, link text',
    ],
    on_screen_text: [
      'Song title — artist name (0:00–0:05)',
      'Release date, lower third (last 10 seconds)',
    ],
    audio_guidance: 'Use the mastered mix. Do not compress it again for the video render.',
    editing_notes:
      'Keep movement slower than you think. YouTube compression punishes fine grain and fast gradients, so use a slightly darker palette and avoid pure white text edges on a moving background.',
    cta_examples: [
      'Full song is on streaming — link in the description.',
      'If you want the story behind this one, the next video breaks it down.',
    ],
    common_mistakes: [
      'Making a five-minute video with one static image — viewers notice the freeze within 20 seconds.',
      'Putting a 30-second intro before the music starts; people came for the song.',
      'Uploading at 720p, which makes soft gradients band badly.',
    ],
    accessibility_notes:
      'Add a description of the visuals for screen-reader users; there is no speech to caption. Avoid strobing or rapid brightness changes — a slow loop is the safer choice for photosensitivity.',
    example_metadata: {
      tone: 'cinematic',
      title_example: 'Low Tide — Official Visualiser',
      caption_example:
        'Four minutes of the same window, the same lamp, and a song about leaving. Chapters in the description if you want to jump to the second verse.',
      hashtag_examples: ['#visualiser', '#indiepop', '#newmusic'],
    },
    estimated_production_minutes: 120,
    is_user_created: false,
    is_archived: false,
    usage_count: 0,
    is_favorite: false,
  },
  {
    id: 'preset-lyric-video-full',
    title: 'Full lyric video',
    summary: 'Every line of the song, timed properly, built for people who search the lyrics.',
    description:
      'Search traffic for lyrics is one of the few reliable long-form entry points for independent artists: someone hears the song, half-remembers a line, and searches for it. A lyric video serves that person. The craft is in the timing — each line appears slightly before it is sung, holds through the phrase, and clears before the next line lands. Typography, contrast and a slow background matter more than effects, and the on-screen text should be readable on a phone at a glance.',
    objectives: ['discovery', 'song-promotion'],
    secondary_objectives: ['song-promotion'],
    platforms: ['youtube-long'],
    duration_seconds: { min: 150, max: 300 },
    difficulty: 'moderate',
    budget: 'minimal',
    filming_methods: ['static-text', 'animation'],
    face_visibility: 'none',
    equipment: ['editing-software', 'lyrics-text'],
    tags: ['lyric-video', 'long-form', 'search', 'typography', 'no-face'],
    genre_tags: ['pop', 'hip-hop', 'r&b', 'indie', 'singer-songwriter'],
    mood_tags: ['emotional', 'hopeful', 'bittersweet'],
    campaign_stage: 'post-release',
    song_context_required: 'Final lyrics, checked word for word against the master.',
    hook_examples: [
      'Every line, timed to the word',
      'The lyric everyone mishears',
      'Full lyrics — no cuts, no talking',
    ],
    execution_steps: [
      'Paste the final lyrics and check them against the master vocal word by word.',
      'Time each line to start a beat before it is sung and clear before the next phrase.',
      'Choose one typeface, one accent colour and one background; keep contrast above 4.5:1.',
      'Add the song title and artist name in the first 5 seconds, and again in the description.',
      'Include a subtle progress hint (chapter markers) rather than a busy lower third.',
      'Export at 1080p, then watch it on a phone at arm’s length and fix anything you cannot read.',
    ],
    shot_list: [
      'Title card: song title, artist, 3–5 seconds',
      'Verse block: timed lines over a slow background',
      'Chorus block: same system, slightly stronger accent colour',
      'Bridge / outro: credits and listen link',
    ],
    on_screen_text: ['Song title and artist (0:00)', 'Each lyric line, timed', 'Credits and link (final 10 seconds)'],
    audio_guidance: 'Use the master; keep the vocal forward, since people are reading along.',
    editing_notes:
      'Never centre two lines of different lengths without checking the jump — use a fixed baseline. Slight fades of 80–120 ms stop the text from strobing.',
    cta_examples: ['Lyrics in the description too — link to the song there.', 'Tell me which line you had wrong.'],
    common_mistakes: [
      'Lines that appear after they are sung, which makes the video feel broken.',
      'Decorative scripts that are unreadable at phone size.',
      'Leaving in a typo — lyric searches are unforgiving.',
    ],
    accessibility_notes:
      'Burn in the lyrics and also upload a subtitle file; do not use colour alone to signal a new section. Keep text at least 24 px at 1080×1920 height equivalents.',
    example_metadata: {
      tone: 'direct',
      title_example: 'Low Tide — lyrics',
      caption_example:
        'The whole song, every line, timed to the vocal. Chapters in the description so you can find the second verse.',
      hashtag_examples: ['#lyrics', '#indiepop', '#songwriter'],
    },
    estimated_production_minutes: 150,
    is_user_created: false,
    is_archived: false,
    usage_count: 0,
    is_favorite: false,
  },
  {
    id: 'preset-live-session-long',
    title: 'Live session, one take',
    summary: 'A full performance captured in one room, with nothing hidden in the edit.',
    description:
      'A one-take session is the cheapest proof that the song is real: one room, one or two mics, no cuts, no autotune. It earns trust in a way a polished visualiser cannot, and it gives you a long-form asset you can re-cut into Shorts for months. Keep the frame wide enough to show that nothing is being faked, and resist the urge to add B-roll — the unbroken take is the format.',
    objectives: ['artist-identity', 'audience-engagement', 'song-promotion'],
    secondary_objectives: [],
    platforms: ['youtube-long'],
    duration_seconds: { min: 150, max: 360 },
    difficulty: 'challenging',
    budget: 'low',
    filming_methods: ['live-action'],
    face_visibility: 'required',
    equipment: ['camera', 'microphone', 'tripod', 'audio-interface'],
    tags: ['live', 'one-take', 'session', 'performance', 'long-form'],
    genre_tags: ['acoustic', 'soul', 'folk', 'indie', 'r&b'],
    mood_tags: ['intimate', 'raw', 'warm'],
    campaign_stage: 'post-release',
    song_context_required: 'A performance-ready arrangement you can play through without stopping.',
    hook_examples: [
      'One take, one room, no edits',
      'This is the version we play live',
      'Recorded at 11pm with the window open',
    ],
    execution_steps: [
      'Rehearse the full song until you can play it through twice without stopping.',
      'Set one wide frame that shows the whole performance and a second angle only if you can cut without hiding a mistake.',
      'Record audio separately if you can, then sync it; phone audio is acceptable if the room is quiet.',
      'Do three full takes and pick the one with the best performance, not the fewest mistakes.',
      'Add the song title and artist at 0:00 and a listen link in the description.',
      'Cut three vertical excerpts from the take for Shorts, Reels and TikTok.',
    ],
    shot_list: [
      'Wide: full frame, performance to camera',
      'Medium: hands and instrument detail (insert only, never covering a mistake)',
      'Close: face during the final chorus',
      'End card: title, artist, listen link',
    ],
    audio_guidance: 'Separate audio if possible; otherwise mic within 60 cm and treat the room.',
    editing_notes:
      'Do not cut within a verse. Grade gently — noise reduction that eats breath sounds makes the take feel synthetic.',
    cta_examples: ['Full version on streaming — link below.', 'Which take would you have picked?'],
    common_mistakes: [
      'Splicing takes and calling it one take; people notice, and it defeats the point.',
      'Filming too tight, so there is no visual evidence of continuity.',
      'A blank end card with no link.',
    ],
    accessibility_notes:
      'Upload captions of the lyrics even though it is a performance; many viewers watch muted first. Keep the frame stable to reduce motion discomfort.',
    example_metadata: {
      tone: 'minimal',
      title_example: 'Low Tide — live session, one take',
      caption_example: 'One room, one take, no edits. Recorded the night before the release.',
      hashtag_examples: ['#livesession', '#onetake', '#indiepop'],
    },
    estimated_production_minutes: 180,
    is_user_created: false,
    is_archived: false,
    usage_count: 0,
    is_favorite: false,
  },
  {
    id: 'preset-making-of-doc',
    title: 'Making-of mini documentary',
    summary: 'The full story of the song in six minutes, told with the material you already have.',
    description:
      'Not a vlog and not a tutorial: a short documentary with a beginning, a turn and an ending. The beginning is the earliest version of the idea (a voice memo, a note); the turn is the problem you had to solve; the ending is what the finished song does that the demo could not. It works because it is specific — one song, one problem, one decision — and because you already own every asset: voice notes, session screenshots, phone footage from the day you wrote it.',
    objectives: ['storytelling', 'artist-identity', 'audience-engagement'],
    secondary_objectives: [],
    platforms: ['youtube-long'],
    duration_seconds: { min: 300, max: 540 },
    difficulty: 'challenging',
    budget: 'low',
    filming_methods: ['hybrid', 'live-action', 'screen-recording', 'archival-footage'],
    face_visibility: 'optional',
    equipment: ['phone-or-camera', 'editing-software', 'existing-archive'],
    tags: ['documentary', 'behind-the-song', 'process', 'long-form', 'story'],
    genre_tags: ['indie', 'singer-songwriter', 'alternative', 'pop'],
    mood_tags: ['reflective', 'hopeful', 'bittersweet'],
    campaign_stage: 'evergreen',
    song_context_required: 'An archive of the song’s early versions, plus the finished mix.',
    hook_examples: [
      'I wrote this song in one night and then changed everything about it',
      'The version you have never heard',
      'This song took two years and one wrong decision',
    ],
    execution_steps: [
      'Write one sentence describing the problem the song had, and one describing how you solved it.',
      'Gather the archive: voice memos, screenshots, notes, photos from that period.',
      'Record a voiceover of the story in one sitting, then cut it down to 90 seconds of narration.',
      'Lay the narration against the archive, letting the song play under the strongest moments.',
      'Record two talking-head pieces: the setup and the reflection at the end.',
      'Finish with the finished song playing over the credits, and add chapters for each beat.',
    ],
    shot_list: [
      'Opening: the voice memo played from the phone, screen visible',
      'Setup: talking head, one take, neutral background',
      'Middle: archive montage cut to the narration',
      'Turn: the session screenshot or the rejected version',
      'End: finished song, credits, listen link',
    ],
    on_screen_text: ['“The first voice memo”, date', '“The version that didn’t work”', 'Song title, artist, link'],
    audio_guidance: 'Narration forward, song ducked to −18 dB under speech, full level in the payoff.',
    editing_notes:
      'Cut narration sentences, not breaths. Keep archive footage at its natural quality — over-sharpening old phone video makes it obvious you upscaled.',
    cta_examples: ['The finished song is linked below.', 'What should I document next?'],
    common_mistakes: [
      'Making it about you rather than about the song.',
      'Six minutes of talking heads with no archive proof.',
      'No reason to stay past 30 seconds — put the best moment early.',
    ],
    accessibility_notes:
      'Burn in captions for the narration; add audio description for archive segments if the visuals carry information. Avoid archival footage with flashing lights.',
    example_metadata: {
      tone: 'storytelling',
      title_example: 'The version of Low Tide nobody heard',
      caption_example:
        'Two years, three rewrites and one decision that changed the whole song. The finished track is linked in the description.',
      hashtag_examples: ['#behindthesong', '#makingof', '#songwriter'],
    },
    estimated_production_minutes: 480,
    is_user_created: false,
    is_archived: false,
    usage_count: 0,
    is_favorite: false,
  },
  {
    id: 'preset-song-breakdown-long',
    title: 'Song arrangement breakdown',
    summary: 'Teach the arrangement: sound selection, structure and the decisions behind them.',
    description:
      'A long-form breakdown is the most searchable thing an independent producer can publish, because it answers a question other musicians actually type: how was this made? Show the arrangement, isolate the layers, and explain why each one exists. The audience is other artists and curious listeners — both reward specifics. Show the screen, keep the pace moving, and never pad a section you have nothing to say about.',
    objectives: ['education', 'discovery', 'artist-identity'],
    secondary_objectives: [],
    platforms: ['youtube-long'],
    duration_seconds: { min: 300, max: 600 },
    difficulty: 'moderate',
    budget: 'minimal',
    filming_methods: ['screen-recording', 'live-action', 'hybrid'],
    face_visibility: 'optional',
    equipment: ['computer', 'screen-recorder', 'microphone'],
    tags: ['breakdown', 'production', 'education', 'long-form', 'screen-recording'],
    genre_tags: ['electronic', 'hip-hop', 'pop', 'lo-fi', 'r&b'],
    mood_tags: ['analytical', 'curious', 'calm'],
    campaign_stage: 'evergreen',
    song_context_required: 'The project file or stems, ideally with the arrangement visible.',
    hook_examples: [
      'How this song is built, layer by layer',
      'Every sound in this track, explained',
      'The arrangement trick that saved this chorus',
    ],
    execution_steps: [
      'Pick one question the video answers, and make the title that question.',
      'Record the screen while soloing each layer in the order a listener hears them.',
      'Cut every pause — breakdown videos die from dead air, not from speed.',
      'Add a short A/B: the section before and after the decision you are explaining.',
      'Keep one section where you are honest about what did not work.',
      'End with the finished section playing uninterrupted, then a link to the song.',
    ],
    shot_list: [
      'Screen capture: arrangement view, layers soloed',
      'Close-up: the specific plugin, sample or instrument',
      'Talking head: two sentences of context per section',
      'Payoff: the finished section in full',
    ],
    on_screen_text: ['Layer names as you solo them', '“Before / after” labels', 'Song title, artist, link'],
    audio_guidance: 'Voice over the music, ducked appropriately; play the payoff at full level.',
    editing_notes:
      'Zoom in on the part of the screen that matters — do not make people squint at a whole DAW. Match the on-screen colour to your channel so it reads as a series.',
    cta_examples: ['Stems and the finished song are linked below.', 'Tell me which part to break down next.'],
    common_mistakes: [
      'Playing the whole song at the start and losing the point.',
      'No visual focus — a whole screen at 1080p is unreadable on a phone.',
      'Explaining what a compressor is instead of why this choice mattered here.',
    ],
    accessibility_notes:
      'Caption the narration and describe what is on screen when it changes; screen recordings are invisible to screen readers. Keep zoom transitions slow.',
    example_metadata: {
      tone: 'direct',
      title_example: 'How I produced Low Tide — full arrangement breakdown',
      caption_example:
        'Every layer in the track, in the order you hear it. The arrangement trick in the second chorus is the reason the song works.',
      hashtag_examples: ['#musicproduction', '#beatmaking', '#ableton'],
    },
    estimated_production_minutes: 300,
    is_user_created: false,
    is_archived: false,
    usage_count: 0,
    is_favorite: false,
  },
];
