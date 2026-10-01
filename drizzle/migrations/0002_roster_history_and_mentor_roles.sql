CREATE TABLE public.tutor_assignment_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  roster_id uuid NOT NULL REFERENCES public.tutor_roster(id) ON DELETE CASCADE,
  tutor_name text NOT NULL,
  previous_mentor_name text,
  previous_mentor_email text,
  new_mentor_name text,
  new_mentor_email text,
  changed_by uuid,
  changed_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.tutor_assignment_history TO authenticated;
GRANT ALL ON public.tutor_assignment_history TO service_role;
ALTER TABLE public.tutor_assignment_history ENABLE ROW LEVEL SECURITY;
CREATE POLICY "staff read history" ON public.tutor_assignment_history FOR SELECT TO authenticated
  USING (public.is_staff(auth.uid()));

CREATE OR REPLACE FUNCTION public.log_roster_reassignment() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF coalesce(NEW.mentor_email,'') IS DISTINCT FROM coalesce(OLD.mentor_email,'') THEN
    INSERT INTO public.tutor_assignment_history (roster_id, tutor_name, previous_mentor_name, previous_mentor_email, new_mentor_name, new_mentor_email, changed_by)
    VALUES (NEW.id, NEW.full_name, OLD.mentor_name, OLD.mentor_email, NEW.mentor_name, NEW.mentor_email, auth.uid());
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER roster_reassignment_log AFTER UPDATE ON public.tutor_roster
  FOR EACH ROW EXECUTE FUNCTION public.log_roster_reassignment();

CREATE POLICY "staff grant mentor role" ON public.user_roles FOR INSERT TO authenticated
  WITH CHECK (role = 'mentor' AND public.is_staff(auth.uid()));
CREATE POLICY "staff revoke mentor role" ON public.user_roles FOR DELETE TO authenticated
  USING (role = 'mentor' AND public.is_staff(auth.uid()));
GRANT INSERT, DELETE ON public.user_roles TO authenticated;