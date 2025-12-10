export enum GamePhase {
  START = 'START',
  LOADING_CARD = 'LOADING_CARD',
  SETUP_TARGET = 'SETUP_TARGET', // Psychic spins the wheel
  VIEW_TARGET = 'VIEW_TARGET',   // Psychic memorizes location
  GUESSING = 'GUESSING',         // Target hidden, Players discuss and move dial
  REVEAL = 'REVEAL',             // Target revealed, points shown
}

export interface ConceptCard {
  left: string;
  right: string;
}

export interface ScoringZone {
  centerAngle: number; // 0 to 180
  width: number;       // total width in degrees
}
