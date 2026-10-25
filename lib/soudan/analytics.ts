import type { CandidateKind, ResponseKind } from "./types";

export const SOUDAN_EVENTS = ["soudan_create", "soudan_candidate_add", "soudan_share", "soudan_link_view", "soudan_response", "soudan_decide"] as const;
type NoProperties = Record<string, never>;
export type SoudanAnalyticsProperties = {
  soudan_create: NoProperties;
  soudan_candidate_add: { kind: CandidateKind };
  soudan_share: NoProperties;
  soudan_link_view: NoProperties;
  soudan_response: { kind: ResponseKind };
  soudan_decide: NoProperties;
};
export type SoudanAnalyticsEvent = {
  [K in keyof SoudanAnalyticsProperties]: { name: K; properties: SoudanAnalyticsProperties[K] };
}[keyof SoudanAnalyticsProperties];
