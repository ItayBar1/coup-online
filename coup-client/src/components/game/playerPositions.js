// Position slot CSS classes for absolute-positioned opponent cards
export const POSITION_CLASSES = {
  "left-top": "absolute top-8 left-4",
  "left-middle": "absolute top-1/2 -translate-y-1/2 left-4",
  "left-bottom": "absolute bottom-40 left-4",
  "right-top": "absolute top-8 right-4",
  "right-middle": "absolute top-1/2 -translate-y-1/2 right-4",
};

// Maps opponent count (1–5) to ordered position slot names
export const OPPONENT_POSITIONS = {
  1: ["left-middle"],
  2: ["left-middle", "right-middle"],
  3: ["left-top", "right-top", "left-bottom"],
  4: ["left-top", "right-top", "left-bottom", "right-middle"],
  5: ["left-top", "right-top", "left-middle", "right-middle", "left-bottom"],
};
