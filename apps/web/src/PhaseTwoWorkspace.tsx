import { useCallback, useEffect, useMemo, useState, type FormEvent } from "react";
import { Animal, api } from "./api";

type Severity = "MILD" | "MODERATE" | "SEVERE";
type FollowUpStatus = "PENDING" | "COMPLETED" | "NOT_REQUIRED";

type Summary = {
  animals: number;
  beef: number;
  dairy: number;
  dueFollowUps: number;
  openExtensionRequests: number;
  recentConcerns: Array<{
    id: string;
    symptoms: string;
    severityObserved: Severity;
    observedAt: string;
    animal: { id: string; name: string; internalCode: string; earTag: string | null };
    recordedBy: { fullName: string };
    assessments: Array<{
      id: string;
      assessment: string;
      professional: { fullName: string };
    }>;
  }>;
  pendingFollowUps: Array<{
    id: string;
    type: "HEALTH_EVENT" | "CARE_RECORD" | "PROFESSIONAL_ASSESSMENT";
    label: string;
    followUpDate: string;
    animal: { id: string; name: string; internalCode: string };
  }>;
};

type Assessment = {
  id: string;
  assessment: string;
  diagnosisIfMade: string | null;
  recordedAt: string;
  followUpDate: string | null;
  followUpStatus: FollowUpStatus;
  professional: { id: string; fullName: string };
};

type HealthEvent = {
  id: string;
  symptoms: string;
  severityObserved: Severity;
  observedAt: string;
  notes: string | null;
  followUpDate: string | null;
  followUpStatus: FollowUpStatus;
  recordedBy: { id: string; fullName: string; role: string };
  assessments: Assessment[];
};

type CareRecord = {
  id: string;
  category: string;
  details: string;
  startDate: string;
  endDate: string | null;
  followUpDate: string | null;
  followUpStatus: FollowUpStatus;
  recordedBy: { id: string; fullName: string; role: string };
};

type FeedRecord = {
  id: string;
  feedName: string;
  quantity: string | number;
  unit: string;
  unitLabel: string | null;
  recordedAt: string;
  notes: string | null;
  recordedBy: { id: string; fullName: string };
};

type AnimalHistory = {
  animal: { id: string; name: string; internalCode: string; earTag: string | null; purpose: string };
  healthEvents: HealthEvent[];
  careRecords: CareRecord[];
  feedRecords: FeedRecord[];
};

type TimelineEntry =
  | { id: string; kind: "observation"; date: string; value: HealthEvent }
  | { id: string; kind: "care"; date: string; value: CareRecord }
  | { id: string; kind: "feed"; date: string; value: FeedRecord };

const severityLabels: Record<Severity, string> = {
  MILD: "Mild",
  MODERATE: "Moderate",
  SEVERE: "Severe",
};

const categoryLabels: Record<string, string> = {
  VETERINARY_VISIT: "Veterinary visit",
  VACCINATION: "Vaccination",
  MEDICATION: "Medication record",
  TREATMENT: "Treatment record",
  OTHER: "Other care",
};

function dateLabel(value: string | null) {
  if (!value) return "Not scheduled";
  return new Date(value).toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  });
}

function datetimeLocalValue(date: Date) {
  return new Date(date.getTime() - date.getTimezoneOffset() * 60_000).toISOString().slice(0, 16);
}

function isFutureDate(value: string) {
  return Boolean(value) && value > new Date().toISOString().slice(0, 10);
}

export function PhaseTwoWorkspace({
  farmId,
  animals,
  canRecord,
}: {
  farmId: string;
  animals: Animal[];
  canRecord: boolean;
}) {
  const [summary, setSummary] = useState<Summary | null>(null);
  const [history, setHistory] = useState<AnimalHistory | null>(null);
  const [selectedAnimalId, setSelectedAnimalId] = useState("");
  const [busy, setBusy] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const loadSummary = useCallback(async () => {
    const result = await api<{ data: { summary: Summary } }>(`/farms/${farmId}/summary`);
    setSummary(result.data.summary);
  }, [farmId]);

  const loadHistory = useCallback(async (animalId: string) => {
    const result = await api<{ data: AnimalHistory }>(`/animals/${animalId}/history`);
    setHistory(result.data);
  }, []);

  useEffect(() => {
    if (!animals.some((animal) => animal.id === selectedAnimalId)) {
      setSelectedAnimalId(animals[0]?.id ?? "");
    }
  }, [animals, selectedAnimalId]);

  useEffect(() => {
    let current = true;
    setBusy(true);
    setError("");
    api<{ data: { summary: Summary } }>(`/farms/${farmId}/summary`)
      .then(({ data }) => {
        if (current) setSummary(data.summary);
      })
      .catch((loadError: unknown) => {
        if (current) setError(errorMessage(loadError, "Could not load the farm health summary."));
      })
      .finally(() => {
        if (current) setBusy(false);
      });
    return () => {
      current = false;
    };
  }, [farmId]);

  useEffect(() => {
    if (!selectedAnimalId) {
      setHistory(null);
      return;
    }
    let current = true;
    setHistory(null);
    api<{ data: AnimalHistory }>(`/animals/${selectedAnimalId}/history`)
      .then(({ data }) => {
        if (current) setHistory(data);
      })
      .catch((loadError: unknown) => {
        if (current) setError(errorMessage(loadError, "Could not load this animal's history."));
      });
    return () => {
      current = false;
    };
  }, [selectedAnimalId]);

  const timeline = useMemo<TimelineEntry[]>(() => {
    if (!history) return [];
    return [
      ...history.healthEvents.map((value) => ({
        id: value.id,
        kind: "observation" as const,
        date: value.observedAt,
        value,
      })),
      ...history.careRecords.map((value) => ({
        id: value.id,
        kind: "care" as const,
        date: value.startDate,
        value,
      })),
      ...history.feedRecords.map((value) => ({
        id: value.id,
        kind: "feed" as const,
        date: value.recordedAt,
        value,
      })),
    ].sort((first, second) => new Date(second.date).getTime() - new Date(first.date).getTime());
  }, [history]);

  async function refreshSelectedAnimal(animalId: string) {
    await Promise.all([loadHistory(animalId), loadSummary()]);
  }

  async function submitObservation(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedAnimalId) return;
    const formElement = event.currentTarget;
    const form = new FormData(formElement);
    setSaving(true);
    setError("");
    setNotice("");
    try {
      const observedAt = new Date(String(form.get("observedAt"))).toISOString();
      if (new Date(observedAt) > new Date()) throw new Error("Observation time cannot be in the future.");
      const followUpDate = String(form.get("followUpDate") ?? "");
      if (isFutureDate(observedAt.slice(0, 10)) || (followUpDate && followUpDate < observedAt.slice(0, 10))) {
        throw new Error("Follow-up date cannot be before the observation date.");
      }
      await api(`/animals/${selectedAnimalId}/health-events`, {
        method: "POST",
        body: JSON.stringify({
          observedAt,
          symptoms: form.get("symptoms"),
          severityObserved: form.get("severityObserved"),
          notes: form.get("notes"),
          followUpDate: followUpDate || null,
        }),
      });
      formElement.reset();
      setNotice("Health observation saved to the animal timeline.");
      await refreshSelectedAnimal(selectedAnimalId);
    } catch (submitError) {
      setError(errorMessage(submitError, "Could not save the health observation."));
    } finally {
      setSaving(false);
    }
  }

  async function submitCareRecord(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedAnimalId) return;
    const formElement = event.currentTarget;
    const form = new FormData(formElement);
    const followUpDate = String(form.get("followUpDate") ?? "");
    const endDate = String(form.get("endDate") ?? "");
    const startDate = String(form.get("startDate") ?? "");
    if (endDate && endDate < startDate) {
      setError("End date cannot be before the start date.");
      return;
    }
    if (followUpDate && followUpDate < (endDate || startDate)) {
      setError("Follow-up date cannot be before the care record date.");
      return;
    }
    setSaving(true);
    setError("");
    setNotice("");
    try {
      await api(`/animals/${selectedAnimalId}/care-records`, {
        method: "POST",
        body: JSON.stringify({
          category: form.get("category"),
          details: form.get("details"),
          startDate,
          endDate: endDate || null,
          followUpDate: followUpDate || null,
        }),
      });
      formElement.reset();
      setNotice("Care record saved to the animal timeline.");
      await refreshSelectedAnimal(selectedAnimalId);
    } catch (submitError) {
      setError(errorMessage(submitError, "Could not save the care record."));
    } finally {
      setSaving(false);
    }
  }

  async function completeFollowUp(path: string) {
    setError("");
    setNotice("");
    try {
      await api(path, {
        method: "PATCH",
        body: JSON.stringify({ followUpStatus: "COMPLETED" }),
      });
      setNotice("Follow-up marked complete.");
      if (selectedAnimalId) await refreshSelectedAnimal(selectedAnimalId);
    } catch (updateError) {
      setError(errorMessage(updateError, "Could not update the follow-up."));
    }
  }

  return (
    <section className="phase-two-workspace" id="health-records">
      <div className="phase-heading phase-two-heading">
        <div>
          <span className="section-kicker">PHASE 2 · ANIMAL HEALTH & RECORDS</span>
          <h2>Health, care and follow-ups</h2>
          <p>Record what you observe and the care provided. Professional assessments are separately identified.</p>
        </div>
        <span className="phase-badge">ANIMAL TIMELINE</span>
      </div>
      {error && <div className="alert alert-error" role="alert">{error}<button type="button" onClick={() => setError("")} aria-label="Dismiss">×</button></div>}
      {notice && <div className="alert alert-success" role="status">{notice}<button type="button" onClick={() => setNotice("")} aria-label="Dismiss">×</button></div>}

      <div className="phase-two-summary" aria-label="Farm health summary">
        <article className="phase-two-stat"><span>REGISTERED ANIMALS</span><strong>{busy ? "…" : summary?.animals ?? 0}</strong><small>{summary?.dairy ?? 0} dairy · {summary?.beef ?? 0} beef</small></article>
        <article className="phase-two-stat"><span>DUE FOLLOW-UPS</span><strong>{busy ? "…" : summary?.dueFollowUps ?? 0}</strong><small>Scheduled for today or earlier</small></article>
        <article className="phase-two-stat"><span>OPEN SUPPORT REQUESTS</span><strong>{busy ? "…" : summary?.openExtensionRequests ?? 0}</strong><small>Open or in progress</small></article>
      </div>

      <div className="phase-two-dashboard">
        <section className="panel phase-two-panel">
          <div className="panel-heading"><div><span className="section-kicker">RECENT CONCERNS</span><h2>Health observations</h2></div></div>
          {!summary?.recentConcerns.length ? <div className="phase-empty">{busy ? "Loading health activity…" : "No health observations have been recorded for this farm."}</div> : (
            <div className="phase-two-list">
              {summary.recentConcerns.map((item) => (
                <article className="phase-two-list-row" key={item.id}>
                  <span className={`health-severity-dot ${item.severityObserved.toLowerCase()}`} aria-hidden="true" />
                  <div className="phase-two-concern-copy">
                    <strong>{item.animal.name} · {item.symptoms}</strong>
                    <small>{severityLabels[item.severityObserved]} · {dateLabel(item.observedAt)} · farmer observation by {item.recordedBy.fullName}</small>
                    {item.assessments.slice(0, 1).map((assessment) => <small className="phase-two-professional-summary" key={assessment.id}>Professional assessment by {assessment.professional.fullName}: {assessment.assessment}</small>)}
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>
        <section className="panel phase-two-panel">
          <div className="panel-heading"><div><span className="section-kicker">NEXT STEPS</span><h2>Scheduled follow-ups</h2></div></div>
          {!summary?.pendingFollowUps.length ? <div className="phase-empty">{busy ? "Loading follow-ups…" : "No follow-ups are currently scheduled."}</div> : (
            <div className="phase-two-list">
              {summary.pendingFollowUps.map((item) => (
                <article className="phase-two-list-row" key={`${item.type}-${item.id}`}>
                  <span className="follow-up-marker" aria-hidden="true">↗</span>
                  <div><strong>{item.animal.name} · {item.label}</strong><small>Due {dateLabel(item.followUpDate)} · {item.animal.internalCode}</small></div>
                </article>
              ))}
            </div>
          )}
        </section>
      </div>

      <section className="panel phase-two-history-panel">
        <div className="panel-heading phase-two-history-heading">
          <div><span className="section-kicker">ANIMAL RECORD</span><h2>Chronological history</h2></div>
          <label className="form-field phase-two-animal-select"><span>Select animal</span>
            <select value={selectedAnimalId} onChange={(event) => setSelectedAnimalId(event.target.value)} aria-label="Select animal history">
              {animals.length === 0 && <option value="">No animals registered</option>}
              {animals.map((animal) => <option key={animal.id} value={animal.id}>{animal.name} · {animal.internalCode}</option>)}
            </select>
          </label>
        </div>

        {selectedAnimalId && canRecord && (
          <div className="phase-two-forms">
            <section className="phase-two-form-card">
              <h3>Record a health observation</h3>
              <p>Describe what you observed. This entry is not a diagnosis.</p>
              <form className="phase-two-form" onSubmit={submitObservation}>
                <label className="form-field"><span>What did you observe?</span><textarea name="symptoms" maxLength={4000} rows={3} placeholder="Describe visible signs or changes in the animal" required /></label>
                <div className="phase-two-form-row">
                  <label className="form-field"><span>Observed severity</span><select name="severityObserved" defaultValue="MILD"><option value="MILD">Mild</option><option value="MODERATE">Moderate</option><option value="SEVERE">Severe</option></select></label>
                  <label className="form-field"><span>Observed at</span><input name="observedAt" type="datetime-local" defaultValue={datetimeLocalValue(new Date())} required /></label>
                </div>
                <label className="form-field"><span>Notes (optional)</span><textarea name="notes" maxLength={2000} rows={2} placeholder="Additional context" /></label>
                <label className="form-field"><span>Follow-up date (optional)</span><input name="followUpDate" type="date" /></label>
                <button className="button button-primary" type="submit" disabled={saving || !animals.length}>{saving ? "Saving…" : "Save observation"}</button>
              </form>
            </section>
            <section className="phase-two-form-card">
              <h3>Record care or treatment</h3>
              <p>Document care already provided. This form does not recommend treatment.</p>
              <form className="phase-two-form" onSubmit={submitCareRecord}>
                <label className="form-field"><span>Record type</span><select name="category" defaultValue="VETERINARY_VISIT">
                  <option value="VETERINARY_VISIT">Veterinary visit</option><option value="VACCINATION">Vaccination</option>
                  <option value="MEDICATION">Medication record</option><option value="TREATMENT">Treatment record</option><option value="OTHER">Other care</option>
                </select></label>
                <label className="form-field"><span>Care details</span><textarea name="details" maxLength={4000} rows={3} placeholder="Record care already provided and by whom" required /></label>
                <div className="phase-two-form-row">
                  <label className="form-field"><span>Start date</span><input name="startDate" type="date" defaultValue={new Date().toISOString().slice(0, 10)} required /></label>
                  <label className="form-field"><span>End date (optional)</span><input name="endDate" type="date" /></label>
                </div>
                <label className="form-field"><span>Follow-up date (optional)</span><input name="followUpDate" type="date" /></label>
                <button className="button button-primary" type="submit" disabled={saving || !animals.length}>{saving ? "Saving…" : "Save care record"}</button>
              </form>
            </section>
          </div>
        )}

        {!animals.length ? <div className="phase-empty">Register an animal to start its health and care history.</div> : !history ? <p className="phase-muted">Loading this animal’s history…</p> : timeline.length === 0 ? (
          <div className="phase-empty">No health, care or feed records for {history.animal.name} yet.</div>
        ) : (
          <div className="phase-two-timeline">
            {timeline.map((entry) => (
              <TimelineCard
                key={`${entry.kind}-${entry.id}`}
                entry={entry}
                canRecord={canRecord}
                onComplete={completeFollowUp}
              />
            ))}
          </div>
        )}
        <p className="phase-two-safety-note">Severe or rapidly worsening signs, sudden deaths, or suspected contagious disease require prompt direct contact with a veterinarian or the relevant animal-health authority. This record system does not diagnose illness.</p>
      </section>
    </section>
  );
}

function TimelineCard({
  entry,
  canRecord,
  onComplete,
}: {
  entry: TimelineEntry;
  canRecord: boolean;
  onComplete: (path: string) => Promise<void>;
}) {
  if (entry.kind === "observation") {
    const event = entry.value;
    return (
      <article className="phase-two-timeline-entry">
        <div className="phase-two-timeline-date">{dateLabel(event.observedAt)}</div>
        <div className="phase-two-timeline-content">
          <div className="phase-two-entry-heading"><span className={`severity-pill ${event.severityObserved.toLowerCase()}`}>{severityLabels[event.severityObserved]} · farmer observation</span><span className="phase-two-author">{event.recordedBy.fullName}</span></div>
          <p className="phase-two-entry-title">{event.symptoms}</p>
          {event.notes && <p className="phase-two-entry-copy">{event.notes}</p>}
          {event.followUpDate && <FollowUpLine date={event.followUpDate} status={event.followUpStatus} onComplete={() => onComplete(`/health-events/${event.id}/follow-up`)} canComplete={canRecord} />}
          {event.assessments.map((assessment) => (
            <div className="professional-assessment-entry" key={assessment.id}>
              <div className="phase-two-entry-heading"><span className="professional-entry-pill">Professional assessment</span><span className="phase-two-author">{assessment.professional.fullName}</span></div>
              <p className="phase-two-entry-copy">{assessment.assessment}</p>
              {assessment.diagnosisIfMade && <p className="phase-two-entry-copy"><strong>Diagnosis recorded by professional:</strong> {assessment.diagnosisIfMade}</p>}
              {assessment.followUpDate && <FollowUpLine date={assessment.followUpDate} status={assessment.followUpStatus} onComplete={() => onComplete(`/professional-assessments/${assessment.id}/follow-up`)} canComplete={canRecord} />}
            </div>
          ))}
        </div>
      </article>
    );
  }
  if (entry.kind === "care") {
    const record = entry.value;
    return (
      <article className="phase-two-timeline-entry">
        <div className="phase-two-timeline-date">{dateLabel(record.startDate)}</div>
        <div className="phase-two-timeline-content">
          <div className="phase-two-entry-heading"><span className="care-record-pill">{categoryLabels[record.category] ?? "Care record"}</span><span className="phase-two-author">{record.recordedBy.fullName}</span></div>
          <p className="phase-two-entry-copy">{record.details}</p>
          {record.endDate && <p className="phase-two-entry-meta">Through {dateLabel(record.endDate)}</p>}
          {record.followUpDate && <FollowUpLine date={record.followUpDate} status={record.followUpStatus} onComplete={() => onComplete(`/care-records/${record.id}/follow-up`)} canComplete={canRecord} />}
        </div>
      </article>
    );
  }
  const record = entry.value;
  return (
    <article className="phase-two-timeline-entry">
      <div className="phase-two-timeline-date">{dateLabel(record.recordedAt)}</div>
      <div className="phase-two-timeline-content">
        <div className="phase-two-entry-heading"><span className="feed-record-pill">Feed recorded</span><span className="phase-two-author">{record.recordedBy.fullName}</span></div>
        <p className="phase-two-entry-title">{record.feedName} · {record.quantity} {record.unit === "OTHER" ? record.unitLabel : record.unit.toLowerCase()}</p>
        {record.notes && <p className="phase-two-entry-copy">{record.notes}</p>}
      </div>
    </article>
  );
}

function FollowUpLine({
  date,
  status,
  canComplete,
  onComplete,
}: {
  date: string;
  status: FollowUpStatus;
  canComplete: boolean;
  onComplete: () => Promise<void>;
}) {
  const overdue = status === "PENDING" && date.slice(0, 10) < new Date().toISOString().slice(0, 10);
  return (
    <div className="phase-two-follow-up">
      <span className={overdue ? "follow-up-overdue" : ""}>{status === "COMPLETED" ? "Follow-up completed" : `Follow-up ${overdue ? "overdue" : "scheduled"} · ${dateLabel(date)}`}</span>
      {status === "PENDING" && canComplete && <button type="button" onClick={() => void onComplete()}>Mark complete</button>}
    </div>
  );
}

function errorMessage(error: unknown, fallback: string) {
  return error instanceof Error ? error.message : fallback;
}
