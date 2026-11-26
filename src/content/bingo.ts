import type { Mode } from '../types';

/**
 * Road bingo: things to spot through the window, by transport mode. Pure observation game — nothing to
 * verify (the cells about the actual route come from the guide's sourced data, see game/bingo.ts).
 */
export interface SpotItem { id: string; emoji: string; name: string }

export const SPOT_ITEMS: SpotItem[] = [
  { id: 'bridge', emoji: '🌉', name: 'Bridge' }, { id: 'tunnel', emoji: '🚇', name: 'Tunnel' }, { id: 'tractor', emoji: '🚜', name: 'Tractor' },
  { id: 'motorbike', emoji: '🏍️', name: 'Motorbike' }, { id: 'truck', emoji: '🚚', name: 'Truck' }, { id: 'bus', emoji: '🚌', name: 'Bus' },
  { id: 'police', emoji: '🚓', name: 'Police car' }, { id: 'ambulance', emoji: '🚑', name: 'Ambulance' }, { id: 'fuel', emoji: '⛽', name: 'Petrol station' },
  { id: 'lights', emoji: '🚦', name: 'Traffic lights' }, { id: 'roadworks', emoji: '🚧', name: 'Roadworks' }, { id: 'church', emoji: '⛪', name: 'Church' },
  { id: 'castle', emoji: '🏰', name: 'Castle' }, { id: 'lake', emoji: '🦢', name: 'Lake' }, { id: 'river', emoji: '🏞️', name: 'River' },
  { id: 'cow', emoji: '🐄', name: 'Cow' }, { id: 'horse', emoji: '🐎', name: 'Horse' }, { id: 'sheep', emoji: '🐑', name: 'Sheep' },
  { id: 'bike', emoji: '🚲', name: 'Bicycle' }, { id: 'camper', emoji: '🚐', name: 'Camper van' }, { id: 'redcar', emoji: '🚗', name: 'Red car' },
  { id: 'plane', emoji: '✈️', name: 'Plane' }, { id: 'bird', emoji: '🦅', name: 'Bird of prey' }, { id: 'station', emoji: '🚉', name: 'Station' },
  { id: 'train', emoji: '🚆', name: 'Another train' }, { id: 'factory', emoji: '🏭', name: 'Factory' }, { id: 'vineyard', emoji: '🍇', name: 'Vineyard' },
  { id: 'snow', emoji: '❄️', name: 'Snow' }, { id: 'mountain', emoji: '⛰️', name: 'Mountain' }, { id: 'forest', emoji: '🌲', name: 'Forest' },
  { id: 'sunflowers', emoji: '🌻', name: 'Sunflower field' }, { id: 'car', emoji: '🚙', name: 'Car on a road' }, { id: 'boat', emoji: '⛵', name: 'Sailing boat' },
  { id: 'clouds', emoji: '☁️', name: 'Clouds below us' }, { id: 'sea', emoji: '🌊', name: 'Sea' }, { id: 'snowpeaks', emoji: '🏔️', name: 'Snowy mountains' },
  { id: 'sunrise', emoji: '🌅', name: 'Sunrise or sunset' }, { id: 'rainbow', emoji: '🌈', name: 'Rainbow' }, { id: 'city', emoji: '🏙️', name: 'City' },
  { id: 'desert', emoji: '🏜️', name: 'Desert' }, { id: 'island', emoji: '🏝️', name: 'Island' }, { id: 'moon', emoji: '🌙', name: 'The Moon' },
  { id: 'beach', emoji: '🏖️', name: 'Beach' }, { id: 'airport', emoji: '🛫', name: 'Airport' }, { id: 'ship', emoji: '🚢', name: 'Ship' },
  { id: 'fields', emoji: '🌾', name: 'Fields' }, { id: 'seabird', emoji: '🐦', name: 'Seabird' }, { id: 'dolphin', emoji: '🐬', name: 'Dolphin' },
  { id: 'port', emoji: '⚓', name: 'Harbour' }, { id: 'fish', emoji: '🐟', name: 'Fish' }, { id: 'cliff', emoji: '🪨', name: 'Cliffs' },
  { id: 'village', emoji: '🏘️', name: 'Village' }, { id: 'kayak', emoji: '🛶', name: 'Kayak or canoe' }, { id: 'dog', emoji: '🐕', name: 'Dog' },
  { id: 'cat', emoji: '🐈', name: 'Cat' }, { id: 'pigeon', emoji: '🕊️', name: 'Pigeon' }, { id: 'fountain', emoji: '⛲', name: 'Fountain' },
  { id: 'tree', emoji: '🌳', name: 'Big tree' }, { id: 'flowers', emoji: '🌷', name: 'Flowers' }, { id: 'bench', emoji: '🪑', name: 'Bench' },
  { id: 'icecream', emoji: '🍦', name: 'Ice cream' }, { id: 'musician', emoji: '🎸', name: 'Street musician' }, { id: 'tram', emoji: '🚋', name: 'Tram' },
  { id: 'bakery', emoji: '🥖', name: 'Bakery' }, { id: 'flag', emoji: '🚩', name: 'Flag' }, { id: 'clock', emoji: '🕰️', name: 'Clock' },
];

const ROAD = ['bridge', 'tunnel', 'tractor', 'motorbike', 'truck', 'bus', 'police', 'ambulance', 'fuel', 'lights', 'roadworks', 'church', 'castle', 'lake', 'river', 'cow', 'horse', 'sheep', 'bike', 'camper', 'redcar', 'plane', 'bird', 'mountain', 'forest', 'flag'];
export const SPOT_BY_MODE: Record<Mode, string[]> = {
  car: ROAD,
  bus: ROAD,
  train: ['tunnel', 'bridge', 'station', 'train', 'river', 'lake', 'cow', 'horse', 'sheep', 'church', 'castle', 'tractor', 'factory', 'vineyard', 'snow', 'mountain', 'forest', 'sunflowers', 'car', 'boat', 'bird', 'plane'],
  flight: ['clouds', 'sea', 'snowpeaks', 'plane', 'sunrise', 'rainbow', 'city', 'river', 'desert', 'island', 'moon', 'beach', 'airport', 'ship', 'fields', 'lake', 'forest', 'mountain'],
  cruise: ['seabird', 'island', 'ship', 'boat', 'dolphin', 'port', 'beach', 'sunrise', 'mountain', 'rainbow', 'plane', 'fish', 'cliff', 'village', 'clouds', 'kayak', 'bridge'],
  walk: ['dog', 'cat', 'pigeon', 'fountain', 'tree', 'flowers', 'bench', 'icecream', 'musician', 'tram', 'bakery', 'flag', 'clock', 'bridge', 'river', 'church', 'bike', 'bus'],
};
