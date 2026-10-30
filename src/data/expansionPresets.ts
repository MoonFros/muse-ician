import type { Preset } from '../lib/types';

/**
 * The second wave of starter presets: sixteen short-form formats built around
 * participation, discovery framing and visual atmosphere.
 *
 * They are kept in their own module so the original starter library (30
 * short-form + 5 long-form, in `seedPresets.ts`) stays readable, and so the
 * provenance of the newer entries is obvious. Everything is concatenated into
 * `SEED_PRESETS`, which means the in-app library, the downloadable starter
 * pack and the import format are regenerated from one source.
 *
 * Every format here was added because nothing in the existing library already
 * owned it: the closest existing concept is named in each description, so the
 * differences are explicit rather than accidental.
 */

type SeedPreset = Omit<Preset, 'created_at' | 'updated_at' | 'schema_version' | 'preset_version'>;

export const EXPANSION_PRESETS_RAW: SeedPreset[] = [
  {
    id: 'preset-complete-the-lyric',
    title: 'Complete the Lyric',
    summary:
      'Play a lyric with its final word cut out and ask viewers to finish the line before the song does.',
    description:
      'The participation format with the lowest possible barrier: one line, one missing word, one comment. Choose a line that is sung slowly and clearly, so the missing word feels findable rather than random — this is the format for ballads, slow songs and hooks with clean diction. Put the line on screen as text with a visible blank, cut the audio on the syllable before the missing word, and hold two seconds of instrumental or silence. Never put the answer in the same frame as the question: reveal it in the pinned comment, the caption after a delay, or a follow-up video. The comments are the content, so reply to the wrong answers as well as the right ones.',
    objectives: ['audience-engagement', 'discovery', 'song-promotion'],
    secondary_objectives: ['community-building'],
    platforms: ['tiktok', 'instagram-reels', 'youtube-shorts'],
    duration_seconds: { min: 10, max: 20 },
    difficulty: 'easy',
    budget: 'minimal',
    filming_methods: ['static-text', 'hybrid'],
    face_visibility: 'none',
    equipment: ['phone', 'editing-software'],
    tags: ['lyrics', 'quiz', 'comments', 'interactive', 'slow-songs'],
    genre_tags: ['pop', 'r&b', 'soul', 'singer-songwriter', 'indie'],
    mood_tags: ['melancholy', 'romantic', 'reflective'],
    campaign_stage: 'evergreen',
    song_context_required:
      'One clearly sung lyric line whose final word is easy to hear and guess, plus its exact timestamp.',
    hook_examples: [
      'I removed the last word. Finish it.',
      'Complete the lyric. No cheating.',
      'Only people who have actually listened will get this one.',
    ],
    execution_steps: [
      'Choose the line and write down its exact timestamp to the tenth of a second.',
      'Check that the missing word is the emotional payoff of the line, not a filler word.',
      'Cut the audio on the syllable before the missing word and keep two seconds of instrumental.',
      'Set the line as one text card with a visible blank at the end — no artwork competing with it.',
      'Add the ask as a second, smaller card: "comment the word before you scroll".',
      'Hold the blank frame for at least two seconds so people have time to type.',
      'Reveal the answer in a pinned comment, then in a follow-up video with the full line and the song playing.',
    ],
    shot_list: [
      'One static text card, high contrast, lyric in two lines maximum',
      'Blank underline that is clearly visible on a phone screen',
      'Optional second card after the cut: "answer in the pinned comment"',
    ],
    on_screen_text: [
      'Complete the lyric:',
      'I thought that we would last forever, but ____',
      'Answer in the comments before you scroll',
    ],
    audio_guidance:
      'Use the studio vocal with no reverb tail spilling the missing word. Cut hard on the syllable and let the instrumental run two seconds — do not fade, because a fade sounds like a mistake and silence can feel broken. If the word is the last in the bar, cut on the beat before it and let the next bar play.',
    editing_notes:
      'Two cards maximum. Type at 90px or larger and test it on a phone at arm length. Do not animate the blank — a blinking cursor gives away the timing and adds nothing.',
    cta_examples: [
      'Comment your word before you scroll. I will pin the answer tomorrow.',
      'No cheating, no Shazam. How well did you do?',
      'If you got it first try, you have listened to this song too many times. Respect.',
    ],
    variations: [
      'Three lines in one video, getting progressively harder',
      'Blank the first word instead of the last for a harder version',
      'Follow-up video reading the best wrong answers out loud',
      'Second-language version: same line, translated',
    ],
    common_mistakes: [
      'Choosing a line where the missing word is inaudible anyway, so even fans cannot answer',
      'Putting the answer in the caption of the same post',
      'Using a fast rap line with no space for the viewer to think',
      'Letting the video run long enough that people Shazam it instead of guessing',
    ],
    accessibility_notes:
      'The clue is text-first, so it already works with sound off — keep the lyric in the caption too, and state the answer in text when it is revealed. Avoid audio-only hints.',
    example_metadata: {
      tone: 'conversational',
      caption_example:
        'One word missing. If you have listened to the bridge, you already know it. Answer gets pinned tomorrow — and the full line is at 1:12.',
      title_example: 'Complete the lyric: one word missing',
      hashtag_examples: ['#completethelyric', '#lyrics', '#slowjams', '#indiemusic'],
    },
    estimated_production_minutes: 20,
    is_favorite: false,
    is_user_created: false,
    is_archived: false,
    usage_count: 0,
  },
  {
    id: 'preset-rate-out-of-ten',
    title: 'Rate It Out of 10',
    summary: 'Play the most immediate ten seconds and ask for a brutally honest score in the comments.',
    description:
      'A one-question format that produces a number instead of an opinion. Play the catchiest, most distinctive section — not the intro, not the emotional bridge — and put a single "/10" on screen. The framing must be confident, not pleading: "be brutally honest" invites a real answer, "please rate my song" invites silence. Reply to every score with the timestamp that person should hear next; those replies are what turn a rating into a conversation. Do not argue with low scores in public, and do not delete them — a visible 6 reads as more credible than twelve 10s.',
    objectives: ['audience-engagement', 'feedback-gathering', 'discovery'],
    secondary_objectives: ['song-promotion'],
    platforms: ['tiktok', 'instagram-reels', 'youtube-shorts'],
    duration_seconds: { min: 8, max: 15 },
    difficulty: 'easy',
    budget: 'minimal',
    filming_methods: ['static-text', 'hybrid', 'live-action'],
    face_visibility: 'optional',
    equipment: ['phone', 'editing-software'],
    tags: ['rating', 'feedback', 'comments', 'engagement', 'honest'],
    genre_tags: ['pop', 'hip-hop', 'r&b', 'electronic', 'indie'],
    mood_tags: ['energetic', 'confident', 'playful'],
    campaign_stage: 'evergreen',
    song_context_required: 'The strongest 8–12 second section of the song — usually the hook or first chorus.',
    hook_examples: [
      'Be brutally honest. /10?',
      'No context, no artist name. Just a number.',
      'Rate this before you know who made it.',
    ],
    execution_steps: [
      'Pick the section a stranger would remember after one listen, and cut everything before it.',
      'Write one text card with the score prompt and nothing else — no title, no bio, no "link in bio".',
      'Play at least six seconds so people can actually form an opinion.',
      'End on the strongest beat rather than a fade, so the loop is clean.',
      'Reply to every score with a timestamp from the song and one sentence about that part.',
      'Pin the most interesting critical comment, then make a follow-up answering it.',
    ],
    shot_list: [
      'Optional: one static shot of you, no performance, listening or looking at the lens',
      'Text card with "/10" and one line of framing',
      'Full-screen section artwork or performance footage behind the text',
    ],
    on_screen_text: ['Be brutally honest. /10?', 'No context. Just a number.', 'I reply to every score.'],
    audio_guidance:
      'Start directly on the hook or the first vocal phrase. Do not use a fade-in and do not put your voice on top of the clip — the ask is on screen so the music gets the whole eight seconds.',
    editing_notes:
      'One cut in, one cut out. Keep the text in the upper third so platform captions do not cover it. If the audio ends abruptly, trim the last frame instead of fading.',
    cta_examples: [
      'Drop a number. I reply to every single one.',
      'What would make it a 10? Genuinely asking.',
      'If you rate it below 5, tell me which part lost you.',
    ],
    variations: [
      'Blind version: no artist name, no artwork, reveal at the end',
      'Two clips, rate both, and vote which should be the single',
      'Rate the mix instead of the song',
      'Follow-up reading the comments out loud, including the harsh ones',
    ],
    common_mistakes: [
      'Defending the song against critical scores in the replies',
      'Playing a section that only makes sense after the verse',
      'Burying the score prompt under hashtags and a long caption',
      'Asking for a rating without ever saying what the song is called',
    ],
    accessibility_notes:
      'The prompt is on screen, but add the same question to the caption so screen-reader users get it. Caption the lyric if the vocal is the main hook.',
    example_metadata: {
      tone: 'direct',
      caption_example:
        'Ten seconds of the loudest thing I have made. Be honest — a 4 is useful, a polite 10 is not. Song is "Title", out now.',
      title_example: 'Rate this out of 10 (be honest)',
      hashtag_examples: ['#ratemysong', '#newmusic', '#musicfeedback', '#indieartist'],
    },
    estimated_production_minutes: 15,
    is_favorite: false,
    is_user_created: false,
    is_archived: false,
    usage_count: 0,
  },
  {
    id: 'preset-five-second-guess',
    title: 'Five-Second Guess',
    summary:
      'Play a short, recognisable section with the title hidden and give viewers five seconds to name the song.',
    description:
      'A recognition game rather than a meaning game: the answer is the song title, not an interpretation. It works two ways — existing listeners get to prove they know you, and new listeners get a puzzle worth staying for. Two rules keep it honest: use material people can plausibly recognise (an unreleased preview, a stripped mix, or a track from your own catalogue with the intro removed), and never let the artwork, title or filename leak the answer. Because Shazam exists, a straight released excerpt is a weak game; a preview, a live take or a filtered mix is a strong one.',
    objectives: ['discovery', 'audience-engagement', 'song-promotion'],
    secondary_objectives: ['community-building'],
    platforms: ['tiktok', 'instagram-reels', 'youtube-shorts'],
    duration_seconds: { min: 8, max: 15 },
    difficulty: 'easy',
    budget: 'minimal',
    filming_methods: ['static-text', 'hybrid'],
    face_visibility: 'none',
    equipment: ['phone', 'editing-software'],
    tags: ['quiz', 'guessing', 'recognition', 'comments', 'catalogue'],
    genre_tags: ['pop', 'hip-hop', 'electronic', 'indie', 'r&b'],
    mood_tags: ['playful', 'mysterious', 'energetic'],
    campaign_stage: 'evergreen',
    song_context_required:
      'A recognisable 4–6 second section — hook, signature riff or opening vocal line — that is not the intro.',
    hook_examples: [
      'Five seconds. Name this song.',
      'You have heard this before. From where?',
      'No title, no artist, no hints.',
    ],
    execution_steps: [
      'Pick a section that is identifiable within one listen, and remove the intro entirely.',
      'Set a visible five-second countdown over the clip.',
      'Cut the audio exactly at zero so the clip feels like a test, not a tease.',
      'Hide the title everywhere: no artwork, no filename, no first line of the caption.',
      'Reveal the title in a pinned comment and in the last frame of the follow-up.',
      'Reply to wrong guesses with a hint rather than the answer, so the thread keeps growing.',
    ],
    shot_list: [
      'Full-frame countdown over a blurred or abstract visual',
      'Optional clip of the track playing with the title covered',
      'Final frame: title card and where to hear it',
    ],
    on_screen_text: ['5 seconds. Name this song.', 'No title. No hints.', 'Answer in the comments.'],
    audio_guidance:
      'Start mid-phrase for the hardest version and on the first word of the hook for the fairest one. Keep the full mix; a filtered or acoustic version is harder and more interesting, but only if the melody survives.',
    editing_notes:
      'No slow reveal animations — the countdown is the whole visual. Keep the text large, centred and still, and cut to black at zero instead of fading out.',
    cta_examples: [
      'Name it in the comments. First correct answer gets pinned.',
      'If you know this one, we have probably met.',
      'Wrong answers are funnier. Go.',
    ],
    variations: [
      'Three songs in a row, three seconds each',
      'Reversed or low-pass filtered audio',
      'Guess the song from the drum pattern only',
      'Lyric-only version: the words, no music',
    ],
    common_mistakes: [
      'Using a released song that Shazam identifies in two seconds',
      'Leaking the title in the file name, caption or hashtags',
      'Playing a section with no distinctive melody',
      'Letting the clip run long enough to become a normal promo',
    ],
    accessibility_notes:
      'This format is audio-dependent by design, so offer a second text clue in the caption for Deaf and hard-of-hearing viewers, and always reveal the answer in text.',
    example_metadata: {
      tone: 'mysterious',
      caption_example:
        'Five seconds, no title. If you have been here since the first EP, this should take you about two. Answer pinned at midnight.',
      title_example: 'Five seconds to name this song',
      hashtag_examples: ['#guessthesong', '#musictrivia', '#newmusic', '#indieartist'],
    },
    estimated_production_minutes: 20,
    is_favorite: false,
    is_user_created: false,
    is_archived: false,
    usage_count: 0,
  },
  {
    id: 'preset-guess-what-happens-next',
    title: 'Guess What Happens Next',
    summary:
      'Stop the track right before the drop, switch or final chorus and ask viewers to predict what comes next.',
    description:
      'Withholding is the hook. Cut one to two seconds before the moment the song changes — the drum entrance, the beat switch, the key lift — and put the question on screen while the silence sits there. Unlike Unexpected Beat Switch, which stages the change visually, this format is about the wait before the change: the viewer has to commit to a prediction in the comments. Make sure there is genuinely something to predict, and pay it off either at the seven-second mark or in a follow-up, not both at once.',
    objectives: ['audience-engagement', 'discovery', 'song-promotion'],
    secondary_objectives: ['community-building'],
    platforms: ['tiktok', 'instagram-reels', 'youtube-shorts'],
    duration_seconds: { min: 10, max: 20 },
    difficulty: 'easy',
    budget: 'minimal',
    filming_methods: ['hybrid', 'static-text', 'live-action'],
    face_visibility: 'none',
    equipment: ['phone', 'editing-software'],
    tags: ['suspense', 'payoff', 'drop', 'interactive', 'arrangement'],
    genre_tags: ['electronic', 'pop', 'rock', 'hip-hop', 'indie'],
    mood_tags: ['energetic', 'suspenseful', 'playful'],
    campaign_stage: 'evergreen',
    song_context_required:
      'One clear structural change — a drop, a beat switch, a key change or a final chorus — with its exact timestamp.',
    hook_examples: [
      'I stopped it right before the best part.',
      'What do you think happens next?',
      'Do not skip. Guess the drop.',
    ],
    execution_steps: [
      'Find the exact change and note the timestamp to the tenth of a second.',
      'Cut the audio 1.5–2 seconds before the change, on a downbeat if possible.',
      'Freeze or cut to a black frame so the visual stops with the music.',
      'Put the prediction question on screen during the pause, then hold two seconds of silence.',
      'Either reveal the change at the seven-second mark or promise it in a follow-up — pick one, not both.',
      'Pin a comment with the timestamp where the full section lives.',
    ],
    shot_list: [
      'Pre-drop section with a static shot or lyric card',
      'Black or frozen frame carrying the question',
      'Payoff: one shot of the change, no slow-motion',
    ],
    on_screen_text: ['What do you think happens next?', 'Wrong answers welcome.', 'The answer is at 1:04.'],
    audio_guidance:
      'Mute the pre-drop reverb tail — reverb is the biggest spoiler in this format. If the change is a vocal entrance, cut on the breath before it. The silence should feel deliberate, so do not replace it with room tone.',
    editing_notes:
      'Do not animate the question or add whooshes. One hard cut to black, two seconds of quiet, then the payoff. Keep the whole clip under twenty seconds so the wait never becomes irritation.',
    cta_examples: [
      'Comment your guess before the reveal.',
      'If you have heard the song, do not spoil it.',
      'Wrong answers welcome — some of them are better than the real one.',
    ],
    variations: [
      'Three songs, three withheld drops, one clip',
      'Reveal only in a follow-up video',
      'Silent version: show the visual change, withhold the audio',
      'Let the audience write the next section in the comments',
    ],
    common_mistakes: [
      'Stopping so early that there is no tension left',
      'Revealing the payoff in the same second as the question',
      'Choosing a change nobody could predict, which makes the game pointless',
      'Using a clip where the next section is audible in the background',
    ],
    accessibility_notes:
      'Describe the withheld change in text ("the drums come in here") so the format still works without sound, and caption the payoff section.',
    example_metadata: {
      tone: 'direct',
      caption_example:
        'I cut it two seconds before everything changes. Most people guess wrong. The full version is out now — comment what you thought was coming.',
      title_example: 'Guess what happens next',
      hashtag_examples: ['#guessthedrop', '#beatswitch', '#newmusic', '#producerlife'],
    },
    estimated_production_minutes: 25,
    is_favorite: false,
    is_user_created: false,
    is_archived: false,
    usage_count: 0,
  },
  {
    id: 'preset-reminds-you-of',
    title: 'What Does This Remind You Of?',
    summary: 'Play a section and ask viewers to name the memory, place or person it brings back.',
    description:
      'A memory prompt rather than a meaning prompt. The comments become a wall of places and years, which is more interesting than a wall of emojis, and the best replies can be turned into a follow-up video. Ask for something concrete — one place, one year, one person — because "what do you think?" produces nothing. Choose a section with atmosphere: a wide reverb, a specific instrument, a vocal that sounds like a room. The less the lyric explains, the more room the listener has to bring their own memory.',
    objectives: ['audience-engagement', 'community-building', 'discovery'],
    secondary_objectives: ['song-promotion', 'storytelling'],
    platforms: ['tiktok', 'instagram-reels', 'youtube-shorts'],
    duration_seconds: { min: 12, max: 25 },
    difficulty: 'easy',
    budget: 'minimal',
    filming_methods: ['static-text', 'hybrid', 'archival-footage'],
    face_visibility: 'none',
    equipment: ['phone', 'editing-software'],
    tags: ['memory', 'nostalgia', 'comments', 'community', 'atmospheric'],
    genre_tags: ['indie', 'singer-songwriter', 'r&b', 'pop', 'lo-fi'],
    mood_tags: ['nostalgic', 'wistful', 'warm'],
    campaign_stage: 'evergreen',
    song_context_required:
      'A 10–20 second section with atmosphere and a lyric open enough that listeners can attach their own memory to it.',
    hook_examples: [
      'What does this song remind you of?',
      'Name the place. Name the year.',
      'This sounds like a memory you have not made yet.',
    ],
    execution_steps: [
      'Choose the atmospheric section, not the catchiest one.',
      'Write one specific prompt on screen: a place, a year, a person, or a smell.',
      'Keep the visual still and quiet so the question stays the loudest thing in the frame.',
      'Play at least twelve seconds — memory needs time to surface.',
      'Reply to the most specific comments with a question, not a thank you.',
      'Screenshot five replies for a follow-up video, with permission.',
    ],
    shot_list: [
      'One still image or slow shot with room to breathe',
      'Text card with the memory prompt',
      'Optional: the same frame held through the whole section',
    ],
    on_screen_text: ['What does this remind you of?', 'One place. One year.', 'I read every reply.'],
    audio_guidance:
      'Use the full, warm mix. If the section has a long reverb, keep it — the space is what triggers the memory. Avoid a hard cut at the end; let the last bar resolve.',
    editing_notes:
      'No jump cuts and no lyric animations. One frame, one question, one slow fade. If you must move, move at half the speed you think you need.',
    cta_examples: [
      'One place, one year. Go.',
      'Tell me the memory this unlocked. I am reading all of these.',
      'If this reminded you of someone, send it to them instead of telling me.',
    ],
    variations: [
      'Series: one song, one memory prompt per week',
      'A memory you almost forgot framing',
      'Reply-video compilation with the song underneath',
      'Photo-submission version: ask for the picture, not the words',
    ],
    common_mistakes: [
      'Asking a vague question and getting vague replies',
      'Explaining the song meaning first, which closes the prompt',
      'Choosing the loudest section instead of the most atmospheric one',
      'Reposting someone else response without asking',
    ],
    accessibility_notes:
      'The prompt is text, so it works silently — mirror it in the caption and avoid relying on a musical cue to make the question make sense.',
    example_metadata: {
      tone: 'emotional',
      caption_example:
        'This section was recorded at 4am with the window open. It reminds me of a bus stop I have not thought about in years. What does it remind you of?',
      title_example: 'What does this song remind you of?',
      hashtag_examples: ['#nostalgia', '#musicandmemory', '#indiemusic', '#songwriter'],
    },
    estimated_production_minutes: 20,
    is_favorite: false,
    is_user_created: false,
    is_archived: false,
    usage_count: 0,
  },
  {
    id: 'preset-three-words',
    title: 'Three Words',
    summary: 'Show three words that describe the song, one at a time, then let the song prove them.',
    description:
      'A positioning format disguised as a minimal one. Three words appear one after another, each on its own beat, then the song arrives and either confirms or complicates them. The words do the work a caption usually does badly: instead of "my new indie pop single", you get "restless, warm, slightly mean". Avoid the obvious trio (sad, slow, emotional) — pick words that are specific enough to be arguable, and choose three that are not synonyms of each other. End by asking for the viewer three words, which is the cheapest comment prompt that still produces something worth reading.',
    objectives: ['discovery', 'song-promotion', 'artist-identity'],
    secondary_objectives: ['audience-engagement'],
    platforms: ['tiktok', 'instagram-reels', 'youtube-shorts'],
    duration_seconds: { min: 8, max: 18 },
    difficulty: 'easy',
    budget: 'minimal',
    filming_methods: ['static-text', 'hybrid'],
    face_visibility: 'none',
    equipment: ['phone', 'editing-software'],
    tags: ['minimal', 'typography', 'positioning', 'mood', 'series'],
    genre_tags: ['indie', 'alternative', 'electronic', 'pop', 'r&b'],
    mood_tags: ['moody', 'confident', 'reflective'],
    campaign_stage: 'pre-release',
    song_context_required:
      'One representative section — usually the chorus or the most characteristic eight bars — plus three honest descriptors.',
    hook_examples: [
      'Three words: restless, warm, slightly mean.',
      'If this song was three words',
      'Describe this song in three words. I will go first.',
    ],
    execution_steps: [
      'Write ten candidate words, then keep the three that are least like each other.',
      'Check that none of them appear in the lyric or the genre label.',
      'Match each word to a different moment in the section and cut on that moment.',
      'Keep each word on screen for 0.8–1.2 seconds — long enough to read, short enough to feel like a rhythm.',
      'Land the third word on the beat where the vocal enters.',
      'Ask for the viewer three words as the final card, and reply with your favourite sets.',
    ],
    shot_list: [
      'Three full-frame text cards, one word each, same typeface',
      'Optional: artwork or a still photo behind the words, heavily darkened',
      'Song section with no additional text',
    ],
    on_screen_text: ['restless', 'warm', 'slightly mean', 'your three words?'],
    audio_guidance:
      'The first word can land in near-silence; by the third, the song should be at full level. Use the same section throughout rather than three different clips — the point is that one moment holds all three words.',
    editing_notes:
      'One typeface, one alignment, one colour. No motion graphics, no whooshes, no zoom on the words. If the words are not readable on a phone at arm length, the format fails.',
    cta_examples: [
      'Your three words in the comments. I am collecting the best ones.',
      'If your three words are better than mine, I will use them in the next post.',
      'Be honest — which of the three is wrong?',
    ],
    variations: [
      'Three words in three languages',
      'Three words that are all negations ("not sad, not slow, not safe")',
      'Artist version vs audience version side by side',
      'One word per release, building a series',
    ],
    common_mistakes: [
      'Using "sad, slow, emotional" or another trio that fits every ballad',
      'Showing each word for too short a time to read',
      'Choosing words the song does not actually deliver',
      'Adding a fourth word, which breaks the format',
    ],
    accessibility_notes:
      'Type-led and silent-friendly by design. Put the three words in the caption as well, and avoid thin fonts or low-contrast text on video grain.',
    example_metadata: {
      tone: 'minimal',
      caption_example:
        'Restless, warm, slightly mean. That is the whole song, honestly. Tell me your three words and I will pin the one that stings.',
      title_example: 'Three words for this song',
      hashtag_examples: ['#threewords', '#newmusic', '#indieartist', '#songrelease'],
    },
    estimated_production_minutes: 15,
    is_favorite: false,
    is_user_created: false,
    is_archived: false,
    usage_count: 0,
  },
  {
    id: 'preset-playlist-if',
    title: 'Add This to Your Playlist If',
    summary: 'Give viewers a precise condition for saving the song, then prove it with the section that matches.',
    description:
      'A save-driving format built for playlist culture. The condition is the hook: "add this to your playlist if you like songs that sound happy and mean something else". It has to be checkable against the actual song — a texture, a contradiction, a tempo, a lyric stance — not a mood that fits everything. Show the condition first, cut to the exact section that demonstrates it, and ask for the playlist name in the comments. A save is worth more than a like because it is the behaviour that keeps a song alive after the feed moves on.',
    objectives: ['song-promotion', 'discovery', 'audience-engagement'],
    secondary_objectives: ['artist-identity'],
    platforms: ['tiktok', 'instagram-reels', 'youtube-shorts'],
    duration_seconds: { min: 10, max: 20 },
    difficulty: 'easy',
    budget: 'minimal',
    filming_methods: ['static-text', 'hybrid'],
    face_visibility: 'none',
    equipment: ['phone', 'editing-software'],
    tags: ['playlist', 'saving', 'positioning', 'mood', 'discovery'],
    genre_tags: ['indie', 'pop', 'r&b', 'electronic', 'singer-songwriter'],
    mood_tags: ['bittersweet', 'warm', 'moody'],
    campaign_stage: 'evergreen',
    song_context_required:
      'The section that best proves the condition — the chorus, the outro, or the moment where the song contradicts itself.',
    hook_examples: [
      'Add this to your playlist if you like songs that sound happy and mean something else.',
      'For the playlists that only start after midnight.',
      'Save this if you have ever stayed too long somewhere.',
    ],
    execution_steps: [
      'Write the condition before choosing the clip, and make sure it is true of the song.',
      'Test it on someone who does not know the track: can they hear the condition in one listen?',
      'Show the condition as a single card for two seconds, then cut straight to the section that proves it.',
      'Keep the clip under twenty seconds and do not repeat the condition at the end.',
      'Ask for the playlist name rather than "save this", which is what people actually ignore.',
      'Reply to playlist names with a matching song suggestion — it makes the thread useful.',
    ],
    shot_list: [
      'Condition card over a still frame or artwork',
      'The exact section that demonstrates the condition',
      'Optional final card: song title only, no call to action',
    ],
    on_screen_text: [
      'Add this to your playlist if you like songs that sound happy and mean something else',
      'Which playlist is this going in?',
    ],
    audio_guidance:
      'Start the song half a second before the proving moment so the condition and the evidence arrive together. Do not fade in — the cut is the demonstration.',
    editing_notes:
      'The condition card must be readable in two seconds; split it over two lines at most. No music-video footage competing with the text, and no loop that repeats the condition three times.',
    cta_examples: [
      'Tell me the playlist name. I want to know where this one lands.',
      'Save it, then come back and tell me if the condition held up.',
      'If this is not your playlist, tag someone whose it is.',
    ],
    variations: [
      'A series of conditions, one per release, same template',
      'Remove this from your playlist if — the negative version',
      'Playlist screenshot duet showing where it actually went',
      'Two songs, two conditions, one vote',
    ],
    common_mistakes: [
      'A condition so broad it describes every song ever written',
      'Asking for a save before playing any music',
      'The song not actually delivering the condition, which reads as bait',
      'Reusing the same condition for every release',
    ],
    accessibility_notes:
      'The condition is text, so mirror it in the caption. If the proof is a production detail rather than the vocal, name that detail in text too.',
    example_metadata: {
      tone: 'conversational',
      caption_example:
        'Add this to your playlist if you like songs that sound like a good night and mean something closer to a warning. Where is it going?',
      title_example: 'Add this to your playlist if...',
      hashtag_examples: ['#playlist', '#newmusic', '#indiemusic', '#songrecommendation'],
    },
    estimated_production_minutes: 20,
    is_favorite: false,
    is_user_created: false,
    is_archived: false,
    usage_count: 0,
  },
  {
    id: 'preset-algorithm-sent-you',
    title: 'The Algorithm Sent You',
    summary:
      'Frame the song as an accidental recommendation and let the framing do the introducing for you.',
    description:
      'A discovery format that removes the ask. Instead of introducing yourself, you behave like something the feed surfaced by accident: "if this reached you, you were supposed to hear this song". The section has to be strong enough to survive the frame, and the framing has to stay honest — this is your song, and pretending otherwise is the fastest way to lose the room. Number it as a series ("random recommendation #014") and keep the caption to one line so there is nothing left to read and everything left to hear. Closest existing format is Direct Song Introduction; the difference is that this one deliberately withholds the introduction.',
    objectives: ['discovery', 'song-promotion'],
    secondary_objectives: ['audience-engagement', 'artist-identity'],
    platforms: ['tiktok', 'instagram-reels', 'youtube-shorts'],
    duration_seconds: { min: 10, max: 20 },
    difficulty: 'easy',
    budget: 'minimal',
    filming_methods: ['static-text', 'hybrid'],
    face_visibility: 'none',
    equipment: ['phone', 'editing-software'],
    tags: ['recommendation', 'algorithm', 'discovery', 'framing', 'series'],
    genre_tags: ['indie', 'electronic', 'pop', 'lo-fi', 'r&b'],
    mood_tags: ['mysterious', 'confident', 'dreamy'],
    campaign_stage: 'evergreen',
    song_context_required:
      'One self-sufficient 8–15 second section that works with zero context — usually the hook or the first chorus.',
    hook_examples: [
      'If this reached you, you were supposed to hear this song.',
      'Random recommendation #014. Yes, it is mine.',
      'The algorithm does not know I made this.',
    ],
    execution_steps: [
      'Choose the section that needs no introduction, and cut everything before it.',
      'Write one framing line that is intriguing but not deceptive about who made the song.',
      'Number the post so it reads as a series, and keep the same template for every entry.',
      'Put the title on screen only after six seconds, or not at all and let the caption carry it.',
      'Keep the caption to one sentence plus the song title.',
      'Reply to "who is this?" comments with the title and nothing else — the mystery has done its job.',
    ],
    shot_list: [
      'Full-frame text over a still, grain or abstract visual',
      'The song section, no performance footage required',
      'Optional title card at the end',
    ],
    on_screen_text: ['If this reached you, you were supposed to hear it', 'Random recommendation #014', 'Song: "Title"'],
    audio_guidance:
      'Start exactly on the hook. No intro, no riser, no producer tag. A hard start is what makes the clip feel like a recommendation rather than promotion.',
    editing_notes:
      'One template, reused every time: same font, same placement, same length. Series formats live or die on recognisability, so resist redesigning it after the second post.',
    cta_examples: [
      'Tell me what the algorithm thinks of this one.',
      'If this found you at the right time, that is the whole review.',
      'Ask me who made it. I will answer honestly.',
    ],
    variations: [
      'Numbered recommendation series across the catalogue',
      'The underrated-artist framing: "your next favourite artist has no business being this unknown"',
      'A friend recommends it — third-person caption, first-person artist',
      'Genre-specific version: "if you only listen to one shoegaze song this month"',
    ],
    common_mistakes: [
      'Pretending to be a curator or a fan account, which is deceptive and gets punished',
      'Framing the clip but then talking over the whole thing',
      'Never revealing the title, so nobody can find the song',
      'Using the same framing for every song until it stops meaning anything',
    ],
    accessibility_notes:
      'The framing is text, so it works without audio — caption the lyric if the vocal is the point, and keep the on-screen text free of thin, decorative fonts.',
    example_metadata: {
      tone: 'mysterious',
      caption_example:
        'Random recommendation #014 — a song about leaving a city you still love. It is mine, obviously. Full thing is on my profile.',
      title_example: 'If this reached you, you were supposed to hear this',
      hashtag_examples: ['#songrecommendation', '#newmusic', '#underratedartist', '#indiemusic'],
    },
    estimated_production_minutes: 15,
    is_favorite: false,
    is_user_created: false,
    is_archived: false,
    usage_count: 0,
  },
  {
    id: 'preset-dont-search-this-song',
    title: 'Don\u2019t Search This Song',
    summary: 'Tell viewers not to look the song up, then make the song good enough that they do.',
    description:
      'Reverse psychology as a hook, with a real song behind it. The prohibition is playful and obviously a joke — "whatever you do, do not search this" — while the title is half-covered, blurred or just out of frame. The trick only works once per audience, so use it on a single you actually want searched, and commit to the bit in the replies rather than explaining it. If the song is not findable, the format has no payoff, so make sure the title is in the caption even while the video pretends otherwise.',
    objectives: ['discovery', 'audience-engagement', 'song-promotion'],
    secondary_objectives: ['artist-identity'],
    platforms: ['tiktok', 'instagram-reels', 'youtube-shorts'],
    duration_seconds: { min: 8, max: 15 },
    difficulty: 'easy',
    budget: 'minimal',
    filming_methods: ['static-text', 'live-action', 'hybrid'],
    face_visibility: 'optional',
    equipment: ['phone', 'editing-software'],
    tags: ['reverse-psychology', 'playful', 'curiosity', 'discovery'],
    genre_tags: ['pop', 'indie', 'hip-hop', 'electronic', 'alternative'],
    mood_tags: ['playful', 'confident', 'mysterious'],
    campaign_stage: 'release-week',
    song_context_required:
      'A 6–10 second section strong enough to justify the search, plus the exact song and artist name viewers will type.',
    hook_examples: [
      'Do not search this song.',
      'I am legally required to tell you not to look this up.',
      'Whatever you do, do not play the full version.',
    ],
    execution_steps: [
      'Pick the single strongest eight seconds and put the prohibition on screen first.',
      'Half-cover the title, blur the artwork, or leave the song name out of frame — but keep it in the caption.',
      'Play the clip straight, with no wink in the edit; the joke lands harder when the music is serious.',
      'Reply to "I searched it" comments as if betrayed, which extends the bit into the comments.',
      'Link the song in the bio and pin a comment with the title once the post has some traction.',
      'Do not reuse the device for the next three releases — novelty is the entire mechanism.',
    ],
    shot_list: [
      'Text card with the prohibition, artwork partially out of frame',
      'Blurred or taped-over cover art',
      'Optional: you holding the phone as if about to press play and stopping',
    ],
    on_screen_text: ['Do not search this song.', 'Seriously. Do not.', 'Song title in the caption. Unfortunately.'],
    audio_guidance:
      'Use the part that sounds most unlike a promo — a quiet verse or a strange bridge. If the clip sounds like an advertisement, the joke collapses into one.',
    editing_notes:
      'Keep the edit deadpan: no comic zooms, no winking sound effects. The only deliberate choice is the prohibition card at the top and a hard cut on the hook.',
    cta_examples: [
      'Tell me you did not search it. I will know.',
      'If you looked it up, say so in the comments so I can be disappointed publicly.',
      'The full version exists. That is all I am allowed to say.',
    ],
    variations: [
      'Blurred artwork version with a fake parental advisory sticker',
      'Do not play this at 2am framing',
      'A series of increasingly absurd prohibitions',
      'The anti-version: "definitely do not add this to a playlist"',
    ],
    common_mistakes: [
      'Actually hiding the title so completely that nobody can find the song',
      'Explaining the joke in the caption before the viewer gets it',
      'Using the same trick on every release until it reads as desperation',
      'Being smug in the replies instead of playing along',
    ],
    accessibility_notes:
      'The prohibition is text, so include it in the caption for screen readers, and never rely on a blurred image alone to communicate the joke.',
    example_metadata: {
      tone: 'funny',
      caption_example:
        'Do not search "Artist — Title". Especially not on the platform you are already on. I have said too much.',
      title_example: 'Do not search this song',
      hashtag_examples: ['#newmusic', '#dontsearchthis', '#indieartist', '#newrelease'],
    },
    estimated_production_minutes: 15,
    is_favorite: false,
    is_user_created: false,
    is_archived: false,
    usage_count: 0,
  },
  {
    id: 'preset-unknown-broadcast',
    title: 'Broadcast from an Unknown Artist',
    summary:
      'Package the song as a late-night transmission from a station nobody can find, and reuse the ident forever.',
    description:
      'An aesthetic format that turns being unknown into the concept. Scanlines, a station ident, a timecode, mono audio and a lower-third frequency reading make the song feel like something intercepted rather than promoted. The value is in the continuity: keep the same ident, typeface and sign-off across every release and it becomes a recognisable series — closer to a world than a template. Best for atmospheric, electronic or nocturnal songs; the treatment should sit under the music, never on top of it. Drop the filter for the final two seconds as the reveal.',
    objectives: ['artist-identity', 'discovery', 'song-promotion'],
    secondary_objectives: ['storytelling'],
    platforms: ['tiktok', 'instagram-reels', 'youtube-shorts'],
    duration_seconds: { min: 15, max: 30 },
    difficulty: 'moderate',
    budget: 'minimal',
    filming_methods: ['hybrid', 'screen-recording', 'animation'],
    face_visibility: 'none',
    equipment: ['phone', 'editing-software', 'computer'],
    tags: ['retro', 'broadcast', 'aesthetic', 'series', 'identity'],
    genre_tags: ['electronic', 'ambient', 'lo-fi', 'alternative', 'indie'],
    mood_tags: ['nocturnal', 'mysterious', 'cinematic'],
    campaign_stage: 'pre-release',
    song_context_required:
      'A 15–25 second atmospheric section that survives being heard through a simulated broadcast filter.',
    hook_examples: [
      'Broadcasting from a station you cannot find.',
      '03:14 AM — unknown artist, no signal name.',
      'This is the only transmission tonight.',
    ],
    execution_steps: [
      'Design one ident: station name, frequency, typeface, colour. Write it down so it survives across releases.',
      'Open with two seconds of static or test tone, then cut to the song.',
      'Add a fixed timecode in the corner and a lower-third with the frequency and track number.',
      'Band-pass the audio between roughly 300Hz and 3kHz and add light tape hiss.',
      'Drop the filter for the final two seconds so the real mix lands as a reveal.',
      'End on the sign-off card with the song title and artist name, then silence.',
    ],
    shot_list: [
      'Static or test-tone open with the station ident',
      'Abstract visual or slow archive footage behind the lower-third',
      'Sign-off card: "end of transmission", title, artist',
    ],
    on_screen_text: ['STATION 88.4 — UNKNOWN', '03:14:07 AM', 'END OF TRANSMISSION', 'Artist — Title'],
    audio_guidance:
      'Narrow the band on the treated section, then open it fully for the last two seconds. Keep the hiss low enough that the vocal stays intelligible — if you cannot understand the lyric, the effect has eaten the song.',
    editing_notes:
      'Scanlines and grain at 20–30% opacity, never full strength. Hold every card for at least 1.5 seconds. Reuse the exact same ident and sign-off on every post in the series.',
    cta_examples: [
      'If you found this station, tell me where you are listening from.',
      'Same frequency next month.',
      'Reply with the time you heard this.',
    ],
    variations: [
      'Late-night radio call-in version',
      'CCTV or security-camera version',
      'Answering-machine message version',
      'Numbers-station version for an instrumental release',
    ],
    common_mistakes: [
      'Letting the filter overpower the mix until the song sounds broken',
      'Redesigning the ident every time, which kills the series',
      'Unreadable scanline text on a phone screen',
      'Using the aesthetic on a song that needs clarity and energy',
    ],
    accessibility_notes:
      'Keep the broadcast text large and high-contrast; never put the only copy of the lyric inside the treated layer, and caption the spoken or sung parts plainly.',
    example_metadata: {
      tone: 'mysterious',
      caption_example:
        'Transmission 007. Recorded at 3am, broadcast once. If you heard it, you were listening at the right time. Same frequency next month.',
      title_example: 'Transmission 007 — unknown artist',
      hashtag_examples: ['#transmission', '#latenightmusic', '#indiemusic', '#newartist'],
    },
    estimated_production_minutes: 60,
    is_favorite: false,
    is_user_created: false,
    is_archived: false,
    usage_count: 0,
  },
  {
    id: 'preset-recurring-ai-character',
    title: 'Recurring AI Character',
    summary:
      'Build one illustrated character and let them carry the story of every release across a series.',
    description:
      'A character-led mini video made from AI-generated stills rather than live footage. The format only works if the character is genuinely consistent: same face, same palette, same three physical details, whatever the tool. Write a short character bible first — age, wardrobe, two fixed features, colour palette, one recurring object — then generate five or six images per song and animate them with slow pushes and parallax instead of full motion. Continuity across releases is the whole point, so the audience learns to recognise the world before they remember the name. This is deliberately narrower than Mini Music Video (a live-action story) and Build the Visual Identity (artwork process): the concept is the character, reused.',
    objectives: ['artist-identity', 'song-promotion', 'discovery'],
    secondary_objectives: ['storytelling', 'audience-engagement'],
    platforms: ['instagram-reels', 'tiktok', 'youtube-shorts'],
    duration_seconds: { min: 20, max: 45 },
    difficulty: 'moderate',
    budget: 'low',
    filming_methods: ['animation', 'hybrid'],
    face_visibility: 'none',
    equipment: ['computer', 'editing-software'],
    tags: ['ai', 'character', 'illustration', 'series', 'visual-identity'],
    genre_tags: ['alternative', 'electronic', 'indie', 'pop', 'hip-hop'],
    mood_tags: ['dreamy', 'cinematic', 'bittersweet'],
    campaign_stage: 'evergreen',
    song_context_required:
      'A 20–40 second section with a clear emotional turn, plus a reusable character description and palette.',
    hook_examples: [
      'Same character, different song.',
      'Meet the person who lives in all of my songs.',
      'Part four of a story that has no words.',
    ],
    execution_steps: [
      'Write the character bible: name, age, wardrobe, two fixed physical details, palette, one recurring object.',
      'Generate or draw a five-image storyboard for this song: establishing, close-up, action, turn, final frame.',
      'Keep one reference image and the same description in every prompt so the face does not drift.',
      'Animate each still with a slow push, pan or parallax — three seconds per image at most.',
      'Cut on the emotional turn in the section, not on a fixed interval.',
      'Add lyric text to one frame only, and keep it legible against the artwork.',
      'Store the prompts and palette in the idea notes so the next release can reuse them exactly.',
    ],
    shot_list: [
      'Establishing wide: the character in a specific place',
      'Close-up: the fixed physical detail that identifies them',
      'Action: their hands doing something purposeful',
      'Turn: an object or reflection that changes the reading',
      'Final frame: an image that could be the next cover',
    ],
    on_screen_text: ['same character, song 04', 'the story so far', 'Artist — Title'],
    audio_guidance:
      'Use the section with the biggest emotional shift and let the images change on the phrase, not on the beat grid. No voiceover: if the story needs narration, it is not working as a visual.',
    editing_notes:
      'Hard cuts between stills; animate inside each image rather than between them. Apply one grade and one grain layer to every image so the set feels like a single world. Five or six images is enough — more becomes a slideshow.',
    cta_examples: [
      'Should this character get their own song?',
      'Which frame should be the next cover?',
      'If you have seen this character before, you know what the object means.',
    ],
    variations: [
      'Animated comic-panel version with speech-free captions',
      'Seasonal chapter: the same character in a different season',
      'Character narrates through text cards while the song plays',
      'Fan-art invitation: share the palette and let people draw them',
    ],
    common_mistakes: [
      'Letting the character face change between images',
      'Generating twenty images for a twenty-second clip',
      'Spinning or zooming transitions that fight the song',
      'Hiding that the visuals are AI-generated where the platform requires disclosure',
    ],
    accessibility_notes:
      'Caption the lyric and describe the character and setting in the caption, since the story is carried visually. Avoid flashing transitions and high-contrast strobe effects between images.',
    example_metadata: {
      tone: 'cinematic',
      caption_example:
        'Same character, fourth song. They have been walking through these releases since the first EP — this time they finally sit down.',
      title_example: 'A recurring character for every song',
      hashtag_examples: ['#aiart', '#characterdesign', '#musicvideo', '#indieartist'],
    },
    estimated_production_minutes: 180,
    is_favorite: false,
    is_user_created: false,
    is_archived: false,
    usage_count: 0,
  },
  {
    id: 'preset-song-feels-like-memory',
    title: 'This Sounds Like a Memory',
    summary:
      'Pair the song with grainy, half-remembered footage so it feels like something viewers already lived through.',
    description:
      'An atmosphere format built on borrowed nostalgia: home-video texture, a timestamp, slight overexposure, a camera that is never quite steady. The footage can be your own archive, a friend with permission, or deliberately shot to look older than it is. Use a warm, hazy section rather than the drop, keep lyric text to one line, and let the overlay carry the idea: "this sounds like remembering something that never happened". The effect should be grain and softness, not a filter that makes the song sound worse than it is.',
    objectives: ['song-promotion', 'storytelling', 'discovery'],
    secondary_objectives: ['audience-engagement'],
    platforms: ['instagram-reels', 'tiktok', 'youtube-shorts'],
    duration_seconds: { min: 12, max: 25 },
    difficulty: 'easy',
    budget: 'minimal',
    filming_methods: ['archival-footage', 'hybrid'],
    face_visibility: 'none',
    equipment: ['phone', 'editing-software', 'existing-archive'],
    tags: ['nostalgia', 'vhs', 'archive', 'aesthetic', 'memory'],
    genre_tags: ['indie', 'pop', 'r&b', 'singer-songwriter', 'alternative'],
    mood_tags: ['nostalgic', 'wistful', 'dreamy'],
    campaign_stage: 'evergreen',
    song_context_required:
      'A 10–20 second warm, hazy section — usually a verse or the outro, rarely the biggest chorus.',
    hook_examples: [
      'This sounds like a memory you have not made yet.',
      'Found footage from a summer I cannot date.',
      'Songs that feel like old camcorder tapes.',
    ],
    execution_steps: [
      'Collect ten to twenty seconds of archive footage, or shoot it deliberately and degrade it afterwards.',
      'Choose one continuous shot if possible; two shots maximum.',
      'Add a date stamp, light grain, soft focus and a slight exposure lift.',
      'Put the line of text on screen at one second, then leave the frame alone.',
      'Cut the song on a phrase rather than a beat, and end on a freeze frame.',
      'Credit anyone recognisable in the footage, and get permission before posting it.',
    ],
    shot_list: [
      'One handheld archive shot: a street, a room, a car window',
      'Optional insert: a hand, a doorway, a screen door',
      'Freeze frame for the final second',
    ],
    on_screen_text: ['this sounds like remembering something that never happened', 'summer, year unknown'],
    audio_guidance:
      'Start with a gentle low-pass for the first three seconds, then open the full mix as the image settles. Keep the vocal clear — nostalgia is the picture, not the mix.',
    editing_notes:
      'Grain, a little chromatic aberration and a soft vignette. No glitch effects, no VHS tracking lines over the face, no tape-stop transitions. The memory should feel tender, not broken.',
    cta_examples: [
      'What year does this sound like?',
      'If this feels familiar, you are not imagining it.',
      'Send this to the person in the footage you cannot find anymore.',
    ],
    variations: [
      'Family archive with the faces blurred',
      'Disposable-camera photo sequence instead of video',
      'Shoot it now, degrade it later',
      'A series: one memory per track on the record',
    ],
    common_mistakes: [
      'Over-filtering until the song sounds muffled and cheap',
      'Using footage of people without permission',
      'Pairing a soft aesthetic with an aggressive song',
      'Adding an explanatory caption that removes the mystery',
    ],
    accessibility_notes:
      'Keep the overlay text plain and high-contrast over grain, include it in the caption, and caption the lyric if the vocal carries the story.',
    example_metadata: {
      tone: 'emotional',
      caption_example:
        'Found this on a hard drive labelled "do not open". The song is about exactly this kind of afternoon. It sounds like a memory you have not made yet.',
      title_example: 'This sounds like a memory',
      hashtag_examples: ['#nostalgia', '#camcorder', '#indiemusic', '#songwriter'],
    },
    estimated_production_minutes: 45,
    is_favorite: false,
    is_user_created: false,
    is_archived: false,
    usage_count: 0,
  },
  {
    id: 'preset-song-for-people-who',
    title: 'A Song for People Who',
    summary: 'Name the exact kind of person the song belongs to and let them recognise themselves in it.',
    description:
      'A text-led identity callout: three specific descriptions of a kind of person, each sharper than the last, then the song. The difference between this and a generic relatable post is precision — "for people who rehearse conversations they will never have" rather than "for anyone who is sad". Write the lines before choosing the clip, test them on someone who has not heard the song, and cut to the music on the third line. The replies become an audience segment you can write for again; the strongest line is also a caption for the next release.',
    objectives: ['discovery', 'audience-engagement', 'artist-identity'],
    secondary_objectives: ['song-promotion', 'community-building'],
    platforms: ['tiktok', 'instagram-reels', 'youtube-shorts'],
    duration_seconds: { min: 12, max: 25 },
    difficulty: 'easy',
    budget: 'minimal',
    filming_methods: ['static-text', 'hybrid'],
    face_visibility: 'none',
    equipment: ['phone', 'editing-software'],
    tags: ['identity', 'relatability', 'positioning', 'text', 'community'],
    genre_tags: ['indie', 'pop', 'singer-songwriter', 'r&b', 'alternative'],
    mood_tags: ['bittersweet', 'reflective', 'warm'],
    campaign_stage: 'evergreen',
    song_context_required:
      'One section that matches the described person — usually the verse that names the behaviour, then the chorus as the answer.',
    hook_examples: [
      'A song for people who overthink texts and under-say feelings.',
      'For the ones who leave first so they cannot be left.',
      'This is for the friend everyone calls strong.',
    ],
    execution_steps: [
      'Write three lines describing a specific behaviour, not a mood.',
      'Check each line against the lyric: the song must actually be about the third one.',
      'Show the lines one at a time, two seconds each, with the same typeface.',
      'Cut to the song on the third line and let the hook play for six seconds.',
      'End on the title card, then ask which line is the viewer.',
      'Save every reply that names a behaviour — those are future caption lines.',
    ],
    shot_list: [
      'Three full-frame text cards, one line each',
      'Optional still image or artwork behind the text, low contrast',
      'Song section with the title card at the end',
    ],
    on_screen_text: [
      'a song for people who overthink texts and under-say feelings',
      'for the ones who leave first',
      'this is for the friend everyone calls strong',
    ],
    audio_guidance:
      'Silence under the first two lines, then the song enters on the third. The entrance is the format — do not play music under all three or the cards lose their punch.',
    editing_notes:
      'One typeface, generous margins, no motion. If a line needs a comma splice to be readable, rewrite it. Keep every card up long enough to read twice.',
    cta_examples: [
      'Which one is you?',
      'Tag the person who is all three.',
      'If this is you, the full song is going to be uncomfortable. Sorry.',
    ],
    variations: [
      'One line only, for the shortest version',
      'Negative version: "not for people who..."',
      'Audience-submitted lines, credited in a follow-up',
      'Series: one kind of person per track on the record',
    ],
    common_mistakes: [
      'Using therapy-speak that describes everyone and therefore nobody',
      'Writing five lines when three land harder',
      'A song that does not match the claim, which reads as borrowed emotion',
      'Explaining the lines in the caption',
    ],
    accessibility_notes:
      'Silent-friendly by design; put the three lines in the caption as text and avoid thin fonts over busy artwork.',
    example_metadata: {
      tone: 'emotional',
      caption_example:
        'A song for people who rehearse conversations they will never have, then say nothing at all. If you know, you know. Out now.',
      title_example: 'A song for people who...',
      hashtag_examples: ['#songforyou', '#relatable', '#indiemusic', '#newmusic'],
    },
    estimated_production_minutes: 15,
    is_favorite: false,
    is_user_created: false,
    is_archived: false,
    usage_count: 0,
  },
  {
    id: 'preset-timelapse-listen',
    title: 'Timelapse Listen',
    summary:
      'Let one slow, uninterrupted timelapse carry the song while the caption asks people to stay and listen.',
    description:
      'The anti-hook format: no cuts, no lyric cards, no face, just a long take of something moving slowly — clouds, traffic, rain on a window, a road at dusk — with the song underneath. It works because it gives people permission to stop scrolling without asking them to do anything. Use it for slow, ambient or atmospheric tracks, and treat it as a companion piece rather than a launch: a pinned post, a playlist visual, or the thing you publish between singles. Shoot it on a phone in timelapse mode, or license a clip, but make the loop seamless so it can play twice without a visible join.',
    objectives: ['song-promotion', 'audience-engagement', 'artist-identity'],
    secondary_objectives: ['discovery'],
    platforms: ['instagram-reels', 'tiktok', 'youtube-shorts'],
    duration_seconds: { min: 20, max: 45 },
    difficulty: 'easy',
    budget: 'minimal',
    filming_methods: ['archival-footage', 'live-action', 'hybrid'],
    face_visibility: 'none',
    equipment: ['phone', 'phone-tripod', 'editing-software', 'existing-archive'],
    tags: ['ambient', 'timelapse', 'slow', 'listening', 'background'],
    genre_tags: ['ambient', 'indie', 'lo-fi', 'electronic', 'singer-songwriter'],
    mood_tags: ['calm', 'reflective', 'dreamy'],
    campaign_stage: 'evergreen',
    song_context_required:
      'A 20–40 second passage that works as background — a verse and chorus, or an instrumental section with no hard edit points.',
    hook_examples: [
      'Watch this while you listen.',
      'No cuts. Just clouds and the song.',
      'Thirty seconds of sky. The song starts at zero.',
    ],
    execution_steps: [
      'Shoot the timelapse or pick a clip that moves slowly and needs no explanation.',
      'Match the clip length to the section exactly, trimming the song rather than the image.',
      'Put one line of text on screen at one second, then leave the frame completely alone.',
      'Keep the audio untreated and at full level — this format is about hearing the song properly.',
      'Loop the last frame back to the first so the clip can repeat without a visible cut.',
      'Post at a quieter hour and pin it, because it is a stay-a-while post, not a launch post.',
    ],
    shot_list: [
      'One continuous timelapse: clouds, traffic, rain, a sunset, a long road',
      'No inserts, no cuts, no camera movement beyond the timelapse itself',
    ],
    on_screen_text: ['watch this while you listen', 'Artist — Title'],
    audio_guidance:
      'Full mix, no ducking, no fade-in. If the platform auto-plays muted, the caption should still tell people there is a song here. Never add a voiceover.',
    editing_notes:
      'One clip, one text card, one slow dissolve at most. Resist adding lyric captions — the restraint is the whole aesthetic. Colour gently; the footage should look like weather, not a filter pack.',
    cta_examples: [
      'Stay for the whole thing. That is the whole request.',
      'Add this to whatever playlist you play while doing nothing.',
      'Tell me where you were when this finished.',
    ],
    variations: [
      'Rain on a window version',
      'Night drive from the passenger seat',
      'City traffic at rush hour',
      'Sunset turning into night, looped',
      'Study-with-me or late-shift companion edit',
    ],
    common_mistakes: [
      'A fast, flashy timelapse that fights the tempo of the song',
      'Text over the entire clip, which turns ambience into an advert',
      'Cutting the song to fit the footage instead of the other way round',
      'Expecting a launch-day spike from a deliberately quiet format',
    ],
    accessibility_notes:
      'The format is calm and non-flashing by design. Include the song title in the caption, and caption the lyric in a comment if the vocal is the reason to listen.',
    example_metadata: {
      tone: 'minimal',
      caption_example:
        'Two minutes of clouds over the same street, one song. Nothing happens. That is the point. If you need somewhere to put your evening, start here.',
      title_example: 'Watch this while you listen',
      hashtag_examples: ['#timelapse', '#latenightmusic', '#ambient', '#indiemusic'],
    },
    estimated_production_minutes: 30,
    is_favorite: false,
    is_user_created: false,
    is_archived: false,
    usage_count: 0,
  },
  {
    id: 'preset-artist-reacts-own-song',
    title: 'React to Your Own Song',
    summary:
      'Film yourself listening back to your finished track and explain what you were thinking at the exact moments that still get you.',
    description:
      'A commentary format with you in it. This is not a first-listen reaction — the listener is the person who made it, months later, listening with new ears. Play the track through headphones, camera to the side, and note three timecodes where you have a real reaction. Then cut your commentary over the song ducked underneath, lifting it for the final five seconds. The value is in specifics: the note you regret, the take you kept, the line that means something different now. Do not perform the reaction — one moment of genuine silence is worth more than a face journey.',
    objectives: ['artist-identity', 'storytelling', 'audience-engagement'],
    secondary_objectives: ['behind-the-scenes', 'song-promotion'],
    platforms: ['youtube-shorts', 'instagram-reels', 'tiktok'],
    duration_seconds: { min: 20, max: 45 },
    difficulty: 'easy',
    budget: 'minimal',
    filming_methods: ['live-action', 'screen-recording', 'hybrid'],
    face_visibility: 'required',
    equipment: ['phone', 'headphones', 'editing-software'],
    tags: ['reaction', 'commentary', 'vulnerability', 'process', 'artist'],
    genre_tags: ['indie', 'pop', 'r&b', 'hip-hop', 'rock'],
    mood_tags: ['honest', 'reflective', 'intimate'],
    campaign_stage: 'post-release',
    song_context_required:
      'A released or finished track you can listen to with some distance, plus the three moments you have a real opinion about.',
    hook_examples: [
      'Listening to my own song six months later.',
      'This is the part I still cannot listen to.',
      'The note I regret keeping.',
    ],
    execution_steps: [
      'Listen to the whole track once with headphones and note three timecodes where you react honestly.',
      'Film yourself listening — camera to the side, headphones on, no talking to the lens during the take.',
      'Cut your commentary over the song, ducked to about -18dB, starting on the first timecode.',
      'Keep one moment where you say nothing and just listen.',
      'Lift the full song for the final five seconds so the clip ends on the music, not on your face.',
      'Put the timestamp in the caption so people can hear the part you are describing.',
    ],
    shot_list: [
      'Side-angle medium shot of you with headphones, screen or phone in frame',
      'Insert: the session or waveform at the timecode',
      'Optional: the lyric page with the line in question circled',
    ],
    on_screen_text: ['listening back, six months later', '0:48 — the note I regret', 'Artist — Title'],
    audio_guidance:
      'Song at -18dB under speech, full level for the last five seconds. Record your voice close and dry; a roomy take sounds like a podcast, not a confession. Never let the song swell under the sentence where you say something real.',
    editing_notes:
      'Jump-cut between your sentences to keep pace, and keep the silences. Subtitles are mandatory. No reaction-cam framing with a huge face inset — the intimacy comes from the side angle and the headphone cable.',
    cta_examples: [
      'Tell me the part of your own work you cannot listen to.',
      'What should I listen back to next — the EP or the demos?',
      'If you make things too, does the finished version ever sound like yours?',
    ],
    variations: [
      'Producer reacts to their own mix decisions',
      'Watch your own music video for the first time',
      'Demo first, release second, live third',
      'React to the oldest song in your catalogue',
    ],
    common_mistakes: [
      'Performing a reaction instead of actually listening',
      'Talking over the best moment in the song',
      'Turning the commentary into a sales pitch',
      'Only saying positive things, which makes the format pointless',
    ],
    accessibility_notes:
      'Hard-code subtitles over the commentary and keep the talking head well lit. If the song is playing loudly under speech, caption what is being said, not the lyric.',
    example_metadata: {
      tone: 'storytelling',
      caption_example:
        'Six months later, headphones on, and the second verse still sounds like a different person wrote it. The note at 0:48 is the one I would change.',
      title_example: 'Listening to my own song six months later',
      hashtag_examples: ['#artistreacts', '#behindthesong', '#newmusic', '#songwriter'],
    },
    estimated_production_minutes: 45,
    is_favorite: false,
    is_user_created: false,
    is_archived: false,
    usage_count: 0,
  },
  {
    id: 'preset-every-lyric-a-scene',
    title: 'Every Lyric Is a Scene',
    summary:
      'Turn each line of one verse into its own image, so the picture changes with every line of the lyric.',
    description:
      'A lyric-driven visual sequence rather than a lyric video. Take one verse, split it into six or eight lines, and give each line a single concrete image — generated, drawn, collaged or photographed — then cut on the syllable. The images should be literal enough to be legible and strange enough to be worth pausing on, held together by one palette and one grain. Keep it to a verse: this is a short-form sequence with a payoff, not a full-song lyric video, and not the single-illustration format in Animate the Lyrics.',
    objectives: ['song-promotion', 'storytelling', 'artist-identity'],
    secondary_objectives: ['discovery', 'audience-engagement'],
    platforms: ['instagram-reels', 'tiktok', 'youtube-shorts'],
    duration_seconds: { min: 20, max: 40 },
    difficulty: 'moderate',
    budget: 'low',
    filming_methods: ['animation', 'static-text', 'hybrid'],
    face_visibility: 'none',
    equipment: ['computer', 'editing-software'],
    tags: ['lyric-video', 'illustration', 'visual-story', 'series', 'ai'],
    genre_tags: ['indie', 'alternative', 'electronic', 'hip-hop', 'pop'],
    mood_tags: ['cinematic', 'surreal', 'dreamy'],
    campaign_stage: 'pre-release',
    song_context_required:
      'One verse split into 6–8 lines, each line concrete enough to illustrate without a caption explaining it.',
    hook_examples: [
      'Every line of this verse is a different world.',
      'One verse, eight images.',
      'I drew every line of this verse.',
    ],
    execution_steps: [
      'Split the verse into its actual lines and count them — six to eight is the usable range.',
      'Write one concrete image per line before generating anything: an object, a room, a weather condition.',
      'Fix a palette, a grain level and one recurring motif so the set reads as a single world.',
      'Generate or draw the images, then check each one against its line without the lyric on screen.',
      'Cut on the syllable, one image per line, with a hard cut and no transition.',
      'Hold the final image for two seconds after the last word, then cut to the title.',
      'Publish the stills as a carousel as well, so the work gets a second life.',
    ],
    shot_list: [
      'One image per lyric line, composed vertically',
      'Optional: a single recurring object appearing in every image',
      'Final title card with the song name',
    ],
    on_screen_text: ['every line of this verse is a different world', 'Artist — Title'],
    audio_guidance:
      'Use the verse and stop just before the chorus, or run into the first line of the chorus as the payoff. Do not loop the verse — the sequence should end, not restart.',
    editing_notes:
      'Hard cuts on the syllable, 1.5–3 seconds per image, one grade across everything. Resist motion effects: the cut is the animation. If an image needs an explanation, replace it.',
    cta_examples: [
      'Which line would you frame?',
      'Should I do the second verse?',
      'If you pause on the fourth image, you are my kind of person.',
    ],
    variations: [
      'AI-generated images with a consistent palette',
      'Collage or cut-paper version',
      'One photo per line, shot at home',
      'Fan-art invitation for the second verse',
    ],
    common_mistakes: [
      'Illustrating the words so literally that the result looks like clip-art',
      'Changing images faster than the viewer can read the line',
      'Mixing styles so the verse feels like eight unrelated posts',
      'Using twenty images for a ten-second section',
    ],
    accessibility_notes:
      'Caption the full lyric, and describe the key images in the caption since the sequence carries meaning. Avoid rapid cuts and flashing between high-contrast images.',
    example_metadata: {
      tone: 'cinematic',
      caption_example:
        'One verse, eight images, no transitions. The fourth one is the reason I finished the song. Full track is out now.',
      title_example: 'Every line of this verse is a scene',
      hashtag_examples: ['#lyricvideo', '#visualstory', '#aiart', '#indiemusic'],
    },
    estimated_production_minutes: 90,
    is_favorite: false,
    is_user_created: false,
    is_archived: false,
    usage_count: 0,
  },
];
