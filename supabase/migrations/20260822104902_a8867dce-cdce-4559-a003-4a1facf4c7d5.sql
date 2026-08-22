
-- Admin check helper (roles stay in the dedicated user_roles table)
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin')
$$;
REVOKE EXECUTE ON FUNCTION public.is_admin() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_admin() TO authenticated;

DO $$ BEGIN
  CREATE TYPE public.ticket_status AS ENUM ('open','pending','resolved','closed');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.ticket_priority AS ENUM ('low','normal','high','urgent');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS public.support_tickets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  subject text NOT NULL,
  category text NOT NULL DEFAULT 'General',
  priority public.ticket_priority NOT NULL DEFAULT 'normal',
  status public.ticket_status NOT NULL DEFAULT 'open',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.support_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id uuid NOT NULL REFERENCES public.support_tickets(id) ON DELETE CASCADE,
  sender_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  is_admin boolean NOT NULL DEFAULT false,
  message text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS support_tickets_user_idx ON public.support_tickets(user_id);
CREATE INDEX IF NOT EXISTS support_messages_ticket_idx ON public.support_messages(ticket_id, created_at);

GRANT SELECT, INSERT, UPDATE ON public.support_tickets TO authenticated;
GRANT ALL ON public.support_tickets TO service_role;
GRANT SELECT, INSERT ON public.support_messages TO authenticated;
GRANT ALL ON public.support_messages TO service_role;

ALTER TABLE public.support_tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.support_messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "tickets select own or admin" ON public.support_tickets;
CREATE POLICY "tickets select own or admin" ON public.support_tickets
  FOR SELECT TO authenticated USING (user_id = auth.uid() OR public.is_admin());

DROP POLICY IF EXISTS "tickets insert own" ON public.support_tickets;
CREATE POLICY "tickets insert own" ON public.support_tickets
  FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "tickets update own or admin" ON public.support_tickets;
CREATE POLICY "tickets update own or admin" ON public.support_tickets
  FOR UPDATE TO authenticated USING (user_id = auth.uid() OR public.is_admin())
  WITH CHECK (user_id = auth.uid() OR public.is_admin());

DROP POLICY IF EXISTS "messages select own or admin" ON public.support_messages;
CREATE POLICY "messages select own or admin" ON public.support_messages
  FOR SELECT TO authenticated USING (
    public.is_admin() OR EXISTS (
      SELECT 1 FROM public.support_tickets t WHERE t.id = ticket_id AND t.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "messages insert own or admin" ON public.support_messages;
CREATE POLICY "messages insert own or admin" ON public.support_messages
  FOR INSERT TO authenticated WITH CHECK (
    sender_id = auth.uid() AND (
      public.is_admin() OR EXISTS (
        SELECT 1 FROM public.support_tickets t
        WHERE t.id = ticket_id AND t.user_id = auth.uid() AND t.status <> 'closed'
      )
    )
  );

-- keep updated_at fresh and flag admin messages server-side
CREATE OR REPLACE FUNCTION public.touch_support_ticket()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  NEW.is_admin := public.is_admin();
  UPDATE public.support_tickets SET updated_at = now() WHERE id = NEW.ticket_id;
  RETURN NEW;
END; $$;
DROP TRIGGER IF EXISTS support_messages_touch ON public.support_messages;
CREATE TRIGGER support_messages_touch BEFORE INSERT ON public.support_messages
FOR EACH ROW EXECUTE FUNCTION public.touch_support_ticket();

CREATE OR REPLACE FUNCTION public.support_tickets_updated_at()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at := now(); RETURN NEW; END; $$;
DROP TRIGGER IF EXISTS support_tickets_touch ON public.support_tickets;
CREATE TRIGGER support_tickets_touch BEFORE UPDATE ON public.support_tickets
FOR EACH ROW EXECUTE FUNCTION public.support_tickets_updated_at();

ALTER TABLE public.support_tickets REPLICA IDENTITY FULL;
ALTER TABLE public.support_messages REPLICA IDENTITY FULL;
DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.support_tickets;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.support_messages;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Wallet address change audit trail
CREATE TABLE IF NOT EXISTS public.wallet_address_audit (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  target_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  changed_by uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  symbol text NOT NULL,
  network text NOT NULL,
  previous_address text,
  new_address text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.wallet_address_audit TO authenticated;
GRANT ALL ON public.wallet_address_audit TO service_role;
ALTER TABLE public.wallet_address_audit ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "wallet audit admin read" ON public.wallet_address_audit;
CREATE POLICY "wallet audit admin read" ON public.wallet_address_audit
  FOR SELECT TO authenticated USING (public.is_admin());

CREATE OR REPLACE FUNCTION public.admin_set_user_wallet(_user_id uuid, _symbol text, _network text, _address text)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE prev text; wid uuid;
BEGIN
  IF NOT public.is_admin() THEN RAISE EXCEPTION 'Forbidden'; END IF;
  IF length(trim(coalesce(_address,''))) < 8 THEN RAISE EXCEPTION 'Invalid wallet address'; END IF;
  SELECT address, id INTO prev, wid FROM public.wallet_addresses
   WHERE user_id = _user_id AND symbol = _symbol AND network = _network LIMIT 1;
  IF wid IS NULL THEN
    INSERT INTO public.wallet_addresses (user_id, symbol, network, address)
    VALUES (_user_id, _symbol, _network, trim(_address)) RETURNING id INTO wid;
  ELSE
    UPDATE public.wallet_addresses SET address = trim(_address) WHERE id = wid;
  END IF;
  INSERT INTO public.wallet_address_audit (target_user_id, changed_by, symbol, network, previous_address, new_address)
  VALUES (_user_id, auth.uid(), _symbol, _network, prev, trim(_address));
  RETURN wid;
END; $$;
REVOKE EXECUTE ON FUNCTION public.admin_set_user_wallet(uuid, text, text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_set_user_wallet(uuid, text, text, text) TO authenticated;
