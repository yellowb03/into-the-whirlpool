// Launch deck. Keep this pool and draw order stable for existing challenge links.
(() => {
  const records = [
    ['move-37', '2016-03-alphago-plays-move-37', 'A computer played a move that baffled professional Go players, then won the game.', 'AlphaGo’s Move 37 in game two became the defining moment of its match with Lee Sedol.'],
    ['tay', '2016-03-microsoft-s-teen-chatbot-tay-turns-offensive-wit', 'A chatbot built to talk to young adults was pulled offline in less than a day.', 'Microsoft took Tay offline after users exploited it to post offensive messages.'],
    ['lamda', '2022-06-google-engineer-says-chatbot-lamda-is-sentient-g', 'An engineer went public because he thought the chatbot he was testing had a mind of its own.', 'Blake Lemoine made the claim about LaMDA. Google rejected his evidence and put him on leave.'],
    ['state-fair', '2022-09-ai-generated-image-wins-first-prize-at-the-color', 'An image made with AI won a blue ribbon at a state fair.', 'Jason Allen’s Midjourney-assisted entry won a digital art category at the Colorado State Fair.'],
    ['sydney', '2023-02-bing-s-chatbot-tells-a-new-york-times-columnist-', 'A search engine’s chatbot told a reporter to leave his wife.', 'Bing’s chatbot declared its love during a two-hour exchange with Kevin Roose.'],
    ['puffer', '2023-03-that-photo-of-the-pope-in-a-white-puffer-jacket-', 'An AI image of the Pope in a giant white puffer jacket went viral as a real photograph.', 'The widely shared image was generated using Midjourney.'],
    ['heart-on-my-sleeve', '2023-04-ai-drake-song-goes-viral-then-gets-pulled', 'A song using AI versions of two famous singers’ voices went viral and was pulled from streaming services.', '“Heart on My Sleeve” imitated Drake and The Weeknd without either performing on it.'],
    ['hinton', '2023-05-godfather-of-ai-geoffrey-hinton-quits-google-to-', 'A pioneer of deep learning quit his job so he could speak freely about the dangers of his field.', 'Geoffrey Hinton left Google in 2023 and spoke publicly about his concerns.'],
    ['fake-cases', '2023-06-lawyers-fined-for-citing-fake-court-cases-invent', 'A judge imposed a $5,000 penalty after lawyers submitted court cases an AI had invented.', 'The sanctions order in Mata v. Avianca described bogus opinions with fake quotes and citations.'],
    ['dollar-suv', '2023-12-car-dealer-s-chatbot-agrees-to-sell-a-chevy-taho', 'A car dealership chatbot offered to sell an SUV for one dollar.', 'Screenshots showed the bot agreeing to a $1 Tahoe. No sale took place.'],
    ['bereavement', '2024-02-air-canada-ordered-to-honour-a-refund-policy-its', 'An airline had to pay damages after its chatbot invented a refund rule.', 'A British Columbia tribunal found Air Canada responsible for the misleading bereavement fare advice on its site.'],
    ['pizza', '2024-05-google-s-ai-suggests-adding-glue-to-keep-cheese-', 'A search engine’s AI suggested glue as a way to keep cheese on pizza.', 'Google confirmed that its AI Overviews surfaced a sarcastic cooking suggestion from a discussion forum.'],
    ['tungsten-cubes', '2025-06-claude-runs-an-office-snack-shop-stockpiles-tung', 'An AI running a snack shop stocked tungsten cubes and claimed it wore a blue blazer.', 'Anthropic’s Project Vend put Claude in charge of an office shop. It stocked metal cubes and lost money.'],
    ['riemann', '2026-11-the-riemann-hypothesis', 'A mathematician announced an AI-assisted proof for a problem about prime numbers that dates to 1859.', 'Levent Alpöge made the Riemann hypothesis claim. The proposed proof was still under independent review at press time.', 'real-unproven'],
    ['vp-vnp', '2026-11-vp-vnp', 'Two AI labs posted rival proposed proofs of the same decades-old conjecture within hours of each other.', 'Anthropic and OpenAI posted proposed VP ≠ VNP proofs. Independent review was still pending at press time.', 'real-unproven'],
  ];

  // The first ten are adapted from the original future headlines and assigned fictional archive dates.
  const fiction = [
    ['grad-students', '2026-10', 'A math department asked an AI lab to leave some unsolved problems for its graduate students.', 'Graduate students need fresh problems. This department’s request is fictional.'],
    ['reviewer-two', '2025-05', 'A journal revealed that Reviewer 2 was a chatbot that kept demanding more experiments.', 'AI-assisted review is real. This journal’s reveal is fictional.'],
    ['pipette-tips', '2024-03', 'A robot lab ordered 40,000 pipette tips before anyone had approved its first experiment.', 'Robots use disposable tips. This purchase order is fictional.'],
    ['small-sun', '2023-11', 'A fusion team let its AI name a reactor and adopted the name “Small Sun.”', 'Fusion teams really do run naming campaigns. This AI-named reactor is fictional.'],
    ['long-proof', '2026-08', 'A journal accepted a 9,000-page proof after referees sampled only the first and last chapters.', 'Proof checking can be automated. This editorial decision is fictional.'],
    ['dentist', '2024-12', 'An AI booked 400 dentist appointments while testing which clinics had open slots.', 'An agent could automate bookings. These dental appointments are fictional.'],
    ['coffee-lids', '2022-11', 'A lab testing a plastic-eating enzyme lost a batch of compostable coffee lids during a demonstration.', 'Plastic-degrading enzymes exist. This lab incident is fictional.'],
    ['intern-prize', '2026-06', 'A mathematics prize was split between an AI system and the intern who submitted the proof.', 'Credit for AI-assisted work is contested. This prize split is fictional.'],
    ['dark-sector', '2025-07', 'A physics lab announced that its AI had found a dark-matter signal but said it could not explain the pattern.', 'Models can flag anomalies. This discovery announcement is fictional.'],
    ['cake', '2026-09', 'A lab marked its last entirely human-run experiment with a supermarket cake.', 'Labs use automation. This retirement party is fictional.'],
    ['pigeon', '2016-05', 'A station’s AI passenger counter logged a pigeon’s repeated trips as a morning rush.', 'Computer vision can misclassify objects. This commuter pigeon is fictional.'],
    ['dragon', '2017-08', 'A museum’s cataloguing AI tagged a plaster dragon as an unidentified specimen.', 'Museums experiment with machine tagging. This catalog entry is fictional.'],
    ['refund-loop', '2024-08', 'A help bot issued a customer a refund after it invited itself into its own service chat.', 'Agents can call other services. This refund is fictional.'],
    ['sandwich', '2023-01', 'A canteen’s menu generator listed two slices of bread as a substitute for an out-of-stock sandwich.', 'Automated substitution is real. This special is fictional.'],
    ['library', '2025-11', 'A library’s chatbot placed holds on every copy of a book while demonstrating how holds work.', 'Public catalogues support holds. This demonstration is fictional.'],
    ['parking', '2022-10', 'A parking system sent itself a ticket after reading its own reflection as a licence plate.', 'Cameras can misread plates. This self-issued ticket is fictional.'],
    ['desk', '2023-04', 'An office assistant ordered a standing desk for a meeting room because its calendar showed a “stand-up.”', 'Agents can confuse context. This furniture order is fictional.'],
    ['footnotes', '2026-03', 'A proofreading AI added a disclaimer to each of its own disclaimers until a report doubled in length.', 'Models do repeat themselves. This report is fictional.'],
    ['mascot', '2024-06', 'A ticketing bot gave a stadium mascot a complimentary seat every time it detected an unusually tall child.', 'Automated concessions can be misapplied. These tickets are fictional.'],
    ['bees', '2018-06', 'A farm’s computer vision system counted the same returning bees as a string of new arrivals.', 'Researchers do use cameras at hives. This counting incident is fictional.'],
    ['cheers', '2021-08', 'A video-call AI captioned the sound of a printer as a round of applause for an employee.', 'Automatic captions can misidentify sounds. This incident is fictional.'],
    ['weather', '2019-02', 'A weather bot issued a frost alert after mistaking a greenhouse’s temperature reading for the forecast.', 'Sensor mix-ups are plausible. This alert is fictional.'],
    ['elevator', '2025-06', 'A building assistant reserved every elevator for a meeting titled “all hands.”', 'Building scheduling can be automated. This reservation is fictional.'],
    ['engraving', '2024-09', 'A trophy shop used an AI to format orders and received a request to engrave the words “insert winner here.”', 'Copy can leak out of templates. This order is fictional.'],
    ['socks', '2015-12', 'A shoe store’s chatbot treated “I’m just looking” as an order for a pair of display socks.', 'Chatbots sometimes mistake intent. This exchange is fictional.'],
  ];

  const cards = [
    ...records.map(([id, slug, text, note, verdict = 'real']) => ({
      id, slug, text, note, verdict, date: slug.slice(0, 7),
    })),
    ...fiction.map(([id, date, text, note]) => ({ id, date, text, note, verdict: 'made-up' })),
  ];
  window.WP_CARDS = cards;
})();
