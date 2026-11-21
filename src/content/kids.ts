/**
 * “Little travellers” (kids who can't read yet): hand-checked animal facts.
 * Each question asks which animal lives in the wild in a country. The right animal has a well-known
 * wild population there (see its Wikipedia article); the two other choices have NO wild population
 * in that country (e.g. no kangaroos in Indonesia's question, because tree-kangaroos live in Papua).
 * Domestic-only animals (llama, dromedary) are left out on purpose.
 */
export interface KidAnimal { id: string; emoji: string; name: string; wiki: string }

export const KID_ANIMALS: KidAnimal[] = [
  { id: 'kangaroo', emoji: '🦘', name: 'Kangaroo', wiki: 'Kangaroo' },
  { id: 'koala', emoji: '🐨', name: 'Koala', wiki: 'Koala' },
  { id: 'panda', emoji: '🐼', name: 'Giant panda', wiki: 'Giant_panda' },
  { id: 'polarbear', emoji: '🐻‍❄️', name: 'Polar bear', wiki: 'Polar_bear' },
  { id: 'giraffe', emoji: '🦒', name: 'Giraffe', wiki: 'Giraffe' },
  { id: 'lion', emoji: '🦁', name: 'Lion', wiki: 'Lion' },
  { id: 'tiger', emoji: '🐅', name: 'Tiger', wiki: 'Bengal_tiger' },
  { id: 'macaw', emoji: '🦜', name: 'Macaw', wiki: 'Scarlet_macaw' },
  { id: 'brownbear', emoji: '🐻', name: 'Brown bear', wiki: 'Brown_bear' },
  { id: 'penguin', emoji: '🐧', name: 'Penguin', wiki: 'African_penguin' },
  { id: 'zebra', emoji: '🦓', name: 'Zebra', wiki: 'Plains_zebra' },
  { id: 'bison', emoji: '🦬', name: 'Bison', wiki: 'American_bison' },
  { id: 'elephant', emoji: '🐘', name: 'Elephant', wiki: 'Asian_elephant' },
  { id: 'reindeer', emoji: '🦌', name: 'Reindeer', wiki: 'Reindeer' },
  { id: 'orangutan', emoji: '🦧', name: 'Orangutan', wiki: 'Orangutan' },
  { id: 'tortoise', emoji: '🐢', name: 'Giant tortoise', wiki: 'Galápagos_tortoise' },
];

/** [country ISO3, animal living there in the wild, two animals with no wild population there]. */
export const KID_ANIMAL_FACTS: [string, string, [string, string]][] = [
  ['AUS', 'kangaroo', ['panda', 'polarbear']],
  ['AUS', 'koala', ['tiger', 'giraffe']],
  ['CHN', 'panda', ['kangaroo', 'polarbear']],
  ['CAN', 'polarbear', ['kangaroo', 'giraffe']],
  ['KEN', 'giraffe', ['polarbear', 'panda']],
  ['KEN', 'lion', ['polarbear', 'kangaroo']],
  ['IND', 'tiger', ['kangaroo', 'polarbear']],
  ['BRA', 'macaw', ['polarbear', 'panda']],
  ['RUS', 'brownbear', ['giraffe', 'kangaroo']],
  ['ZAF', 'penguin', ['polarbear', 'panda']],
  ['TZA', 'zebra', ['polarbear', 'panda']],
  ['USA', 'bison', ['panda', 'kangaroo']],
  ['THA', 'elephant', ['polarbear', 'kangaroo']],
  ['NOR', 'reindeer', ['giraffe', 'panda']],
  ['IDN', 'orangutan', ['polarbear', 'giraffe']],
  ['ECU', 'tortoise', ['polarbear', 'panda']],
];

/** Stickers won every 3 right first tries, collected in this order (album in the passport). */
export const STICKERS = ['🎈', '🚀', '🌈', '⭐', '🦄', '🐳', '🌋', '🏰', '🗿', '🎡', '🚂', '⛵', '🌵', '🍉', '🦋', '🐙', '🛸', '🏝️', '🎪', '🗽', '🐉', '🌻', '🚁', '🧭'];
