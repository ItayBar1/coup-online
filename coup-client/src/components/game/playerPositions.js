// Position slot CSS classes for absolute-positioned opponent cards
export const POSITION_CLASSES = {
  'top-left':    'absolute top-4 left-4',
  'top-center':  'absolute top-4 left-1/2 -translate-x-1/2',
  'top-right':   'absolute top-4 right-4',
  'bottom-left': 'absolute bottom-32 left-4',
  'bottom-right':'absolute bottom-32 right-4',
};

// Maps opponent count (1–5) to ordered position slot names
export const OPPONENT_POSITIONS = {
  1: ['top-center'],
  2: ['top-left', 'top-right'],
  3: ['top-left', 'top-right', 'bottom-left'],
  4: ['top-left', 'top-right', 'bottom-left', 'bottom-right'],
  5: ['top-left', 'top-center', 'top-right', 'bottom-left', 'bottom-right'],
};
