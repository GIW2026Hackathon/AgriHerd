import { FormEvent, useEffect, useState, type ReactNode } from "react";
import { api, Animal, Farm, User } from "./api";

type FeedRecord = {
  id: string;
  feedName: string;
  quantity: number | string;
  unit: string;
  unitLabel: string | null;
  recordedAt: string;
  notes: string | null;
  animal: { id: string; name: string; internalCode: string } | null;
  recordedBy: { fullName: string };
};

type Professional = {
  id: string;
  fullName: string;
  qualifications: string;
  serviceArea: string;
  publicEmail: string | null;
  publicPhone: string | null;
};

type NutritionResource = {
  id: string;
  title: string;
  content: string;
  scope: "ALL_CATTLE" | "DAIRY" | "BEEF";
  source: string | null;
  sourceUrl: string | null;
  reviewDate: string | null;
  status: "DRAFT" | "PUBLISHED" | "ARCHIVED";
  reviewedBy?: { id: string; fullName: string } | null;
  createdBy?: { id: string; fullName: string; role: string };
};

type ExtensionInteraction = {
  id: string;
  interactionDate: string;
  advice: string;
  followUpDate: string | null;
  outcome: string | null;
  professional: { id: string; fullName: string };
};

type ExtensionRequest = {
  id: string;
  reference: string;
  category: "HEALTH" | "NUTRITION" | "HERD_MANAGEMENT";
  description: string;
  urgency: "ROUTINE" | "SOON" | "URGENT";
  contactMethod: "PHONE" | "EMAIL" | "IN_PERSON";
  preferredContactValue: string | null;
  status: "OPEN" | "ACKNOWLEDGED" | "IN_PROGRESS" | "RESOLVED" | "CLOSED";
  createdAt: string;
  farm: { id: string; name: string; locationLabel: string | null };
  animal: { id: string; name: string; internalCode: string; purpose: string } | null;
  submittedBy: { fullName: string };
  assignedProfessional: {
    id: string;
    fullName: string;
    profile: Pick<Professional, "qualifications" | "serviceArea" | "publicEmail" | "publicPhone"> | null;
  };
  interactions: ExtensionInteraction[];
};

type ProfessionalProfile = {
  qualifications: string;
  serviceArea: string;
  publicEmail: string | null;
  publicPhone: string | null;
  isListed: boolean;
  verifiedAt: string;
};

type AdminProfessional = Professional & {
  email: string;
  accountStatus: "ACTIVE" | "SUSPENDED";
  isListed: boolean;
  verifiedAt: string;
};

function errorMessage(error: unknown, fallback: string) {
  return error instanceof Error ? error.message : fallback;
}

function dateLabel(value: string | null) {
  if (!value) return "Not recorded";
  return new Date(value).toLocaleDateString(undefined, {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  });
}

export function PhaseThreeWorkspace({
  user,
  farms,
  farmId,
  animals,
}: {
  user: User;
  farms: Farm[];
  farmId: string;
  animals: Animal[];
}) {
  if (user.role === "PROFESSIONAL") {
    return <ProfessionalWorkspace />;
  }
  if (user.role === "ADMIN") {
    return <AdminWorkspace />;
  }
  return (
    <FarmPhaseThreeWorkspace
      key={farmId}
      canRequestSupport={user.role === "FARMER"}
      farm={farms.find((farm) => farm.id === farmId) ?? null}
      farmId={farmId}
      animals={animals}
      accountEmail={user.email}
    />
  );
}

export function PasswordChangeScreen({
  fullName,
  onChanged,
  onSignOut,
}: {
  fullName: string;
  onChanged: () => void;
  onSignOut: () => Promise<void>;
}) {
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  async function changePassword(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const newPassword = form.get("newPassword")?.toString() ?? "";
    if (newPassword !== form.get("confirmPassword")?.toString()) {
      setError("The new passwords do not match.");
      return;
    }
    setError("");
    try {
      await api("/auth/change-password", {
        method: "POST",
        body: JSON.stringify({
          currentPassword: form.get("currentPassword"),
          newPassword,
        }),
      });
      setNotice("Password updated. Your other sign-in sessions have been revoked.");
      onChanged();
    } catch (changeError) {
      setError(errorMessage(changeError, "Could not update your password."));
    }
  }

  return (
    <main className="auth-layout">
      <section className="auth-story">
        <a className="brand brand-light" href="/">
          <span className="brand-mark">A</span><span>AgriHerd<small>HERD MANAGEMENT</small></span>
        </a>
        <div className="story-copy">
          <span className="story-label">SECURE YOUR ACCOUNT</span>
          <h1>One quick step<br /><em>before you begin.</em></h1>
          <p>Set a private password for your AgriHerd account before opening your professional workspace.</p>
        </div>
        <div className="story-art" aria-hidden="true"><span className="sun" /><span className="hill hill-back" /><span className="hill hill-front" /></div>
      </section>
      <section className="auth-main">
        <div className="auth-card">
          <div className="section-kicker">PASSWORD UPDATE REQUIRED</div>
          <h2>Welcome, {fullName.split(" ")[0]}</h2>
          <p className="auth-description">Choose a unique password. Updating it signs out any other active sessions for your account.</p>
          {error && <div className="alert alert-error" role="alert">{error}</div>}
          {notice && <div className="alert alert-success" role="status">{notice}</div>}
          <form className="form-stack" onSubmit={changePassword}>
            <PhaseField label="Initial password" name="currentPassword" type="password" autoComplete="current-password" required />
            <PhaseField label="New password (at least 12 characters)" name="newPassword" type="password" autoComplete="new-password" minLength={12} required />
            <PhaseField label="Confirm new password" name="confirmPassword" type="password" autoComplete="new-password" minLength={12} required />
            <button className="button button-primary button-full" type="submit">Update password <span aria-hidden="true">→</span></button>
          </form>
          <p className="auth-toggle"><button type="button" onClick={() => void onSignOut()}>Sign out</button></p>
        </div>
        <span className="auth-footer">AgriHerd · Secure access for your farm team.</span>
      </section>
    </main>
  );
}

function FarmPhaseThreeWorkspace({
  farm,
  farmId,
  animals,
  canRequestSupport,
  accountEmail,
}: {
  farm: Farm | null;
  farmId: string;
  animals: Animal[];
  canRequestSupport: boolean;
  accountEmail: string;
}) {
  const [feedRecords, setFeedRecords] = useState<FeedRecord[]>([]);
  const [resources, setResources] = useState<NutritionResource[]>([]);
  const [professionals, setProfessionals] = useState<Professional[]>([]);
  const [requests, setRequests] = useState<ExtensionRequest[]>([]);
  const [busy, setBusy] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [selectedProfessionalId, setSelectedProfessionalId] = useState("");
  const [contactMethod, setContactMethod] = useState<"PHONE" | "EMAIL" | "IN_PERSON">("PHONE");
  const [feedUnit, setFeedUnit] = useState("KG");

  useEffect(() => {
    if (!farmId) return;
    let current = true;
    setBusy(true);
    setFeedRecords([]);
    setRequests([]);
    setSelectedProfessionalId("");
    setContactMethod("PHONE");
    Promise.all([
      api<{ data: { records: FeedRecord[] } }>(`/farms/${farmId}/feed-records`),
      api<{ data: { resources: NutritionResource[] } }>("/nutrition-guidance"),
      api<{ data: { professionals: Professional[] } }>("/professionals"),
      api<{ data: { requests: ExtensionRequest[] } }>("/extension-requests"),
    ])
      .then(([feedResult, resourceResult, professionalResult, requestResult]) => {
        if (!current) return;
        setFeedRecords(feedResult.data.records);
        setResources(resourceResult.data.resources);
        setProfessionals(professionalResult.data.professionals);
        setRequests(requestResult.data.requests.filter((item) => item.farm.id === farmId));
      })
      .catch((loadError: unknown) => {
        if (current) setError(errorMessage(loadError, "Could not load nutrition and extension records."));
      })
      .finally(() => {
        if (current) setBusy(false);
      });
    return () => {
      current = false;
    };
  }, [farmId]);

  async function refreshRequests() {
    const result = await api<{ data: { requests: ExtensionRequest[] } }>("/extension-requests");
    setRequests(result.data.requests.filter((item) => item.farm.id === farmId));
  }

  async function handleFeedRecord(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formElement = event.currentTarget;
    const form = new FormData(formElement);
    setError("");
    try {
      const result = await api<{ data: { record: FeedRecord } }>(`/farms/${farmId}/feed-records`, {
        method: "POST",
        body: JSON.stringify({
          feedName: form.get("feedName"),
          quantity: Number(form.get("quantity")),
          unit: feedUnit,
          unitLabel: feedUnit === "OTHER" ? form.get("unitLabel") : null,
          animalId: form.get("animalId") || null,
          recordedAt: form.get("recordedAt")
            ? new Date(`${form.get("recordedAt")?.toString()}T12:00:00`).toISOString()
            : undefined,
          notes: form.get("notes"),
        }),
      });
      setFeedRecords((current) => [result.data.record, ...current]);
      setNotice("Feed record saved.");
      formElement.reset();
      setFeedUnit("KG");
    } catch (submitError) {
      setError(errorMessage(submitError, "Could not save the feed record."));
    }
  }

  async function handleRequest(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formElement = event.currentTarget;
    const form = new FormData(formElement);
    setError("");
    try {
      const result = await api<{ data: { request: ExtensionRequest } }>(
        `/farms/${farmId}/extension-requests`,
        {
          method: "POST",
          body: JSON.stringify({
            category: form.get("category"),
            description: form.get("description"),
            urgency: form.get("urgency"),
            contactMethod: form.get("contactMethod"),
            contactPhone: form.get("contactPhone") || undefined,
            shareConsent: form.get("shareConsent") === "on",
            animalId: form.get("animalId") || null,
            assignedProfessionalId: form.get("professionalId"),
          }),
        },
      );
      setRequests((current) => [result.data.request, ...current]);
      setNotice(`Support request ${result.data.request.reference} submitted.`);
      formElement.reset();
      setSelectedProfessionalId("");
      setContactMethod("PHONE");
    } catch (submitError) {
      setError(errorMessage(submitError, "Could not submit your support request."));
    }
  }

  return (
    <section className="phase-three" id="phase-three">
      <div className="phase-heading">
        <div>
          <div className="section-kicker">NUTRITION & PROFESSIONAL SUPPORT</div>
          <h2>Everyday feed records and trusted advice</h2>
          <p>Record what you feed, read reviewed resources, and follow support requests in one place.</p>
        </div>
        <span className="phase-badge">PHASE 3</span>
      </div>
      {error && <div className="alert alert-error" role="alert">{error}<button type="button" onClick={() => setError("")} aria-label="Dismiss">×</button></div>}
      {notice && <div className="alert alert-success" role="status">{notice}<button type="button" onClick={() => setNotice("")} aria-label="Dismiss">×</button></div>}

      <div className="phase-grid">
        <section className="panel phase-panel">
          <PhasePanelHeading kicker="FEED LOG" title="Record feed usage" />
          <p className="panel-intro">Log the feed, quantity and unit. A record can be linked to an animal or kept at farm level.</p>
          <form className="form-stack phase-form" onSubmit={handleFeedRecord}>
            <PhaseField label="Feed type" name="feedName" placeholder="e.g. Napier grass" required />
            <div className="phase-two-fields">
              <PhaseField label="Quantity" name="quantity" type="number" min="0.001" step="0.001" placeholder="e.g. 12" required />
              <label className="form-field"><span>Unit</span><select name="unit" value={feedUnit} onChange={(event) => setFeedUnit(event.target.value)}>
                <option value="KG">Kilograms</option><option value="G">Grams</option>
                <option value="L">Litres</option><option value="ML">Millilitres</option>
                <option value="BALE">Bales</option><option value="BAG">Bags</option><option value="OTHER">Other</option>
              </select></label>
            </div>
            {feedUnit === "OTHER" && <PhaseField label="Unit name" name="unitLabel" placeholder="e.g. scoops" required />}
            <label className="form-field"><span>Animal (optional)</span><select name="animalId" defaultValue="">
              <option value="">Farm-level record</option>
              {animals.map((animal) => <option key={animal.id} value={animal.id}>{animal.name} · {animal.internalCode}</option>)}
            </select></label>
            <PhaseField label="Date" name="recordedAt" type="date" />
            <PhaseField label="Notes (optional)" name="notes" placeholder="Add useful context" />
            <button className="button button-primary button-full" type="submit">Save feed record <span aria-hidden="true">→</span></button>
          </form>
        </section>

        <section className="panel phase-panel">
          <PhasePanelHeading kicker="REVIEWED RESOURCES" title="Nutrition information" />
          <p className="panel-intro">General reference material only. These resources are not personalised feed rations.</p>
          {busy ? <p className="phase-muted">Loading reviewed resources…</p> : resources.length === 0 ? (
            <div className="phase-empty">No guidance has been reviewed and published yet. Check back after a qualified professional has reviewed the content.</div>
          ) : <div className="resource-list">
            {resources.map((resource) => <article className="resource-card" key={resource.id}>
              <div className="resource-meta"><span>{resource.scope === "ALL_CATTLE" ? "ALL CATTLE" : resource.scope}</span><span>Reviewed {dateLabel(resource.reviewDate)}</span></div>
              <h3>{resource.title}</h3>
              <p>{resource.content}</p>
              <div className="resource-source">
                <span>Source: {resource.source} · Reviewed by {resource.reviewedBy?.fullName ?? "qualified professional"}</span>
                {resource.sourceUrl && <a href={resource.sourceUrl} target="_blank" rel="noreferrer">View source ↗</a>}
              </div>
            </article>)}
          </div>}
          <div className="safety-note"><strong>Important</strong><span>For an individual ration or animal-health concern, contact a qualified adviser. AgriHerd does not diagnose or prescribe.</span></div>
        </section>

        <section className="panel phase-panel">
          <PhasePanelHeading kicker="REQUEST SUPPORT" title="Ask an extension professional" />
          {canRequestSupport ? <>
            <p className="panel-intro">Select an available professional. The request, your chosen contact method, and the selected animal profile are shared only with that professional.</p>
            {professionals.length === 0
              ? <div className="phase-empty">There are no verified professionals listed yet, so online requests are not available. Please contact your local extension service or veterinarian directly.</div>
              : <div className="professional-directory">
                {professionals.map((professional) => <article className="directory-card" key={professional.id}>
                  <div className="directory-card-title"><strong>{professional.fullName}</strong><span>{professional.serviceArea}</span></div>
                  <div className="directory-qualification">{professional.qualifications}</div>
                  {(professional.publicEmail || professional.publicPhone) && <div className="directory-contact">
                    {professional.publicEmail && <a href={`mailto:${professional.publicEmail}`}>{professional.publicEmail}</a>}
                    {professional.publicPhone && <a href={`tel:${professional.publicPhone}`}>{professional.publicPhone}</a>}
                  </div>}
                </article>)}
              </div>}
            {professionals.length > 0 && <form className="form-stack phase-form" onSubmit={handleRequest}>
            <div className="phase-two-fields">
              <label className="form-field"><span>Support type</span><select name="category" defaultValue="HEALTH">
                <option value="HEALTH">Animal health concern</option><option value="NUTRITION">Nutrition guidance</option><option value="HERD_MANAGEMENT">Herd management</option>
              </select></label>
              <label className="form-field"><span>Urgency</span><select name="urgency" defaultValue="ROUTINE">
                <option value="ROUTINE">Routine</option><option value="SOON">Soon</option><option value="URGENT">Urgent</option>
              </select></label>
            </div>
            <label className="form-field"><span>Related animal (optional)</span><select name="animalId" defaultValue="">
              <option value="">No specific animal</option>
              {animals.map((animal) => <option key={animal.id} value={animal.id}>{animal.name} · {animal.internalCode}</option>)}
            </select></label>
            <label className="form-field"><span>Professional</span><select name="professionalId" required value={selectedProfessionalId} onChange={(event) => {
              setSelectedProfessionalId(event.target.value);
            }}>
              <option value="" disabled>Select a professional</option>
              {professionals.map((professional) => <option key={professional.id} value={professional.id}>{professional.fullName} · {professional.serviceArea}</option>)}
            </select></label>
            <label className="form-field"><span>Preferred contact</span><select name="contactMethod" value={contactMethod} onChange={(event) => {
              const value = event.target.value;
              if (value === "PHONE" || value === "EMAIL" || value === "IN_PERSON") setContactMethod(value);
            }}>
              <option value="PHONE">Phone</option><option value="EMAIL">Email</option><option value="IN_PERSON">In person</option>
            </select></label>
            {contactMethod === "PHONE"
              ? <PhaseField label="Phone number to share with this professional" name="contactPhone" type="tel" placeholder="+254 700 000 000" required />
              : contactMethod === "EMAIL"
                ? <div className="contact-consent">We will share your account email, <strong>{accountEmail}</strong>, with the assigned professional.</div>
                : <div className="contact-consent">The professional will see that you prefer an in-person follow-up. No phone number or email is shared.</div>}
            <label className="form-field"><span>What support do you need?</span><textarea name="description" minLength={3} maxLength={4000} rows={4} placeholder="Describe what you observed or the guidance you are seeking." required /></label>
            <label className="request-consent"><input type="checkbox" name="shareConsent" required /><span>I agree to share this request, the contact detail I selected, and the linked animal's basic profile with the professional I chose.</span></label>
            <button className="button button-primary button-full" type="submit">Submit support request <span aria-hidden="true">→</span></button>
            </form>}
            <div className="safety-note emergency-note"><strong>Urgent animal-health concerns</strong><span>This request does not replace immediate care. Contact a veterinarian or relevant animal-health authority directly for emergencies.</span></div>
          </> : <div className="phase-empty">Farm workers can record feed usage. A farm owner can submit extension-support requests.</div>}
        </section>

        <section className="panel phase-panel">
          <PhasePanelHeading kicker="RECENT ACTIVITY" title="Feed and support history" />
          <div className="phase-subheading">Feed records</div>
          {busy ? <p className="phase-muted">Loading feed records…</p> : feedRecords.length === 0 ? (
            <div className="phase-empty">Feed usage you record will appear here.</div>
          ) : <div className="compact-record-list">
            {feedRecords.slice(0, 12).map((record) => <article className="compact-record" key={record.id}>
              <span className="record-mark">F</span><span className="record-copy"><strong>{record.feedName}</strong><small>{record.animal?.name ?? farm?.name ?? "Farm"} · {dateLabel(record.recordedAt)}</small></span>
              <span className="record-quantity">{record.quantity} {record.unit === "OTHER" ? record.unitLabel : record.unit.toLowerCase()}</span>
            </article>)}
          </div>}
          <div className="phase-subheading request-subheading">Extension requests</div>
          {requests.length === 0 ? <div className="phase-empty">Requests and recorded next steps will appear here.</div> : (
            <div className="support-request-list">
              {requests.map((item) => <RequestCard key={item.id} item={item} />)}
            </div>
          )}
        </section>
      </div>
    </section>
  );
}

function ProfessionalWorkspace() {
  const [profile, setProfile] = useState<ProfessionalProfile | null>(null);
  const [requests, setRequests] = useState<ExtensionRequest[]>([]);
  const [resources, setResources] = useState<NutritionResource[]>([]);
  const [busy, setBusy] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  useEffect(() => {
    let current = true;
    Promise.all([
      api<{ data: { profile: ProfessionalProfile } }>("/professionals/me"),
      api<{ data: { requests: ExtensionRequest[] } }>("/extension-requests"),
      api<{ data: { resources: NutritionResource[] } }>("/nutrition-guidance/manage"),
    ])
      .then(([profileResult, requestResult, resourceResult]) => {
        if (!current) return;
        setProfile(profileResult.data.profile);
        setRequests(requestResult.data.requests);
        setResources(resourceResult.data.resources);
      })
      .catch((loadError: unknown) => {
        if (current) setError(errorMessage(loadError, "Could not load your professional workspace."));
      })
      .finally(() => {
        if (current) setBusy(false);
      });
    return () => {
      current = false;
    };
  }, []);

  async function refreshRequests() {
    const result = await api<{ data: { requests: ExtensionRequest[] } }>("/extension-requests");
    setRequests(result.data.requests);
  }

  async function saveProfile(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setError("");
    try {
      const result = await api<{ data: { profile: ProfessionalProfile } }>("/professionals/me", {
        method: "PATCH",
        body: JSON.stringify({
          serviceArea: form.get("serviceArea"),
          publicEmail: form.get("publicEmail") || null,
          publicPhone: form.get("publicPhone") || null,
          isListed: form.get("isListed") === "on",
        }),
      });
      setProfile(result.data.profile);
      setNotice("Professional directory preferences saved.");
    } catch (saveError) {
      setError(errorMessage(saveError, "Could not save your directory preferences."));
    }
  }

  async function saveDraft(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formElement = event.currentTarget;
    const form = new FormData(formElement);
    try {
      const result = await api<{ data: { resource: NutritionResource } }>("/nutrition-guidance", {
        method: "POST",
        body: JSON.stringify({
          title: form.get("title"),
          content: form.get("content"),
          scope: form.get("scope"),
          source: form.get("source") || null,
          sourceUrl: form.get("sourceUrl") || null,
        }),
      });
      setResources((current) => [result.data.resource, ...current]);
      setNotice("Guidance saved as a draft. An administrator must verify the review and publish it.");
      formElement.reset();
    } catch (saveError) {
      setError(errorMessage(saveError, "Could not save the draft."));
    }
  }

  return (
    <WorkspacePage
      kicker="PROFESSIONAL WORKSPACE"
      title="Extension requests and reviewed guidance"
      description="Respond to assigned farm requests and prepare sourced information for review."
      error={error}
      notice={notice}
      onDismissError={() => setError("")}
      onDismissNotice={() => setNotice("")}
    >
      {profile && <section className="panel professional-profile-panel">
        <PhasePanelHeading kicker="DIRECTORY PROFILE" title="Your verified profile" />
        <p className="panel-intro">Your qualifications were verified when the account was provisioned. Listing is optional and requires a public contact method.</p>
        <form className="profile-form" onSubmit={saveProfile}>
          <PhaseField label="Service area" name="serviceArea" defaultValue={profile.serviceArea} required />
          <PhaseField label="Public email" name="publicEmail" type="email" defaultValue={profile.publicEmail ?? ""} />
          <PhaseField label="Public phone" name="publicPhone" defaultValue={profile.publicPhone ?? ""} />
          <label className="directory-opt-in"><input type="checkbox" name="isListed" defaultChecked={profile.isListed} /><span>List my profile in the farmer directory</span></label>
          <button className="button button-primary" type="submit">Save directory settings</button>
        </form>
      </section>}

      <div className="phase-grid pro-grid">
        <section className="panel phase-panel pro-requests-panel">
          <PhasePanelHeading kicker="ASSIGNED TO YOU" title="Support requests" />
          <p className="panel-intro">Only requests explicitly assigned to your verified account appear here. Record a clear next step for the farmer.</p>
          {busy ? <p className="phase-muted">Loading assigned requests…</p> : requests.length === 0 ? (
            <div className="phase-empty">There are no assigned requests yet.</div>
          ) : requests.map((item) => <ProfessionalRequestCard
            key={item.id}
            item={item}
            onSaved={async () => {
              await refreshRequests();
              setNotice(`Request ${item.reference} updated.`);
            }}
            onError={setError}
          />)}
        </section>

        <section className="panel phase-panel">
          <PhasePanelHeading kicker="KNOWLEDGE RESOURCES" title="Prepare reviewed guidance" />
          <p className="panel-intro">Save general information as a draft. It remains hidden from farmers until an administrator records a qualified reviewer, source and review date.</p>
          <form className="form-stack phase-form" onSubmit={saveDraft}>
            <PhaseField label="Resource title" name="title" required />
            <label className="form-field"><span>Applies to</span><select name="scope" defaultValue="ALL_CATTLE">
              <option value="ALL_CATTLE">All cattle</option><option value="DAIRY">Dairy</option><option value="BEEF">Beef</option>
            </select></label>
            <label className="form-field"><span>General information</span><textarea name="content" rows={6} maxLength={8000} placeholder="Provide evidence-informed information. Do not write a personalised ration or treatment prescription." required /></label>
            <PhaseField label="Source (optional in draft)" name="source" />
            <PhaseField label="Source URL (optional)" name="sourceUrl" type="url" />
            <button className="button button-primary button-full" type="submit">Save review draft</button>
          </form>
          <div className="phase-subheading">Your resource drafts</div>
          {resources.slice(0, 8).map((resource) => (
            <div className="resource-admin-row" key={resource.id}><span><strong>{resource.title}</strong><small>{resource.scope} · {resource.status}</small></span><span className={`status-pill ${resource.status.toLowerCase()}`}>{resource.status}</span></div>
          ))}
        </section>
      </div>
    </WorkspacePage>
  );
}

function AdminWorkspace() {
  const [professionals, setProfessionals] = useState<AdminProfessional[]>([]);
  const [resources, setResources] = useState<NutritionResource[]>([]);
  const [busy, setBusy] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  useEffect(() => {
    let current = true;
    Promise.all([
      api<{ data: { professionals: AdminProfessional[] } }>("/admin/professionals"),
      api<{ data: { resources: NutritionResource[] } }>("/nutrition-guidance/manage"),
    ])
      .then(([professionalResult, resourceResult]) => {
        if (!current) return;
        setProfessionals(professionalResult.data.professionals);
        setResources(resourceResult.data.resources);
      })
      .catch((loadError: unknown) => {
        if (current) setError(errorMessage(loadError, "Could not load administration data."));
      })
      .finally(() => {
        if (current) setBusy(false);
      });
    return () => {
      current = false;
    };
  }, []);

  async function provisionProfessional(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formElement = event.currentTarget;
    const form = new FormData(formElement);
    setError("");
    try {
      const result = await api<{ data: { professional: { id: string; fullName: string; email: string } } }>(
        "/admin/professionals",
        {
          method: "POST",
          body: JSON.stringify({
            fullName: form.get("fullName"),
            email: form.get("email"),
            password: form.get("password"),
            qualifications: form.get("qualifications"),
            serviceArea: form.get("serviceArea"),
            publicEmail: form.get("publicEmail") || null,
            publicPhone: form.get("publicPhone") || null,
          }),
        },
      );
      setProfessionals((current) => [{
        id: result.data.professional.id,
        fullName: result.data.professional.fullName,
        email: result.data.professional.email,
        qualifications: form.get("qualifications")?.toString() ?? "",
        serviceArea: form.get("serviceArea")?.toString() ?? "",
        publicEmail: form.get("publicEmail")?.toString() || null,
        publicPhone: form.get("publicPhone")?.toString() || null,
        accountStatus: "ACTIVE",
        isListed: false,
        verifiedAt: new Date().toISOString(),
      }, ...current]);
      setNotice("Professional account created. Share the initial sign-in credentials securely.");
      formElement.reset();
    } catch (provisionError) {
      setError(errorMessage(provisionError, "Could not provision the professional account."));
    }
  }

  async function createAdminDraft(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formElement = event.currentTarget;
    const form = new FormData(formElement);
    setError("");
    try {
      const result = await api<{ data: { resource: NutritionResource } }>("/nutrition-guidance", {
        method: "POST",
        body: JSON.stringify({
          title: form.get("title"),
          content: form.get("content"),
          scope: form.get("scope"),
          source: form.get("source") || null,
          sourceUrl: form.get("sourceUrl") || null,
        }),
      });
      setResources((current) => [result.data.resource, ...current]);
      setNotice("Nutrition resource saved as a draft.");
      formElement.reset();
    } catch (draftError) {
      setError(errorMessage(draftError, "Could not save the nutrition draft."));
    }
  }

  async function publishResource(resource: NutritionResource, formElement: HTMLFormElement) {
    const form = new FormData(formElement);
    setError("");
    try {
      const result = await api<{ data: { resource: NutritionResource } }>(
        `/nutrition-guidance/${resource.id}`,
        {
          method: "PATCH",
          body: JSON.stringify({
            source: form.get("source"),
            reviewedById: form.get("reviewedById"),
            reviewDate: form.get("reviewDate"),
            status: "PUBLISHED",
          }),
        },
      );
      setResources((current) => current.map((item) => item.id === resource.id ? result.data.resource : item));
      setNotice("Guidance published with its recorded professional review.");
    } catch (publishError) {
      setError(errorMessage(publishError, "Could not publish reviewed guidance."));
    }
  }

  async function archiveResource(resource: NutritionResource) {
    setError("");
    try {
      const result = await api<{ data: { resource: NutritionResource } }>(
        `/nutrition-guidance/${resource.id}`,
        { method: "PATCH", body: JSON.stringify({ status: "ARCHIVED" }) },
      );
      setResources((current) => current.map((item) => item.id === resource.id ? result.data.resource : item));
      setNotice("Guidance archived.");
    } catch (archiveError) {
      setError(errorMessage(archiveError, "Could not archive the resource."));
    }
  }

  const verifiedProfessionals = professionals.filter((professional) => professional.accountStatus !== "SUSPENDED");

  return (
    <WorkspacePage
      kicker="ADMINISTRATION"
      title="Professional access and reviewed guidance"
      description="Verify qualified professionals before provisioning accounts. Publish nutrition information only after its source and professional review are recorded."
      error={error}
      notice={notice}
      onDismissError={() => setError("")}
      onDismissNotice={() => setNotice("")}
    >
      <div className="phase-grid admin-grid">
        <section className="panel phase-panel">
          <PhasePanelHeading kicker="PROFESSIONAL DIRECTORY" title="Provision a professional" />
          <p className="panel-intro">Verify qualifications and authority outside the system before creating an account. New profiles start unlisted until the professional opts in.</p>
          <form className="form-stack phase-form" onSubmit={provisionProfessional}>
            <PhaseField label="Full name" name="fullName" required />
            <PhaseField label="Sign-in email" name="email" type="email" required />
            <PhaseField label="Initial password (12+ characters)" name="password" type="password" minLength={12} required />
            <PhaseField label="Verified qualifications" name="qualifications" required />
            <PhaseField label="Service area" name="serviceArea" required />
            <PhaseField label="Public email (optional)" name="publicEmail" type="email" />
            <PhaseField label="Public phone (optional)" name="publicPhone" />
            <button className="button button-primary button-full" type="submit">Create verified account</button>
          </form>
          <div className="phase-subheading">Provisioned professionals</div>
          {busy ? <p className="phase-muted">Loading professionals…</p> : professionals.length === 0 ? (
            <div className="phase-empty">No professional accounts have been provisioned.</div>
          ) : professionals.map((professional) => (
            <div className="resource-admin-row" key={professional.id}>
              <span><strong>{professional.fullName}</strong><small>{professional.qualifications} · {professional.serviceArea}</small></span>
              <span className={`status-pill ${professional.isListed ? "published" : "draft"}`}>{professional.isListed ? "Listed" : "Unlisted"}</span>
            </div>
          ))}
        </section>

        <section className="panel phase-panel">
          <PhasePanelHeading kicker="NUTRITION RESOURCES" title="Review and publish guidance" />
          <p className="panel-intro">Only published resources are visible to farmers. Publishing records a source, date, and professional with a provisioned account.</p>
          <form className="form-stack phase-form" onSubmit={createAdminDraft}>
            <PhaseField label="Resource title" name="title" required />
            <label className="form-field"><span>Applies to</span><select name="scope" defaultValue="ALL_CATTLE">
              <option value="ALL_CATTLE">All cattle</option><option value="DAIRY">Dairy</option><option value="BEEF">Beef</option>
            </select></label>
            <label className="form-field"><span>General information</span><textarea name="content" rows={5} maxLength={8000} placeholder="General reviewed information only; do not provide an automated ration." required /></label>
            <PhaseField label="Source (required before publishing)" name="source" />
            <PhaseField label="Source URL (optional)" name="sourceUrl" type="url" />
            <button className="button button-outline button-full" type="submit">Save as draft</button>
          </form>
          <div className="phase-subheading">Resource review queue</div>
          {busy ? <p className="phase-muted">Loading resources…</p> : resources.length === 0 ? (
            <div className="phase-empty">No nutrition resources yet.</div>
          ) : resources.map((resource) => <AdminResourceReview
            key={resource.id}
            resource={resource}
            professionals={verifiedProfessionals}
            onPublish={publishResource}
            onArchive={archiveResource}
          />)}
        </section>
      </div>
    </WorkspacePage>
  );
}

function AdminResourceReview({
  resource,
  professionals,
  onPublish,
  onArchive,
}: {
  resource: NutritionResource;
  professionals: AdminProfessional[];
  onPublish: (resource: NutritionResource, form: HTMLFormElement) => Promise<void>;
  onArchive: (resource: NutritionResource) => Promise<void>;
}) {
  const canPublish = resource.status !== "ARCHIVED";
  return (
    <form className="review-resource-row" onSubmit={(event) => {
      event.preventDefault();
      void onPublish(resource, event.currentTarget);
    }}>
      <div className="review-resource-title"><strong>{resource.title}</strong><span className={`status-pill ${resource.status.toLowerCase()}`}>{resource.status}</span></div>
      {resource.status === "PUBLISHED" && resource.reviewedBy && (
        <p className="reviewed-summary">Reviewed by {resource.reviewedBy.fullName} · {dateLabel(resource.reviewDate)}</p>
      )}
      {canPublish && <div className="review-fields">
        <PhaseField label="Named source" name="source" defaultValue={resource.source ?? ""} required />
        <label className="form-field"><span>Professional reviewer</span><select name="reviewedById" defaultValue={resource.reviewedBy?.id ?? ""} required>
          <option value="" disabled>Select a verified professional</option>
          {professionals.map((professional) => <option key={professional.id} value={professional.id}>{professional.fullName} · {professional.qualifications}</option>)}
        </select></label>
        <PhaseField label="Review date" name="reviewDate" type="date" defaultValue={resource.reviewDate?.slice(0, 10) ?? new Date().toISOString().slice(0, 10)} required />
        <button className="button button-primary button-full" type="submit">Record review and publish</button>
      </div>}
      {resource.status !== "ARCHIVED" && <button className="text-button" type="button" onClick={() => void onArchive(resource)}>Archive resource</button>}
    </form>
  );
}

function ProfessionalRequestCard({
  item,
  onSaved,
  onError,
}: {
  item: ExtensionRequest;
  onSaved: () => Promise<void>;
  onError: (message: string) => void;
}) {
  async function recordInteraction(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formElement = event.currentTarget;
    const form = new FormData(formElement);
    try {
      await api(`/extension-requests/${item.id}/interactions`, {
        method: "POST",
        body: JSON.stringify({
          advice: form.get("advice"),
          outcome: form.get("outcome") || null,
          followUpDate: form.get("followUpDate") || null,
          status: form.get("status") || undefined,
        }),
      });
      await onSaved();
      formElement.reset();
    } catch (saveError) {
      onError(errorMessage(saveError, "Could not record the professional interaction."));
    }
  }

  return (
    <article className="professional-request-card">
      <RequestCard item={item} />
      {item.status !== "CLOSED" && <form className="interaction-form" onSubmit={recordInteraction}>
        <label className="form-field"><span>Professional notes / advice</span><textarea name="advice" rows={3} maxLength={4000} required placeholder="Record advice, contact or visit details, and the agreed next step." /></label>
        <div className="phase-two-fields">
          <label className="form-field"><span>Follow-up date (optional)</span><input name="followUpDate" type="date" /></label>
          <label className="form-field"><span>Update status</span><select name="status" defaultValue="">
            <option value="">Acknowledge / keep current</option>
            <option value="IN_PROGRESS">In progress</option>
            {item.status === "ACKNOWLEDGED" || item.status === "IN_PROGRESS" || item.status === "RESOLVED"
              ? <option value="RESOLVED">Resolved</option>
              : null}
            <option value="CLOSED">Close request</option>
          </select></label>
        </div>
        <label className="form-field"><span>Outcome (required to resolve or close)</span><textarea name="outcome" rows={2} maxLength={2000} placeholder="Record the outcome or next step." /></label>
        <button className="button button-primary" type="submit">Save interaction</button>
      </form>}
      {item.status !== "CLOSED" && item.category === "HEALTH" && item.animal && (
        <ProfessionalAssessmentForm
          animalId={item.animal.id}
          onError={onError}
        />
      )}
    </article>
  );
}

function ProfessionalAssessmentForm({
  animalId,
  onError,
}: {
  animalId: string;
  onError: (message: string) => void;
}) {
  const [events, setEvents] = useState<Array<{ id: string; symptoms: string; observedAt: string; assessments: Array<{ id: string; assessment: string }> }>>([]);
  const [busy, setBusy] = useState(true);
  const [notice, setNotice] = useState("");

  async function refreshEvents() {
    const result = await api<{ data: { healthEvents: typeof events } }>(`/animals/${animalId}/history`);
    setEvents(result.data.healthEvents);
  }

  useEffect(() => {
    let current = true;
    api<{ data: { healthEvents: typeof events } }>(`/animals/${animalId}/history`)
      .then(({ data }) => {
        if (current) setEvents(data.healthEvents);
      })
      .catch((loadError: unknown) => {
        if (current) onError(errorMessage(loadError, "Could not load the consented animal history."));
      })
      .finally(() => {
        if (current) setBusy(false);
      });
    return () => {
      current = false;
    };
  }, [animalId, onError]);

  async function recordAssessment(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formElement = event.currentTarget;
    const form = new FormData(formElement);
    const healthEventId = String(form.get("healthEventId"));
    if (!healthEventId) return;
    try {
      await api(`/health-events/${healthEventId}/assessments`, {
        method: "POST",
        body: JSON.stringify({
          assessment: form.get("assessment"),
          diagnosisIfMade: form.get("diagnosisIfMade") || null,
          followUpDate: form.get("followUpDate") || null,
        }),
      });
      formElement.reset();
      setNotice("Professional assessment recorded separately from the farmer observation.");
      await refreshEvents();
    } catch (saveError) {
      onError(errorMessage(saveError, "Could not record the professional assessment."));
    }
  }

  return (
    <section className="professional-health-assessment">
      <div className="phase-two-professional-heading"><strong>Health assessments</strong><span>Separate professional record</span></div>
      {busy ? <p className="phase-muted">Loading consented observations…</p> : events.length === 0 ? (
        <div className="phase-empty">No health observations are linked to this animal yet. Any assessment you record here will be attached to an existing farmer observation.</div>
      ) : <>
        {notice && <p className="phase-two-inline-notice" role="status">{notice}</p>}
        <form className="interaction-form" onSubmit={recordAssessment}>
          <label className="form-field"><span>Farmer observation</span><select name="healthEventId" required defaultValue="">
            <option value="" disabled>Select an observation</option>
            {events.map((healthEvent) => <option key={healthEvent.id} value={healthEvent.id}>{new Date(healthEvent.observedAt).toLocaleDateString()} · {healthEvent.symptoms.slice(0, 100)}</option>)}
          </select></label>
          <label className="form-field"><span>Professional assessment</span><textarea name="assessment" rows={3} maxLength={4000} required placeholder="Record your assessment without changing the farmer’s original observation." /></label>
          <label className="form-field"><span>Diagnosis, if made by you (optional)</span><input name="diagnosisIfMade" maxLength={500} /></label>
          <label className="form-field"><span>Follow-up date (optional)</span><input name="followUpDate" type="date" /></label>
          <button className="button button-primary" type="submit">Save professional assessment</button>
        </form>
      </>}
    </section>
  );
}

function RequestCard({ item }: { item: ExtensionRequest }) {
  return (
    <article className="support-request-card">
      <div className="request-card-heading">
        <div><strong>{item.reference}</strong><span className={`status-pill ${item.status.toLowerCase()}`}>{item.status.replace("_", " ")}</span></div>
        <span className={`urgency-label ${item.urgency.toLowerCase()}`}>{item.urgency}</span>
      </div>
      <div className="request-card-meta">{item.category.replace("_", " ")} · {item.farm.name} · {dateLabel(item.createdAt)}</div>
      <p>{item.description}</p>
      {item.animal && <div className="request-animal">Related animal: {item.animal.name} · {item.animal.internalCode} ({item.animal.purpose})</div>}
      {item.assignedProfessional && <div className="request-professional">Assigned to {item.assignedProfessional.fullName}</div>}
      {item.preferredContactValue && <div className="request-contact">Preferred contact: {item.contactMethod.toLowerCase().replace("_", " ")} · {item.contactMethod === "EMAIL"
        ? <a href={`mailto:${item.preferredContactValue}`}>{item.preferredContactValue}</a>
        : item.contactMethod === "PHONE"
          ? <a href={`tel:${item.preferredContactValue}`}>{item.preferredContactValue}</a>
          : item.preferredContactValue}</div>}
      {item.interactions.length > 0 && <div className="interaction-list">
        {item.interactions.map((interaction) => <div className="interaction-entry" key={interaction.id}>
          <strong>{interaction.professional.fullName} · {dateLabel(interaction.interactionDate)}</strong>
          <span>{interaction.advice}</span>
          {interaction.outcome && <small>Outcome: {interaction.outcome}</small>}
          {interaction.followUpDate && <small>Follow-up: {dateLabel(interaction.followUpDate)}</small>}
        </div>)}
      </div>}
    </article>
  );
}

function WorkspacePage({
  kicker,
  title,
  description,
  error,
  notice,
  onDismissError,
  onDismissNotice,
  children,
}: {
  kicker: string;
  title: string;
  description: string;
  error: string;
  notice: string;
  onDismissError: () => void;
  onDismissNotice: () => void;
  children: ReactNode;
}) {
  return (
    <main className="phase-workspace">
      <header className="phase-workspace-header"><div className="section-kicker">{kicker}</div><h1>{title}</h1><p>{description}</p></header>
      {error && <div className="alert alert-error" role="alert">{error}<button type="button" onClick={onDismissError} aria-label="Dismiss">×</button></div>}
      {notice && <div className="alert alert-success" role="status">{notice}<button type="button" onClick={onDismissNotice} aria-label="Dismiss">×</button></div>}
      {children}
      <footer className="phase-workspace-footer">AgriHerd records support professional care; they do not replace veterinary or qualified nutrition advice.</footer>
    </main>
  );
}

function PhasePanelHeading({ kicker, title }: { kicker: string; title: string }) {
  return <div className="panel-heading"><div><div className="section-kicker">{kicker}</div><h2>{title}</h2></div></div>;
}

function PhaseField({
  label,
  name,
  type = "text",
  placeholder,
  autoComplete,
  required = false,
  defaultValue,
  minLength,
  min,
  step,
}: {
  label: string;
  name: string;
  type?: string;
  placeholder?: string;
  autoComplete?: string;
  required?: boolean;
  defaultValue?: string;
  minLength?: number;
  min?: string;
  step?: string;
}) {
  return <label className="form-field"><span>{label}</span><input
    name={name}
    type={type}
    placeholder={placeholder}
    autoComplete={autoComplete}
    required={required}
    defaultValue={defaultValue}
    minLength={minLength}
    min={min}
    step={step}
  /></label>;
}
