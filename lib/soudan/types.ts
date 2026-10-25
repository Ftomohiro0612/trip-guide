/** Keep these contract values aligned with migration 021 (checked by soudan:test). */
export const CONSULTATION_STATUSES = ["open", "decided", "archived"] as const;
export const CANDIDATE_KINDS = ["facility", "event", "external"] as const;
export const CANDIDATE_STATUSES = ["candidate", "favorite", "rejected"] as const;
export const RESPONSE_KINDS = ["finding", "correction", "unverified", "comment"] as const;
export const CORRECTION_FIELDS = ["hours", "price", "reservation", "other"] as const;
export const REACTIONS = ["like", "concern"] as const;
export const RESPONSE_STATUSES = ["open", "resolved"] as const;
export const RESPONSE_SOURCES = ["owner", "link"] as const;
export const LIMITS = {
  consultationTitle: 60,
  candidateTitle: 100,
  note: 500,
  body: 500,
  authorLabel: 20,
  sourceUrl: 500,
  candidates: 30,
  tokenMin: 32,
  tokenMax: 128,
  linkResponsesPerWindow: 30,
  linkResponseWindowMinutes: 10,
  linkResponsesTotal: 500,
  conditionList: 5,
  conditionLabel: 100,
} as const;
export const AGE_BANDS = ["0〜2歳", "3〜5歳", "小学生", "中学生以上"] as const;
export const CONDITION_KEYS = ["dates", "areas", "budget", "travelTime", "ageBands", "rainOk", "note"] as const;

export type CandidateKind = (typeof CANDIDATE_KINDS)[number];
export type ResponseKind = (typeof RESPONSE_KINDS)[number];
export type CorrectionField = (typeof CORRECTION_FIELDS)[number];
export type Reaction = (typeof REACTIONS)[number];
export type Conditions = {
  dates?: string[];
  areas?: string[];
  budget?: string;
  travelTime?: string;
  ageBands?: (typeof AGE_BANDS)[number][];
  rainOk?: boolean;
  note?: string;
};
/** Extracted display facts only; null means the canon does not supply that fact. */
export type CandidateSnapshot = {
  title: string;
  venue_name: string | null;
  prefecture_label: string;
  date_label: string | null;
  hours: string | null;
  price: string | null;
  reservation: string | null;
  rain: string | null;
  age: string | null;
  official_url: string | null;
  source_checked_at: string | null;
};
export type Consultation = {
  id: string;
  user_id: string;
  title: string;
  conditions: Conditions;
  status: (typeof CONSULTATION_STATUSES)[number];
  decided_candidate_id: string | null;
  decided_date: string | null;
  share_token_hash: string | null;
  share_enabled: boolean;
  share_expires_at: string | null;
  created_at: string;
  updated_at: string;
};
export type ConsultationCandidate = {
  id: string;
  consultation_id: string;
  kind: CandidateKind;
  facility_slug: string | null;
  event_id: string | null;
  external_url: string | null;
  title: string;
  snapshot: CandidateSnapshot | Record<string, never>;
  status: (typeof CANDIDATE_STATUSES)[number];
  reason: string | null;
  research_note: string | null;
  concern: string | null;
  reject_reason: string | null;
  sort_order: number;
  created_at: string;
};
export type ConsultationResponse = {
  id: string;
  consultation_id: string;
  candidate_id: string | null;
  kind: ResponseKind;
  correction_field: CorrectionField | null;
  reply_to_id: string | null;
  source_url: string | null;
  author_label: string;
  reaction: Reaction | null;
  body: string;
  status: (typeof RESPONSE_STATUSES)[number];
  resolved_at: string | null;
  source: (typeof RESPONSE_SOURCES)[number];
  created_at: string;
};
export type SharedConsultation = {
  consultation: Pick<Consultation, "id" | "title" | "conditions" | "status" | "decided_candidate_id" | "decided_date">;
  candidates: ConsultationCandidate[];
  responses: ConsultationResponse[];
};
export type SharedGetResult = SharedConsultation | null;
export type ResponseInput = Pick<ConsultationResponse, "candidate_id" | "kind" | "body" | "author_label" | "correction_field" | "reaction" | "source_url" | "reply_to_id">;
export type ResponseError = "invalid_link" | "invalid_kind" | "invalid_body" | "invalid_author_label" | "invalid_source_url" | "invalid_correction_field" | "invalid_reaction" | "invalid_candidate" | "invalid_reply" | "invalid_reference" | "rate_limited";
export type SharedAddResponseResult = { ok: true; id: string } | { ok: false; error: ResponseError };
export type SharedAddResponseArgs = { p_token: string } & {
  [K in keyof ResponseInput as `p_${K}`]: ResponseInput[K];
};
