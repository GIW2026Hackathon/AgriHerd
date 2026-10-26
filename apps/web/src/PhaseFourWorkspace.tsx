import { FormEvent, useState } from "react";
import { api, User } from "./api";

type PilotReport = {
  period: { from: string; to: string };
  animals: {
    active: number;
    withIdentityRecords: number;
    identityCoveragePercent: number;
    withHealthEvent: number;
    healthEventCoveragePercent: number;
  };
  health: {
    events: number;
    eventsWithRequiredFields: number;
    requiredFieldCoveragePercent: number;
  };
  extension: {
    requests: number;
    completedRequests: number;
    completionPercent: number;
    requestsWithFirstResponse: number;
    averageHoursToFirstResponse: number | null;
    requestsWithNextStep: number;
    nextStepCoveragePercent: number;
    averageDaysToCompletion: number | null;
  };
};

type FeedbackEntry = {
  id: string;
  category: string;
  rating: number;
  comments: string | null;
  createdAt: string;
  submittedBy: { role: string };
};

const feedbackCategories = [
  ["USABILITY", "Ease of use"],
  ["DATA_QUALITY", "Record quality"],
  ["ACCESS", "Access and permissions"],
  ["PROFESSIONAL_WORKFLOW", "Professional workflow"],
  ["OTHER", "Other"],
] as const;

function errorMessage(error: unknown, fallback: string) {
  return error instanceof Error ? error.message : fallback;
}

function dateLabel(value: string) {
  return new Date(value).toLocaleDateString(undefined, {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  });
}

export function PhaseFourWorkspace({ farmId, role }: { farmId?: string; role: User["role"] }) {
  const [report, setReport] = useState<PilotReport | null>(null);
  const [reportVisible, setReportVisible] = useState(false);
  const [loadingReport, setLoadingReport] = useState(false);
  const [feedback, setFeedback] = useState<FeedbackEntry[]>([]);
  const [feedbackVisible, setFeedbackVisible] = useState(false);
  const [loadingFeedback, setLoadingFeedback] = useState(false);
  const [savingFeedback, setSavingFeedback] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const canSubmitFeedback = role === "FARMER" || role === "FARM_WORKER" || role === "PROFESSIONAL";

  async function loadReport() {
    if (!farmId) return;
    setLoadingReport(true);
    setError("");
    try {
      const result = await api<{ data: { report: PilotReport } }>(`/farms/${farmId}/reports/summary`);
      setReport(result.data.report);
      setReportVisible(true);
    } catch (loadError) {
      setError(errorMessage(loadError, "Could not load the farm report."));
    } finally {
      setLoadingReport(false);
    }
  }

  async function loadFeedback() {
    setLoadingFeedback(true);
    setError("");
    try {
      const result = await api<{ data: { feedback: FeedbackEntry[] } }>("/pilot/feedback");
      setFeedback(result.data.feedback);
      setFeedbackVisible(true);
    } catch (loadError) {
      setError(errorMessage(loadError, "Could not load pilot feedback."));
    } finally {
      setLoadingFeedback(false);
    }
  }

  async function submitFeedback(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formElement = event.currentTarget;
    const form = new FormData(formElement);
    setSavingFeedback(true);
    setError("");
    setNotice("");
    try {
      await api("/pilot/feedback", {
        method: "POST",
        body: JSON.stringify({
          category: form.get("category"),
          rating: Number(form.get("rating")),
          comments: form.get("comments") || null,
        }),
      });
      formElement.reset();
      setNotice("Thank you. Your pilot feedback has been recorded.");
    } catch (submitError) {
      setError(errorMessage(submitError, "Could not submit pilot feedback."));
    } finally {
      setSavingFeedback(false);
    }
  }

  const csvHref = report && farmId
    ? `/api/v1/farms/${encodeURIComponent(farmId)}/reports/summary.csv?from=${encodeURIComponent(report.period.from)}&to=${encodeURIComponent(report.period.to)}`
    : "";

  return (
    <section className="phase-four-workspace" aria-label="Pilot reporting and feedback">
      {error && <div className="alert alert-error" role="alert">{error}<button type="button" onClick={() => setError("")} aria-label="Dismiss">×</button></div>}
      {notice && <div className="alert alert-success" role="status">{notice}<button type="button" onClick={() => setNotice("")} aria-label="Dismiss">×</button></div>}

      {farmId && (role === "FARMER" || role === "FARM_WORKER") && (
        <section className="panel phase-four-panel">
          <div className="panel-heading">
            <div><span className="section-kicker">PILOT REPORTING</span><h2>Farm records and service</h2></div>
            {report && <a className="button button-outline" href={csvHref}>Download CSV</a>}
          </div>
          <p className="panel-intro">A compact view of identity and health-record coverage and extension follow-through. Reports are limited to this farm.</p>
          <button className="button button-primary" type="button" onClick={() => void loadReport()} disabled={loadingReport}>
            {loadingReport ? "Loading report…" : report ? "Refresh 90-day report" : "View 90-day report"}
          </button>
          {reportVisible && report && (
            <div className="phase-four-report">
              <p className="phase-four-report-period">Period: {dateLabel(report.period.from)} – {dateLabel(report.period.to)}</p>
              <div className="phase-four-metrics">
                <article><span>Active herd identity coverage</span><strong>{report.animals.identityCoveragePercent}%</strong><small>{report.animals.withIdentityRecords} of {report.animals.active} active animals</small></article>
                <article><span>Active animals with a health event</span><strong>{report.animals.healthEventCoveragePercent}%</strong><small>{report.animals.withHealthEvent} of {report.animals.active} active animals</small></article>
                <article><span>Health events with required fields</span><strong>{report.health.requiredFieldCoveragePercent}%</strong><small>{report.health.eventsWithRequiredFields} of {report.health.events} events in period</small></article>
                <article><span>Extension requests completed</span><strong>{report.extension.completionPercent}%</strong><small>{report.extension.completedRequests} of {report.extension.requests} requests</small></article>
                <article><span>Average time to first response</span><strong>{report.extension.averageHoursToFirstResponse === null ? "—" : `${report.extension.averageHoursToFirstResponse} h`}</strong><small>{report.extension.requestsWithFirstResponse} requests with response data</small></article>
                <article><span>Requests with a recorded next step</span><strong>{report.extension.nextStepCoveragePercent}%</strong><small>{report.extension.requestsWithNextStep} of {report.extension.requests} requests</small></article>
                <article><span>Average time to completion</span><strong>{report.extension.averageDaysToCompletion === null ? "—" : `${report.extension.averageDaysToCompletion} d`}</strong><small>For requests with a completion timestamp</small></article>
              </div>
              <p className="phase-four-report-note">Health-event completeness reflects required animal, observation-date, and follow-up-status fields. A next step is counted when the latest professional interaction records an outcome or follow-up date.</p>
            </div>
          )}
        </section>
      )}

      {canSubmitFeedback && (
        <section className="panel phase-four-panel">
          <div className="panel-heading"><div><span className="section-kicker">PILOT FEEDBACK</span><h2>Help improve AgriHerd</h2></div></div>
          <p className="panel-intro">Rate your experience and share a short suggestion. Do not include animal health details, names, or contact information.</p>
          <form className="phase-four-feedback-form" onSubmit={submitFeedback}>
            <label className="form-field"><span>Feedback topic</span><select name="category" defaultValue="USABILITY">
              {feedbackCategories.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
            </select></label>
            <label className="form-field"><span>Experience rating</span><select name="rating" defaultValue="4">
              <option value="5">5 · Very good</option><option value="4">4 · Good</option><option value="3">3 · Okay</option><option value="2">2 · Difficult</option><option value="1">1 · Very difficult</option>
            </select></label>
            <label className="form-field phase-four-feedback-comments"><span>Suggestion (optional)</span><textarea name="comments" rows={3} maxLength={1000} placeholder="What worked well or should be improved?" /></label>
            <button className="button button-primary" type="submit" disabled={savingFeedback}>{savingFeedback ? "Sending…" : "Send feedback"}</button>
          </form>
          <small className="phase-four-privacy-note">Your account is not identified in the pilot feedback review list; feedback is retained under the pilot data policy.</small>
        </section>
      )}

      {role === "ADMIN" && (
        <section className="panel phase-four-panel">
          <div className="panel-heading"><div><span className="section-kicker">PILOT OPERATIONS</span><h2>Participant feedback</h2></div></div>
          <p className="panel-intro">Feedback is shown without submitter names or farm details.</p>
          <button className="button button-outline" type="button" onClick={() => void loadFeedback()} disabled={loadingFeedback}>
            {loadingFeedback ? "Loading…" : feedbackVisible ? "Refresh feedback" : "Review feedback"}
          </button>
          {feedbackVisible && (
            <div className="phase-four-feedback-list">
              {feedback.length === 0 ? <p className="phase-muted">No pilot feedback has been submitted yet.</p> : feedback.map((item) => (
                <article key={item.id}>
                  <div><strong>{item.category.replaceAll("_", " ").toLowerCase()}</strong><span>{item.rating}/5 · {item.submittedBy.role.replaceAll("_", " ").toLowerCase()} · {dateLabel(item.createdAt)}</span></div>
                  {item.comments && <p>{item.comments}</p>}
                </article>
              ))}
            </div>
          )}
        </section>
      )}
    </section>
  );
}
