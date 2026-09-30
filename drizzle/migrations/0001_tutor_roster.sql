CREATE TABLE public.tutor_roster (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tutor_code text,
  full_name text NOT NULL,
  email text,
  mentor_name text,
  mentor_email text,
  notes text,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX tutor_roster_code_mentor ON public.tutor_roster (lower(coalesce(tutor_code, email, full_name)), lower(coalesce(mentor_email,'')));
GRANT SELECT, INSERT, UPDATE, DELETE ON public.tutor_roster TO authenticated;
GRANT ALL ON public.tutor_roster TO service_role;
ALTER TABLE public.tutor_roster ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.my_email() RETURNS text LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT lower(email) FROM public.profiles WHERE id = auth.uid()
$$;

CREATE POLICY "roster visible" ON public.tutor_roster FOR SELECT TO authenticated
  USING (public.is_staff(auth.uid()) OR lower(mentor_email) = public.my_email() OR created_by = auth.uid());
CREATE POLICY "roster insert" ON public.tutor_roster FOR INSERT TO authenticated
  WITH CHECK (created_by = auth.uid() AND (public.is_staff(auth.uid()) OR public.has_role(auth.uid(),'mentor')));
CREATE POLICY "roster update" ON public.tutor_roster FOR UPDATE TO authenticated
  USING (public.is_staff(auth.uid()) OR created_by = auth.uid());
CREATE POLICY "roster delete" ON public.tutor_roster FOR DELETE TO authenticated
  USING (public.is_staff(auth.uid()) OR created_by = auth.uid());