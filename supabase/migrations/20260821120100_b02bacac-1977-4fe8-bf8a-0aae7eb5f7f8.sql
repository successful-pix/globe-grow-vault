-- ENUMS
CREATE TYPE public.app_role AS ENUM ('admin','user');
CREATE TYPE public.kyc_status AS ENUM ('none','pending','approved','rejected');
CREATE TYPE public.review_status AS ENUM ('pending','approved','rejected');

-- PROFILES
CREATE TABLE public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email text,
  full_name text,
  referral_code text NOT NULL UNIQUE,
  referred_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  kyc_status public.kyc_status NOT NULL DEFAULT 'none',
  referral_earnings numeric(20,8) NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- USER ROLES
CREATE TABLE public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role)
$$;

CREATE POLICY "own roles readable" ON public.user_roles FOR SELECT TO authenticated USING (user_id = auth.uid() OR public.has_role(auth.uid(),'admin'));

CREATE POLICY "profiles select own or admin" ON public.profiles FOR SELECT TO authenticated USING (id = auth.uid() OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "profiles update own" ON public.profiles FOR UPDATE TO authenticated USING (id = auth.uid()) WITH CHECK (id = auth.uid());
CREATE POLICY "profiles admin update" ON public.profiles FOR UPDATE TO authenticated USING (public.has_role(auth.uid(),'admin'));

-- BALANCES
CREATE TABLE public.balances (
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  symbol text NOT NULL,
  amount numeric(20,8) NOT NULL DEFAULT 0,
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, symbol)
);
GRANT SELECT ON public.balances TO authenticated;
GRANT ALL ON public.balances TO service_role;
ALTER TABLE public.balances ENABLE ROW LEVEL SECURITY;
CREATE POLICY "balances select own or admin" ON public.balances FOR SELECT TO authenticated USING (user_id = auth.uid() OR public.has_role(auth.uid(),'admin'));

-- TRANSACTIONS
CREATE TABLE public.transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type text NOT NULL,
  symbol text NOT NULL,
  amount numeric(20,8) NOT NULL,
  status text NOT NULL DEFAULT 'completed',
  note text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.transactions TO authenticated;
GRANT ALL ON public.transactions TO service_role;
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "tx select own or admin" ON public.transactions FOR SELECT TO authenticated USING (user_id = auth.uid() OR public.has_role(auth.uid(),'admin'));

-- INVESTMENT PLANS
CREATE TABLE public.investment_plans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  duration_days integer NOT NULL,
  profit_percent numeric(10,2) NOT NULL,
  min_amount numeric(20,8) NOT NULL DEFAULT 50,
  max_amount numeric(20,8) NOT NULL DEFAULT 100000,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.investment_plans TO authenticated;
GRANT ALL ON public.investment_plans TO service_role;
ALTER TABLE public.investment_plans ENABLE ROW LEVEL SECURITY;
CREATE POLICY "plans readable" ON public.investment_plans FOR SELECT TO authenticated USING (true);
CREATE POLICY "plans admin insert" ON public.investment_plans FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(),'admin'));
CREATE POLICY "plans admin update" ON public.investment_plans FOR UPDATE TO authenticated USING (public.has_role(auth.uid(),'admin'));
CREATE POLICY "plans admin delete" ON public.investment_plans FOR DELETE TO authenticated USING (public.has_role(auth.uid(),'admin'));

INSERT INTO public.investment_plans (name, duration_days, profit_percent, min_amount, max_amount) VALUES
  ('Starter', 7, 5.00, 50, 5000),
  ('Growth', 15, 12.00, 100, 20000),
  ('Premium', 30, 28.00, 250, 100000);

-- INVESTMENTS
CREATE TABLE public.investments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  plan_id uuid REFERENCES public.investment_plans(id) ON DELETE SET NULL,
  plan_name text NOT NULL,
  amount numeric(20,8) NOT NULL,
  symbol text NOT NULL DEFAULT 'USDT',
  profit_percent numeric(10,2) NOT NULL,
  profit_amount numeric(20,8) NOT NULL,
  duration_days integer NOT NULL,
  start_at timestamptz NOT NULL DEFAULT now(),
  end_at timestamptz NOT NULL,
  status text NOT NULL DEFAULT 'active',
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.investments TO authenticated;
GRANT ALL ON public.investments TO service_role;
ALTER TABLE public.investments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "investments select own or admin" ON public.investments FOR SELECT TO authenticated USING (user_id = auth.uid() OR public.has_role(auth.uid(),'admin'));

-- SWAPS
CREATE TABLE public.swaps (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  from_symbol text NOT NULL,
  to_symbol text NOT NULL,
  from_amount numeric(20,8) NOT NULL,
  to_amount numeric(20,8) NOT NULL,
  rate numeric(30,10) NOT NULL,
  network_fee_usd numeric(20,8) NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'completed',
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.swaps TO authenticated;
GRANT ALL ON public.swaps TO service_role;
ALTER TABLE public.swaps ENABLE ROW LEVEL SECURITY;
CREATE POLICY "swaps select own or admin" ON public.swaps FOR SELECT TO authenticated USING (user_id = auth.uid() OR public.has_role(auth.uid(),'admin'));

-- WITHDRAWALS
CREATE TABLE public.withdrawals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  symbol text NOT NULL,
  amount numeric(20,8) NOT NULL,
  address text NOT NULL,
  source text NOT NULL DEFAULT 'wallet',
  status public.review_status NOT NULL DEFAULT 'pending',
  admin_note text,
  created_at timestamptz NOT NULL DEFAULT now(),
  reviewed_at timestamptz
);
GRANT SELECT ON public.withdrawals TO authenticated;
GRANT ALL ON public.withdrawals TO service_role;
ALTER TABLE public.withdrawals ENABLE ROW LEVEL SECURITY;
CREATE POLICY "withdrawals select own or admin" ON public.withdrawals FOR SELECT TO authenticated USING (user_id = auth.uid() OR public.has_role(auth.uid(),'admin'));

-- KYC
CREATE TABLE public.kyc_submissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name text NOT NULL,
  document_path text,
  selfie_path text,
  status public.review_status NOT NULL DEFAULT 'pending',
  admin_note text,
  created_at timestamptz NOT NULL DEFAULT now(),
  reviewed_at timestamptz
);
GRANT SELECT ON public.kyc_submissions TO authenticated;
GRANT ALL ON public.kyc_submissions TO service_role;
ALTER TABLE public.kyc_submissions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "kyc select own or admin" ON public.kyc_submissions FOR SELECT TO authenticated USING (user_id = auth.uid() OR public.has_role(auth.uid(),'admin'));

-- WALLET ADDRESSES
CREATE TABLE public.wallet_addresses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  symbol text NOT NULL,
  network text NOT NULL,
  address text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.wallet_addresses TO authenticated;
GRANT ALL ON public.wallet_addresses TO service_role;
ALTER TABLE public.wallet_addresses ENABLE ROW LEVEL SECURITY;
CREATE POLICY "addresses readable" ON public.wallet_addresses FOR SELECT TO authenticated USING (user_id IS NULL OR user_id = auth.uid() OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "addresses admin insert" ON public.wallet_addresses FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(),'admin'));
CREATE POLICY "addresses admin update" ON public.wallet_addresses FOR UPDATE TO authenticated USING (public.has_role(auth.uid(),'admin'));
CREATE POLICY "addresses admin delete" ON public.wallet_addresses FOR DELETE TO authenticated USING (public.has_role(auth.uid(),'admin'));

INSERT INTO public.wallet_addresses (symbol, network, address) VALUES
  ('USDT','TRC20','TQn9Y2khDD95J42FQtQTdwVVRZq5hSmJ4c'),
  ('USDT','ERC20','0x9f8c163cBA728e99993ABe7495F06c0A3c8Ac8b9'),
  ('BTC','Bitcoin','bc1qar0srrr7xfkvy5l643lydnw9re59gtzzwf5mdq'),
  ('ETH','ERC20','0x28C6c06298d514Db089934071355E5743bf21d60'),
  ('BNB','BEP20','0xbe0eb53f46cd790cd13851d5eff43d12404d33e8'),
  ('SOL','Solana','9WzDXwBbmkg8ZTbNMqUxvQRAyrZzDsGYdLVL9zYtAWWM'),
  ('XRP','XRP Ledger','rEb8TK3gBgk5auZkwc6sHnwrGVJH8DuaLh'),
  ('ADA','Cardano','addr1qxy2lpan99fcnhhyjk79qpkq2xd3lsl5eqmqzq2xzq'),
  ('DOGE','Dogecoin','DH5yaieqoZN36fDVciNyRueRGvGLR3mr7L'),
  ('TON','TON','EQCD39VS5jcptHL8vMjEXrzGaRcCVYto7HUn4bpAOg8xqB2N'),
  ('MATIC','Polygon','0x5A52E96BAcdaBb82fd05763E25335261B270Efcb');

-- HELPERS
CREATE OR REPLACE FUNCTION public.adjust_balance(_user_id uuid, _symbol text, _delta numeric)
RETURNS numeric LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE new_amount numeric;
BEGIN
  INSERT INTO public.balances (user_id, symbol, amount) VALUES (_user_id, _symbol, 0)
  ON CONFLICT (user_id, symbol) DO NOTHING;
  UPDATE public.balances SET amount = amount + _delta, updated_at = now()
  WHERE user_id = _user_id AND symbol = _symbol
  RETURNING amount INTO new_amount;
  IF new_amount < 0 THEN
    RAISE EXCEPTION 'Insufficient % balance', _symbol;
  END IF;
  RETURN new_amount;
END;
$$;
REVOKE ALL ON FUNCTION public.adjust_balance(uuid, text, numeric) FROM PUBLIC, authenticated, anon;

-- SIGNUP TRIGGER
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  new_code text;
  ref_code text;
  referrer uuid;
  bonus numeric := 10;
BEGIN
  new_code := upper(substr(replace(gen_random_uuid()::text,'-',''), 1, 8));
  ref_code := nullif(trim(coalesce(NEW.raw_user_meta_data->>'referral_code','')), '');
  IF ref_code IS NOT NULL THEN
    SELECT id INTO referrer FROM public.profiles WHERE referral_code = upper(ref_code);
  END IF;

  INSERT INTO public.profiles (id, email, full_name, referral_code, referred_by)
  VALUES (NEW.id, NEW.email, NEW.raw_user_meta_data->>'full_name', new_code, referrer);

  INSERT INTO public.balances (user_id, symbol, amount) VALUES (NEW.id, 'USDT', 0)
  ON CONFLICT DO NOTHING;

  IF referrer IS NOT NULL THEN
    PERFORM public.adjust_balance(referrer, 'USDT', bonus);
    UPDATE public.profiles SET referral_earnings = referral_earnings + bonus WHERE id = referrer;
    INSERT INTO public.transactions (user_id, type, symbol, amount, note)
    VALUES (referrer, 'referral', 'USDT', bonus, 'Referral bonus for ' || coalesce(NEW.email,'new user'));
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- USER ACTIONS
CREATE OR REPLACE FUNCTION public.app_swap(_from text, _to text, _from_amount numeric, _to_amount numeric, _rate numeric, _fee numeric)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE uid uuid := auth.uid(); swap_id uuid;
BEGIN
  IF uid IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  IF _from_amount <= 0 OR _to_amount <= 0 OR _from = _to THEN RAISE EXCEPTION 'Invalid swap'; END IF;
  PERFORM public.adjust_balance(uid, _from, -_from_amount);
  PERFORM public.adjust_balance(uid, _to, _to_amount);
  INSERT INTO public.swaps (user_id, from_symbol, to_symbol, from_amount, to_amount, rate, network_fee_usd)
  VALUES (uid, _from, _to, _from_amount, _to_amount, _rate, _fee) RETURNING id INTO swap_id;
  INSERT INTO public.transactions (user_id, type, symbol, amount, note)
  VALUES (uid, 'swap', _from, -_from_amount, 'Swap to ' || _to),
         (uid, 'swap', _to, _to_amount, 'Swap from ' || _from);
  RETURN swap_id;
END;
$$;
GRANT EXECUTE ON FUNCTION public.app_swap(text, text, numeric, numeric, numeric, numeric) TO authenticated;

CREATE OR REPLACE FUNCTION public.app_invest(_plan_id uuid, _amount numeric)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE uid uuid := auth.uid(); p record; inv_id uuid;
BEGIN
  IF uid IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  SELECT * INTO p FROM public.investment_plans WHERE id = _plan_id AND active;
  IF p IS NULL THEN RAISE EXCEPTION 'Plan not available'; END IF;
  IF _amount < p.min_amount OR _amount > p.max_amount THEN
    RAISE EXCEPTION 'Amount must be between % and % USDT', p.min_amount, p.max_amount;
  END IF;
  PERFORM public.adjust_balance(uid, 'USDT', -_amount);
  INSERT INTO public.investments (user_id, plan_id, plan_name, amount, profit_percent, profit_amount, duration_days, end_at)
  VALUES (uid, p.id, p.name, _amount, p.profit_percent, round(_amount * p.profit_percent / 100, 8), p.duration_days, now() + (p.duration_days || ' days')::interval)
  RETURNING id INTO inv_id;
  INSERT INTO public.transactions (user_id, type, symbol, amount, note)
  VALUES (uid, 'invest', 'USDT', -_amount, p.name || ' plan (' || p.duration_days || ' days)');
  RETURN inv_id;
END;
$$;
GRANT EXECUTE ON FUNCTION public.app_invest(uuid, numeric) TO authenticated;

CREATE OR REPLACE FUNCTION public.app_claim_investment(_investment_id uuid)
RETURNS numeric LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE uid uuid := auth.uid(); inv record; payout numeric;
BEGIN
  IF uid IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  SELECT * INTO inv FROM public.investments WHERE id = _investment_id AND user_id = uid FOR UPDATE;
  IF inv IS NULL THEN RAISE EXCEPTION 'Investment not found'; END IF;
  IF inv.status <> 'active' THEN RAISE EXCEPTION 'Already claimed'; END IF;
  IF inv.end_at > now() THEN RAISE EXCEPTION 'Plan is still running'; END IF;
  payout := inv.amount + inv.profit_amount;
  PERFORM public.adjust_balance(uid, 'USDT', payout);
  UPDATE public.investments SET status = 'claimed' WHERE id = inv.id;
  INSERT INTO public.transactions (user_id, type, symbol, amount, note)
  VALUES (uid, 'profit', 'USDT', payout, inv.plan_name || ' plan matured');
  RETURN payout;
END;
$$;
GRANT EXECUTE ON FUNCTION public.app_claim_investment(uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.app_request_withdrawal(_symbol text, _amount numeric, _address text, _source text DEFAULT 'wallet')
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE uid uuid := auth.uid(); w_id uuid; kyc public.kyc_status;
BEGIN
  IF uid IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  IF _amount <= 0 THEN RAISE EXCEPTION 'Invalid amount'; END IF;
  IF length(trim(_address)) < 8 THEN RAISE EXCEPTION 'Invalid destination address'; END IF;
  SELECT kyc_status INTO kyc FROM public.profiles WHERE id = uid;
  IF kyc <> 'approved' AND _amount > 1000 THEN
    RAISE EXCEPTION 'Withdrawals above 1000 require approved KYC verification';
  END IF;
  IF _source = 'referral' THEN
    UPDATE public.profiles SET referral_earnings = referral_earnings - _amount WHERE id = uid AND referral_earnings >= _amount;
    IF NOT FOUND THEN RAISE EXCEPTION 'Insufficient referral balance'; END IF;
  END IF;
  PERFORM public.adjust_balance(uid, _symbol, -_amount);
  INSERT INTO public.withdrawals (user_id, symbol, amount, address, source)
  VALUES (uid, _symbol, _amount, trim(_address), _source) RETURNING id INTO w_id;
  INSERT INTO public.transactions (user_id, type, symbol, amount, status, note)
  VALUES (uid, 'withdraw', _symbol, -_amount, 'pending', 'Withdrawal to ' || trim(_address));
  RETURN w_id;
END;
$$;
GRANT EXECUTE ON FUNCTION public.app_request_withdrawal(text, numeric, text, text) TO authenticated;

CREATE OR REPLACE FUNCTION public.app_submit_kyc(_full_name text, _document_path text, _selfie_path text)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE uid uuid := auth.uid(); k_id uuid;
BEGIN
  IF uid IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  IF length(trim(coalesce(_full_name,''))) < 3 THEN RAISE EXCEPTION 'Full name is required'; END IF;
  INSERT INTO public.kyc_submissions (user_id, full_name, document_path, selfie_path)
  VALUES (uid, trim(_full_name), _document_path, _selfie_path) RETURNING id INTO k_id;
  UPDATE public.profiles SET kyc_status = 'pending', full_name = trim(_full_name) WHERE id = uid;
  RETURN k_id;
END;
$$;
GRANT EXECUTE ON FUNCTION public.app_submit_kyc(text, text, text) TO authenticated;

-- ADMIN ACTIONS
CREATE OR REPLACE FUNCTION public.admin_adjust_balance(_user_id uuid, _symbol text, _delta numeric, _note text DEFAULT NULL)
RETURNS numeric LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE new_amount numeric;
BEGIN
  IF NOT public.has_role(auth.uid(),'admin') THEN RAISE EXCEPTION 'Forbidden'; END IF;
  new_amount := public.adjust_balance(_user_id, _symbol, _delta);
  INSERT INTO public.transactions (user_id, type, symbol, amount, note)
  VALUES (_user_id, CASE WHEN _delta >= 0 THEN 'deposit' ELSE 'admin' END, _symbol, _delta, coalesce(_note,'Adjusted by admin'));
  RETURN new_amount;
END;
$$;
GRANT EXECUTE ON FUNCTION public.admin_adjust_balance(uuid, text, numeric, text) TO authenticated;

CREATE OR REPLACE FUNCTION public.admin_review_withdrawal(_id uuid, _approve boolean, _note text DEFAULT NULL)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE w record;
BEGIN
  IF NOT public.has_role(auth.uid(),'admin') THEN RAISE EXCEPTION 'Forbidden'; END IF;
  SELECT * INTO w FROM public.withdrawals WHERE id = _id FOR UPDATE;
  IF w IS NULL OR w.status <> 'pending' THEN RAISE EXCEPTION 'Request not pending'; END IF;
  IF _approve THEN
    UPDATE public.withdrawals SET status = 'approved', admin_note = _note, reviewed_at = now() WHERE id = _id;
    UPDATE public.transactions SET status = 'completed'
      WHERE user_id = w.user_id AND type = 'withdraw' AND status = 'pending' AND amount = -w.amount AND symbol = w.symbol;
  ELSE
    UPDATE public.withdrawals SET status = 'rejected', admin_note = _note, reviewed_at = now() WHERE id = _id;
    PERFORM public.adjust_balance(w.user_id, w.symbol, w.amount);
    IF w.source = 'referral' THEN
      UPDATE public.profiles SET referral_earnings = referral_earnings + w.amount WHERE id = w.user_id;
    END IF;
    UPDATE public.transactions SET status = 'rejected'
      WHERE user_id = w.user_id AND type = 'withdraw' AND status = 'pending' AND amount = -w.amount AND symbol = w.symbol;
  END IF;
END;
$$;
GRANT EXECUTE ON FUNCTION public.admin_review_withdrawal(uuid, boolean, text) TO authenticated;

CREATE OR REPLACE FUNCTION public.admin_review_kyc(_id uuid, _approve boolean, _note text DEFAULT NULL)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE k record;
BEGIN
  IF NOT public.has_role(auth.uid(),'admin') THEN RAISE EXCEPTION 'Forbidden'; END IF;
  SELECT * INTO k FROM public.kyc_submissions WHERE id = _id FOR UPDATE;
  IF k IS NULL THEN RAISE EXCEPTION 'Submission not found'; END IF;
  UPDATE public.kyc_submissions SET status = CASE WHEN _approve THEN 'approved' ELSE 'rejected' END::public.review_status,
    admin_note = _note, reviewed_at = now() WHERE id = _id;
  UPDATE public.profiles SET kyc_status = CASE WHEN _approve THEN 'approved' ELSE 'rejected' END::public.kyc_status
  WHERE id = k.user_id;
END;
$$;
GRANT EXECUTE ON FUNCTION public.admin_review_kyc(uuid, boolean, text) TO authenticated;

CREATE OR REPLACE FUNCTION public.admin_stats()
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE result jsonb;
BEGIN
  IF NOT public.has_role(auth.uid(),'admin') THEN RAISE EXCEPTION 'Forbidden'; END IF;
  SELECT jsonb_build_object(
    'total_users', (SELECT count(*) FROM public.profiles),
    'total_invested', (SELECT coalesce(sum(amount),0) FROM public.investments),
    'active_investments', (SELECT count(*) FROM public.investments WHERE status = 'active'),
    'total_swap_volume', (SELECT coalesce(sum(from_amount),0) FROM public.swaps),
    'pending_withdrawals', (SELECT count(*) FROM public.withdrawals WHERE status = 'pending'),
    'pending_kyc', (SELECT count(*) FROM public.kyc_submissions WHERE status = 'pending'),
    'usdt_liability', (SELECT coalesce(sum(amount),0) FROM public.balances WHERE symbol = 'USDT')
  ) INTO result;
  RETURN result;
END;
$$;
GRANT EXECUTE ON FUNCTION public.admin_stats() TO authenticated;

CREATE OR REPLACE FUNCTION public.admin_users()
RETURNS TABLE (id uuid, email text, full_name text, referral_code text, kyc_status public.kyc_status, referral_earnings numeric, created_at timestamptz, usdt_balance numeric, referred_count bigint)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.has_role(auth.uid(),'admin') THEN RAISE EXCEPTION 'Forbidden'; END IF;
  RETURN QUERY
  SELECT p.id, p.email, p.full_name, p.referral_code, p.kyc_status, p.referral_earnings, p.created_at,
    coalesce((SELECT b.amount FROM public.balances b WHERE b.user_id = p.id AND b.symbol = 'USDT'), 0),
    (SELECT count(*) FROM public.profiles r WHERE r.referred_by = p.id)
  FROM public.profiles p ORDER BY p.created_at DESC;
END;
$$;
GRANT EXECUTE ON FUNCTION public.admin_users() TO authenticated;