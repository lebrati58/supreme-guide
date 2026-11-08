import type { Mode, Stop } from '../types';

/**
 * Curated sample journeys with real places. Coordinates are approximate station/port/landmark
 * positions. Lines between stops are drawn stop-to-stop: they are NOT exact track, road or
 * sailing geometry (road/walking routes are re-computed on a real network when online).
 */
export interface CuratedJourney { id: string; mode: Mode; title: string; blurb: string; stops: Stop[]; label?: string }

const s = (name: string, lat: number, lng: number, cc?: string, note?: string): Stop => ({ name, lat, lng, cc, note });

export const JOURNEYS: CuratedJourney[] = [
  // ---------------- trains
  { id: 'tokaido', mode: 'train', title: 'Tōkaidō Shinkansen: Tokyo → Shin-Osaka', label: 'Nozomi', blurb: 'The world’s first high-speed line (1964), main Nozomi stops.',
    stops: [s('Tokyo', 35.6812, 139.7671, 'JP'), s('Shinagawa', 35.6285, 139.7387, 'JP'), s('Shin-Yokohama', 35.5075, 139.6175, 'JP'), s('Nagoya', 35.1709, 136.8815, 'JP'), s('Kyoto', 34.9858, 135.7588, 'JP'), s('Shin-Osaka', 34.7335, 135.5003, 'JP')] },
  { id: 'glacier', mode: 'train', title: 'Glacier Express: Zermatt → St. Moritz', blurb: 'A famous slow panoramic train through the Swiss Alps.',
    stops: [s('Zermatt', 46.0244, 7.7487, 'CH'), s('Brig', 46.319, 7.988, 'CH'), s('Andermatt', 46.6355, 8.594, 'CH'), s('Disentis/Mustér', 46.7036, 8.8552, 'CH'), s('Chur', 46.8531, 9.5287, 'CH'), s('St. Moritz', 46.4985, 9.8458, 'CH')] },
  { id: 'eurostar', mode: 'train', title: 'London → Paris under the Channel', blurb: 'From St Pancras through the Channel Tunnel to Gare du Nord.',
    stops: [s('London St Pancras', 51.532, -0.1263, 'GB'), s('Channel Tunnel (Folkestone portal)', 51.095, 1.13, 'GB', 'passes through'), s('Channel Tunnel (Coquelles portal)', 50.9234, 1.81, 'FR', 'passes through'), s('Paris Gare du Nord', 48.8809, 2.3553, 'FR')] },
  { id: 'paris-marseille', mode: 'train', title: 'Paris → Marseille by TGV', blurb: 'North to south France on the LGV Sud-Est and LGV Méditerranée.',
    stops: [s('Paris Gare de Lyon', 48.8443, 2.3744, 'FR'), s('Lyon area', 45.7605, 4.8597, 'FR', 'passes through or stops'), s('Avignon TGV', 43.9216, 4.7862, 'FR'), s('Marseille Saint-Charles', 43.3027, 5.3806, 'FR')] },
  { id: 'transsib', mode: 'train', title: 'Trans-Siberian: Moscow → Vladivostok', blurb: 'About 9,289 km across Russia — the longest railway line in the world.',
    stops: [s('Moscow', 55.7765, 37.6572, 'RU'), s('Yekaterinburg', 56.858, 60.602, 'RU'), s('Novosibirsk', 55.035, 82.8977, 'RU'), s('Krasnoyarsk', 56.009, 92.852, 'RU'), s('Irkutsk', 52.283, 104.258, 'RU'), s('Ulan-Ude', 51.803, 107.594, 'RU'), s('Khabarovsk', 48.493, 135.064, 'RU'), s('Vladivostok', 43.111, 131.882, 'RU')] },
  // ---------------- buses
  { id: 'nyc-dc', mode: 'bus', title: 'New York → Washington, D.C.', blurb: 'The classic East Coast intercity bus corridor.',
    stops: [s('New York City', 40.757, -73.9903, 'US'), s('Philadelphia', 39.9526, -75.1652, 'US'), s('Baltimore', 39.2904, -76.6122, 'US'), s('Washington, D.C.', 38.8973, -77.0063, 'US')] },
  { id: 'london-tour', mode: 'bus', title: 'London sightseeing loop', blurb: 'An urban hop-on hop-off style tour of central London.',
    stops: [s('Trafalgar Square', 51.508, -0.1281, 'GB'), s('Big Ben', 51.5007, -0.1246, 'GB'), s('London Eye', 51.5033, -0.1196, 'GB'), s('St Paul’s Cathedral', 51.5138, -0.0984, 'GB'), s('Tower of London', 51.5081, -0.0759, 'GB'), s('Buckingham Palace', 51.5014, -0.1419, 'GB')] },
  { id: 'rome-florence', mode: 'bus', title: 'Rome → Florence', blurb: 'Through Lazio, Umbria and Tuscany.',
    stops: [s('Rome', 41.9028, 12.4964, 'IT'), s('Orvieto', 42.7186, 12.111, 'IT'), s('Florence', 43.7696, 11.2558, 'IT')] },
  // ---------------- road trips
  { id: 'pch', mode: 'car', title: 'California coast: San Francisco → Los Angeles', blurb: 'Big Sur cliffs and beach towns along the Pacific.',
    stops: [s('San Francisco', 37.7749, -122.4194, 'US'), s('Monterey', 36.6002, -121.8947, 'US'), s('Big Sur', 36.2704, -121.8081, 'US'), s('San Luis Obispo', 35.2828, -120.6596, 'US'), s('Santa Barbara', 34.4208, -119.6982, 'US'), s('Los Angeles', 34.0522, -118.2437, 'US')] },
  { id: 'greatoceanroad', mode: 'car', title: 'Great Ocean Road, Australia', blurb: 'Surf beaches and the Twelve Apostles rock stacks.',
    stops: [s('Melbourne', -37.8136, 144.9631, 'AU'), s('Torquay', -38.3333, 144.3167, 'AU'), s('Lorne', -38.5419, 143.975, 'AU'), s('Apollo Bay', -38.757, 143.67, 'AU'), s('Twelve Apostles', -38.6662, 143.1047, 'AU'), s('Warrnambool', -38.3818, 142.488, 'AU')] },
  { id: 'iceland-south', mode: 'car', title: 'Iceland’s south coast', blurb: 'Waterfalls, black sand and a glacier lagoon on the Ring Road.',
    stops: [s('Reykjavík', 64.1466, -21.9426, 'IS'), s('Selfoss', 63.9331, -20.9971, 'IS'), s('Vík í Mýrdal', 63.4186, -19.006, 'IS'), s('Jökulsárlón', 64.0784, -16.2306, 'IS'), s('Höfn', 64.2539, -15.2082, 'IS')] },
  // ---------------- walks
  { id: 'paris-walk', mode: 'walk', title: 'Paris: Arc de Triomphe → Notre-Dame', blurb: 'A long classic walk through the heart of Paris.',
    stops: [s('Arc de Triomphe', 48.8738, 2.295, 'FR'), s('Eiffel Tower', 48.8584, 2.2945, 'FR'), s('Pont Alexandre III', 48.8639, 2.3136, 'FR'), s('Place de la Concorde', 48.8656, 2.3212, 'FR'), s('Louvre Pyramid', 48.8611, 2.3358, 'FR'), s('Notre-Dame de Paris', 48.853, 2.3499, 'FR')] },
  { id: 'rome-walk', mode: 'walk', title: 'Ancient Rome walk', blurb: 'From the Colosseum to Piazza Navona.',
    stops: [s('Colosseum', 41.8902, 12.4922, 'IT'), s('Roman Forum', 41.8925, 12.4853, 'IT'), s('Trevi Fountain', 41.9009, 12.4833, 'IT'), s('Pantheon', 41.8986, 12.4769, 'IT'), s('Piazza Navona', 41.8992, 12.4731, 'IT')] },
  // ---------------- cruises
  { id: 'med-cruise', mode: 'cruise', title: 'Western Mediterranean (sample itinerary)', blurb: 'A typical 7-night loop of Mediterranean ports.',
    stops: [s('Barcelona', 41.3755, 2.181, 'ES'), s('Marseille', 43.311, 5.366, 'FR'), s('Genoa', 44.409, 8.923, 'IT'), s('Civitavecchia (for Rome)', 42.093, 11.792, 'IT'), s('Naples', 40.84, 14.256, 'IT'), s('Palma de Mallorca', 39.566, 2.63, 'ES'), s('Barcelona', 41.3755, 2.181, 'ES')] },
  { id: 'caribbean', mode: 'cruise', title: 'Eastern Caribbean (sample itinerary)', blurb: 'From Miami to the Virgin Islands and back to Puerto Rico.',
    stops: [s('Miami', 25.778, -80.179, 'US'), s('Nassau', 25.078, -77.341, 'BS'), s('Charlotte Amalie, St. Thomas', 18.3358, -64.9307, 'VI'), s('Philipsburg, Sint Maarten', 18.0237, -63.0458, 'SX'), s('San Juan', 18.4655, -66.1057, 'PR')] },
  { id: 'norway', mode: 'cruise', title: 'Norwegian fjords (sample itinerary)', blurb: 'Fjord ports on Norway’s west coast.',
    stops: [s('Stavanger', 58.97, 5.733, 'NO'), s('Bergen', 60.397, 5.324, 'NO'), s('Flåm', 60.863, 7.114, 'NO'), s('Geiranger', 62.101, 7.206, 'NO'), s('Ålesund', 62.472, 6.155, 'NO')] },
];

/** Sample airport pairs for the flight demo (no flight numbers: real schedules change). */
export const SAMPLE_FLIGHTS: { from: string; to: string }[] = [
  { from: 'CDG', to: 'JFK' }, { from: 'TLV', to: 'CDG' }, { from: 'LHR', to: 'SIN' },
  { from: 'LAX', to: 'SYD' }, { from: 'FRA', to: 'NRT' }, { from: 'MAD', to: 'EZE' },
];
