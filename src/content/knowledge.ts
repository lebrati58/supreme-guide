import type { Category, Difficulty, Question } from '../types';

/**
 * General-knowledge banks by DOMAIN, used when a trip runs out of route material and in the
 * “Themed quiz”. Only textbook, uncontroversial facts, each with its reference article.
 * (Math questions are also generated, with answers computed exactly: see game/engine.ts genMath.)
 */
export type Domain = 'history' | 'geography' | 'biology' | 'science' | 'math' | 'philosophy' | 'culture';
export const DOMAINS: { id: Domain; emoji: string }[] = [
  { id: 'history', emoji: '📜' }, { id: 'geography', emoji: '🌍' }, { id: 'biology', emoji: '🧬' },
  { id: 'science', emoji: '🔬' }, { id: 'math', emoji: '➗' }, { id: 'philosophy', emoji: '🤔' }, { id: 'culture', emoji: '🎨' },
];

interface Raw { id: string; c: Category; d: Difficulty; q: string; o: string[]; a: number; e: string; w: string }
const W = (t: string) => ({ label: 'Wikipedia', url: `https://en.wikipedia.org/wiki/${t}` });

const RAW: Raw[] = [
  // ---------- science (physics, chemistry, astronomy)
  { id: 'sc-gold', c: 'science', d: 1, q: 'What is the chemical symbol for gold?', o: ['Au', 'Ag', 'Go', 'Gd'], a: 0, e: 'Gold’s symbol Au comes from its Latin name, aurum.', w: 'Gold' },
  { id: 'sc-boil', c: 'science', d: 1, q: 'At sea level, at what temperature does pure water boil?', o: ['90 °C', '100 °C', '110 °C', '120 °C'], a: 1, e: 'At standard atmospheric pressure, pure water boils at 100 °C; at altitude it boils at a lower temperature.', w: 'Boiling_point' },
  { id: 'sc-mercury', c: 'science', d: 1, q: 'Which planet is closest to the Sun?', o: ['Venus', 'Mars', 'Mercury', 'Earth'], a: 2, e: 'Mercury is the closest planet to the Sun and the smallest planet of the Solar System.', w: 'Mercury_(planet)' },
  { id: 'sc-jupiter', c: 'science', d: 1, q: 'What is the largest planet in the Solar System?', o: ['Saturn', 'Jupiter', 'Neptune', 'Earth'], a: 1, e: 'Jupiter is the largest planet: more than twice as massive as all the other planets combined.', w: 'Jupiter' },
  { id: 'sc-mars', c: 'science', d: 1, q: 'Which planet is nicknamed the “Red Planet”?', o: ['Mars', 'Venus', 'Jupiter', 'Mercury'], a: 0, e: 'Mars looks red because of iron oxide (rust) in its dust and rocks.', w: 'Mars' },
  { id: 'sc-sunlight', c: 'science', d: 2, q: 'About how long does sunlight take to reach Earth?', o: ['8 seconds', '8 minutes', '8 hours', '8 days'], a: 1, e: 'Light covers the ~150 million km from the Sun in about 8 minutes and 20 seconds.', w: 'Sunlight' },
  { id: 'sc-nitrogen', c: 'science', d: 2, q: 'Which gas makes up most of Earth’s atmosphere?', o: ['Oxygen', 'Carbon dioxide', 'Nitrogen', 'Argon'], a: 2, e: 'Dry air is about 78% nitrogen and 21% oxygen.', w: 'Atmosphere_of_Earth' },
  { id: 'sc-light', c: 'science', d: 2, q: 'Roughly how fast does light travel in a vacuum?', o: ['300 km/s', '3,000 km/s', '300,000 km/s', '3,000,000 km/s'], a: 2, e: 'The speed of light in a vacuum is exactly 299,792,458 m/s — about 300,000 km/s.', w: 'Speed_of_light' },
  { id: 'sc-newton', c: 'science', d: 1, q: 'Who formulated the laws of motion and universal gravitation?', o: ['Galileo Galilei', 'Isaac Newton', 'Albert Einstein', 'Nicolaus Copernicus'], a: 1, e: 'Isaac Newton published them in his Principia in 1687.', w: 'Isaac_Newton' },
  { id: 'sc-einstein', c: 'science', d: 1, q: 'Who developed the theory of relativity?', o: ['Niels Bohr', 'Marie Curie', 'Albert Einstein', 'Max Planck'], a: 2, e: 'Albert Einstein published special relativity in 1905 and general relativity in 1915.', w: 'Theory_of_relativity' },
  { id: 'sc-hydrogen', c: 'science', d: 2, q: 'What is the lightest chemical element?', o: ['Helium', 'Hydrogen', 'Lithium', 'Oxygen'], a: 1, e: 'Hydrogen, element number 1, is the lightest and most abundant element in the universe.', w: 'Hydrogen' },
  { id: 'sc-ph', c: 'science', d: 2, q: 'What is the pH of pure water at 25 °C?', o: ['0', '5', '7', '14'], a: 2, e: 'Pure water is neutral: pH 7 at 25 °C. Lower is acidic, higher is basic.', w: 'PH' },
  { id: 'sc-diamond', c: 'science', d: 2, q: 'Diamond is made of which element?', o: ['Silicon', 'Carbon', 'Quartz', 'Iron'], a: 1, e: 'Diamond is pure carbon arranged in a very strong crystal lattice — like graphite, but organised differently.', w: 'Diamond' },
  { id: 'sc-curie', c: 'science', d: 2, q: 'Who was the first person to win Nobel Prizes in two different sciences?', o: ['Marie Curie', 'Linus Pauling', 'Albert Einstein', 'Dorothy Hodgkin'], a: 0, e: 'Marie Curie won the Nobel Prize in Physics (1903) and in Chemistry (1911).', w: 'Marie_Curie' },

  // ---------- biology (life & Earth sciences)
  { id: 'bio-bones', c: 'biology', d: 2, q: 'How many bones does an adult human skeleton typically have?', o: ['106', '206', '306', '406'], a: 1, e: 'An adult usually has 206 bones; babies are born with more, which fuse as they grow.', w: 'Human_skeleton' },
  { id: 'bio-heart', c: 'biology', d: 1, q: 'How many chambers does the human heart have?', o: ['2', '3', '4', '6'], a: 2, e: 'Two atria and two ventricles: four chambers.', w: 'Heart' },
  { id: 'bio-photo', c: 'biology', d: 1, q: 'Which gas do plants release during photosynthesis?', o: ['Oxygen', 'Carbon dioxide', 'Nitrogen', 'Methane'], a: 0, e: 'Plants take in carbon dioxide and release oxygen while making sugars from light.', w: 'Photosynthesis' },
  { id: 'bio-dna', c: 'biology', d: 1, q: 'Which molecule carries genetic information in living things?', o: ['ATP', 'DNA', 'Glucose', 'Collagen'], a: 1, e: 'DNA (deoxyribonucleic acid) stores the genetic instructions of almost all living organisms.', w: 'DNA' },
  { id: 'bio-skin', c: 'biology', d: 2, q: 'What is the largest organ of the human body?', o: ['The liver', 'The brain', 'The skin', 'The lungs'], a: 2, e: 'The skin is the largest organ by surface and weight.', w: 'Human_skin' },
  { id: 'bio-mito', c: 'biology', d: 2, q: 'Which part of the cell produces most of its energy?', o: ['The nucleus', 'The mitochondria', 'The ribosomes', 'The cell wall'], a: 1, e: 'Mitochondria make most of the cell’s ATP — they are often called the cell’s “powerhouse”.', w: 'Mitochondrion' },
  { id: 'bio-redcells', c: 'biology', d: 2, q: 'Which blood cells carry oxygen around the body?', o: ['White blood cells', 'Platelets', 'Red blood cells', 'Neurons'], a: 2, e: 'Red blood cells contain haemoglobin, which binds oxygen in the lungs.', w: 'Red_blood_cell' },
  { id: 'bio-bluewhale', c: 'biology', d: 1, q: 'What is the largest animal known to have ever lived?', o: ['The blue whale', 'The African elephant', 'Argentinosaurus', 'The whale shark'], a: 0, e: 'The blue whale can reach about 30 m and is the heaviest animal known to have existed.', w: 'Blue_whale' },
  { id: 'bio-darwin', c: 'biology', d: 1, q: 'Who proposed the theory of evolution by natural selection in “On the Origin of Species” (1859)?', o: ['Gregor Mendel', 'Charles Darwin', 'Louis Pasteur', 'Jean-Baptiste Lamarck'], a: 1, e: 'Charles Darwin published On the Origin of Species in 1859.', w: 'On_the_Origin_of_Species' },
  { id: 'bio-spider', c: 'biology', d: 1, q: 'How many legs does a spider have?', o: ['6', '8', '10', '12'], a: 1, e: 'Spiders are arachnids, with eight legs; insects have six.', w: 'Spider' },
  { id: 'bio-whale-mammal', c: 'biology', d: 1, q: 'Whales and dolphins belong to which group of animals?', o: ['Fish', 'Mammals', 'Reptiles', 'Amphibians'], a: 1, e: 'They are mammals: they breathe air and feed their young with milk.', w: 'Cetacea' },
  { id: 'bio-honey', c: 'biology', d: 1, q: 'Bees make honey mainly from what?', o: ['Pollen', 'Nectar', 'Tree sap', 'Water'], a: 1, e: 'Honey bees make honey from flower nectar, which they concentrate in the hive.', w: 'Honey' },
  { id: 'bio-pasteur', c: 'biology', d: 2, q: 'Which scientist developed the first rabies vaccine, in 1885?', o: ['Louis Pasteur', 'Edward Jenner', 'Robert Koch', 'Alexander Fleming'], a: 0, e: 'Louis Pasteur first used his rabies vaccine on a person in 1885.', w: 'Louis_Pasteur' },
  { id: 'bio-fleming', c: 'biology', d: 2, q: 'Who discovered penicillin, in 1928?', o: ['Alexander Fleming', 'Louis Pasteur', 'Marie Curie', 'Joseph Lister'], a: 0, e: 'Alexander Fleming noticed in 1928 that a mould killed bacteria: penicillin, the first widely used antibiotic.', w: 'Penicillin' },

  // ---------- math (facts; arithmetic and travel math are generated)
  { id: 'm-triangle', c: 'math', d: 1, q: 'What is the sum of the angles of a triangle (on a flat surface)?', o: ['90°', '180°', '270°', '360°'], a: 1, e: 'In Euclidean geometry, a triangle’s three angles always add up to 180°.', w: 'Triangle' },
  { id: 'm-pi', c: 'math', d: 1, q: 'What is the value of π (pi) to two decimal places?', o: ['3.12', '3.14', '3.16', '3.41'], a: 1, e: 'π ≈ 3.14159… It is the ratio of a circle’s circumference to its diameter.', w: 'Pi' },
  { id: 'm-prime', c: 'math', d: 1, q: 'Which of these numbers is prime?', o: ['21', '27', '29', '33'], a: 2, e: '29 has no divisors other than 1 and itself; 21 = 3×7, 27 = 3×9, 33 = 3×11.', w: 'Prime_number' },
  { id: 'm-pythagoras', c: 'math', d: 2, q: 'In a right triangle with sides 3 and 4, how long is the hypotenuse?', o: ['5', '6', '7', '12'], a: 0, e: 'By Pythagoras’ theorem: 3² + 4² = 9 + 16 = 25 = 5².', w: 'Pythagorean_theorem' },
  { id: 'm-hexagon', c: 'math', d: 1, q: 'How many sides does a hexagon have?', o: ['5', '6', '7', '8'], a: 1, e: 'A hexagon has six sides — like the cells of a honeycomb.', w: 'Hexagon' },
  { id: 'm-zero', c: 'math', d: 3, q: 'Which ancient civilisation is credited with treating zero as a number in its own right?', o: ['Indian', 'Roman', 'Greek', 'Egyptian'], a: 0, e: 'Indian mathematicians, notably Brahmagupta (7th century), set out rules for calculating with zero.', w: '0' },

  // ---------- philosophy
  { id: 'ph-republic', c: 'philosophy', d: 2, q: 'Who wrote “The Republic”?', o: ['Aristotle', 'Plato', 'Socrates', 'Cicero'], a: 1, e: 'Plato wrote The Republic around 375 BC, a dialogue on justice and the ideal city.', w: 'Republic_(Plato)' },
  { id: 'ph-socrates', c: 'philosophy', d: 1, q: 'Who was Plato’s teacher?', o: ['Socrates', 'Aristotle', 'Pythagoras', 'Diogenes'], a: 0, e: 'Plato was a student of Socrates, who left no writings; we know him mostly through Plato.', w: 'Socrates' },
  { id: 'ph-aristotle', c: 'philosophy', d: 2, q: 'Aristotle was the tutor of which future king?', o: ['Julius Caesar', 'Alexander the Great', 'Cyrus the Great', 'Ramesses II'], a: 1, e: 'Aristotle tutored the young Alexander of Macedon.', w: 'Aristotle' },
  { id: 'ph-descartes', c: 'philosophy', d: 1, q: 'Who said “I think, therefore I am”?', o: ['René Descartes', 'Blaise Pascal', 'Voltaire', 'John Locke'], a: 0, e: 'René Descartes, in his Discourse on the Method (1637): “Cogito, ergo sum”.', w: 'Cogito,_ergo_sum' },
  { id: 'ph-word', c: 'philosophy', d: 1, q: 'The word “philosophy” comes from Greek. What does it mean?', o: ['Love of wisdom', 'Study of the stars', 'Art of speaking', 'Search for truth'], a: 0, e: 'From philo- (love) and sophia (wisdom).', w: 'Philosophy' },
  { id: 'ph-nietzsche', c: 'philosophy', d: 2, q: 'Who wrote “Thus Spoke Zarathustra”?', o: ['Arthur Schopenhauer', 'Friedrich Nietzsche', 'Immanuel Kant', 'Karl Marx'], a: 1, e: 'Friedrich Nietzsche wrote it between 1883 and 1885.', w: 'Thus_Spoke_Zarathustra' },
  { id: 'ph-kant', c: 'philosophy', d: 2, q: 'Who wrote the “Critique of Pure Reason” (1781)?', o: ['Immanuel Kant', 'G. W. F. Hegel', 'David Hume', 'Baruch Spinoza'], a: 0, e: 'Immanuel Kant published the Critique of Pure Reason in 1781.', w: 'Critique_of_Pure_Reason' },
  { id: 'ph-confucius', c: 'philosophy', d: 1, q: 'The “Analects” collect the sayings of which Chinese thinker?', o: ['Laozi', 'Confucius', 'Sun Tzu', 'Mencius'], a: 1, e: 'The Analects gather the teachings of Confucius, compiled by his followers.', w: 'Analects' },
  { id: 'ph-rousseau', c: 'philosophy', d: 2, q: 'Who wrote “The Social Contract” (1762)?', o: ['Montesquieu', 'Voltaire', 'Jean-Jacques Rousseau', 'Denis Diderot'], a: 2, e: 'Jean-Jacques Rousseau published The Social Contract in 1762.', w: 'The_Social_Contract' },
  { id: 'ph-hobbes', c: 'philosophy', d: 3, q: 'Who wrote “Leviathan” (1651)?', o: ['John Locke', 'Thomas Hobbes', 'Francis Bacon', 'Thomas More'], a: 1, e: 'Thomas Hobbes published Leviathan in 1651.', w: 'Leviathan_(Hobbes_book)' },
  { id: 'ph-marcus', c: 'philosophy', d: 2, q: 'Which Roman emperor wrote the Stoic “Meditations”?', o: ['Augustus', 'Nero', 'Marcus Aurelius', 'Hadrian'], a: 2, e: 'Marcus Aurelius wrote his Meditations in Greek during his reign (161–180).', w: 'Meditations' },
  { id: 'ph-prince', c: 'philosophy', d: 2, q: 'Who wrote “The Prince”?', o: ['Niccolò Machiavelli', 'Dante Alighieri', 'Thomas Aquinas', 'Erasmus'], a: 0, e: 'Niccolò Machiavelli wrote The Prince in 1513.', w: 'The_Prince' },

  // ---------- culture (arts, literature, music)
  { id: 'cu-mona', c: 'culture', d: 1, q: 'Who painted the Mona Lisa?', o: ['Raphael', 'Michelangelo', 'Leonardo da Vinci', 'Botticelli'], a: 2, e: 'Leonardo da Vinci painted it in the early 16th century; it hangs in the Louvre.', w: 'Mona_Lisa' },
  { id: 'cu-romeo', c: 'culture', d: 1, q: 'Who wrote “Romeo and Juliet”?', o: ['William Shakespeare', 'Charles Dickens', 'Molière', 'Christopher Marlowe'], a: 0, e: 'William Shakespeare wrote it in the 1590s.', w: 'Romeo_and_Juliet' },
  { id: 'cu-seasons', c: 'culture', d: 2, q: 'Who composed “The Four Seasons”?', o: ['Johann Sebastian Bach', 'Antonio Vivaldi', 'Wolfgang Amadeus Mozart', 'George Frideric Handel'], a: 1, e: 'Antonio Vivaldi’s four violin concertos were published in 1725.', w: 'The_Four_Seasons_(Vivaldi)' },
  { id: 'cu-sistine', c: 'culture', d: 2, q: 'Who painted the ceiling of the Sistine Chapel?', o: ['Michelangelo', 'Leonardo da Vinci', 'Caravaggio', 'Titian'], a: 0, e: 'Michelangelo painted it between 1508 and 1512.', w: 'Sistine_Chapel_ceiling' },
  { id: 'cu-quixote', c: 'culture', d: 2, q: 'Who wrote “Don Quixote”?', o: ['Lope de Vega', 'Miguel de Cervantes', 'Gabriel García Márquez', 'Federico García Lorca'], a: 1, e: 'Miguel de Cervantes published Don Quixote in two parts, in 1605 and 1615.', w: 'Don_Quixote' },
  { id: 'cu-starry', c: 'culture', d: 1, q: 'Who painted “The Starry Night” (1889)?', o: ['Claude Monet', 'Paul Cézanne', 'Vincent van Gogh', 'Paul Gauguin'], a: 2, e: 'Vincent van Gogh painted it in 1889 at Saint-Rémy-de-Provence.', w: 'The_Starry_Night' },
  { id: 'cu-miserables', c: 'culture', d: 1, q: 'Who wrote “Les Misérables”?', o: ['Émile Zola', 'Alexandre Dumas', 'Victor Hugo', 'Gustave Flaubert'], a: 2, e: 'Victor Hugo published Les Misérables in 1862.', w: 'Les_Misérables' },
  { id: 'cu-beethoven', c: 'culture', d: 2, q: 'Which composer wrote his Ninth Symphony after becoming almost completely deaf?', o: ['Ludwig van Beethoven', 'Johannes Brahms', 'Franz Schubert', 'Joseph Haydn'], a: 0, e: 'Ludwig van Beethoven completed the Ninth Symphony in 1824, when he was almost completely deaf.', w: 'Symphony_No._9_(Beethoven)' },
  { id: 'cu-guernica', c: 'culture', d: 2, q: 'Who painted “Guernica” (1937)?', o: ['Salvador Dalí', 'Pablo Picasso', 'Joan Miró', 'Francisco Goya'], a: 1, e: 'Pablo Picasso painted Guernica in 1937, after the bombing of the Basque town.', w: 'Guernica_(Picasso)' },
  { id: 'cu-piano', c: 'culture', d: 1, q: 'How many keys does a standard modern piano have?', o: ['66', '76', '88', '98'], a: 2, e: 'A standard modern piano has 88 keys: 52 white and 36 black.', w: 'Piano' },

  // ---------- history (general, beyond the route)
  { id: 'hi-gutenberg', c: 'history', d: 2, q: 'Who introduced movable-type printing to Europe, around 1450?', o: ['Johannes Gutenberg', 'Leonardo da Vinci', 'Martin Luther', 'William Caxton'], a: 0, e: 'Johannes Gutenberg developed his printing press in Mainz around 1450.', w: 'Johannes_Gutenberg' },
  { id: 'hi-augustus', c: 'history', d: 2, q: 'Who was the first Roman emperor?', o: ['Julius Caesar', 'Augustus', 'Nero', 'Constantine'], a: 1, e: 'Augustus became the first emperor in 27 BC. Julius Caesar was dictator, never emperor.', w: 'Augustus' },
  { id: 'hi-pyramid', c: 'history', d: 1, q: 'Which of the Seven Wonders of the Ancient World still stands?', o: ['The Colossus of Rhodes', 'The Great Pyramid of Giza', 'The Lighthouse of Alexandria', 'The Hanging Gardens of Babylon'], a: 1, e: 'The Great Pyramid of Giza is the oldest of the Seven Wonders and the only one still largely intact.', w: 'Great_Pyramid_of_Giza' },
  { id: 'hi-ww1', c: 'history', d: 1, q: 'In which year did the First World War end?', o: ['1914', '1916', '1918', '1920'], a: 2, e: 'The armistice of 11 November 1918 ended the fighting.', w: 'World_War_I' },
  { id: 'hi-rosetta', c: 'history', d: 2, q: 'Which object helped decipher Egyptian hieroglyphs?', o: ['The Rosetta Stone', 'The Dead Sea Scrolls', 'The Code of Hammurabi', 'Tutankhamun’s mask'], a: 0, e: 'The Rosetta Stone carries the same decree in hieroglyphs, Demotic and Greek; Champollion deciphered it in 1822.', w: 'Rosetta_Stone' },
  { id: 'hi-un', c: 'history', d: 2, q: 'In which year was the United Nations founded?', o: ['1919', '1945', '1950', '1960'], a: 1, e: 'The UN Charter came into force on 24 October 1945.', w: 'United_Nations' },
];

export const KNOWLEDGE: Question[] = RAW.map((r) => ({
  id: r.id, kind: 'mcq', category: r.c, difficulty: r.d, prompt: r.q, options: r.o, answer: r.a, explanation: r.e, source: W(r.w),
}));

/** Which question categories and generators feed each domain. */
export const DOMAIN_CATEGORIES: Record<Domain, Category[]> = {
  history: ['history'], geography: ['geography', 'capitals', 'flags'], biology: ['biology', 'nature'],
  science: ['science'], math: ['math'], philosophy: ['philosophy'], culture: ['culture', 'landmarks'],
};
