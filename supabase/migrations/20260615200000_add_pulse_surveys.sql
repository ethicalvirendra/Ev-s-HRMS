-- Migration: Add Pulse Surveys & Anonymous Sentiment Tracking

-- 1) Surveys Table
CREATE TABLE IF NOT EXISTS public.surveys (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid REFERENCES public.organizations(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text,
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'active', 'closed')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- 2) Survey Questions Table
CREATE TABLE IF NOT EXISTS public.survey_questions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  survey_id uuid REFERENCES public.surveys(id) ON DELETE CASCADE NOT NULL,
  question_text text NOT NULL,
  question_type text NOT NULL CHECK (question_type IN ('rating', 'text')),
  order_index integer NOT NULL DEFAULT 0
);

-- 3) Survey Submissions Table (To prevent duplicate votes)
CREATE TABLE IF NOT EXISTS public.survey_submissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  survey_id uuid REFERENCES public.surveys(id) ON DELETE CASCADE NOT NULL,
  employee_id uuid REFERENCES public.employees(id) ON DELETE CASCADE NOT NULL,
  submitted_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (survey_id, employee_id)
);

-- 4) Survey Answers Table (Anonymized - No link to employee_id or submission)
CREATE TABLE IF NOT EXISTS public.survey_answers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  survey_id uuid REFERENCES public.surveys(id) ON DELETE CASCADE NOT NULL,
  question_id uuid REFERENCES public.survey_questions(id) ON DELETE CASCADE NOT NULL,
  rating_value integer CHECK (rating_value BETWEEN 1 AND 5),
  text_value text,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_surveys_organization ON public.surveys(organization_id);
CREATE INDEX IF NOT EXISTS idx_survey_questions_survey ON public.survey_questions(survey_id);
CREATE INDEX IF NOT EXISTS idx_survey_submissions_survey_employee ON public.survey_submissions(survey_id, employee_id);
CREATE INDEX IF NOT EXISTS idx_survey_answers_question ON public.survey_answers(question_id);

-- Enable RLS
ALTER TABLE public.surveys ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.survey_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.survey_submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.survey_answers ENABLE ROW LEVEL SECURITY;

-- Grants
GRANT SELECT, INSERT, UPDATE, DELETE ON public.surveys TO authenticated;
GRANT ALL ON public.surveys TO service_role;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.survey_questions TO authenticated;
GRANT ALL ON public.survey_questions TO service_role;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.survey_submissions TO authenticated;
GRANT ALL ON public.survey_submissions TO service_role;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.survey_answers TO authenticated;
GRANT ALL ON public.survey_answers TO service_role;

-- Policies for surveys
CREATE POLICY surveys_select ON public.surveys FOR SELECT TO authenticated
  USING (organization_id = public.current_organization_id());

CREATE POLICY surveys_all ON public.surveys FOR ALL TO authenticated
  USING (organization_id = public.current_organization_id() AND (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'manager')))
  WITH CHECK (organization_id = public.current_organization_id() AND (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'manager')));

-- Policies for questions
CREATE POLICY survey_questions_select ON public.survey_questions FOR SELECT TO authenticated
  USING (survey_id IN (SELECT id FROM public.surveys WHERE organization_id = public.current_organization_id()));

CREATE POLICY survey_questions_all ON public.survey_questions FOR ALL TO authenticated
  USING (survey_id IN (SELECT id FROM public.surveys WHERE organization_id = public.current_organization_id()) AND (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'manager')))
  WITH CHECK (survey_id IN (SELECT id FROM public.surveys WHERE organization_id = public.current_organization_id()) AND (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'manager')));

-- Policies for submissions (Users check their own submissions. Admin cannot map submissions to answers)
CREATE POLICY survey_submissions_select ON public.survey_submissions FOR SELECT TO authenticated
  USING (employee_id = public.current_employee_id());

CREATE POLICY survey_submissions_insert ON public.survey_submissions FOR INSERT TO authenticated
  WITH CHECK (employee_id = public.current_employee_id());

-- Policies for answers (Only admin/managers read aggregate answers. All write answers)
CREATE POLICY survey_answers_select ON public.survey_answers FOR SELECT TO authenticated
  USING (survey_id IN (SELECT id FROM public.surveys WHERE organization_id = public.current_organization_id()) AND (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'manager')));

CREATE POLICY survey_answers_insert ON public.survey_answers FOR INSERT TO authenticated
  WITH CHECK (survey_id IN (SELECT id FROM public.surveys WHERE organization_id = public.current_organization_id()));

-- Trigger for surveys updated_at
CREATE TRIGGER surveys_updated BEFORE UPDATE ON public.surveys 
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
