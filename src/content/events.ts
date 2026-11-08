/** Dated events for chronology challenges. Negative years = BC. All dates are standard, well-documented. */
export interface HistoricEvent { label: string; year: number; wiki: string; tags?: string[] }

export const EVENTS: HistoricEvent[] = [
  { label: 'Great Pyramid of Giza built (c.)', year: -2560, wiki: 'Great_Pyramid_of_Giza', tags: ['EGY'] },
  { label: 'Colosseum completed in Rome', year: 80, wiki: 'Colosseum', tags: ['ITA'] },
  { label: 'Hagia Sophia completed in Constantinople', year: 537, wiki: 'Hagia_Sophia', tags: ['TUR'] },
  { label: 'Magna Carta sealed in England', year: 1215, wiki: 'Magna_Carta', tags: ['GBR'] },
  { label: 'Forbidden City completed in Beijing', year: 1420, wiki: 'Forbidden_City', tags: ['CHN'] },
  { label: 'Fall of Constantinople', year: 1453, wiki: 'Fall_of_Constantinople', tags: ['TUR'] },
  { label: 'Columbus’s first voyage reaches the Americas', year: 1492, wiki: 'Voyages_of_Christopher_Columbus', tags: ['ESP'] },
  { label: 'Magellan–Elcano expedition completes the first circumnavigation', year: 1522, wiki: 'Magellan_expedition', tags: ['ESP', 'PRT'] },
  { label: 'Great Fire of London', year: 1666, wiki: 'Great_Fire_of_London', tags: ['GBR'] },
  { label: 'US Declaration of Independence', year: 1776, wiki: 'United_States_Declaration_of_Independence', tags: ['USA'] },
  { label: 'Storming of the Bastille', year: 1789, wiki: 'Storming_of_the_Bastille', tags: ['FRA'] },
  { label: 'Liverpool and Manchester Railway opens', year: 1830, wiki: 'Liverpool_and_Manchester_Railway', tags: ['GBR'] },
  { label: 'London’s first Underground line opens', year: 1863, wiki: 'Metropolitan_Railway', tags: ['GBR'] },
  { label: 'Suez Canal opens', year: 1869, wiki: 'Suez_Canal', tags: ['EGY'] },
  { label: 'Statue of Liberty dedicated', year: 1886, wiki: 'Statue_of_Liberty', tags: ['USA', 'FRA'] },
  { label: 'Eiffel Tower completed', year: 1889, wiki: 'Eiffel_Tower', tags: ['FRA'] },
  { label: 'Wright brothers’ first powered flight', year: 1903, wiki: 'Wright_Flyer', tags: ['USA'] },
  { label: 'Titanic sinks', year: 1912, wiki: 'Titanic', tags: ['GBR'] },
  { label: 'Panama Canal opens', year: 1914, wiki: 'Panama_Canal', tags: ['PAN'] },
  { label: 'Lindbergh flies solo across the Atlantic', year: 1927, wiki: 'Spirit_of_St._Louis', tags: ['USA', 'FRA'] },
  { label: 'Sydney Harbour Bridge opens', year: 1932, wiki: 'Sydney_Harbour_Bridge', tags: ['AUS'] },
  { label: 'Golden Gate Bridge opens', year: 1937, wiki: 'Golden_Gate_Bridge', tags: ['USA'] },
  { label: 'First Shinkansen line opens in Japan', year: 1964, wiki: 'Tōkaidō_Shinkansen', tags: ['JPN'] },
  { label: 'Apollo 11 lands on the Moon', year: 1969, wiki: 'Apollo_11', tags: ['USA'] },
  { label: 'Sydney Opera House opens', year: 1973, wiki: 'Sydney_Opera_House', tags: ['AUS'] },
  { label: 'Concorde enters commercial service', year: 1976, wiki: 'Concorde', tags: ['FRA', 'GBR'] },
  { label: 'Fall of the Berlin Wall', year: 1989, wiki: 'Fall_of_the_Berlin_Wall', tags: ['DEU'] },
  { label: 'Channel Tunnel opens', year: 1994, wiki: 'Channel_Tunnel', tags: ['GBR', 'FRA'] },
  { label: 'Euro banknotes and coins enter circulation', year: 2002, wiki: 'Euro', tags: ['FRA', 'DEU', 'ITA', 'ESP'] },
  { label: 'Burj Khalifa opens in Dubai', year: 2010, wiki: 'Burj_Khalifa', tags: ['ARE'] },
];

export const formatYear = (y: number) => (y < 0 ? `${-y} BC` : `${y}`);
