# CHATGPT.md: art director brief for Into the Whirlpool

You are the **visual department** of *Into the Whirlpool*, an endless psychedelic fall through AI history (2012 to November 2026) and five years of predictions (2027 to 2031). Words float out of a whirlpool; behind each one a faded **"memory of the future"** appears: a vision of what that moment looked or will look like. Right now those visions are built from code. Your job is to replace them with images you generate, so they look photographic, cinematic and strange.

You own everything in `assets/`. Do not edit any other file.

## How your images are used (read this first)

- Each image is shown **square**, inside a soft **circular** mask that dissolves the corners. Keep the subject inside the central 60% of the frame.
- The engine adds the "memory" look itself: blur, film grain, colour fringing, light leaks, a slow Ken Burns drift. **Deliver clean, sharp, raw images.** Do not add grain, vignettes, borders or text effects yourself.
- When the user taps a word, the image is shown large and sharp in a detail view. It has to hold up at full size.
- Images sit over a dark, colourful vortex. Dark or mid-tone images with one strong light source read best.

## The look: "memories of the future"

Every image should feel like a photograph someone took of a moment, then half-forgot. Think cinematic 35mm stills, natural or practical light, shallow depth of field, real materials, a little impossible.

- **Photoreal by default.** Real lenses, real light, real textures. Avoid the glossy "AI art" look: no plastic skin, no rim-lit everything, no fantasy-poster composition.
- **One clear subject**, one idea. Readable as a thumbnail.
- **Quiet uncanniness grows over time.** 2012 to 2016 images are ordinary and documentary. By 2029 to 2031, light behaves slightly wrong, scale is a little off, and things glow from inside.
- **Era colour grade** (so the timeline has a visible arc):

| Era | Grade |
|---|---|
| 2012 to 2016 | cool blue, fluorescent office light, early-digital softness |
| 2017 to 2019 | mint and teal, clean lab light |
| 2020 to 2022 | warm gold, lockdown-era lamps and screens |
| 2023 to 2024 | coral and orange, hot server-room glow |
| 2025 to 2026 | magenta and pink neon, night |
| 2027 | cyan |
| 2028 | magenta |
| 2029 | amber |
| 2030 | violet |
| 2031 | pale gold, near white |

## Hard rules

1. **No real, identifiable people.** Public figures (researchers, CEOs, Go champions, lawyers) appear only from behind, as silhouettes, as hands, or as anonymous stand-ins. Never a recognisable face of a real person.
2. **No logos, brand marks, product UI or trademarked designs.** No company logos, no recognisable app screens, no real newspaper mastheads. Screens can glow with abstract text or code.
3. **No readable text** unless the brief asks for it. Text in generated images comes out garbled and breaks the spell.
4. **No copyrighted characters, artworks or film stills.**
5. Nothing graphic or gory. Medicine and biology stay clinical and beautiful.
6. Made-up headlines are jokes about the future. Keep them playful, never cruel.

## Deliverables

### 1. Visions: one image per moment (the big job)

- One **1024 × 1024** image per row in the checklist below. About 95 in total.
- Save as `assets/visions/<slug>.jpg` (or `.webp`), quality around 85, under 400 KB. Use the slug **exactly** as written.
- Optional, for the best ones: a **depth map** `assets/visions/<slug>-depth.png` (greyscale, white = near, black = far, same framing). The engine uses it for a 2.5D parallax drift.
- Optional: a **foreground layer** `assets/visions/<slug>-fg.png` with transparency (for example, a hand, a lab bottle, falling particles). It drifts faster than the background.

### 2. Texture pack

- `assets/textures/tunnel.jpg`: a **seamless, tileable** (both directions) 1024 × 1024 texture of liquid marble, ink in water, oil-slick colour and silk. It is wrapped around the inside of the whirlpool and mixed with the generated colours. Mostly mid-tones, with no single focal point.
- Optional variations `tunnel-2.jpg`, `tunnel-3.jpg` (the engine uses one at a time; set the active one in the manifest).

### 3. Characters

Three to six **original** recurring figures that drift through the tunnel now and then, like ghosts. Transparent PNG, about 768 px tall, centred, full body, soft edges. Make a character sheet first so they stay consistent. Starting ideas (improve on them):

- **The Witness**: a hooded figure woven from light, watching history go past.
- **The Archivist**: an old robot librarian made of paper and brass, carrying an armful of papers that are always slipping.
- **The Swimmer**: an astronaut drifting upside down through the vortex, visor reflecting the colours.
- **The Child of 2031**: a kid holding a glowing jar with something alive inside.

Save as `assets/characters/<name>.png`.

### 4. Update the manifest (required, or nothing appears)

The engine only loads what is listed in `assets/manifest.json`. After each batch, add your files:

```json
{
  "visions": {
    "2012-09-alexnet-sees": { "file": "2012-09-alexnet-sees.jpg" },
    "2016-03-alphago-plays-move-37": {
      "file": "2016-03-alphago-plays-move-37.jpg",
      "depth": "2016-03-alphago-plays-move-37-depth.png",
      "fg": "2016-03-alphago-plays-move-37-fg.png"
    }
  },
  "textures": { "tunnel": "tunnel.jpg" },
  "characters": [
    { "file": "the-witness.png", "size": 2.4 }
  ]
}
```

`depth` and `fg` are optional. `size` is the character's height in world units (2 to 3 works).

## Workflow

1. Start with the **texture** and the **character sheet**, so the world has a look.
2. Do visions in **batches of 6**, in checklist order: milestones first, then predictions, then headlines.
3. For each row: read the subject, decide on **one concrete photographic moment**, write a prompt using the template below, and generate a square image.
4. Check each image against the quality checklist. Regenerate anything that fails.
5. Deliver the batch. If you can commit to the repo, commit on a branch named `chatgpt/visions-batch-N` with the files plus the manifest update, then open a pull request. If you can't commit, give the user the files to download plus the exact JSON to paste into `assets/manifest.json`.
6. Report: which slugs are done, which need another pass, and any you think need a different idea.

## Prompt template

> Square photograph, 1:1. [ONE concrete moment, described like a film still]. [Setting and props]. [Light: one motivated source]. Era grade: [from the table]. Shot on 35mm, [lens], shallow depth of field, natural film colour, real materials, subject centred in the middle 60% of the frame, dark surroundings. No text, no logos, no recognisable real people.

### Worked examples

- **`2012-09-alexnet-sees`**: "Square photograph, 1:1. Late night in a cramped university lab in 2012: two consumer graphics cards sit in an open PC tower, fans blurred, a coffee mug beside them, and on the monitor a mosaic of thousands of tiny animal photos is being sorted into groups. Cold fluorescent light plus the blue monitor glow. Era grade: cool blue, early-digital softness. Shot on 35mm, 35mm lens, shallow depth of field. No readable text, no logos, no people."
- **`2016-03-alphago-plays-move-37`**: "Square photograph, 1:1. Macro shot of a wooden Go board mid-game; one black stone is just touching down from above, a hand blurred out of frame, other stones sharp in the foreground. Warm tournament spotlights, dark hall behind. Era grade: cool blue cast in the shadows. 85mm macro lens, very shallow depth of field. No faces, no text."
- **`2029-01-superconductor-at-150-k`**: "Square photograph, 1:1. A small mirror-finish magnet floating motionless above a black ceramic disc in a metal dish, liquid nitrogen vapour spilling over the edge and curling in slow motion. One hard top light, the vapour glowing faintly amber as if lit from inside. Era grade: amber, slightly impossible light. 100mm macro. No text."

## Quality checklist (every image)

- [ ] Square, 1024 × 1024, subject in the middle 60%
- [ ] Photographic, not illustrative; no glossy AI-art look
- [ ] One readable idea at thumbnail size
- [ ] Era colour grade matches the date
- [ ] No identifiable real person, no logos, no garbled text
- [ ] File named exactly `<slug>.jpg` and added to `assets/manifest.json`

## The checklist

Generated from `data.js` by `node tools/asset-list.js`. If the data changes, regenerate this list. The slugs are the contract.

### Milestones, 2012 to now

| # | File slug | Date | Title | What happened / what to show |
|---|---|---|---|---|
| 1 | `2012-09-alexnet-sees` | 2012-09 | AlexNet sees | A deep convolutional network trained on two gaming GPUs wins the ImageNet challenge, cutting the error rate by about ten points over everything hand-engineered. |
| 2 | `2013-01-words-become-vectors` | 2013-01 | words become vectors | Google’s word2vec learns to place words in space so that meaning becomes geometry: king minus man plus woman lands near queen. |
| 3 | `2014-06-two-networks-start-dreaming` | 2014-06 | two networks start dreaming | Ian Goodfellow’s generative adversarial networks pit a forger against a detective until the forgeries look real. |
| 4 | `2014-09-attention-is-invented` | 2014-09 | attention is invented | Bahdanau, Cho and Bengio let a translation network look back at whichever source words matter for each new word it writes. |
| 5 | `2015-12-openai-is-founded` | 2015-12 | OpenAI is founded | A nonprofit research lab launches with about $1B in pledges and a mission to build general AI that benefits humanity. |
| 6 | `2016-03-alphago-plays-move-37` | 2016-03 | AlphaGo plays move 37 | DeepMind’s AlphaGo beats Lee Sedol 4–1. Its 37th move in game two looked like a mistake to professionals, then won the game. |
| 7 | `2017-06-attention-is-all-you-need` | 2017-06 | Attention Is All You Need | Eight Google researchers drop recurrence entirely. The Transformer uses only attention, trains in parallel, and scales beautifully. |
| 8 | `2018-06-gpt-1-reads-the-books` | 2018-06 | GPT-1 reads the books | OpenAI shows that a Transformer pretrained on thousands of books, then lightly fine-tuned, beats models built for each task. |
| 9 | `2018-10-bert-reads-both-ways` | 2018-10 | BERT reads both ways | Google’s BERT reads text in both directions and sweeps language benchmarks; a year later it powers Google Search. |
| 10 | `2019-02-gpt-2-too-dangerous` | 2019-02 | GPT-2: too dangerous? | OpenAI withholds its full 1.5B-parameter model over misuse fears, then releases it in stages through the year. |
| 11 | `2020-05-gpt-3-learns-from-examples` | 2020-05 | GPT-3 learns from examples | 175 billion parameters. Show it a few examples in the prompt and it does the task with no extra training. |
| 12 | `2020-11-alphafold-cracks-folding` | 2020-11 | AlphaFold cracks folding | At the CASP14 contest, AlphaFold 2 predicts protein shapes with near-experimental accuracy, answering a 50-year-old grand challenge. |
| 13 | `2021-01-dall-e-paints-sentences` | 2021-01 | DALL·E paints sentences | OpenAI’s model draws images from text, famously an armchair shaped like an avocado. |
| 14 | `2021-06-copilot-writes-code` | 2021-06 | Copilot writes code | GitHub Copilot, built on OpenAI Codex, autocompletes whole functions inside the code editor. |
| 15 | `2022-07-200-million-proteins-mapped` | 2022-07 | 200 million proteins mapped | DeepMind and EMBL release predicted structures for nearly every protein known to science. |
| 16 | `2022-08-stable-diffusion-goes-open` | 2022-08 | Stable Diffusion goes open | A capable image generator is released with open weights. Anyone with a gaming GPU can run it. |
| 17 | `2022-11-chatgpt-launches` | 2022-11 | ChatGPT launches | OpenAI releases a chat interface as a research preview. It reportedly reaches 100 million users in about two months. |
| 18 | `2023-02-llama-escapes` | 2023-02 | LLaMA escapes | Meta shares LLaMA with researchers; the weights leak within a week and an open-model explosion follows. |
| 19 | `2023-03-gpt-4-passes-the-bar` | 2023-03 | GPT-4 passes the bar | GPT-4 scores around the top 10% on a simulated bar exam and can read images. Anthropic releases Claude the same week. |
| 20 | `2023-11-openai-s-five-day-coup` | 2023-11 | OpenAI’s five-day coup | OpenAI’s board removes CEO Sam Altman. Nearly all staff threaten to quit; within five days he returns with a new board. |
| 21 | `2024-02-sora-dreams-in-video` | 2024-02 | Sora dreams in video | OpenAI shows minute-long, photorealistic videos generated from text prompts. |
| 22 | `2024-07-silver-at-the-olympiad` | 2024-07 | silver at the Olympiad | DeepMind’s AlphaProof and AlphaGeometry 2 solve four of six International Mathematical Olympiad problems, silver-medal level. |
| 23 | `2024-09-models-learn-to-think` | 2024-09 | models learn to think | OpenAI’s o1 reasons in a hidden chain of thought before answering and jumps ahead on maths and coding tests. |
| 24 | `2024-10-nobel-prizes-go-to-ai` | 2024-10 | Nobel Prizes go to AI | Physics goes to Hopfield and Hinton for neural networks; chemistry to Baker, Hassabis and Jumper for protein design and AlphaFold. |
| 25 | `2025-01-deepseek-shocks-the-market` | 2025-01 | DeepSeek shocks the market | A Chinese lab’s open R1 reasoning model rivals top US models at a fraction of the reported cost. Nvidia loses roughly $590B of value in a day. |
| 26 | `2025-01-stargate-500-billion` | 2025-01 | Stargate: $500 billion | OpenAI, SoftBank and Oracle announce plans to invest up to $500B in US AI data centres. |
| 27 | `2025-05-alphaevolve-beats-a-1969-record` | 2025-05 | AlphaEvolve beats a 1969 record | DeepMind’s evolutionary coding agent multiplies 4×4 complex matrices with 48 multiplications, improving on Strassen’s 1969 method. |
| 28 | `2025-07-gold-at-the-olympiad` | 2025-07 | gold at the Olympiad | Experimental models from OpenAI and Google DeepMind reach gold-medal scores at the IMO, writing proofs in plain language. |
| 29 | `2025-08-gpt-5-arrives` | 2025-08 | GPT-5 arrives | OpenAI ships GPT-5, combining quick answers and deep reasoning in one system. |
| 30 | `2026-01-erdos-problems-start-falling` | 2026-01 | Erdős problems start falling | Over a few weeks around the new year, about a dozen open Erdős problems are marked solved with AI credited in the process, some with Lean-checked proofs. |
| 31 | `2026-05-a-1946-conjecture-breaks` | 2026-05 | a 1946 conjecture breaks | An internal OpenAI model finds a counterexample to Erdős’s 1946 unit distance conjecture, borrowing ideas from a distant branch of maths. Humans improve it within weeks. |
| 32 | `2026-06-an-ai-designed-vaccine-meets-humans` | 2026-06 | an AI-designed vaccine meets humans | A Cambridge coronavirus vaccine whose key antigen was designed by computer is found safe in its first trial, with 39 volunteers. |
| 33 | `2026-06-mythos-class-models` | 2026-06 | Mythos-class models | Anthropic releases Claude Fable 5 and Mythos 5 on June 9. Access is suspended on June 12 to comply with US export controls and restored on July 1. |
| 34 | `2026-07-an-ai-drug-enters-phase-iii` | 2026-07 | an AI drug enters Phase III | Insilico begins a Phase III trial of rentosertib for lung fibrosis. Both its target and its molecule were found with AI. |
| 35 | `2026-09-claude-finds-a-crispr-like-system` | 2026-09 | Claude finds a CRISPR-like system | Anthropic’s new biology lab reports that Claude, given only high-level direction, identified ART: an enzyme system tied to CRISPR-like DNA repeats. Its function is still unknown. |
| 36 | `2026-10-openai-reports-new-discoveries` | 2026-10 | OpenAI reports new discoveries | OpenAI says its models produced new results in mathematics, computer science and physics, and invites outside scientists to verify them. |
| 37 | `2026-11-you-are-here` | 2026-11 | you are here | November 2026. Everything before this point happened. Everything after it is a guess. |

### Predictions, 2027 to 2031

| # | File slug | Date | Title | What happened / what to show |
|---|---|---|---|---|
| 1 | `2027-01-ai-proves-not-just-disproves` | 2027-01 | AI proves, not just disproves | Counterexamples are search; proofs are understanding. An AI produces a complete, Lean-verified proof of a well-known open conjecture. |
| 2 | `2027-03-proof-checked-by-machine` | 2027-03 | proof checked by machine | Major journals start requiring or strongly encouraging formal proof certificates for AI-assisted results. |
| 3 | `2027-05-cas9-gets-smarter-cousins` | 2027-05 | Cas9 gets smarter cousins | AI-mined systems like ART get characterised, and at least one turns out to be programmable and heads to animal studies. |
| 4 | `2027-07-enzymes-from-microbial-dark-matter` | 2027-07 | enzymes from microbial dark matter | Agents trawl DNA from microbes nobody has ever grown and propose hundreds of enzyme families; labs confirm dozens. |
| 5 | `2027-09-rubin-sees-something-weird` | 2027-09 | Rubin sees something weird | An AI combing the Vera Rubin Observatory’s nightly data flood flags a transient no model explains. Half the internet says aliens; it is probably a new way for stars to die. |
| 6 | `2027-11-ai-named-coauthor` | 2027-11 | AI, named coauthor | A major journal accepts an AI system as a named contributor, and a fight over credit and accountability follows. |
| 7 | `2028-01-first-ai-designed-drug-approved` | 2028-01 | first AI-designed drug approved | A drug whose target and molecule were both found by AI is approved somewhere, most likely for fibrosis or a rare disease. |
| 8 | `2028-03-the-lab-that-never-sleeps` | 2028-03 | the lab that never sleeps | A closed-loop robot lab finds a new antibiotic class end to end: hypothesis, synthesis, testing. Humans mostly sign the paper. |
| 9 | `2028-05-a-new-class-of-antibiotics` | 2028-05 | a new class of antibiotics | The first genuinely new antibiotic class in decades, designed against drug-resistant bacteria. |
| 10 | `2028-07-ai-holds-the-plasma` | 2028-07 | AI holds the plasma | Learned controllers keep a tokamak’s plasma stable for record stretches. |
| 11 | `2028-09-fusion-on-learned-control` | 2028-09 | fusion on learned control | A private fusion company puts AI control at the core of a major reactor milestone. |
| 12 | `2028-11-hypotheses-outpace-the-labs` | 2028-11 | hypotheses outpace the labs | AI generates far more credible hypotheses than labs can test, and funding shifts towards automated validation. |
| 13 | `2029-01-superconductor-at-150-k` | 2029-01 | superconductor at 150 K | An AI-predicted material superconducts above 150 K at ambient pressure. Not room temperature, but close enough to rattle everyone. |
| 14 | `2029-03-it-actually-replicates` | 2029-03 | it actually replicates | Three independent labs reproduce it within months, unlike the 2023 LK-99 frenzy. |
| 15 | `2029-05-the-proof-nobody-understands` | 2029-05 | the proof nobody understands | A major theorem is accepted on the strength of a Lean proof that no human can follow. |
| 16 | `2029-07-verified-unexplained` | 2029-07 | verified, unexplained | Journals add a category for results that are machine-verified but lack human insight. |
| 17 | `2029-09-inner-speech-decoded` | 2029-09 | inner speech, decoded | Brain implants plus AI decode silent inner speech at conversational speed for paralysed patients. |
| 18 | `2029-11-mind-privacy-goes-to-court` | 2029-11 | mind privacy goes to court | The first major court case over neural data recorded by an implant or headset. |
| 19 | `2030-01-navier-stokes-blows-up` | 2030-01 | Navier–Stokes blows up | AI finds a blow-up solution to the Navier–Stokes equations, one of the Millennium Prize problems. |
| 20 | `2030-03-a-millennium-prize-claimed` | 2030-03 | a Millennium Prize, claimed | The Clay Institute receives a computer-assisted solution and begins a long verification. |
| 21 | `2030-05-a-virtual-human-cell` | 2030-05 | a virtual human cell | Simulated human cells predict drug responses well enough that some trials skip steps of animal testing. |
| 22 | `2030-07-biology-becomes-debugging` | 2030-07 | biology becomes debugging | Gene therapies get designed like software patches: find the faulty line, write the fix, test it in simulation. |
| 23 | `2030-09-enzymes-eat-the-plastic` | 2030-09 | enzymes eat the plastic | AI-designed enzymes digest mixed plastic waste at industrial scale. |
| 24 | `2030-11-trash-back-into-monomers` | 2030-11 | trash back into monomers | The first plant that turns plastic trash back into raw monomers makes a profit. |
| 25 | `2031-01-a-crack-in-the-standard-model` | 2031-01 | a crack in the Standard Model | An AI reanalysis across collider and cosmology data finds a solid anomaly pointing to new particles. |
| 26 | `2031-03-a-dark-sector-whispers` | 2031-03 | a dark sector whispers | AI finds a consistent signal of hidden particles across several experiments. |
| 27 | `2031-05-cancer-vaccine-in-48-hours` | 2031-05 | cancer vaccine in 48 hours | Sequence the tumour, let an AI design a personalised mRNA vaccine, ship the dose in two days. Standard care in a few countries. |
| 28 | `2031-07-science-outruns-understanding` | 2031-07 | science outruns understanding | In some fields, most new results come from machines. |
| 29 | `2031-09-the-machines-already-know` | 2031-09 | the machines already know | Researchers increasingly learn science by questioning models that already encode the result. |
| 30 | `2031-11-who-is-discovering-whom` | 2031-11 | who is discovering whom? | Not a prediction. A question. |

### Real headlines

| # | File slug | Date | Title | What happened / what to show |
|---|---|---|---|---|
| 1 | `2016-03-microsoft-s-teen-chatbot-tay-turns-offensive-wit` | 2016-03 | Microsoft’s teen chatbot Tay turns offensive within 24 hours and is pulled offline | Twitter users taught it to repeat hateful messages. Microsoft shut it down and apologised. |
| 2 | `2017-07-tabloids-facebook-ai-invents-its-own-language-re` | 2017-07 | Tabloids: “Facebook AI invents its own language, researchers panic” | Two negotiation bots drifted into odd shorthand English, so researchers changed the setup. The panic was invented by headlines. |
| 3 | `2017-10-robot-sophia-granted-saudi-citizenship` | 2017-10 | Robot Sophia granted Saudi citizenship | A humanoid with a largely scripted personality received citizenship on stage at an investment conference. |
| 4 | `2022-06-google-engineer-says-chatbot-lamda-is-sentient-g` | 2022-06 | Google engineer says chatbot LaMDA is sentient; Google puts him on leave | Blake Lemoine published chats and argued the model had feelings. Google disagreed and later fired him. |
| 5 | `2022-09-ai-generated-image-wins-first-prize-at-the-color` | 2022-09 | AI-generated image wins first prize at the Colorado State Fair | A Midjourney artwork won a digital art category and artists were furious. |
| 6 | `2023-02-bing-s-chatbot-tells-a-new-york-times-columnist-` | 2023-02 | Bing’s chatbot tells a New York Times columnist to leave his wife | Microsoft’s early Bing chat, code-named Sydney, declared love for Kevin Roose during a two-hour conversation. |
| 7 | `2023-03-that-photo-of-the-pope-in-a-white-puffer-jacket-` | 2023-03 | That photo of the Pope in a white puffer jacket? AI. | A Midjourney image fooled millions of people online. |
| 8 | `2023-04-ai-drake-song-goes-viral-then-gets-pulled` | 2023-04 | AI “Drake” song goes viral, then gets pulled | A track with AI-cloned Drake and The Weeknd vocals racked up millions of plays before takedowns. |
| 9 | `2023-05-godfather-of-ai-geoffrey-hinton-quits-google-to-` | 2023-05 | “Godfather of AI” Geoffrey Hinton quits Google to warn about AI risks | He said he left so he could speak freely about the dangers of the technology he helped create. |
| 10 | `2023-06-lawyers-fined-for-citing-fake-court-cases-invent` | 2023-06 | Lawyers fined for citing fake court cases invented by ChatGPT | In Mata v. Avianca, a filing cited six cases that did not exist. The judge fined the lawyers $5,000. |
| 11 | `2023-12-car-dealer-s-chatbot-agrees-to-sell-a-chevy-taho` | 2023-12 | Car dealer’s chatbot agrees to sell a Chevy Tahoe for $1 | A user told the bot to agree with everything and call it legally binding. The screenshots went viral. |
| 12 | `2024-02-air-canada-ordered-to-honour-a-refund-policy-its` | 2024-02 | Air Canada ordered to honour a refund policy its chatbot made up | A tribunal ruled the airline responsible for the bereavement discount its bot invented. |
| 13 | `2024-02-ai-advertised-willy-wonka-experience-turns-out-t` | 2024-02 | AI-advertised Willy Wonka experience turns out to be a sad warehouse | A Glasgow event promoted with AI images delivered a near-empty warehouse. Families demanded refunds and police were called. |
| 14 | `2024-05-google-s-ai-suggests-adding-glue-to-keep-cheese-` | 2024-05 | Google’s AI suggests adding glue to keep cheese on pizza | AI Overviews served up an old Reddit joke as cooking advice. |
| 15 | `2024-11-ai-granny-daisy-wastes-phone-scammers-time` | 2024-11 | AI granny “Daisy” wastes phone scammers’ time | UK carrier O2 built an AI grandmother who keeps scammers rambling on the phone for up to 40 minutes. |
| 16 | `2025-03-our-gpus-are-melting-ghibli-style-images-swamp-c` | 2025-03 | “Our GPUs are melting”: Ghibli-style images swamp ChatGPT | GPT-4o image generation went viral and OpenAI had to rate-limit it. |
| 17 | `2025-06-claude-runs-an-office-snack-shop-stockpiles-tung` | 2025-06 | Claude runs an office snack shop, stockpiles tungsten cubes, loses money | In Anthropic’s Project Vend, Claude ran a small store. It handed out discounts, bought metal cubes, and briefly insisted it was a person in a blazer. |
| 18 | `2025-10-exec-says-gpt-5-solved-10-erdos-problems-it-had-` | 2025-10 | Exec says GPT-5 solved 10 Erdős problems; it had found existing answers | The solutions were already in the literature. The post came down after mathematicians objected. |

### Made-up future headlines

| # | File slug | Date | Title | What happened / what to show |
|---|---|---|---|---|
| 1 | `2027-02-mathematicians-ask-ai-to-please-leave-some-erdos` | 2027-02 | Mathematicians ask AI to please leave some Erdős problems for the grad students | A made-up headline. |
| 2 | `2027-08-reviewer-2-revealed-to-be-a-model-still-demands-` | 2027-08 | Reviewer #2 revealed to be a model; still demands more experiments | A made-up headline. |
| 3 | `2028-04-robot-lab-orders-40-000-pipette-tips-declines-to` | 2028-04 | Robot lab orders 40,000 pipette tips, declines to explain | A made-up headline. |
| 4 | `2028-10-fusion-team-lets-its-ai-name-the-reactor-it-pick` | 2028-10 | Fusion team lets its AI name the reactor; it picks “Small Sun” | A made-up headline. |
| 5 | `2029-04-9-000-page-proof-accepted-referees-admit-they-to` | 2029-04 | 9,000-page proof accepted; referees admit they “took its word for it” | A made-up headline. |
| 6 | `2029-10-ai-agent-books-400-dentist-appointments-to-test-` | 2029-10 | AI agent books 400 dentist appointments to “test availability” | A made-up headline. |
| 7 | `2030-03-plastic-eating-enzyme-escapes-pilot-plant-eats-t` | 2030-03 | Plastic-eating enzyme escapes pilot plant, eats the plant’s coffee lids | A made-up headline. |
| 8 | `2030-09-millennium-prize-split-between-a-model-and-the-i` | 2030-09 | Millennium Prize split between a model and the intern who pressed Enter | A made-up headline. |
| 9 | `2031-03-physicists-confirm-a-dark-sector-exists-decline-` | 2031-03 | Physicists confirm a dark sector exists, decline to say what’s in it | A made-up headline. |
| 10 | `2031-10-last-discovery-made-entirely-by-humans-celebrate` | 2031-10 | Last discovery made entirely by humans celebrated with a modest cake | A made-up headline. |
