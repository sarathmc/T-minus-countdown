CREATE TABLE public.sync_requests (
  user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  idempotency_key varchar(128) NOT NULL,
  request_hash char(64) NOT NULL,
  response jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, idempotency_key)
);
CREATE INDEX sync_requests_created_at_idx ON public.sync_requests(created_at);
ALTER TABLE public.sync_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sync_requests FORCE ROW LEVEL SECURITY;
CREATE POLICY owner_access ON public.sync_requests
  USING (user_id::text = current_setting('request.jwt.claim.sub', true))
  WITH CHECK (user_id::text = current_setting('request.jwt.claim.sub', true));