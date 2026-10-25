-- おでかけ相談 Track A: new tables and token-based RPCs only.
-- Owner: paste this entire file into Supabase Dashboard SQL Editor and run once.
-- Re-running is supported. Existing product tables/data are untouched.
-- Apply before running scripts/soudan-live-rpc-check.mjs; no application deploy here.
-- Anyone who knows the link can read and add responses. Search exclusion is not access control.
BEGIN;

CREATE TABLE IF NOT EXISTS public.consultations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  title text NOT NULL CHECK (char_length(title) BETWEEN 1 AND 60),
  conditions jsonb NOT NULL DEFAULT '{}',
  status text NOT NULL DEFAULT 'open' CHECK (status IN ('open','decided','archived')),
  decided_candidate_id uuid,
  decided_date date,
  share_token_hash text,
  share_enabled boolean NOT NULL DEFAULT false,
  share_expires_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_consultations_user_updated ON public.consultations(user_id, updated_at DESC);
CREATE UNIQUE INDEX IF NOT EXISTS idx_consultations_token ON public.consultations(share_token_hash) WHERE share_token_hash IS NOT NULL;

CREATE TABLE IF NOT EXISTS public.consultation_candidates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  consultation_id uuid NOT NULL REFERENCES public.consultations(id) ON DELETE CASCADE,
  kind text NOT NULL CHECK (kind IN ('facility','event','external')),
  facility_slug text,
  event_id text,
  external_url text,
  title text NOT NULL CHECK (char_length(title) BETWEEN 1 AND 100),
  snapshot jsonb NOT NULL DEFAULT '{}',
  status text NOT NULL DEFAULT 'candidate' CHECK (status IN ('candidate','favorite','rejected')),
  reason text CHECK (char_length(reason) BETWEEN 0 AND 500),
  research_note text CHECK (char_length(research_note) BETWEEN 0 AND 500),
  concern text CHECK (char_length(concern) BETWEEN 0 AND 500),
  reject_reason text CHECK (char_length(reject_reason) BETWEEN 0 AND 500),
  sort_order int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  CHECK (
    (kind = 'facility' AND facility_slug IS NOT NULL AND char_length(facility_slug) > 0)
    OR (kind = 'event' AND event_id IS NOT NULL AND char_length(event_id) > 0)
    OR (kind = 'external' AND external_url IS NOT NULL AND external_url ~* '^https?://')
  )
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_consultation_candidates_facility ON public.consultation_candidates(consultation_id, facility_slug) WHERE facility_slug IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS idx_consultation_candidates_event ON public.consultation_candidates(consultation_id, event_id) WHERE event_id IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS idx_consultation_candidates_external ON public.consultation_candidates(consultation_id, external_url) WHERE external_url IS NOT NULL;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = 'public.consultations'::regclass AND conname = 'consultations_decided_candidate_fk') THEN
    ALTER TABLE public.consultations ADD CONSTRAINT consultations_decided_candidate_fk
      FOREIGN KEY (decided_candidate_id) REFERENCES public.consultation_candidates(id) ON DELETE SET NULL;
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS public.consultation_responses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  consultation_id uuid NOT NULL REFERENCES public.consultations(id) ON DELETE CASCADE,
  candidate_id uuid REFERENCES public.consultation_candidates(id) ON DELETE CASCADE,
  kind text NOT NULL CHECK (kind IN ('finding','correction','unverified','comment')),
  correction_field text CHECK (correction_field IN ('hours','price','reservation','other')),
  reply_to_id uuid REFERENCES public.consultation_responses(id) ON DELETE SET NULL,
  source_url text CHECK (source_url IS NULL OR (source_url ~* '^https?://' AND char_length(source_url) <= 500)),
  author_label text NOT NULL CHECK (char_length(author_label) BETWEEN 1 AND 20),
  reaction text CHECK (reaction IN ('like','concern')),
  body text NOT NULL DEFAULT '' CHECK (char_length(body) BETWEEN 0 AND 500),
  status text NOT NULL DEFAULT 'open' CHECK (status IN ('open','resolved')),
  resolved_at timestamptz,
  source text NOT NULL CHECK (source IN ('owner','link')),
  created_at timestamptz NOT NULL DEFAULT now(),
  CHECK (kind = 'correction' OR correction_field IS NULL),
  CHECK (reaction IS NOT NULL OR char_length(btrim(body, E' \t\n\r\f' || chr(11) || chr(160) || chr(5760) || chr(8192) || chr(8193) || chr(8194) || chr(8195) || chr(8196) || chr(8197) || chr(8198) || chr(8199) || chr(8200) || chr(8201) || chr(8202) || chr(8232) || chr(8233) || chr(8239) || chr(8287) || chr(12288) || chr(65279))) >= 1)
);
CREATE INDEX IF NOT EXISTS idx_consultation_responses_created ON public.consultation_responses(consultation_id, created_at);
CREATE INDEX IF NOT EXISTS idx_consultation_responses_candidate ON public.consultation_responses(candidate_id);
CREATE INDEX IF NOT EXISTS idx_consultation_responses_link ON public.consultation_responses(consultation_id, created_at) WHERE source = 'link';

ALTER TABLE public.consultations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.consultation_candidates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.consultation_responses ENABLE ROW LEVEL SECURITY;
-- Supabase default privileges may already grant anon access: explicitly revoke it.
REVOKE ALL ON TABLE public.consultations, public.consultation_candidates, public.consultation_responses FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.consultations, public.consultation_candidates TO authenticated;
GRANT SELECT, INSERT, DELETE ON TABLE public.consultation_responses TO authenticated;
GRANT UPDATE (status, resolved_at) ON TABLE public.consultation_responses TO authenticated;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'consultations' AND policyname = 'consultations_owner') THEN
    CREATE POLICY consultations_owner ON public.consultations FOR ALL TO authenticated
      USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'consultation_candidates' AND policyname = 'consultation_candidates_owner') THEN
    CREATE POLICY consultation_candidates_owner ON public.consultation_candidates FOR ALL TO authenticated
      USING (EXISTS (SELECT 1 FROM public.consultations c WHERE c.id = consultation_id AND c.user_id = auth.uid()))
      WITH CHECK (EXISTS (SELECT 1 FROM public.consultations c WHERE c.id = consultation_id AND c.user_id = auth.uid()));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'consultation_responses' AND policyname = 'consultation_responses_select') THEN
    CREATE POLICY consultation_responses_select ON public.consultation_responses FOR SELECT TO authenticated
      USING (EXISTS (SELECT 1 FROM public.consultations c WHERE c.id = consultation_id AND c.user_id = auth.uid()));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'consultation_responses' AND policyname = 'consultation_responses_insert') THEN
    CREATE POLICY consultation_responses_insert ON public.consultation_responses FOR INSERT TO authenticated
      WITH CHECK (source = 'owner' AND EXISTS (SELECT 1 FROM public.consultations c WHERE c.id = consultation_id AND c.user_id = auth.uid()));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'consultation_responses' AND policyname = 'consultation_responses_update') THEN
    CREATE POLICY consultation_responses_update ON public.consultation_responses FOR UPDATE TO authenticated
      USING (EXISTS (SELECT 1 FROM public.consultations c WHERE c.id = consultation_id AND c.user_id = auth.uid()))
      WITH CHECK (EXISTS (SELECT 1 FROM public.consultations c WHERE c.id = consultation_id AND c.user_id = auth.uid()));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'consultation_responses' AND policyname = 'consultation_responses_delete') THEN
    CREATE POLICY consultation_responses_delete ON public.consultation_responses FOR DELETE TO authenticated
      USING (EXISTS (SELECT 1 FROM public.consultations c WHERE c.id = consultation_id AND c.user_id = auth.uid()));
  END IF;
END $$;

CREATE OR REPLACE FUNCTION public.soudan_consultation_guard()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
BEGIN
  IF NEW.decided_candidate_id IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM public.consultation_candidates x WHERE x.id = NEW.decided_candidate_id AND x.consultation_id = NEW.id
  ) THEN
    RAISE EXCEPTION 'invalid decided candidate' USING ERRCODE = '23514';
  END IF;
  IF TG_OP = 'UPDATE' THEN NEW.updated_at := now(); END IF;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.soudan_candidate_guard()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
BEGIN
  -- Keep parent identity immutable so moving rows cannot bypass limits or references.
  IF TG_OP = 'UPDATE' THEN
    IF NEW.consultation_id IS DISTINCT FROM OLD.consultation_id OR NEW.id IS DISTINCT FROM OLD.id THEN
      RAISE EXCEPTION 'candidate identity is immutable' USING ERRCODE = '23514';
    END IF;
    RETURN NEW;
  END IF;
  PERFORM 1 FROM public.consultations WHERE id = NEW.consultation_id FOR UPDATE;
  IF (SELECT count(*) FROM public.consultation_candidates WHERE consultation_id = NEW.consultation_id) >= 30 THEN
    RAISE EXCEPTION 'candidate limit reached' USING ERRCODE = '23514';
  END IF;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.soudan_response_guard()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
BEGIN
  IF NEW.candidate_id IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM public.consultation_candidates x WHERE x.id = NEW.candidate_id AND x.consultation_id = NEW.consultation_id
  ) THEN RAISE EXCEPTION 'invalid candidate' USING ERRCODE = '23514'; END IF;
  IF NEW.reply_to_id IS NOT NULL AND (NEW.kind <> 'finding' OR NOT EXISTS (
    SELECT 1 FROM public.consultation_responses x WHERE x.id = NEW.reply_to_id AND x.consultation_id = NEW.consultation_id AND x.kind = 'unverified'
  )) THEN RAISE EXCEPTION 'invalid reply' USING ERRCODE = '23514'; END IF;
  RETURN NEW;
END;
$$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgrelid = 'public.consultations'::regclass AND tgname = 'trg_soudan_consultation_guard') THEN
    CREATE TRIGGER trg_soudan_consultation_guard BEFORE INSERT OR UPDATE ON public.consultations FOR EACH ROW EXECUTE FUNCTION public.soudan_consultation_guard();
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgrelid = 'public.consultation_candidates'::regclass AND tgname = 'trg_soudan_candidate_guard') THEN
    CREATE TRIGGER trg_soudan_candidate_guard BEFORE INSERT OR UPDATE ON public.consultation_candidates FOR EACH ROW EXECUTE FUNCTION public.soudan_candidate_guard();
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgrelid = 'public.consultation_responses'::regclass AND tgname = 'trg_soudan_response_guard') THEN
    CREATE TRIGGER trg_soudan_response_guard BEFORE INSERT OR UPDATE ON public.consultation_responses FOR EACH ROW EXECUTE FUNCTION public.soudan_response_guard();
  END IF;
END $$;
REVOKE ALL ON FUNCTION public.soudan_consultation_guard(), public.soudan_candidate_guard(), public.soudan_response_guard() FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.soudan_shared_get(p_token text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE c public.consultations%ROWTYPE;
BEGIN
  IF p_token IS NULL OR char_length(p_token) NOT BETWEEN 32 AND 128 OR p_token !~ '^[A-Za-z0-9_-]+$' THEN RETURN NULL; END IF;
  SELECT * INTO c FROM public.consultations
    WHERE share_token_hash = encode(sha256(convert_to(p_token,'utf8')),'hex')
      AND share_enabled = true AND (share_expires_at IS NULL OR share_expires_at > now()) AND status <> 'archived';
  IF NOT FOUND THEN RETURN NULL; END IF;
  -- Explicit allowlist; never serialize a consultation row wholesale.
  RETURN jsonb_build_object(
    'consultation', jsonb_build_object('id', c.id, 'title', c.title, 'conditions', c.conditions, 'status', c.status,
      'decided_candidate_id', c.decided_candidate_id, 'decided_date', c.decided_date),
    'candidates', COALESCE((SELECT jsonb_agg(to_jsonb(x) ORDER BY x.sort_order, x.created_at, x.id) FROM public.consultation_candidates x WHERE x.consultation_id = c.id), '[]'::jsonb),
    'responses', COALESCE((SELECT jsonb_agg(to_jsonb(x) ORDER BY x.created_at, x.id) FROM public.consultation_responses x WHERE x.consultation_id = c.id), '[]'::jsonb)
  );
END;
$$;
REVOKE ALL ON FUNCTION public.soudan_shared_get(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.soudan_shared_get(text) TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.soudan_shared_add_response(
  p_token text, p_candidate_id uuid, p_kind text, p_body text, p_author_label text,
  p_correction_field text, p_reaction text, p_source_url text, p_reply_to_id uuid
)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE
  c public.consultations%ROWTYPE;
  response_id uuid;
  label text := btrim(p_author_label, E' \t\n\r\f' || chr(11) || chr(160) || chr(5760) || chr(8192) || chr(8193) || chr(8194) || chr(8195) || chr(8196) || chr(8197) || chr(8198) || chr(8199) || chr(8200) || chr(8201) || chr(8202) || chr(8232) || chr(8233) || chr(8239) || chr(8287) || chr(12288) || chr(65279));
  content text := COALESCE(p_body, '');
  trim_chars text := E' \t\n\r\f' || chr(11) || chr(160) || chr(5760) || chr(8192) || chr(8193) || chr(8194) || chr(8195) || chr(8196) || chr(8197) || chr(8198) || chr(8199) || chr(8200) || chr(8201) || chr(8202) || chr(8232) || chr(8233) || chr(8239) || chr(8287) || chr(12288) || chr(65279);
BEGIN
  IF p_token IS NULL OR char_length(p_token) NOT BETWEEN 32 AND 128 OR p_token !~ '^[A-Za-z0-9_-]+$' THEN
    RETURN jsonb_build_object('ok', false, 'error', 'invalid_link');
  END IF;
  -- Serialize link inserts, candidate inserts and owner share changes on this parent.
  SELECT * INTO c FROM public.consultations
    WHERE share_token_hash = encode(sha256(convert_to(p_token,'utf8')),'hex')
      AND share_enabled = true AND (share_expires_at IS NULL OR share_expires_at > now()) AND status <> 'archived'
    FOR UPDATE;
  IF NOT FOUND THEN RETURN jsonb_build_object('ok', false, 'error', 'invalid_link'); END IF;
  IF p_kind IS NULL OR p_kind NOT IN ('finding','correction','unverified','comment') THEN
    RETURN jsonb_build_object('ok', false, 'error', 'invalid_kind');
  END IF;
  IF char_length(content) > 500 OR (p_reaction IS NULL AND char_length(btrim(content, trim_chars)) = 0) THEN
    RETURN jsonb_build_object('ok', false, 'error', 'invalid_body');
  END IF;
  IF label IS NULL OR char_length(label) NOT BETWEEN 1 AND 20 THEN
    RETURN jsonb_build_object('ok', false, 'error', 'invalid_author_label');
  END IF;
  IF p_source_url IS NOT NULL AND (char_length(p_source_url) > 500 OR p_source_url !~* '^https?://') THEN
    RETURN jsonb_build_object('ok', false, 'error', 'invalid_source_url');
  END IF;
  IF p_correction_field IS NOT NULL AND (p_kind <> 'correction' OR p_correction_field NOT IN ('hours','price','reservation','other')) THEN
    RETURN jsonb_build_object('ok', false, 'error', 'invalid_correction_field');
  END IF;
  IF p_reaction IS NOT NULL AND p_reaction NOT IN ('like','concern') THEN
    RETURN jsonb_build_object('ok', false, 'error', 'invalid_reaction');
  END IF;
  IF p_candidate_id IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM public.consultation_candidates x WHERE x.id = p_candidate_id AND x.consultation_id = c.id
  ) THEN RETURN jsonb_build_object('ok', false, 'error', 'invalid_candidate'); END IF;
  IF p_reply_to_id IS NOT NULL AND (p_kind <> 'finding' OR NOT EXISTS (
    SELECT 1 FROM public.consultation_responses x WHERE x.id = p_reply_to_id AND x.consultation_id = c.id AND x.kind = 'unverified'
  )) THEN RETURN jsonb_build_object('ok', false, 'error', 'invalid_reply'); END IF;
  IF (SELECT count(*) FROM public.consultation_responses WHERE consultation_id = c.id AND source = 'link' AND created_at > now() - interval '10 minutes') >= 30
    OR (SELECT count(*) FROM public.consultation_responses WHERE consultation_id = c.id AND source = 'link') >= 500 THEN
    RETURN jsonb_build_object('ok', false, 'error', 'rate_limited');
  END IF;
  INSERT INTO public.consultation_responses(consultation_id, candidate_id, kind, body, author_label, correction_field, reaction, source_url, reply_to_id, source, status)
    VALUES (c.id, p_candidate_id, p_kind, content, label, p_correction_field, p_reaction, p_source_url, p_reply_to_id, 'link', 'open') RETURNING id INTO response_id;
  RETURN jsonb_build_object('ok', true, 'id', response_id);
EXCEPTION WHEN foreign_key_violation OR check_violation THEN
  -- A referenced candidate/response may disappear concurrently. Do not expose SQL detail.
  RETURN jsonb_build_object('ok', false, 'error', 'invalid_reference');
END;
$$;
REVOKE ALL ON FUNCTION public.soudan_shared_add_response(text, uuid, text, text, text, text, text, text, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.soudan_shared_add_response(text, uuid, text, text, text, text, text, text, uuid) TO anon, authenticated;
COMMIT;
