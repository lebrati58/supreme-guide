/** English mascot lines (source of truth; translations under catalog keys mascot.<mood>.<index>). */
export type Mood = 'welcome' | 'correct' | 'wrong' | 'streak' | 'levelup' | 'takeoff' | 'landing' | 'idle' | 'surprise' | 'perfect' | 'offline' | 'driver' | 'timeout';

export const MASCOT_LINES: Record<Mood, string[]> = {
  welcome: [
    'Welcome aboard! Your captain knows everything. Almost.',
    'Ah, a new traveller! Stay close — I have never been lost. Recently.',
    'Fasten your curiosity. We depart for knowledge in three… two…',
    'Bonjour, hola, shalom, hello! I speak many languages. Mostly “tourist”.',
    'The world is big. Luckily, so is my brain.',
  ],
  correct: [
    'Correct! I would have said the same thing. Slightly faster.',
    'Magnificent! Even my hat is impressed.',
    'Yes! You are officially less lost than yesterday.',
    'Bravo! Put that on a postcard.',
    'Right answer! My binoculars saw it coming.',
    'Spot on. I’m adding you to my list of favourite travellers.',
    'Excellent! You navigate like a pigeon with a GPS.',
  ],
  wrong: [
    'Wrong answer! Even my suitcase knew that one.',
    'Not quite. Don’t worry — I once took a train to the wrong Paris.',
    'Oops! Happens to the best of us. Rarely to me, but still.',
    'Close-ish! On a world map, anyway.',
    'Nope! But now you know — and knowing is half the journey.',
    'Hmm. Let’s pretend the turbulence made you click that.',
  ],
  streak: [
    'Streak alert! Are you secretly a geography satellite?',
    'Another one! Shall I hand you my hat?',
    'On fire! Careful, the cabin crew will need an extinguisher.',
  ],
  levelup: [
    'LEVEL UP! I’m almost starting to feel threatened.',
    'Promotion! Your passport just got heavier.',
    'New level! Somewhere, a map is applauding.',
  ],
  takeoff: ['Wheels up! Let’s see what’s down there.', 'Next stop: knowledge. Then the actual destination.', 'Off we go! Window seat recommended.'],
  landing: ['We have arrived! Please collect your luggage and your new facts.', 'Journey complete! Another dot on your map.', 'Touchdown! Applause is optional but appreciated.'],
  idle: [
    'Did you know? I know a lot of things. Ask me with a quiz!',
    'Looking out of the window counts as research.',
    'Tip: download your trip before leaving — I work offline too.',
    'A good traveller always has snacks and a quiz ready.',
  ],
  surprise: ['SURPRISE CHALLENGE! Double XP — no pressure. Some pressure.', 'Supreme challenge incoming! Answer this and I’ll double your points.'],
  perfect: ['A perfect round! I’m framing this one.', 'Flawless! I may have to retire. Just kidding, never.'],
  offline: ['No signal? No problem. I packed everything in my backpack.', 'Offline mode: my favourite. No one can google the answers.'],
  driver: ['Eyes on the road! I’ll wait for the next stop.', 'Driver detected: the quiz is parked until you stop. Safety first, trivia second.'],
  timeout: ['Time’s up! The clock is the only guide faster than me.', 'Tick tock… too late! Next one, quick!'],
};
