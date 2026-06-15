import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export type SurveyRow = {
  id: string;
  title: string;
  description: string | null;
  status: "draft" | "active" | "closed";
  created_at: string;
  updated_at: string;
};

export type SurveyQuestionRow = {
  id: string;
  survey_id: string;
  question_text: string;
  question_type: "rating" | "text";
  order_index: number;
};

export type SurveyDetails = SurveyRow & {
  questions: SurveyQuestionRow[];
};

export type SurveyAnswerInput = {
  questionId: string;
  ratingValue?: number;
  textValue?: string;
};

export type SurveyAnalytics = {
  totalSubmissions: number;
  questionAnalytics: {
    questionId: string;
    questionText: string;
    questionType: "rating" | "text";
    averageRating?: number;
    ratingCounts?: Record<number, number>;
    textAnswers?: string[];
  }[];
};

// 1) List all surveys in the organization
export const listSurveys = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<SurveyRow[]> => {
    const { supabase, userId } = context;

    // Get current employee's organization ID
    const { data: emp } = await supabase
      .from("employees")
      .select("organization_id")
      .eq("user_id", userId)
      .maybeSingle();

    if (!emp?.organization_id) return [];

    const { data, error } = await supabase
      .from("surveys")
      .select("id, title, description, status, created_at, updated_at")
      .eq("organization_id", emp.organization_id)
      .order("created_at", { ascending: false });

    if (error) throw new Error(error.message);
    return (data || []) as SurveyRow[];
  });

// 2) Get specific survey details along with its questions
export const getSurveyDetails = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .validator((surveyId: string) => surveyId)
  .handler(async ({ input: surveyId, context }): Promise<SurveyDetails> => {
    const { supabase } = context;

    const { data: survey, error: surveyError } = await supabase
      .from("surveys")
      .select("id, title, description, status, created_at, updated_at")
      .eq("id", surveyId)
      .single();

    if (surveyError) throw new Error(surveyError.message);

    const { data: questions, error: questionsError } = await supabase
      .from("survey_questions")
      .select("id, survey_id, question_text, question_type, order_index")
      .eq("survey_id", surveyId)
      .order("order_index", { ascending: true });

    if (questionsError) throw new Error(questionsError.message);

    return {
      ...(survey as SurveyRow),
      questions: (questions || []) as SurveyQuestionRow[],
    };
  });

// 3) Get list of survey IDs submitted by the logged-in employee
export const getSurveySubmissions = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<string[]> => {
    const { supabase } = context;

    const empIdResult = await supabase.rpc("current_employee_id");
    const empId = empIdResult.data;
    if (!empId) return [];

    const { data, error } = await supabase
      .from("survey_submissions")
      .select("survey_id")
      .eq("employee_id", empId);

    if (error) throw new Error(error.message);
    return (data || []).map((s) => s.survey_id);
  });

// 4) Submit survey answers anonymously
export const submitSurveyAnswers = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((data: { surveyId: string; answers: SurveyAnswerInput[] }) => data)
  .handler(async ({ input, context }) => {
    const { supabase } = context;

    const empIdResult = await supabase.rpc("current_employee_id");
    const empId = empIdResult.data;
    if (!empId) throw new Error("Employee profile not found");

    // Check if employee has already submitted this survey
    const { data: existing } = await supabase
      .from("survey_submissions")
      .select("id")
      .eq("survey_id", input.surveyId)
      .eq("employee_id", empId)
      .maybeSingle();

    if (existing) throw new Error("You have already completed this survey.");

    // 1) Write to submissions (Lock vote)
    const { error: subError } = await supabase
      .from("survey_submissions")
      .insert({
        survey_id: input.surveyId,
        employee_id: empId,
      });

    if (subError) throw new Error(subError.message);

    // 2) Write anonymized answers (NO link to employee ID)
    const answersData = input.answers.map((ans) => ({
      survey_id: input.surveyId,
      question_id: ans.questionId,
      rating_value: ans.ratingValue || null,
      text_value: ans.textValue || null,
    }));

    const { error: ansError } = await supabase
      .from("survey_answers")
      .insert(answersData);

    if (ansError) {
      // Rollback submission record if answers insertion fails
      await supabase
        .from("survey_submissions")
        .delete()
        .eq("survey_id", input.surveyId)
        .eq("employee_id", empId);
      throw new Error(ansError.message);
    }

    return { success: true };
  });

// 5) Get survey analytics (Admin/Manager only)
export const getSurveyAnalytics = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .validator((surveyId: string) => surveyId)
  .handler(async ({ input: surveyId, context }): Promise<SurveyAnalytics> => {
    const { supabase } = context;

    // Fetch submission count
    const { count, error: countError } = await supabase
      .from("survey_submissions")
      .select("id", { count: "exact", head: true })
      .eq("survey_id", surveyId);

    if (countError) throw new Error(countError.message);

    // Fetch questions
    const { data: questions, error: qError } = await supabase
      .from("survey_questions")
      .select("id, question_text, question_type")
      .eq("survey_id", surveyId)
      .order("order_index", { ascending: true });

    if (qError) throw new Error(qError.message);

    // Fetch all answers
    const { data: answers, error: aError } = await supabase
      .from("survey_answers")
      .select("question_id, rating_value, text_value")
      .eq("survey_id", surveyId);

    if (aError) throw new Error(aError.message);

    const questionAnalytics = (questions || []).map((q) => {
      const qAnswers = (answers || []).filter((a) => a.question_id === q.id);

      if (q.question_type === "rating") {
        const ratingAnswers = qAnswers.filter((a) => a.rating_value !== null) as { rating_value: number }[];
        const totalRating = ratingAnswers.reduce((sum, a) => sum + a.rating_value, 0);
        const averageRating = ratingAnswers.length > 0 ? Number((totalRating / ratingAnswers.length).toFixed(1)) : 0;

        const ratingCounts: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
        ratingAnswers.forEach((a) => {
          if (a.rating_value >= 1 && a.rating_value <= 5) {
            ratingCounts[a.rating_value]++;
          }
        });

        return {
          questionId: q.id,
          questionText: q.question_text,
          questionType: q.question_type as "rating" | "text",
          averageRating,
          ratingCounts,
        };
      } else {
        const textAnswers = qAnswers
          .filter((a) => a.text_value && a.text_value.trim() !== "")
          .map((a) => a.text_value as string);

        return {
          questionId: q.id,
          questionText: q.question_text,
          questionType: q.question_type as "rating" | "text",
          textAnswers,
        };
      }
    });

    return {
      totalSubmissions: count || 0,
      questionAnalytics,
    };
  });

// 6) Create a new survey and questions (Admin/Manager only)
export const createNewSurvey = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((data: {
    title: string;
    description?: string;
    questions: { questionText: string; questionType: "rating" | "text" }[];
  }) => data)
  .handler(async ({ input, context }) => {
    const { supabase, userId } = context;

    // Get current employee's organization ID
    const { data: emp } = await supabase
      .from("employees")
      .select("organization_id")
      .eq("user_id", userId)
      .maybeSingle();

    if (!emp?.organization_id) throw new Error("No organization associated with this account.");

    // Create survey record
    const { data: survey, error: sError } = await supabase
      .from("surveys")
      .insert({
        organization_id: emp.organization_id,
        title: input.title,
        description: input.description || null,
        status: "draft",
      })
      .select()
      .single();

    if (sError) throw new Error(sError.message);

    // Insert questions
    if (input.questions && input.questions.length > 0) {
      const questionsData = input.questions.map((q, idx) => ({
        survey_id: survey.id,
        question_text: q.questionText,
        question_type: q.questionType,
        order_index: idx,
      }));

      const { error: qError } = await supabase
        .from("survey_questions")
        .insert(questionsData);

      if (qError) {
        // Rollback survey record if questions insert fails
        await supabase.from("surveys").delete().eq("id", survey.id);
        throw new Error(qError.message);
      }
    }

    return survey;
  });

// 7) Toggle survey status (Admin/Manager only)
export const toggleSurveyStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((data: { surveyId: string; status: "active" | "closed" }) => data)
  .handler(async ({ input, context }) => {
    const { supabase } = context;

    const { data, error } = await supabase
      .from("surveys")
      .update({ status: input.status })
      .eq("id", input.surveyId)
      .select()
      .single();

    if (error) throw new Error(error.message);
    return data;
  });
