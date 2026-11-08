export const en = {
  'app.tagline': 'Every Journey Is a Game!',
  'app.subtitle': 'The Global Travel Quiz Game',
  'nav.home': 'Home', 'nav.trips': 'Trips', 'nav.challenges': 'Play', 'nav.passport': 'Passport', 'nav.profile': 'Profile',
  'home.start': 'Start Adventure',
  'home.chooseRide': 'Choose your ride',
  'home.daily': 'Daily challenge',
  'home.continue': 'Continue journey',
  'common.back': 'Back', 'common.next': 'Next', 'common.finish': 'Finish', 'common.close': 'Close', 'common.loading': 'Loading…',
  'common.offline': 'Offline', 'common.online': 'Online', 'common.estimated': 'Estimated', 'common.level': 'Level',
  'quiz.correct': 'Correct!', 'quiz.wrong': 'Not quite', 'quiz.source': 'Source', 'quiz.check': 'Check order', 'quiz.timeup': 'Time’s up!',
  'trip.download': 'Download for offline', 'trip.downloaded': 'Ready offline',
  'safety.driver': 'Eyes on the road! The game is paused while the vehicle is moving.',
} as const;
export type Key = keyof typeof en;
