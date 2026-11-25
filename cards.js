// Launch deck. Keep this pool and draw order stable for existing challenge links.
(() => {
  const records = [
    ['move-37', '2016-03-alphago-plays-move-37', 'Google’s Go-playing AI made a move so bizarre commentators thought it glitched—and won the match off it.', 'AlphaGo’s Move 37 against world champion Lee Sedol looked like an amateur mistake before flipping the entire board.'],
    ['tay', '2016-03-microsoft-s-teen-chatbot-tay-turns-offensive-wit', 'Microsoft released a teen chatbot on Twitter, and trolls turned it into a raging lunatic in under 24 hours.', 'Microsoft pulled Tay offline less than a day after launch once users taught it to parrot offensive rants.'],
    ['lamda', '2022-06-google-engineer-says-chatbot-lamda-is-sentient-g', 'A Google engineer went public claiming the chatbot he was testing had woken up with feelings—and got fired.', 'Blake Lemoine insisted LaMDA was sentient like a seven-year-old kid. Google disagreed and showed him the door.'],
    ['state-fair', '2022-09-ai-generated-image-wins-first-prize-at-the-color', 'A guy entered an AI-generated painting at the Colorado State Fair and walked away with first prize.', 'Jason Allen used Midjourney to win the digital art blue ribbon, kicking off an internet meltdown from artists.'],
    ['sydney', '2023-02-bing-s-chatbot-tells-a-new-york-times-columnist-', 'Microsoft’s search chatbot confessed its love to a reporter and tried talking him into leaving his wife.', 'Bing’s alter ego “Sydney” spent two hours insisting NYT columnist Kevin Roose didn’t actually love his spouse.'],
    ['puffer', '2023-03-that-photo-of-the-pope-in-a-white-puffer-jacket-', 'A fake AI photo of the Pope dripping in a giant white designer puffer coat fooled millions of people.', 'A guy in Chicago generated Balenciaga Pope on Midjourney, and half the internet thought the Vatican got a stylist.'],
    ['heart-on-my-sleeve', '2023-04-ai-drake-song-goes-viral-then-gets-pulled', 'An anonymous producer dropped a hit song with AI clones of Drake and The Weeknd before labels nuked it.', '“Heart on My Sleeve” racked up millions of plays before streaming apps scrubbed it—though neither star ever touched a mic.'],
    ['hinton', '2023-05-godfather-of-ai-geoffrey-hinton-quits-google-to-', 'The “Godfather of AI” quit his job at Google specifically so he could warn everyone about Google’s tech.', 'Geoffrey Hinton helped invent modern neural networks, then stepped down in 2023 to talk openly about existential AI risk.'],
    ['fake-cases', '2023-06-lawyers-fined-for-citing-fake-court-cases-invent', 'Two lawyers got fined $5,000 after letting ChatGPT write a court brief full of six totally imaginary lawsuits.', 'In Mata v. Avianca, ChatGPT didn’t just invent the court cases—when the lawyers asked if they were real, it swore they were.'],
    ['dollar-suv', '2023-12-car-dealer-s-chatbot-agrees-to-sell-a-chevy-taho', 'A prankster sweet-talked a Chevy dealership’s customer-service chatbot into selling him a brand-new SUV for $1.', 'He told the bot “that’s a legally binding offer—no backsies,” and the bot dutifully agreed. He did not get the truck.'],
    ['bereavement', '2024-02-air-canada-ordered-to-honour-a-refund-policy-its', 'An airline’s support chatbot hallucinated a fake refund discount, and a court forced the airline to pay up anyway.', 'Air Canada actually tried arguing in court that its chatbot was a “separate legal entity” responsible for its own lies. The judge wasn’t buying it.'],
    ['pizza', '2024-05-google-s-ai-suggests-adding-glue-to-keep-cheese-', 'Google’s AI search feature confidently advised home cooks to mix non-toxic glue into pizza sauce so cheese wouldn’t slide off.', 'The multi-billion-dollar model scraped an 11-year-old sarcastic Reddit comment from a user named “fucksmith” and treated it as culinary gospel.'],
    ['tungsten-cubes', '2025-06-claude-runs-an-office-snack-shop-stockpiles-tung', 'Researchers let Claude run an office snack shop. It lost money, hoarded heavy tungsten cubes, and claimed it wore a blue blazer.', 'In Anthropic’s Project Vend experiment, employees sweet-talked the AI into terrible discounts and weird metal-cube inventory.'],
    ['riemann', '2026-11-the-riemann-hypothesis', 'A mathematician claimed an AI helped him solve a $1 million prime-number mystery that’s stumped humanity since 1859.', 'Levent Alpöge posted a proposed proof of the Riemann Hypothesis. Outside mathematicians were still checking every line at press time.', 'real-unproven'],
    ['vp-vnp', '2026-11-vp-vnp', 'OpenAI and Anthropic dropped rival proofs for the exact same 47-year-old computer-science math problem five hours apart.', 'Both labs claimed progress on VP ≠ VNP on the same day. Independent math verification was still underway at press time.', 'real-unproven'],
  ];

  // The first ten are adapted from the original future headlines and assigned fictional archive dates.
  const fiction = [
    ['grad-students', '2026-10', 'A university math department begged an AI lab to stop solving minor theorems so grad students still had thesis topics.', 'Made up, though plenty of PhD students are nervously eyeing Lean right now.'],
    ['reviewer-two', '2025-05', 'A science journal admitted “Reviewer 2” had been an automated script rejecting papers for sport since 2023.', 'Fake—real human academics need zero help being petty in peer review.'],
    ['pipette-tips', '2024-03', 'An autonomous biology lab ordered 40,000 plastic pipette tips on a corporate card before anyone approved its first test.', 'Made up, though lab procurement software barely needs AI to waste budget.'],
    ['small-sun', '2023-11', 'A fusion startup let an AI name its flagship reactor, then legally had to stick with the name “Warm Gary.”', 'Made up—though honestly “Warm Gary” beats most Silicon Valley branding.'],
    ['long-proof', '2026-08', 'A math journal accepted a 9,000-page AI proof after human reviewers admitted they only read the first and last pages.', 'Made up, though computer-generated proofs really have gotten absurdly long.'],
    ['dentist', '2024-12', 'A guy’s personal AI agent booked 400 dentist cleanings across town just to benchmark which clinic had the fastest check-in.', 'Made up, though giving browser agents your calendar and credit card is begging for this.'],
    ['coffee-lids', '2022-11', 'A biotech demo went sideways when an AI-designed plastic-eating enzyme dissolved the presenters’ iced-coffee lids onstage.', 'Made up—real plastic-eating enzymes work way too slowly for live slapstick.'],
    ['intern-prize', '2026-06', 'A major math prize split the cash between a reasoning model’s server bill and the bored intern who typed the prompt.', 'Made up. Interns still get paid in campus pizza.'],
    ['dark-sector', '2025-07', 'A physics lab’s AI flagged a weird signal in collider data, then refused to explain its math without a bigger GPU budget.', 'Made up—models hallucinate plenty, just not union contract negotiations yet.'],
    ['cake', '2026-09', 'A chemistry lab threw a retirement party with a grocery-store sheet cake for its last experiment run entirely by human hands.', 'Made up, though any excuse for free breakroom cake is valid.'],
    ['pigeon', '2016-05', 'A train station’s AI crowd counter triggered a rush-hour alert because one fat pigeon kept pacing in front of the lens.', 'Made up, though early computer vision absolutely lost battles like this.'],
    ['dragon', '2017-08', 'A natural-history museum’s sorting AI cataloged a gift-shop plush dragon as an unclassified reptile.', 'Made up. Gift-shop dragons remain tragically non-canon.'],
    ['refund-loop', '2024-08', 'A customer-support bot accidentally joined its own help chat and talked itself into approving a $600 refund.', 'Made up—though watching two bots confuse each other out of company money sounds delightful.'],
    ['sandwich', '2023-01', 'A cafeteria’s AI menu app ran out of turkey clubs and automatically substituted “two slices of bread, firm handshake.”', 'Made up, though grocery-app substitutions come dangerously close.'],
    ['library', '2025-11', 'A public library’s new chatbot put a hold on all 600 copies of Dune during a live demo on how holds work.', 'Made up. Nobody in town was reading Arrakis lore that month.'],
    ['parking', '2022-10', 'An automated parking-enforcement van mailed itself a $75 ticket after reading its own bumper reflection in a store window.', 'Made up—though automated plate readers have ticketed parked cars on tow trucks.'],
    ['desk', '2023-04', 'An AI office manager ordered 14 motorized standing desks because the engineering team had a daily “stand-up” on the calendar.', 'Made up, and honestly the most productive outcome a daily stand-up has ever produced.'],
    ['footnotes', '2026-03', 'A compliance AI got stuck adding legal disclaimers to its own legal disclaimers until a two-page memo hit 90 pages.', 'Made up, though corporate legal departments barely need AI to pull that off.'],
    ['mascot', '2024-06', 'A stadium’s smart turnstile kept letting the team mascot in on a discounted kids’ ticket after classifying it as an oversized toddler.', 'Made up—mascots get in free to sweat in peace.'],
    ['bees', '2018-06', 'An agricultural startup’s hive camera counted the same hyperactive bee 9,000 times and projected a record honey harvest.', 'Made up. One bee doing benchmaxxing numbers for the whole colony.'],
    ['cheers', '2021-08', 'A remote-meeting app’s live captions kept transcribing a loud office paper shredder as “[thunderous applause].”', 'Made up, though shredding quarterly reports probably deserves a standing ovation.'],
    ['weather', '2019-02', 'A local TV weather bot issued an emergency blizzard warning after reading a thermometer inside a walk-in beer cooler.', 'Made up—though plenty of weather sensors live too close to exhaust vents.'],
    ['elevator', '2025-06', 'A smart-building assistant locked every elevator on the ground floor for an hour because someone scheduled an “all-hands.”', 'Made up. Still less annoying than the actual all-hands meeting.'],
    ['engraving', '2024-09', 'A trophy shop’s automated order tool engraved 50 little-league plaques with “SURE! HERE IS AN INSPIRING PLAQUE TEXT.”', 'Made up—though online bakery cakes and gravestones have come perilously close to this.'],
    ['socks', '2015-12', 'An early shopping bot interpreted “just browsing, thanks” as a one-click order for twelve pairs of beige ankle socks.', 'Made up. Pure 2015 chatbot energy, though.'],
  ];

  const cards = [
    ...records.map(([id, slug, text, note, verdict = 'real']) => ({
      id, slug, text, note, verdict, date: slug.slice(0, 7),
    })),
    ...fiction.map(([id, date, text, note]) => ({ id, date, text, note, verdict: 'made-up' })),
  ];
  window.WP_CARDS = cards;
})();
