DROP POLICY IF EXISTS "profiles readable by authenticated" ON public.profiles;
CREATE POLICY "profiles visible to related users" ON public.profiles FOR SELECT TO authenticated
USING (
  id = auth.uid()
  OR public.is_staff(auth.uid())
  OR public.is_mentor_of(auth.uid(), id)
  OR public.is_mentor_of(id, auth.uid())
  OR EXISTS (SELECT 1 FROM public.feedback f WHERE f.tutor_id = auth.uid() AND f.mentor_id = profiles.id)
);

DROP POLICY IF EXISTS "roles readable" ON public.user_roles;
CREATE POLICY "own or staff reads roles" ON public.user_roles FOR SELECT TO authenticated
USING (user_id = auth.uid() OR public.is_staff(auth.uid()));

DROP POLICY IF EXISTS "assignments readable" ON public.mentor_assignments;
CREATE POLICY "assignments visible to participants" ON public.mentor_assignments FOR SELECT TO authenticated
USING (mentor_id = auth.uid() OR tutor_id = auth.uid() OR team_leader_id = auth.uid() OR public.is_staff(auth.uid()));