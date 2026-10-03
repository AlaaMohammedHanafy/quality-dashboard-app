CREATE TABLE public.coaching_plans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tutor_id uuid NOT NULL,
  category text NOT NULL,
  summary text NOT NULL DEFAULT '',
  actions jsonb NOT NULL DEFAULT '[]'::jsonb,
  status text NOT NULL DEFAULT 'active',
  baseline_streak integer NOT NULL DEFAULT 0,
  baseline_date date,
  created_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.coaching_plans TO authenticated;
GRANT ALL ON public.coaching_plans TO service_role;
ALTER TABLE public.coaching_plans ENABLE ROW LEVEL SECURITY;
CREATE POLICY "coaching visible" ON public.coaching_plans FOR SELECT TO authenticated
  USING (tutor_id = auth.uid() OR created_by = auth.uid() OR public.is_mentor_of(auth.uid(), tutor_id) OR public.is_staff(auth.uid()));
CREATE POLICY "coaching insert" ON public.coaching_plans FOR INSERT TO authenticated
  WITH CHECK (created_by = auth.uid() AND (public.is_mentor_of(auth.uid(), tutor_id) OR public.is_staff(auth.uid())));
CREATE POLICY "coaching update" ON public.coaching_plans FOR UPDATE TO authenticated
  USING (created_by = auth.uid() OR public.is_mentor_of(auth.uid(), tutor_id) OR public.is_staff(auth.uid()));
CREATE POLICY "coaching delete" ON public.coaching_plans FOR DELETE TO authenticated
  USING (created_by = auth.uid() OR public.is_staff(auth.uid()));