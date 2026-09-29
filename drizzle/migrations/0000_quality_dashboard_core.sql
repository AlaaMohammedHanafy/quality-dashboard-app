-- Roles
CREATE TYPE public.app_role AS ENUM ('admin','team_leader','mentor','tutor');
CREATE TYPE public.feedback_type AS ENUM ('positive','negative');

CREATE TABLE public.profiles (
  id uuid PRIMARY KEY,
  full_name text NOT NULL DEFAULT '',
  email text,
  tutor_code text,
  status text NOT NULL DEFAULT 'active',
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  role public.app_role NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role)
$$;

CREATE OR REPLACE FUNCTION public.is_staff(_user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role IN ('admin','team_leader'))
$$;

CREATE TABLE public.mentor_assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  mentor_id uuid NOT NULL,
  tutor_id uuid NOT NULL,
  team_leader_id uuid,
  start_date date NOT NULL DEFAULT current_date,
  end_date date,
  status text NOT NULL DEFAULT 'active',
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (mentor_id, tutor_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.mentor_assignments TO authenticated;
GRANT ALL ON public.mentor_assignments TO service_role;
ALTER TABLE public.mentor_assignments ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.is_mentor_of(_mentor_id uuid, _tutor_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.mentor_assignments
    WHERE mentor_id = _mentor_id AND tutor_id = _tutor_id AND status = 'active'
  )
$$;

CREATE TABLE public.sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tutor_id uuid NOT NULL,
  session_date date NOT NULL,
  slot text NOT NULL,
  session_link text,
  status text NOT NULL DEFAULT 'scheduled',
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (tutor_id, session_date, slot)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.sessions TO authenticated;
GRANT ALL ON public.sessions TO service_role;
ALTER TABLE public.sessions ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.comment_library (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  category text NOT NULL,
  type public.feedback_type NOT NULL,
  comment text NOT NULL,
  score_impact integer NOT NULL DEFAULT 1,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.comment_library TO authenticated;
GRANT ALL ON public.comment_library TO service_role;
ALTER TABLE public.comment_library ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.feedback (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid REFERENCES public.sessions(id) ON DELETE SET NULL,
  tutor_id uuid NOT NULL,
  mentor_id uuid NOT NULL,
  session_date date NOT NULL,
  slot text NOT NULL,
  session_link text,
  category_scores jsonb NOT NULL DEFAULT '{}'::jsonb,
  overall_score numeric NOT NULL DEFAULT 0,
  uniform_status text,
  positive_count integer NOT NULL DEFAULT 0,
  negative_count integer NOT NULL DEFAULT 0,
  notes text,
  report_markdown text,
  report_link text,
  recommended_action text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.feedback TO authenticated;
GRANT ALL ON public.feedback TO service_role;
ALTER TABLE public.feedback ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.feedback_comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  feedback_id uuid NOT NULL REFERENCES public.feedback(id) ON DELETE CASCADE,
  library_comment_id uuid REFERENCES public.comment_library(id) ON DELETE SET NULL,
  category text NOT NULL,
  type public.feedback_type NOT NULL,
  comment_text text NOT NULL,
  score_impact integer NOT NULL DEFAULT 1
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.feedback_comments TO authenticated;
GRANT ALL ON public.feedback_comments TO service_role;
ALTER TABLE public.feedback_comments ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.app_settings (
  key text PRIMARY KEY,
  value jsonb NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.app_settings TO authenticated;
GRANT ALL ON public.app_settings TO service_role;
ALTER TABLE public.app_settings ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "profiles readable by authenticated" ON public.profiles FOR SELECT TO authenticated USING (true);
CREATE POLICY "own profile insert" ON public.profiles FOR INSERT TO authenticated WITH CHECK (id = auth.uid());
CREATE POLICY "own profile update" ON public.profiles FOR UPDATE TO authenticated USING (id = auth.uid() OR public.has_role(auth.uid(),'admin'));

CREATE POLICY "roles readable" ON public.user_roles FOR SELECT TO authenticated USING (true);
CREATE POLICY "admin manages roles" ON public.user_roles FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

CREATE POLICY "assignments readable" ON public.mentor_assignments FOR SELECT TO authenticated USING (true);
CREATE POLICY "staff manages assignments" ON public.mentor_assignments FOR ALL TO authenticated
  USING (public.is_staff(auth.uid())) WITH CHECK (public.is_staff(auth.uid()));

CREATE POLICY "sessions visible" ON public.sessions FOR SELECT TO authenticated
  USING (tutor_id = auth.uid() OR public.is_mentor_of(auth.uid(), tutor_id) OR public.is_staff(auth.uid()));
CREATE POLICY "mentors create sessions" ON public.sessions FOR INSERT TO authenticated
  WITH CHECK (public.is_mentor_of(auth.uid(), tutor_id) OR public.is_staff(auth.uid()));
CREATE POLICY "mentors update sessions" ON public.sessions FOR UPDATE TO authenticated
  USING (public.is_mentor_of(auth.uid(), tutor_id) OR public.is_staff(auth.uid()));
CREATE POLICY "staff delete sessions" ON public.sessions FOR DELETE TO authenticated
  USING (public.is_staff(auth.uid()));

CREATE POLICY "library readable" ON public.comment_library FOR SELECT TO authenticated USING (true);
CREATE POLICY "admin manages library" ON public.comment_library FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

CREATE POLICY "feedback visible" ON public.feedback FOR SELECT TO authenticated
  USING (tutor_id = auth.uid() OR mentor_id = auth.uid() OR public.is_staff(auth.uid()));
CREATE POLICY "mentors insert feedback" ON public.feedback FOR INSERT TO authenticated
  WITH CHECK (mentor_id = auth.uid() AND (public.is_mentor_of(auth.uid(), tutor_id) OR public.is_staff(auth.uid())));
CREATE POLICY "mentors update own feedback" ON public.feedback FOR UPDATE TO authenticated
  USING (mentor_id = auth.uid() OR public.is_staff(auth.uid()));
CREATE POLICY "mentors delete own feedback" ON public.feedback FOR DELETE TO authenticated
  USING (mentor_id = auth.uid() OR public.has_role(auth.uid(),'admin'));

CREATE POLICY "feedback comments visible" ON public.feedback_comments FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.feedback f WHERE f.id = feedback_id
    AND (f.tutor_id = auth.uid() OR f.mentor_id = auth.uid() OR public.is_staff(auth.uid()))));
CREATE POLICY "feedback comments write" ON public.feedback_comments FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM public.feedback f WHERE f.id = feedback_id
    AND (f.mentor_id = auth.uid() OR public.is_staff(auth.uid()))));
CREATE POLICY "feedback comments delete" ON public.feedback_comments FOR DELETE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.feedback f WHERE f.id = feedback_id
    AND (f.mentor_id = auth.uid() OR public.is_staff(auth.uid()))));

CREATE POLICY "settings readable" ON public.app_settings FOR SELECT TO authenticated USING (true);
CREATE POLICY "admin manages settings" ON public.app_settings FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

-- New user handling: first user is admin, others tutor
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  user_count integer;
BEGIN
  INSERT INTO public.profiles (id, full_name, email)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email,'@',1)), NEW.email)
  ON CONFLICT (id) DO NOTHING;

  SELECT count(*) INTO user_count FROM public.user_roles;
  IF user_count = 0 THEN
    INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'admin') ON CONFLICT DO NOTHING;
  ELSE
    INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'tutor') ON CONFLICT DO NOTHING;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Seed settings
INSERT INTO public.app_settings (key, value) VALUES
('weights', '{"attitude":20,"project":20,"teaching":20,"interaction":20,"homework":10,"uniform":10}'::jsonb),
('thresholds', '{"high":85,"attention":70,"negative_streak":3}'::jsonb);

-- Seed comment library
INSERT INTO public.comment_library (category, type, comment) VALUES
('Attitude','positive','Positive attitude'),
('Attitude','positive','Professional communication'),
('Attitude','positive','Friendly with students'),
('Attitude','positive','Encourages students'),
('Attitude','positive','Patient with students'),
('Attitude','positive','Maintains good classroom atmosphere'),
('Attitude','negative','Needs better communication'),
('Attitude','negative','Needs more patience'),
('Attitude','negative','Low engagement with students'),
('Attitude','negative','Needs better classroom management'),
('Attitude','negative','Limited interaction with students'),
('Project','positive','Correct implementation'),
('Project','positive','Clear explanation of implementation'),
('Project','positive','Helps students understand the project'),
('Project','positive','Follows the required project steps'),
('Project','negative','Implementation needs improvement'),
('Project','negative','Explanation was unclear'),
('Project','negative','Did not properly guide the student'),
('Project','negative','Missed an important implementation step'),
('Project','negative','Needs better technical guidance'),
('Teaching','positive','Well prepared'),
('Teaching','positive','Clear explanation'),
('Teaching','positive','Good session structure'),
('Teaching','positive','Follows lesson objectives'),
('Teaching','positive','Explains concepts clearly'),
('Teaching','negative','Insufficient preparation'),
('Teaching','negative','Explanation needs improvement'),
('Teaching','negative','Session structure needs improvement'),
('Teaching','negative','Did not cover required content'),
('Teaching','negative','Needs better time management'),
('Interaction','positive','Engages students effectively'),
('Interaction','positive','Encourages participation'),
('Interaction','positive','Responds positively to questions'),
('Interaction','positive','Gives appropriate guidance'),
('Interaction','positive','Supports struggling students'),
('Interaction','negative','Limited student engagement'),
('Interaction','negative','Does not respond adequately to questions'),
('Interaction','negative','Needs better student support'),
('Interaction','negative','Gives insufficient guidance'),
('Interaction','negative','Needs better interaction with students'),
('Homework','positive','Homework checked properly'),
('Homework','positive','Provides useful feedback'),
('Homework','positive','Follows up on missing homework'),
('Homework','positive','Identifies student mistakes'),
('Homework','negative','Homework not checked'),
('Homework','negative','Incomplete homework checking'),
('Homework','negative','Feedback is insufficient'),
('Homework','negative','Needs better follow-up');