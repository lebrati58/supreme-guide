/**
 * The 10 legendary journeys: deep, hand-verified content (English source; translated through the
 * catalog under legend.* keys) + useful phrases in the LOCAL language with pronunciation.
 * Facts are anchored to a stop (English stop name) so the guide tells them at the right place.
 * Every fact is a well-documented, uncontroversial statement; see the reference article per journey.
 */
export type PhraseKey = 'hello' | 'thanks' | 'please' | 'bye' | 'sorry' | 'yesno';
export interface Phrase { key: PhraseKey; text: string; say?: string }
export interface LegendQuestion { id: string; q: string; o: string[]; a: number; e: string }
export interface LegendPack {
  journey: string;          // CuratedJourney id
  emoji: string;
  wiki: string;             // reference article
  local: { lang: string; name: string; phrases: Phrase[] };
  facts: { stop: string; text: string }[];
  questions: LegendQuestion[];
}

const EN_US: LegendPack['local'] = { lang: 'en-US', name: 'English (US)', phrases: [
  { key: 'hello', text: 'Hi there!' }, { key: 'thanks', text: 'Thank you' }, { key: 'please', text: 'Please' },
  { key: 'bye', text: 'Have a good one!' }, { key: 'sorry', text: 'Excuse me' }, { key: 'yesno', text: 'Yes / No' },
] };

export const LEGENDS: LegendPack[] = [
  {
    journey: 'route66', emoji: '🛣️', wiki: 'U.S._Route_66', local: EN_US,
    facts: [
      { stop: 'Chicago', text: 'Route 66 was commissioned in 1926 and linked Chicago to Santa Monica: about 3,940 km (2,448 miles).' },
      { stop: 'St. Louis', text: 'John Steinbeck nicknamed it “the Mother Road” in his 1939 novel The Grapes of Wrath.' },
      { stop: 'Springfield, Missouri', text: 'The road crossed eight states — Illinois, Missouri, Kansas, Oklahoma, Texas, New Mexico, Arizona and California — with only about 13 miles in Kansas.' },
      { stop: 'Tulsa', text: 'Tulsa businessman Cyrus Avery is often called the “Father of Route 66” for his role in creating it.' },
      { stop: 'Amarillo', text: 'Near Amarillo, the Cadillac Ranch art installation (1974) shows ten Cadillacs buried nose-first in a field.' },
      { stop: 'Albuquerque', text: 'The 1946 song “(Get Your Kicks on) Route 66”, written by Bobby Troup, made the road famous around the world.' },
      { stop: 'Flagstaff', text: 'Route 66 was removed from the US Highway System in 1985, replaced by Interstate highways.' },
      { stop: 'Santa Monica', text: 'A sign on the Santa Monica Pier marks the symbolic “End of the Trail”.' },
    ],
    questions: [
      { id: 'year', q: 'In which year was Route 66 commissioned?', o: ['1906', '1926', '1946', '1956'], a: 1, e: 'Route 66 was commissioned in 1926.' },
      { id: 'author', q: 'Which author called Route 66 “the Mother Road”?', o: ['Jack Kerouac', 'John Steinbeck', 'Mark Twain', 'Ernest Hemingway'], a: 1, e: 'John Steinbeck, in The Grapes of Wrath (1939).' },
      { id: 'states', q: 'How many US states did Route 66 cross?', o: ['6', '8', '10', '12'], a: 1, e: 'Eight: Illinois, Missouri, Kansas, Oklahoma, Texas, New Mexico, Arizona and California.' },
      { id: 'end', q: 'Where is the traditional western end of Route 66?', o: ['San Diego', 'Santa Monica', 'San Francisco', 'Las Vegas'], a: 1, e: 'Santa Monica, where a sign on the pier marks the “End of the Trail”.' },
      { id: 'removed', q: 'In which year was Route 66 removed from the US Highway System?', o: ['1965', '1975', '1985', '1995'], a: 2, e: 'In 1985, after the Interstate highways replaced it.' },
    ],
  },
  {
    journey: 'pch', emoji: '🌊', wiki: 'California_State_Route_1', local: EN_US,
    facts: [
      { stop: 'San Francisco', text: 'Most of this drive follows California State Route 1, which runs along much of the state’s Pacific coast.' },
      { stop: 'Monterey', text: 'The Monterey Bay Aquarium opened in 1984 in a former sardine cannery on Cannery Row.' },
      { stop: 'Big Sur', text: 'Bixby Creek Bridge, one of the most photographed bridges in California, opened in 1932.' },
      { stop: 'Big Sur', text: 'At Julia Pfeiffer Burns State Park, McWay Falls (about 24 m high) pours onto a beach at the edge of the Pacific.' },
      { stop: 'San Luis Obispo', text: 'North of San Luis Obispo, at San Simeon, Hearst Castle was built for newspaper publisher William Randolph Hearst between 1919 and 1947.' },
      { stop: 'Santa Barbara', text: 'Mission Santa Barbara, founded in 1786, is nicknamed the “Queen of the Missions”.' },
      { stop: 'Los Angeles', text: 'Los Angeles is the second most populous city in the United States.' },
    ],
    questions: [
      { id: 'bixby', q: 'Which Big Sur bridge, opened in 1932, is one of California’s most photographed?', o: ['Bixby Creek Bridge', 'Bay Bridge', 'Gerald Desmond Bridge', 'Colorado Street Bridge'], a: 0, e: 'Bixby Creek Bridge opened in 1932.' },
      { id: 'hearst', q: 'Hearst Castle was built for which newspaper publisher?', o: ['Joseph Pulitzer', 'William Randolph Hearst', 'Adolph Ochs', 'Harrison Gray Otis'], a: 1, e: 'William Randolph Hearst; it was built between 1919 and 1947.' },
      { id: 'route', q: 'Which road follows much of California’s Pacific coast?', o: ['State Route 1', 'Interstate 5', 'Route 66', 'Interstate 80'], a: 0, e: 'California State Route 1.' },
      { id: 'aquarium', q: 'The Monterey Bay Aquarium opened in a former…', o: ['sardine cannery', 'car factory', 'train station', 'army fort'], a: 0, e: 'A sardine cannery on Cannery Row, in 1984.' },
      { id: 'mission', q: 'Which mission is nicknamed the “Queen of the Missions”?', o: ['Santa Barbara', 'San Diego', 'Carmel', 'San Juan Capistrano'], a: 0, e: 'Mission Santa Barbara, founded in 1786.' },
    ],
  },
  {
    journey: 'glacier', emoji: '🚞', wiki: 'Glacier_Express',
    local: { lang: 'de-CH', name: 'Swiss German', phrases: [
      { key: 'hello', text: 'Grüezi', say: 'GREW-tsee' }, { key: 'thanks', text: 'Merci vilmal', say: 'MEHR-see FEEL-mahl' }, { key: 'please', text: 'Bitte', say: 'BIT-teh' },
      { key: 'bye', text: 'Uf Wiederluege', say: 'oof VEE-der-loo-eh-geh' }, { key: 'sorry', text: 'Entschuldigung', say: 'ent-SHOOL-dee-goong' }, { key: 'yesno', text: 'Ja / Nei', say: 'yah / nye' },
    ] },
    facts: [
      { stop: 'Zermatt', text: 'The Glacier Express has run between Zermatt and St. Moritz since 1930.' },
      { stop: 'Brig', text: 'It is nicknamed “the slowest express train in the world”: the whole trip takes about 8 hours.' },
      { stop: 'Andermatt', text: 'Its highest point is the Oberalp Pass, at 2,033 m.' },
      { stop: 'Disentis/Mustér', text: 'Along the way the train crosses 291 bridges and goes through 91 tunnels.' },
      { stop: 'Chur', text: 'Chur is often described as the oldest town in Switzerland.' },
      { stop: 'Chur', text: 'After Chur the train takes the Albula line, part of the Rhaetian Railway UNESCO World Heritage Site since 2008.' },
      { stop: 'St. Moritz', text: 'On the Albula line, the 65 m-high Landwasser Viaduct sends the train straight into a tunnel in the cliff.' },
    ],
    questions: [
      { id: 'since', q: 'Since which year has the Glacier Express run?', o: ['1890', '1930', '1965', '1982'], a: 1, e: 'Since 1930.' },
      { id: 'pass', q: 'What is the highest point of the Glacier Express?', o: ['Oberalp Pass', 'Gotthard Pass', 'Simplon Pass', 'Great St Bernard Pass'], a: 0, e: 'The Oberalp Pass, at 2,033 m.' },
      { id: 'nick', q: 'What is the Glacier Express nicknamed?', o: ['The slowest express train in the world', 'The highest train in Europe', 'The oldest train in the Alps', 'The longest train in Switzerland'], a: 0, e: 'The slowest express train in the world: about 8 hours.' },
      { id: 'viaduct', q: 'Which viaduct sends the train straight into a tunnel in a cliff?', o: ['Landwasser Viaduct', 'Brusio Spiral Viaduct', 'Wiesen Viaduct', 'Solis Viaduct'], a: 0, e: 'The 65 m-high Landwasser Viaduct.' },
      { id: 'unesco', q: 'Since when is the Albula line part of a UNESCO World Heritage Site?', o: ['1998', '2001', '2008', '2015'], a: 2, e: 'Since 2008 (Rhaetian Railway in the Albula / Bernina Landscapes).' },
    ],
  },
  {
    journey: 'transsib', emoji: '🚂', wiki: 'Trans-Siberian_Railway',
    local: { lang: 'ru-RU', name: 'Russian', phrases: [
      { key: 'hello', text: 'Здравствуйте', say: 'ZDRAST-vooy-tyeh' }, { key: 'thanks', text: 'Спасибо', say: 'spa-SEE-ba' }, { key: 'please', text: 'Пожалуйста', say: 'pa-ZHAL-sta' },
      { key: 'bye', text: 'До свидания', say: 'da svee-DA-nee-ya' }, { key: 'sorry', text: 'Извините', say: 'iz-vee-NEE-tyeh' }, { key: 'yesno', text: 'Да / Нет', say: 'da / nyet' },
    ] },
    facts: [
      { stop: 'Moscow', text: 'The Trans-Siberian Railway is about 9,289 km long — the longest railway line in the world.' },
      { stop: 'Moscow', text: 'Construction began in 1891 and the main line was completed in 1916.' },
      { stop: 'Yekaterinburg', text: 'Near Yekaterinburg, the line crosses the symbolic border between Europe and Asia.' },
      { stop: 'Novosibirsk', text: 'Novosibirsk, Russia’s third-largest city, was founded in 1893 where the railway crossed the Ob River.' },
      { stop: 'Irkutsk', text: 'After Irkutsk the line follows the southern shore of Lake Baikal, the deepest lake in the world.' },
      { stop: 'Ulan-Ude', text: 'Ulan-Ude, capital of Buryatia, has a giant head of Lenin often said to be the largest in the world.' },
      { stop: 'Khabarovsk', text: 'At Khabarovsk the railway crosses the wide Amur River.' },
      { stop: 'Vladivostok', text: 'Moscow is on UTC+3 and Vladivostok on UTC+10: a 7-hour time difference. The name Vladivostok means roughly “Ruler of the East”.' },
    ],
    questions: [
      { id: 'length', q: 'About how long is the Trans-Siberian Railway?', o: ['4,300 km', '6,200 km', '9,289 km', '12,500 km'], a: 2, e: 'About 9,289 km, the longest railway line in the world.' },
      { id: 'lake', q: 'Which lake does the line run along after Irkutsk?', o: ['Lake Ladoga', 'Lake Baikal', 'Lake Balkhash', 'Lake Onega'], a: 1, e: 'Lake Baikal, the deepest lake in the world.' },
      { id: 'tz', q: 'What is the time difference between Moscow and Vladivostok?', o: ['3 hours', '5 hours', '7 hours', '9 hours'], a: 2, e: '7 hours: UTC+3 in Moscow, UTC+10 in Vladivostok.' },
      { id: 'built', q: 'In which year did construction of the Trans-Siberian begin?', o: ['1851', '1891', '1921', '1946'], a: 1, e: 'In 1891; the main line was completed in 1916.' },
      { id: 'name', q: 'What does the name “Vladivostok” roughly mean?', o: ['Ruler of the East', 'Pearl of the Pacific', 'City of the Sun', 'End of the Line'], a: 0, e: '“Ruler of the East”.' },
    ],
  },
  {
    journey: 'eurostar', emoji: '🚄', wiki: 'Channel_Tunnel',
    local: { lang: 'fr-FR', name: 'French', phrases: [
      { key: 'hello', text: 'Bonjour', say: 'bon-ZHOOR' }, { key: 'thanks', text: 'Merci', say: 'mehr-SEE' }, { key: 'please', text: 'S’il vous plaît', say: 'seel voo PLEH' },
      { key: 'bye', text: 'Au revoir', say: 'oh ruh-VWAHR' }, { key: 'sorry', text: 'Excusez-moi', say: 'ex-kew-ZAY mwah' }, { key: 'yesno', text: 'Oui / Non', say: 'wee / nohn' },
    ] },
    facts: [
      { stop: 'London St Pancras', text: 'St Pancras station opened in 1868; its Victorian Gothic hotel façade is a London icon.' },
      { stop: 'London St Pancras', text: 'Eurostar passenger services started in November 1994.' },
      { stop: 'Channel Tunnel (Folkestone portal)', text: 'The Channel Tunnel is about 50 km long, with about 38 km under the sea — the longest undersea section of any tunnel in the world.' },
      { stop: 'Channel Tunnel (Coquelles portal)', text: 'At its deepest the tunnel lies about 75 m below sea level. British and French crews met under the Channel in 1990.' },
      { stop: 'Paris Gare du Nord', text: 'Paris Gare du Nord is the busiest railway station in Europe by number of passengers.' },
    ],
    questions: [
      { id: 'start', q: 'When did Eurostar passenger services start?', o: ['1984', '1994', '1999', '2004'], a: 1, e: 'In November 1994.' },
      { id: 'undersea', q: 'About how much of the Channel Tunnel is under the sea?', o: ['12 km', '38 km', '75 km', '120 km'], a: 1, e: 'About 38 km of its roughly 50 km.' },
      { id: 'paris', q: 'At which Paris station does Eurostar arrive?', o: ['Gare de Lyon', 'Gare du Nord', 'Gare de l’Est', 'Gare Montparnasse'], a: 1, e: 'Gare du Nord, the busiest station in Europe.' },
      { id: 'meet', q: 'In which year did the British and French tunnelling crews meet?', o: ['1975', '1990', '1994', '2000'], a: 1, e: 'In 1990; the tunnel opened in 1994.' },
      { id: 'pancras', q: 'When did London St Pancras station open?', o: ['1768', '1868', '1928', '1968'], a: 1, e: 'In 1868.' },
    ],
  },
  {
    journey: 'tokaido', emoji: '🚅', wiki: 'Tōkaidō_Shinkansen',
    local: { lang: 'ja-JP', name: 'Japanese', phrases: [
      { key: 'hello', text: 'こんにちは', say: 'kon-nee-chee-wa' }, { key: 'thanks', text: 'ありがとうございます', say: 'a-ree-ga-toh go-zai-mas' }, { key: 'please', text: 'お願いします', say: 'o-ne-gai shi-mas' },
      { key: 'bye', text: 'さようなら', say: 'sa-yoh-na-ra' }, { key: 'sorry', text: 'すみません', say: 'su-mee-ma-sen' }, { key: 'yesno', text: 'はい / いいえ', say: 'hai / ee-eh' },
    ] },
    facts: [
      { stop: 'Tokyo', text: 'The Tōkaidō Shinkansen opened on 1 October 1964, just before the Tokyo Olympic Games.' },
      { stop: 'Tokyo', text: '“Shinkansen” means “new trunk line”. The Tōkaidō was the old road linking Edo (Tokyo) with Kyoto.' },
      { stop: 'Shin-Yokohama', text: 'Heading towards Osaka, Mount Fuji appears on the right-hand side of the train (seats E on most trains), weather permitting.' },
      { stop: 'Nagoya', text: 'Nagoya is the heart of Japan’s car industry: Toyota has its headquarters nearby.' },
      { stop: 'Kyoto', text: 'Kyoto was Japan’s imperial capital for more than a thousand years, from 794 to 1868.' },
      { stop: 'Shin-Osaka', text: 'The fastest Nozomi trains link Tokyo and Shin-Osaka in about two and a half hours.' },
    ],
    questions: [
      { id: 'open', q: 'In which year did the Tōkaidō Shinkansen open?', o: ['1952', '1964', '1972', '1980'], a: 1, e: 'On 1 October 1964.' },
      { id: 'fuji', q: 'Travelling from Tokyo to Osaka, on which side do you see Mount Fuji?', o: ['On the right', 'On the left', 'Behind the train', 'It can’t be seen'], a: 0, e: 'On the right-hand side (seats E), weather permitting.' },
      { id: 'kyoto', q: 'From which year was Kyoto Japan’s imperial capital?', o: ['594', '794', '1194', '1594'], a: 1, e: 'From 794 until 1868.' },
      { id: 'word', q: 'What does “Shinkansen” mean?', o: ['New trunk line', 'Bullet train', 'Arrow of light', 'Sun express'], a: 0, e: '“New trunk line”.' },
      { id: 'road', q: 'What was the Tōkaidō originally?', o: ['A road between Edo and Kyoto', 'A river', 'A mountain range', 'A temple'], a: 0, e: 'The old “Eastern Sea Road” between Edo (Tokyo) and Kyoto.' },
    ],
  },
  {
    journey: 'greatoceanroad', emoji: '🏄', wiki: 'Great_Ocean_Road',
    local: { lang: 'en-AU', name: 'Australian English', phrases: [
      { key: 'hello', text: 'G’day!' }, { key: 'thanks', text: 'Cheers!' }, { key: 'please', text: 'Please' },
      { key: 'bye', text: 'See ya!' }, { key: 'sorry', text: 'Sorry, mate' }, { key: 'yesno', text: 'Yeah / Nah' },
    ] },
    facts: [
      { stop: 'Melbourne', text: 'Melbourne was the seat of Australia’s federal government from 1901 to 1927, before Canberra.' },
      { stop: 'Torquay', text: 'The Great Ocean Road starts near Torquay, home of the famous Bells Beach surf contest.' },
      { stop: 'Lorne', text: 'Returned soldiers built the road between 1919 and 1932 in memory of those killed in the First World War: it is the world’s largest war memorial.' },
      { stop: 'Apollo Bay', text: 'Around Kennett River and Cape Otway, wild koalas are often seen in the trees.' },
      { stop: 'Twelve Apostles', text: 'The Twelve Apostles are limestone stacks carved by the Southern Ocean; despite the name, fewer than twelve stand today.' },
      { stop: 'Warrnambool', text: 'From June to September, southern right whales often come to calve near Warrnambool.' },
    ],
    questions: [
      { id: 'built', q: 'Who built the Great Ocean Road?', o: ['Returned First World War soldiers', 'Convicts', 'Gold miners', 'The Royal Navy'], a: 0, e: 'Returned soldiers, between 1919 and 1932: it is a war memorial.' },
      { id: 'rock', q: 'What are the Twelve Apostles made of?', o: ['Limestone', 'Granite', 'Basalt', 'Marble'], a: 0, e: 'Limestone, carved by the Southern Ocean.' },
      { id: 'whales', q: 'Which whales come to calve near Warrnambool?', o: ['Southern right whales', 'Blue whales', 'Sperm whales', 'Orcas'], a: 0, e: 'Southern right whales, from June to September.' },
      { id: 'capital', q: 'Until which year was Melbourne the seat of Australia’s federal government?', o: ['1913', '1927', '1945', '1959'], a: 1, e: 'Until 1927, when Parliament moved to Canberra.' },
      { id: 'surf', q: 'Which famous surf beach is near Torquay?', o: ['Bells Beach', 'Bondi Beach', 'Manly Beach', 'Cable Beach'], a: 0, e: 'Bells Beach, home of a famous surf contest.' },
    ],
  },
  {
    journey: 'norway', emoji: '⛴️', wiki: 'Geirangerfjord',
    local: { lang: 'nb-NO', name: 'Norwegian', phrases: [
      { key: 'hello', text: 'Hei', say: 'hi' }, { key: 'thanks', text: 'Takk', say: 'tahk' }, { key: 'please', text: 'Vær så snill', say: 'vair saw SNILL' },
      { key: 'bye', text: 'Ha det', say: 'HAH-deh' }, { key: 'sorry', text: 'Unnskyld', say: 'OON-shil' }, { key: 'yesno', text: 'Ja / Nei', say: 'yah / nye' },
    ] },
    facts: [
      { stop: 'Stavanger', text: 'Near Stavanger, Preikestolen (Pulpit Rock) towers about 604 m above the Lysefjord.' },
      { stop: 'Bergen', text: 'Bergen’s Bryggen wharf, with its colourful Hanseatic wooden houses, has been a UNESCO World Heritage Site since 1979.' },
      { stop: 'Flåm', text: 'Flåm lies on a branch of the Sognefjord, Norway’s longest and deepest fjord (about 205 km long and up to 1,308 m deep).' },
      { stop: 'Flåm', text: 'The Flåm Railway climbs about 863 m in about 20 km, one of the steepest standard-gauge lines in the world.' },
      { stop: 'Geiranger', text: 'The Geirangerfjord and the Nærøyfjord have been UNESCO World Heritage together since 2005.' },
      { stop: 'Geiranger', text: 'Opposite the Seven Sisters waterfall stands another fall nicknamed “the Suitor”.' },
      { stop: 'Ålesund', text: 'Ålesund was rebuilt in Art Nouveau style after a fire destroyed the town in 1904.' },
    ],
    questions: [
      { id: 'pulpit', q: 'Preikestolen (Pulpit Rock) towers above which fjord?', o: ['Lysefjord', 'Geirangerfjord', 'Sognefjord', 'Hardangerfjord'], a: 0, e: 'The Lysefjord, about 604 m below.' },
      { id: 'bryggen', q: 'In which city is the Bryggen wharf?', o: ['Oslo', 'Bergen', 'Stavanger', 'Trondheim'], a: 1, e: 'Bergen; UNESCO World Heritage since 1979.' },
      { id: 'longest', q: 'Which is Norway’s longest fjord?', o: ['Sognefjord', 'Geirangerfjord', 'Nærøyfjord', 'Lysefjord'], a: 0, e: 'The Sognefjord, about 205 km long.' },
      { id: 'alesund', q: 'In which style was Ålesund rebuilt after the 1904 fire?', o: ['Art Nouveau', 'Gothic', 'Baroque', 'Brutalist'], a: 0, e: 'Art Nouveau (Jugendstil).' },
      { id: 'unesco', q: 'Since which year are the Geirangerfjord and Nærøyfjord UNESCO World Heritage?', o: ['1985', '1995', '2005', '2015'], a: 2, e: 'Since 2005.' },
    ],
  },
  {
    journey: 'amalfi', emoji: '🍋', wiki: 'Amalfi_Coast',
    local: { lang: 'it-IT', name: 'Italian', phrases: [
      { key: 'hello', text: 'Buongiorno', say: 'bwon-JOR-no' }, { key: 'thanks', text: 'Grazie', say: 'GRAHT-see-eh' }, { key: 'please', text: 'Per favore', say: 'pehr fa-VO-reh' },
      { key: 'bye', text: 'Arrivederci', say: 'ar-ree-veh-DEHR-chee' }, { key: 'sorry', text: 'Mi scusi', say: 'mee SKOO-zee' }, { key: 'yesno', text: 'Sì / No', say: 'see / noh' },
    ] },
    facts: [
      { stop: 'Sorrento', text: 'From Sorrento you look across the Bay of Naples to Mount Vesuvius.' },
      { stop: 'Positano', text: 'The Amalfi Coast has been a UNESCO World Heritage Site since 1997.' },
      { stop: 'Amalfi', text: 'In the Middle Ages, Amalfi was the capital of a powerful maritime republic.' },
      { stop: 'Amalfi', text: 'Amalfi’s cathedral, dedicated to Saint Andrew, stands at the top of a grand staircase.' },
      { stop: 'Ravello', text: 'In 1880, the gardens of Villa Rufolo in Ravello inspired Richard Wagner for a scene of his opera Parsifal.' },
      { stop: 'Ravello', text: 'The coast’s large, fragrant lemons, the Sfusato Amalfitano, are used to make limoncello.' },
      { stop: 'Salerno', text: 'Salerno was home to the Schola Medica Salernitana, one of the first medical schools of medieval Europe.' },
    ],
    questions: [
      { id: 'unesco', q: 'Since which year is the Amalfi Coast a UNESCO World Heritage Site?', o: ['1977', '1987', '1997', '2007'], a: 2, e: 'Since 1997.' },
      { id: 'wagner', q: 'Which town’s gardens inspired Richard Wagner in 1880?', o: ['Ravello', 'Positano', 'Sorrento', 'Capri'], a: 0, e: 'Ravello, at Villa Rufolo.' },
      { id: 'saint', q: 'To which saint is Amalfi’s cathedral dedicated?', o: ['Saint Andrew', 'Saint Peter', 'Saint Mark', 'Saint Nicholas'], a: 0, e: 'Saint Andrew.' },
      { id: 'liqueur', q: 'Which liqueur is made from the coast’s lemons?', o: ['Limoncello', 'Amaretto', 'Sambuca', 'Grappa'], a: 0, e: 'Limoncello, from the Sfusato Amalfitano lemon.' },
      { id: 'salerno', q: 'What was Salerno famous for in the Middle Ages?', o: ['A medical school', 'A naval academy', 'A law school', 'An observatory'], a: 0, e: 'The Schola Medica Salernitana, one of Europe’s first medical schools.' },
    ],
  },
  {
    journey: 'med-cruise', emoji: '🛳️', wiki: 'Mediterranean_Sea',
    local: { lang: 'es-ES', name: 'Spanish', phrases: [
      { key: 'hello', text: 'Hola', say: 'OH-la' }, { key: 'thanks', text: 'Gracias', say: 'GRAH-thyahs' }, { key: 'please', text: 'Por favor', say: 'por fa-VOR' },
      { key: 'bye', text: 'Adiós', say: 'ah-DYOS' }, { key: 'sorry', text: 'Perdone', say: 'pehr-DOH-neh' }, { key: 'yesno', text: 'Sí / No', say: 'see / noh' },
    ] },
    facts: [
      { stop: 'Barcelona', text: 'Several works by Antoni Gaudí in Barcelona, such as Park Güell, are UNESCO World Heritage.' },
      { stop: 'Marseille', text: 'Marseille, France’s oldest city, was founded around 600 BC by Greek sailors from Phocaea, as Massalia.' },
      { stop: 'Genoa', text: 'Genoa is widely considered the birthplace of Christopher Columbus.' },
      { stop: 'Civitavecchia (for Rome)', text: 'Civitavecchia, Rome’s cruise port, was developed as a harbour by Emperor Trajan in the early 2nd century.' },
      { stop: 'Naples', text: 'Naples lies beneath Mount Vesuvius, whose eruption in 79 AD buried Pompeii.' },
      { stop: 'Palma de Mallorca', text: 'Palma’s Gothic cathedral, La Seu, stands right above the sea.' },
    ],
    questions: [
      { id: 'massalia', q: 'Who founded Marseille, around 600 BC?', o: ['Greeks from Phocaea', 'Romans', 'Phoenicians', 'Celts'], a: 0, e: 'Greek sailors from Phocaea, who named it Massalia.' },
      { id: 'genoa', q: 'Which explorer is widely considered to be from Genoa?', o: ['Christopher Columbus', 'Vasco da Gama', 'Ferdinand Magellan', 'Amerigo Vespucci'], a: 0, e: 'Christopher Columbus.' },
      { id: 'volcano', q: 'Which volcano overlooks Naples?', o: ['Vesuvius', 'Etna', 'Stromboli', 'Teide'], a: 0, e: 'Mount Vesuvius, which buried Pompeii in 79 AD.' },
      { id: 'trajan', q: 'Which emperor developed the harbour of Civitavecchia?', o: ['Trajan', 'Nero', 'Augustus', 'Hadrian'], a: 0, e: 'Trajan, in the early 2nd century.' },
      { id: 'palma', q: 'On which island is Palma?', o: ['Mallorca', 'Menorca', 'Ibiza', 'Sardinia'], a: 0, e: 'Mallorca, in the Balearic Islands.' },
    ],
  },
];

export const legendFor = (journeyId?: string) => (journeyId ? LEGENDS.find((l) => l.journey === journeyId) : undefined);
