export enum Domain {
  NPF = "1.0 Network Programmability Foundation",
  ACI = "2.0 Controller Based DC Networking (ACI)",
  NXOS = "3.0 Device-centric Networking (NX-OS)",
  UCS = "4.0 DC Compute (UCS/Intersight)"
}

export interface Question {
  id: string;
  domain: Domain;
  q: string;
  a: string;
}

export interface Stats {
  correct: number;
  wrong: number;
  requeued: number;
  totalAnswered: number;
}

export enum GameState {
  SETUP,
  PLAYING,
  SUMMARY
}