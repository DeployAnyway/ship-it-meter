export type Weekday =
  | "monday"
  | "tuesday"
  | "wednesday"
  | "thursday"
  | "friday"
  | "saturday"
  | "sunday";
export interface Evidence {
  tests?: number;
  failingTests?: number;
  coverage?: number;
  build?: boolean;
  uncommittedChanges?: boolean;
  branch?: string;
  day?: Weekday;
  criticalIssues?: number;
  lintFailures?: number;
}
export interface Readiness {
  score: number;
  verdict:
    | "Absolutely Not"
    | "Questionable"
    | "Probably Fine"
    | "Ship It"
    | "Suspiciously Ready";
  reasons: string[];
}
export interface Preflight extends Readiness {
  actions: string[];
}
export interface Gate extends Preflight {
  minScore: number;
  passed: boolean;
  blockers: string[];
}
export function shipIt(input?: Evidence): Readiness;
export function preflight(input?: Evidence): Preflight;
export function releaseGate(
  input?: Evidence,
  options?: { minScore?: number },
): Gate;
