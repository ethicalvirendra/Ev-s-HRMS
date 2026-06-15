import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  listSurveys,
  getSurveyDetails,
  getSurveySubmissions,
  submitSurveyAnswers,
  getSurveyAnalytics,
  createNewSurvey,
  toggleSurveyStatus,
} from "@/lib/surveys.functions";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

type QuestionInput = { questionText: string; questionType: "rating" | "text" };

export function SurveysView() {
  const qc = useQueryClient();
  
  const triggerListSurveys = useServerFn(listSurveys);
  const triggerGetSurveyDetails = useServerFn(getSurveyDetails);
  const triggerGetSubmissions = useServerFn(getSurveySubmissions);
  const triggerSubmitAnswers = useServerFn(submitSurveyAnswers);
  const triggerGetAnalytics = useServerFn(getSurveyAnalytics);
  const triggerCreateSurvey = useServerFn(createNewSurvey);
  const triggerToggleStatus = useServerFn(toggleSurveyStatus);

  // Queries
  const surveys = useQuery({ queryKey: ["surveys", "list"], queryFn: () => triggerListSurveys() });
  const submissions = useQuery({ queryKey: ["surveys", "submissions"], queryFn: () => triggerGetSubmissions() });

  // Get User Role to display Admin tab
  const userRoles = useQuery({
    queryKey: ["user", "roles"],
    queryFn: async () => {
      const { data } = await supabase.from("user_roles").select("role");
      return data?.map((r) => r.role) || [];
    },
  });
  const isAdminOrManager = userRoles.data?.includes("admin") || userRoles.data?.includes("manager");

  // Tabs
  const [activeTab, setActiveTab] = useState<"fill" | "admin">("fill");

  // Filling Survey state
  const [selectedSurveyId, setSelectedSurveyId] = useState<string | null>(null);
  const [answers, setAnswers] = useState<Record<string, { ratingValue?: number; textValue?: string }>>({});

  // Active survey details
  const activeSurvey = useQuery({
    queryKey: ["surveys", "details", selectedSurveyId],
    queryFn: () => triggerGetSurveyDetails(selectedSurveyId!),
    enabled: !!selectedSurveyId,
  });

  // Admin Selected Survey for Analytics
  const [analyticsSurveyId, setAnalyticsSurveyId] = useState<string | null>(null);
  const surveyAnalytics = useQuery({
    queryKey: ["surveys", "analytics", analyticsSurveyId],
    queryFn: () => triggerGetAnalytics(analyticsSurveyId!),
    enabled: !!analyticsSurveyId,
  });

  // Create Survey state
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newDesc, setNewDesc] = useState("");
  const [newQuestions, setNewQuestions] = useState<QuestionInput[]>([
    { questionText: "How happy are you at work this week?", questionType: "rating" },
  ]);

  // Mutations
  const submitAnswersMut = useMutation({
    mutationFn: (data: { surveyId: string; answers: any[] }) => triggerSubmitAnswers(data),
    onSuccess: () => {
      toast.success("Survey submitted anonymously. Thank you for your feedback!");
      setSelectedSurveyId(null);
      setAnswers({});
      qc.invalidateQueries({ queryKey: ["surveys"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const createSurveyMut = useMutation({
    mutationFn: (data: { title: string; description?: string; questions: QuestionInput[] }) => triggerCreateSurvey(data),
    onSuccess: () => {
      toast.success("Pulse Survey created as Draft");
      setCreateModalOpen(false);
      setNewTitle("");
      setNewDesc("");
      setNewQuestions([{ questionText: "How happy are you at work this week?", questionType: "rating" }]);
      qc.invalidateQueries({ queryKey: ["surveys"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const toggleStatusMut = useMutation({
    mutationFn: (data: { surveyId: string; status: "active" | "closed" }) => triggerToggleStatus(data),
    onSuccess: () => {
      toast.success("Survey status updated successfully");
      qc.invalidateQueries({ queryKey: ["surveys"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const handleRatingChange = (qId: string, value: number) => {
    setAnswers((prev) => ({
      ...prev,
      [qId]: { ...prev[qId], ratingValue: value },
    }));
  };

  const handleTextChange = (qId: string, value: string) => {
    setAnswers((prev) => ({
      ...prev,
      [qId]: { ...prev[qId], textValue: value },
    }));
  };

  const handleSurveySubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSurveyId || !activeSurvey.data) return;

    // Validate all rating questions are answered
    for (const q of activeSurvey.data.questions) {
      if (q.question_type === "rating" && !answers[q.id]?.ratingValue) {
        toast.error(`Please answer all rating questions: "${q.question_text}"`);
        return;
      }
    }

    const answersPayload = activeSurvey.data.questions.map((q) => ({
      questionId: q.id,
      ratingValue: answers[q.id]?.ratingValue,
      textValue: answers[q.id]?.textValue,
    }));

    submitAnswersMut.mutate({
      surveyId: selectedSurveyId,
      answers: answersPayload,
    });
  };

  const handleAddQuestion = () => {
    setNewQuestions((prev) => [...prev, { questionText: "", questionType: "rating" }]);
  };

  const handleRemoveQuestion = (idx: number) => {
    setNewQuestions((prev) => prev.filter((_, i) => i !== idx));
  };

  const handleQuestionTextChange = (idx: number, text: string) => {
    setNewQuestions((prev) =>
      prev.map((q, i) => (i === idx ? { ...q, questionText: text } : q))
    );
  };

  const handleQuestionTypeChange = (idx: number, type: "rating" | "text") => {
    setNewQuestions((prev) =>
      prev.map((q, i) => (i === idx ? { ...q, questionType: type } : q))
    );
  };

  const handleCreateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) {
      toast.error("Survey title is required");
      return;
    }
    if (newQuestions.some((q) => !q.questionText.trim())) {
      toast.error("Please fill in all question texts");
      return;
    }
    createSurveyMut.mutate({
      title: newTitle,
      description: newDesc,
      questions: newQuestions,
    });
  };

  const activeSurveysList = (surveys.data || []).filter((s) => s.status === "active");

  return (
    <div className="p-6 space-y-6 text-xs">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Pulse Surveys & Workplace Sentiment</h1>
          <p className="text-sm text-slate-500 mt-1">Provide anonymous feedback to shape company culture and satisfaction.</p>
        </div>
        {isAdminOrManager && (
          <button
            onClick={() => setCreateModalOpen(true)}
            className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 shadow-sm transition-colors flex items-center gap-1.5"
          >
            <span className="material-symbols-outlined text-sm">poll</span>
            New Survey
          </button>
        )}
      </div>

      {/* Tabs */}
      {isAdminOrManager && (
        <div className="flex border-b border-slate-200 font-semibold">
          <button
            onClick={() => {
              setActiveTab("fill");
              setSelectedSurveyId(null);
            }}
            className={`flex items-center gap-1.5 px-4 py-2.5 border-b-2 -mb-px transition-all ${
              activeTab === "fill" ? "border-blue-600 text-blue-600" : "border-transparent text-slate-500 hover:text-slate-800"
            }`}
          >
            <span className="material-symbols-outlined text-sm">edit_document</span>
            Active Surveys
          </button>
          <button
            onClick={() => {
              setActiveTab("admin");
              setAnalyticsSurveyId(null);
            }}
            className={`flex items-center gap-1.5 px-4 py-2.5 border-b-2 -mb-px transition-all ${
              activeTab === "admin" ? "border-blue-600 text-blue-600" : "border-transparent text-slate-500 hover:text-slate-800"
            }`}
          >
            <span className="material-symbols-outlined text-sm">analytics</span>
            Survey Administration & Reports
          </button>
        </div>
      )}

      {/* FILLING SURVEY TAB */}
      {activeTab === "fill" && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Survey Player / Card */}
          <div className="lg:col-span-2">
            {selectedSurveyId && activeSurvey.data ? (
              <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm space-y-6">
                <div className="flex justify-between items-start border-b border-slate-100 pb-4">
                  <div>
                    <h2 className="text-base font-bold text-slate-900">{activeSurvey.data.title}</h2>
                    <p className="text-slate-500 mt-1">{activeSurvey.data.description || "No description provided."}</p>
                  </div>
                  <button
                    onClick={() => {
                      setSelectedSurveyId(null);
                      setAnswers({});
                    }}
                    className="text-slate-400 hover:text-slate-600"
                  >
                    <span className="material-symbols-outlined text-sm">close</span>
                  </button>
                </div>

                <form onSubmit={handleSurveySubmit} className="space-y-6">
                  {activeSurvey.data.questions.map((q, qidx) => (
                    <div key={q.id} className="space-y-3 bg-slate-50 border border-slate-200/60 p-4 rounded-lg">
                      <p className="font-bold text-slate-800 flex gap-2">
                        <span className="text-blue-600 font-semibold">{qidx + 1}.</span>
                        {q.question_text}
                      </p>

                      {q.question_type === "rating" ? (
                        <div className="flex items-center gap-1.5">
                          {[1, 2, 3, 4, 5].map((val) => (
                            <button
                              key={val}
                              type="button"
                              onClick={() => handleRatingChange(q.id, val)}
                              className={`h-9 w-9 rounded-lg border font-bold text-sm transition-all flex items-center justify-center ${
                                answers[q.id]?.ratingValue === val
                                  ? "bg-blue-600 text-white border-blue-600"
                                  : "bg-white text-slate-600 border-slate-300 hover:border-blue-400"
                              }`}
                            >
                              {val}
                            </button>
                          ))}
                          <span className="text-[10px] text-slate-400 font-medium ml-3">
                            {answers[q.id]?.ratingValue ? `Score: ${answers[q.id]?.ratingValue}/5` : "(1 = Poor, 5 = Excellent)"}
                          </span>
                        </div>
                      ) : (
                        <textarea
                          placeholder="Type your anonymous feedback here..."
                          rows={3}
                          value={answers[q.id]?.textValue || ""}
                          onChange={(e) => handleTextChange(q.id, e.target.value)}
                          className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 focus:border-blue-500 focus:outline-none"
                        />
                      )}
                    </div>
                  ))}

                  <div className="bg-rose-50 border border-rose-100 rounded-lg p-3 text-[10px] text-rose-800 flex items-center gap-2">
                    <span className="material-symbols-outlined text-base">lock</span>
                    <span>This response is completely anonymous. Your identity cannot be associated with these answers.</span>
                  </div>

                  <button
                    disabled={submitAnswersMut.isPending}
                    type="submit"
                    className="w-full rounded-lg bg-blue-600 text-white font-semibold py-2.5 hover:bg-blue-700 disabled:opacity-50 transition-colors"
                  >
                    {submitAnswersMut.isPending ? "Submitting securely..." : "Submit Answers Anonymously"}
                  </button>
                </form>
              </div>
            ) : (
              <div className="bg-white rounded-xl border border-slate-200 p-8 shadow-sm text-center flex flex-col items-center justify-center h-80">
                <span className="material-symbols-outlined text-[60px] text-slate-300 mb-4 select-none">
                  rate_review
                </span>
                <h3 className="text-sm font-bold text-slate-700">No Survey Selected</h3>
                <p className="text-slate-400 mt-1 max-w-sm">
                  Select an active survey from the right side panel to submit your anonymous feedback.
                </p>
              </div>
            )}
          </div>

          {/* Survey list panel */}
          <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm space-y-4 h-fit">
            <h3 className="text-sm font-bold text-slate-900 border-b border-slate-100 pb-3 flex items-center gap-2">
              <span className="material-symbols-outlined text-rose-500 text-base">forum</span>
              Active Pulse Surveys
            </h3>

            {activeSurveysList.length === 0 ? (
              <p className="text-slate-400 py-4 text-center">There are no active surveys at this time.</p>
            ) : (
              <div className="space-y-2">
                {activeSurveysList.map((s) => {
                  const completed = submissions.data?.includes(s.id);
                  return (
                    <div
                      key={s.id}
                      className={`p-3.5 rounded-lg border transition-all flex justify-between items-center ${
                        completed
                          ? "bg-slate-50 border-slate-200"
                          : "bg-white border-slate-200 hover:border-rose-400 cursor-pointer"
                      }`}
                      onClick={() => !completed && setSelectedSurveyId(s.id)}
                    >
                      <div>
                        <h4 className="font-bold text-slate-800">{s.title}</h4>
                        <p className="text-[10px] text-slate-400 mt-1">
                          Created {new Date(s.created_at).toLocaleDateString()}
                        </p>
                      </div>

                      {completed ? (
                        <span className="flex items-center gap-1 text-[10px] text-emerald-600 font-bold">
                          <span className="material-symbols-outlined text-[14px]">check_circle</span>
                          Done
                        </span>
                      ) : (
                        <span className="text-[10px] text-blue-600 font-bold hover:underline flex items-center gap-0.5">
                          Start
                          <span className="material-symbols-outlined text-[12px]">arrow_forward</span>
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* SURVEY ADMINISTRATION & REPORTS TAB */}
      {activeTab === "admin" && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Survey Control Table */}
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="p-4 border-b border-slate-200 bg-slate-50 flex justify-between items-center">
                <h3 className="font-semibold text-slate-800 flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-blue-600 text-sm">settings</span>
                  Manage Surveys
                </h3>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-slate-200 bg-slate-50 text-slate-500 font-semibold">
                      <th className="p-3">Title</th>
                      <th className="p-3">Status</th>
                      <th className="p-3">Created At</th>
                      <th className="p-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="text-slate-700">
                    {surveys.data && surveys.data.map((s) => (
                      <tr
                        key={s.id}
                        className={`border-b border-slate-100 hover:bg-slate-50 transition-colors cursor-pointer ${
                          analyticsSurveyId === s.id ? "bg-blue-50/40" : ""
                        }`}
                        onClick={() => setAnalyticsSurveyId(s.id)}
                      >
                        <td className="p-3 font-semibold text-slate-900">{s.title}</td>
                        <td className="p-3">
                          <span className={`rounded-full px-2 py-0.5 text-[9px] font-bold uppercase ${
                            s.status === "active" ? "bg-emerald-100 text-emerald-800" :
                            s.status === "closed" ? "bg-slate-100 text-slate-800" : "bg-blue-100 text-blue-800"
                          }`}>
                            {s.status}
                          </span>
                        </td>
                        <td className="p-3 text-slate-400">{new Date(s.created_at).toLocaleDateString()}</td>
                        <td className="p-3 text-right" onClick={(e) => e.stopPropagation()}>
                          {s.status === "draft" && (
                            <button
                              onClick={() => toggleStatusMut.mutate({ surveyId: s.id, status: "active" })}
                              className="text-emerald-600 hover:underline font-bold"
                            >
                              Launch
                            </button>
                          )}
                          {s.status === "active" && (
                            <button
                              onClick={() => toggleStatusMut.mutate({ surveyId: s.id, status: "closed" })}
                              className="text-rose-600 hover:underline font-bold"
                            >
                              Close
                            </button>
                          )}
                          {s.status === "closed" && <span className="text-slate-400 font-medium">Finished</span>}
                        </td>
                      </tr>
                    ))}
                    {(!surveys.data || surveys.data.length === 0) && (
                      <tr>
                        <td colSpan={4} className="p-5 text-center text-slate-400">
                          No surveys created yet. Click "New Survey" to get started.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Selected Survey Analytics Report */}
            {analyticsSurveyId && surveyAnalytics.data && (
              <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm space-y-6">
                <h3 className="text-sm font-bold text-slate-950 flex items-center gap-1.5 border-b border-slate-100 pb-3">
                  <span className="material-symbols-outlined text-rose-500 text-base">query_stats</span>
                  Report: {surveys.data?.find((s) => s.id === analyticsSurveyId)?.title}
                  <span className="text-xs font-normal text-slate-500 ml-auto">
                    Total Responses: <strong className="text-slate-900">{surveyAnalytics.data.totalSubmissions}</strong>
                  </span>
                </h3>

                {surveyAnalytics.data.totalSubmissions === 0 ? (
                  <p className="text-slate-400 py-8 text-center">No responses submitted for this survey yet.</p>
                ) : (
                  <div className="space-y-6">
                    {surveyAnalytics.data.questionAnalytics.map((qa, idx) => (
                      <div key={qa.questionId} className="border border-slate-200 rounded-lg p-4 bg-slate-50/30">
                        <p className="font-bold text-slate-800">
                          Q{idx + 1}: {qa.questionText}
                        </p>

                        {qa.questionType === "rating" ? (
                          <div className="mt-4 flex flex-col sm:flex-row gap-6">
                            {/* Avg Score Badge */}
                            <div className="flex flex-col items-center justify-center bg-blue-50 border border-blue-100 rounded-lg p-4 w-28 h-24">
                              <span className="text-3xl font-extrabold text-blue-700">{qa.averageRating}</span>
                              <span className="text-[9px] text-blue-500 font-bold uppercase tracking-wider mt-1">Average Score</span>
                            </div>

                            {/* Rating Distribution Bar Chart */}
                            <div className="flex-1 space-y-1.5 text-[10px]">
                              {[5, 4, 3, 2, 1].map((stars) => {
                                const count = qa.ratingCounts?.[stars] ?? 0;
                                const percent = Math.round((count / surveyAnalytics.data.totalSubmissions) * 100);
                                return (
                                  <div key={stars} className="flex items-center gap-2">
                                    <span className="w-8 text-right font-medium text-slate-500">{stars} ★</span>
                                    <div className="flex-1 h-3 bg-slate-200 rounded-full overflow-hidden">
                                      <div className="bg-blue-600 h-full transition-all" style={{ width: `${percent}%` }} />
                                    </div>
                                    <span className="w-8 text-slate-700 font-bold">{count} ({percent}%)</span>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        ) : (
                          <div className="mt-3 space-y-2">
                            <p className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider">Anonymous Feedback comments ({qa.textAnswers?.length || 0}):</p>
                            <div className="max-h-40 overflow-y-auto space-y-1.5 pr-2">
                              {qa.textAnswers && qa.textAnswers.map((comment, cidx) => (
                                <div key={cidx} className="bg-white border border-slate-200 p-2.5 rounded-lg text-slate-700 italic">
                                  "{comment}"
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Quick Guidance Sidebar */}
          <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm space-y-4 h-fit">
            <h3 className="text-sm font-bold text-slate-900 border-b border-slate-100 pb-3">
              Workplace sentiment tracking
            </h3>
            <div className="space-y-3 text-slate-600 leading-relaxed">
              <p>
                Launch short pulse surveys to check the mood of your team, evaluate wellness, or audit remote-work productivity.
              </p>
              <div className="bg-rose-50/50 border border-rose-100 rounded-lg p-3 text-[11px] text-rose-800">
                <strong>Anonymity Guarantee</strong>: The system doesn't link employee IDs to answer rows. Employee ID is only mapped to a boolean value representing whether they completed the survey.
              </div>
              <p className="text-[10px] text-slate-400 pt-2">
                Need templates or scheduling surveys? Zia can assist you in generating survey content!
              </p>
            </div>
          </div>
        </div>
      )}

      {/* CREATE SURVEY MODAL */}
      {createModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40">
          <div className="w-full max-w-lg bg-white rounded-xl border border-slate-200 shadow-2xl p-6">
            <div className="flex justify-between items-center border-b border-slate-200 pb-3 mb-4">
              <h2 className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
                <span className="material-symbols-outlined text-blue-600 text-base">poll</span>
                Create New Pulse Survey
              </h2>
              <button onClick={() => setCreateModalOpen(false)} className="rounded p-1 hover:bg-slate-100">
                <span className="material-symbols-outlined text-sm">close</span>
              </button>
            </div>
            <form onSubmit={handleCreateSubmit} className="space-y-4 text-xs">
              <div>
                <label className="block text-slate-500 mb-1 font-semibold">Survey Title *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Wellness and Workload Check-in"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 focus:outline-none focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block text-slate-500 mb-1 font-semibold">Description / Instruction</label>
                <textarea
                  placeholder="e.g. Please share your honest feedback. Your responses are anonymous..."
                  value={newDesc}
                  onChange={(e) => setNewDesc(e.target.value)}
                  rows={2}
                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 focus:outline-none focus:border-blue-500"
                />
              </div>

              {/* Dynamic Questions Builder */}
              <div className="space-y-3">
                <div className="flex justify-between items-center border-t border-slate-100 pt-3">
                  <span className="font-bold text-slate-700">Survey Questions ({newQuestions.length})</span>
                  <button
                    type="button"
                    onClick={handleAddQuestion}
                    className="text-blue-600 font-bold hover:underline flex items-center gap-0.5"
                  >
                    <span className="material-symbols-outlined text-[14px]">add</span>
                    Add Question
                  </button>
                </div>

                <div className="max-h-56 overflow-y-auto space-y-3 pr-2">
                  {newQuestions.map((q, idx) => (
                    <div key={idx} className="flex gap-2.5 items-start bg-slate-50 p-3 rounded-lg border border-slate-200/50">
                      <div className="flex-1 space-y-2">
                        <input
                          type="text"
                          required
                          placeholder={`Question #${idx + 1} Text`}
                          value={q.questionText}
                          onChange={(e) => handleQuestionTextChange(idx, e.target.value)}
                          className="w-full rounded-lg border border-slate-300 bg-white px-3 py-1.5 focus:outline-none"
                        />
                        <div className="flex gap-3 items-center">
                          <span className="text-slate-500">Type:</span>
                          <label className="flex items-center gap-1 cursor-pointer">
                            <input
                              type="radio"
                              name={`type-${idx}`}
                              checked={q.questionType === "rating"}
                              onChange={() => handleQuestionTypeChange(idx, "rating")}
                            />
                            Rating (1-5 Stars)
                          </label>
                          <label className="flex items-center gap-1 cursor-pointer">
                            <input
                              type="radio"
                              name={`type-${idx}`}
                              checked={q.questionType === "text"}
                              onChange={() => handleQuestionTypeChange(idx, "text")}
                            />
                            Text Comment
                          </label>
                        </div>
                      </div>

                      {newQuestions.length > 1 && (
                        <button
                          type="button"
                          onClick={() => handleRemoveQuestion(idx)}
                          className="text-rose-500 hover:text-rose-700 mt-1.5"
                        >
                          <span className="material-symbols-outlined text-base">delete</span>
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              <button
                disabled={createSurveyMut.isPending}
                type="submit"
                className="w-full rounded-lg bg-blue-600 text-white font-semibold py-2 hover:bg-blue-700 disabled:opacity-50 transition-colors"
              >
                {createSurveyMut.isPending ? "Creating..." : "Save as Draft"}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
