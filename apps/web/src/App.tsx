import { FormEvent, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Animal, api, Farm, User } from "./api";
import { PasswordChangeScreen, PhaseThreeWorkspace } from "./PhaseThreeWorkspace";

type LoadState = "loading" | "signed-out" | "ready";

function displayPurpose(purpose: Animal["purpose"]) {
  return purpose === "DAIRY" ? "Dairy" : "Beef";
}

function displayAge(animal: Animal) {
  if (animal.birthDate) {
    return new Date(animal.birthDate).toLocaleDateString(undefined, {
      year: "numeric",
      month: "short",
      day: "numeric",
      timeZone: "UTC",
    });
  }
  if (animal.estimatedAgeMonths !== null) {
    const years = Math.floor(animal.estimatedAgeMonths / 12);
    const months = animal.estimatedAgeMonths % 12;
    if (years === 0) return `${months} months (estimated)`;
    if (months === 0) return `${years} ${years === 1 ? "year" : "years"} (estimated)`;
    return `${years}y ${months}m (estimated)`;
  }
  return "Not recorded";
}

export function App() {
  const [loadState, setLoadState] = useState<LoadState>("loading");
  const [authMode, setAuthMode] = useState<"login" | "register" | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [farms, setFarms] = useState<Farm[]>([]);
  const [farmId, setFarmId] = useState("");
  const [animals, setAnimals] = useState<Animal[]>([]);
  const [search, setSearch] = useState("");
  const [purposeFilter, setPurposeFilter] = useState("");
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  const activeFarmId = useRef(farmId);
  activeFarmId.current = farmId;
  const activeFarm = farms.find((farm) => farm.id === farmId) ?? null;

  const refreshFarms = useCallback(async (selectedFarmId?: string) => {
    const result = await api<{ data: { farms: Farm[] } }>("/farms");
    setFarms(result.data.farms);
    setFarmId((current) => {
      const preferred = selectedFarmId ?? current;
      return result.data.farms.some((farm) => farm.id === preferred)
        ? preferred
        : result.data.farms[0]?.id ?? "";
    });
  }, []);

  const loadAnimals = useCallback(async (selectedFarmId: string) => {
    const result = await api<{ data: { animals: Animal[] } }>(
      `/farms/${selectedFarmId}/animals`,
    );
    return result.data.animals;
  }, []);

  useEffect(() => {
    api<{ data: { user: User | null } }>("/auth/session")
      .then(async ({ data }) => {
        if (!data.user) {
          setLoadState("signed-out");
          return;
        }
        setUser(data.user);
        setLoadState("ready");
        if (data.user.mustChangePassword) return;
        try {
          await refreshFarms();
        } catch (requestError) {
          setError(requestError instanceof Error ? requestError.message : "Could not load your farms.");
        }
      })
      .catch(() => {
        setError("We could not connect to AgriHerd. Check your connection and try again.");
        setLoadState("signed-out");
      });
  }, [refreshFarms]);

  useEffect(() => {
    if (!farmId) {
      setAnimals([]);
      return;
    }
    let current = true;
    setAnimals([]);
    loadAnimals(farmId)
      .then((result) => {
        if (current) setAnimals(result);
      })
      .catch((requestError: unknown) => {
        if (current) setError(requestError instanceof Error ? requestError.message : "Could not load animals.");
      });
    return () => {
      current = false;
    };
  }, [farmId, loadAnimals]);

  const animalCounts = useMemo(() => ({
    total: animals.length,
    dairy: animals.filter((animal) => animal.purpose === "DAIRY").length,
    beef: animals.filter((animal) => animal.purpose === "BEEF").length,
  }), [animals]);
  const visibleAnimals = useMemo(() => {
    const normalizedSearch = search.trim().toLocaleLowerCase();
    return animals.filter((animal) => {
      const matchesSearch = !normalizedSearch
        || [animal.name, animal.internalCode, animal.earTag ?? ""]
          .some((value) => value.toLocaleLowerCase().includes(normalizedSearch));
      return matchesSearch && (!purposeFilter || animal.purpose === purposeFilter);
    });
  }, [animals, search, purposeFilter]);

  async function handleAuth(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    const form = new FormData(event.currentTarget);
    const mode = form.get("mode")?.toString() ?? "login";
    const payload = {
      email: form.get("email")?.toString().trim(),
      password: form.get("password")?.toString(),
      ...(mode === "register" ? { fullName: form.get("fullName")?.toString().trim() } : {}),
    };
    try {
      const path = mode === "register" ? "/auth/register" : "/auth/login";
      const result = await api<{ data: { user: User } }>(path, {
        method: "POST",
        body: JSON.stringify(payload),
      });
      setUser(result.data.user);
      setLoadState("ready");
      setAuthMode(null);
      if (!result.data.user.mustChangePassword) await refreshFarms();
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Sign-in failed.");
    }
  }

  async function handleSignOut() {
    try {
      await api("/auth/logout", { method: "POST", body: "{}" });
      setUser(null);
      setFarms([]);
      setFarmId("");
      setAnimals([]);
      setAuthMode(null);
      setLoadState("signed-out");
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Could not sign out.");
    }
  }

  async function handleCreateFarm(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    const formElement = event.currentTarget;
    const form = new FormData(formElement);
    try {
      const result = await api<{ data: { farm: Farm } }>("/farms", {
        method: "POST",
        body: JSON.stringify({
          name: form.get("name"),
          locationLabel: form.get("locationLabel"),
          preferredUnits: form.get("preferredUnits"),
        }),
      });
      await refreshFarms(result.data.farm.id);
      setNotice("Farm profile created.");
      formElement.reset();
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Could not create the farm.");
    }
  }

  async function handleCreateAnimal(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!farmId) return;
    setError("");
    const formElement = event.currentTarget;
    const form = new FormData(formElement);
    const ageMode = form.get("ageMode")?.toString() === "birthDate";
    const body = {
      name: form.get("name"),
      earTag: form.get("earTag"),
      breed: form.get("breed"),
      sex: form.get("sex"),
      purpose: form.get("purpose"),
      ...(ageMode
        ? { birthDate: form.get("birthDate")?.toString() }
        : { estimatedAgeMonths: Number(form.get("estimatedAgeMonths")) }),
    };
    try {
      const result = await api<{ data: { animal: Animal } }>(
        `/farms/${farmId}/animals`,
        { method: "POST", body: JSON.stringify(body) },
      );
      if (activeFarmId.current === farmId) {
        setAnimals((current) => [result.data.animal, ...current]);
      }
      await refreshFarms(farmId);
      setNotice("Animal registered successfully.");
      formElement.reset();
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Could not register the animal.");
    }
  }

  if (loadState === "loading") {
    return <main className="loading-screen"><BrandMark /><p>Preparing your farm workspace…</p></main>;
  }

  if (loadState === "signed-out") {
    return authMode
      ? <AuthScreen initialMode={authMode} onBack={() => setAuthMode(null)} onSubmit={handleAuth} error={error} />
      : <WelcomeScreen onAuth={setAuthMode} error={error} />;
  }

  if (user?.mustChangePassword) {
    return (
      <PasswordChangeScreen
        fullName={user.fullName}
        onChanged={() => setUser((current) => current ? { ...current, mustChangePassword: false } : current)}
        onSignOut={handleSignOut}
      />
    );
  }

  if (user?.role === "PROFESSIONAL" || user?.role === "ADMIN") {
    return (
      <div className="app-shell">
        <aside className="sidebar">
          <a className="brand brand-light" href="/" aria-label="AgriHerd home">
            <BrandMark />
            <span>AgriHerd<small>HERD MANAGEMENT</small></span>
          </a>
          <div className="sidebar-label">WORKSPACE</div>
          <button className="nav-item active" type="button">
            <span aria-hidden="true">▦</span> {user.role === "ADMIN" ? "Administration" : "My workspace"}
          </button>
          <div className="sidebar-note">
            <span className="note-icon" aria-hidden="true">✳</span>
            <p>Professional entries stay distinct from farmer observations.</p>
          </div>
          <div className="sidebar-user">
            <div className="avatar">{user.fullName.slice(0, 1).toUpperCase()}</div>
            <div className="user-copy"><strong>{user.fullName}</strong><span>{user.role === "ADMIN" ? "Administrator" : "Livestock professional"}</span></div>
            <button className="icon-button" type="button" onClick={handleSignOut} aria-label="Sign out" title="Sign out">↗</button>
          </div>
        </aside>
        <PhaseThreeWorkspace user={user} farms={farms} farmId={farmId} animals={animals} />
      </div>
    );
  }

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <a className="brand brand-light" href="/" aria-label="AgriHerd home">
          <BrandMark />
          <span>AgriHerd<small>HERD MANAGEMENT</small></span>
        </a>
        <div className="sidebar-label">WORKSPACE</div>
        <button className="nav-item active" type="button"><span aria-hidden="true">▦</span> Overview</button>
        <button className="nav-item" type="button" onClick={() => document.getElementById("animal-register")?.scrollIntoView({ behavior: "smooth" })}>
          <span aria-hidden="true">◉</span> Cattle register
        </button>
        <button className="nav-item" type="button" onClick={() => document.getElementById("phase-three")?.scrollIntoView({ behavior: "smooth" })}>
          <span aria-hidden="true">◇</span> Feed & support
        </button>
        <div className="sidebar-note">
          <span className="note-icon" aria-hidden="true">✳</span>
          <p>Good records help your team make better-informed decisions.</p>
        </div>
        <div className="sidebar-user">
          <div className="avatar">{user?.fullName.slice(0, 1).toUpperCase()}</div>
          <div className="user-copy"><strong>{user?.fullName}</strong><span>Farm owner</span></div>
          <button className="icon-button" type="button" onClick={handleSignOut} aria-label="Sign out" title="Sign out">↗</button>
        </div>
      </aside>

      <nav className="mobile-workspace-nav" aria-label="Workspace sections">
        <button type="button" onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}><span aria-hidden="true">⌂</span>Overview</button>
        <button type="button" onClick={() => document.getElementById("animal-register")?.scrollIntoView({ behavior: "smooth" })}><span aria-hidden="true">◉</span>Herd</button>
        <button type="button" onClick={() => document.getElementById("phase-three")?.scrollIntoView({ behavior: "smooth" })}><span aria-hidden="true">◇</span>Feed & support</button>
      </nav>

      <main className="main-content">
        <header className="topbar">
          <div>
            <div className="eyebrow">FARM MANAGEMENT / OVERVIEW</div>
            <h1>Your farm, at a glance</h1>
          </div>
          <label className="farm-switcher">
            <span className="farm-dot" aria-hidden="true" />
            <select aria-label="Active farm" value={farmId} onChange={(event) => {
              setAnimals([]);
              setFarmId(event.target.value);
            }}>
              {farms.length === 0 && <option value="">No farm selected</option>}
              {farms.map((farm) => <option key={farm.id} value={farm.id}>{farm.name}</option>)}
            </select>
            <span aria-hidden="true">⌄</span>
          </label>
        </header>

        {error && <div className="alert alert-error" role="alert">{error}<button type="button" onClick={() => setError("")} aria-label="Dismiss">×</button></div>}
        {notice && <div className="alert alert-success" role="status">{notice}<button type="button" onClick={() => setNotice("")} aria-label="Dismiss">×</button></div>}

        {farms.length === 0 ? (
          <section className="setup-card">
            <div className="section-kicker">FIRST STEP</div>
            <h2>Set up your farm profile</h2>
            <p>Add a farm to start registering cattle and keeping your records together.</p>
            <FarmForm onSubmit={handleCreateFarm} />
          </section>
        ) : (
          <>
            <section className="welcome-row">
              <div>
                <p className="welcome-date">{new Date().toLocaleDateString(undefined, { weekday: "long", day: "numeric", month: "long", year: "numeric" })}</p>
                <h2>{activeFarm?.name ?? "Your farm"} <span className="wave">✳</span></h2>
                <p className="muted">{activeFarm?.locationLabel || "Farm location not added"} · Your records are ready when you are.</p>
              </div>
              <button className="button button-outline" type="button" onClick={() => document.getElementById("new-farm")?.scrollIntoView({ behavior: "smooth" })}>
                <span aria-hidden="true">＋</span> Add another farm
              </button>
            </section>

            <section className="stats-grid" aria-label="Herd summary">
              <StatCard label="REGISTERED CATTLE" value={animalCounts.total} icon="◉" color="green" footnote="In this farm" />
              <StatCard label="DAIRY" value={animalCounts.dairy} icon="♧" color="amber" footnote="Dairy purpose" />
              <StatCard label="BEEF" value={animalCounts.beef} icon="◇" color="blue" footnote="Beef purpose" />
              <StatCard label="FARM RECORDS" value={farms.length} icon="▤" color="plum" footnote="Farm profiles" />
            </section>

            <div className="content-grid">
              <section className="panel register-panel" id="animal-register">
                <div className="panel-heading">
                  <div>
                    <div className="section-kicker">HERD RECORDS</div>
                    <h2>Register cattle</h2>
                  </div>
                  <span className="panel-icon" aria-hidden="true">＋</span>
                </div>
                <p className="panel-intro">Create a clear identity record for each animal. You can add more detail later.</p>
                {user?.role === "FARMER"
                  ? <AnimalForm onSubmit={handleCreateAnimal} />
                  : <div className="phase-empty">Only farm owners can register cattle. Ask the farm owner to update this record.</div>}
              </section>

              <section className="panel herd-panel">
                <div className="panel-heading herd-heading">
                  <div>
                    <div className="section-kicker">YOUR ANIMALS</div>
                    <h2>Cattle register <span className="count-pill">{activeFarm?._count?.animals ?? animals.length}</span></h2>
                  </div>
                </div>
                <div className="filters">
                  <label className="search-field">
                    <span aria-hidden="true">⌕</span>
                    <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search name, ID or ear tag" aria-label="Search cattle" />
                  </label>
                  <select aria-label="Filter cattle by purpose" value={purposeFilter} onChange={(event) => setPurposeFilter(event.target.value)}>
                    <option value="">All cattle</option>
                    <option value="DAIRY">Dairy</option>
                    <option value="BEEF">Beef</option>
                  </select>
                </div>
                <div className="animal-list">
                  {visibleAnimals.length === 0 ? (
                    <div className="empty-state">
                      <span className="empty-illustration" aria-hidden="true">◉</span>
                      <strong>{search || purposeFilter ? "No matching cattle" : "Your register is ready"}</strong>
                      <span>{search || purposeFilter ? "Try a different search or filter." : "Add your first animal using the form."}</span>
                    </div>
                  ) : visibleAnimals.map((animal) => (
                    <AnimalRow key={animal.id} animal={animal} />
                  ))}
                </div>
                <div className="list-footer">
                  <span>Showing {visibleAnimals.length} of {animals.length} {animals.length === 1 ? "animal" : "animals"}</span>
                  <span className="privacy-note"><span aria-hidden="true">▣</span> Private to your farm</span>
                </div>
              </section>
            </div>

            <section className="panel farm-form-panel" id="new-farm">
              <div className="panel-heading">
                <div>
                  <div className="section-kicker">FARM SETTINGS</div>
                  <h2>Add a farm profile</h2>
                </div>
              </div>
              <p className="panel-intro">Keep records for multiple farms in separate workspaces.</p>
              <FarmForm onSubmit={handleCreateFarm} compact />
            </section>
            {user && <PhaseThreeWorkspace user={user} farms={farms} farmId={farmId} animals={animals} />}
          </>
        )}
        <footer className="page-footer">
          <span>AgriHerd · Better herd management, one record at a time.</span>
          <span>Health and care decisions should be reviewed with a qualified professional.</span>
        </footer>
      </main>
    </div>
  );
}

function BrandMark() {
  return (
    <svg className="brand-symbol" viewBox="0 0 48 48" aria-hidden="true">
      <path d="M8 26c0-8.8 7.2-16 16-16s16 7.2 16 16v6c0 1.1-.9 2-2 2H10c-1.1 0-2-.9-2-2v-6Z" fill="currentColor" />
      <path d="M14 26c0-5.5 4.5-10 10-10s10 4.5 10 10M13 38h22M17 38v4M31 38v4" stroke="var(--brand-mark-stroke)" strokeWidth="3" fill="none" strokeLinecap="round" />
    </svg>
  );
}

function WelcomeScreen({ onAuth, error }: { onAuth: (mode: "login" | "register") => void; error: string }) {
  return (
    <main className="welcome-page">
      {error && <div className="welcome-error" role="alert">{error}</div>}
      <section className="welcome-hero">
        <img className="welcome-hero-image" src="/images/hero-ankole.jpg" alt="Cattle grazing in green pasture" fetchPriority="high" />
        <div className="welcome-hero-shade" />
        <header className="welcome-nav">
          <a className="brand brand-light" href="/" aria-label="AgriHerd home">
            <BrandMark />
            <span>AgriHerd<small>HERD MANAGEMENT</small></span>
          </a>
          <div className="welcome-actions">
            <button className="button button-hero-quiet" type="button" onClick={() => onAuth("login")}>Sign in</button>
            <button className="button button-hero-primary" type="button" onClick={() => onAuth("register")}>Create an account <span aria-hidden="true">→</span></button>
          </div>
        </header>
        <div className="welcome-hero-copy">
          <span className="welcome-eyebrow">CLEAR RECORDS. BETTER FARMING.</span>
          <h1>Know your herd.<br /><em>Care with confidence.</em></h1>
          <p>Keep farm and cattle records together, record feed use, and connect with listed livestock professionals when you need support.</p>
          <div className="welcome-actions welcome-actions-main">
            <button className="button button-hero-primary" type="button" onClick={() => onAuth("register")}>Get started <span aria-hidden="true">→</span></button>
            <button className="button button-hero-quiet" type="button" onClick={() => onAuth("login")}>Sign in to your farm</button>
          </div>
          <div className="welcome-trust"><span aria-hidden="true">✓</span> Farm-scoped records <span aria-hidden="true">✓</span> Farmer-controlled support requests</div>
        </div>
        <span className="welcome-photo-credit">Designed for the everyday work of caring for livestock.</span>
      </section>
      <section className="welcome-features" aria-labelledby="welcome-features-title">
        <div className="welcome-section-heading">
          <span className="section-kicker">A PRACTICAL FARM WORKSPACE</span>
          <h2 id="welcome-features-title">The essentials, in one place</h2>
          <p>Useful records for the work you do every day, with privacy and professional oversight built in.</p>
        </div>
        <div className="welcome-feature-grid">
          <article className="welcome-feature-card">
            <span className="welcome-feature-icon" aria-hidden="true">01</span>
            <h3>Keep a clear herd register</h3>
            <p>Register beef and dairy cattle, then find animals by name, internal ID, or ear tag.</p>
          </article>
          <article className="welcome-feature-card">
            <span className="welcome-feature-icon" aria-hidden="true">02</span>
            <h3>Record feed and read guidance</h3>
            <p>Log feed use by animal or farm, and read nutrition resources that have been reviewed before publication.</p>
          </article>
          <article className="welcome-feature-card">
            <span className="welcome-feature-icon" aria-hidden="true">03</span>
            <h3>Follow up with professionals</h3>
            <p>Choose a listed professional, consent to share request details, and follow the recorded next steps.</p>
          </article>
        </div>
        <p className="welcome-disclaimer">AgriHerd helps organise records and connect farmers with professionals. It does not diagnose illness, prescribe treatment, or replace veterinary care.</p>
      </section>
    </main>
  );
}

function AuthScreen({
  initialMode,
  onBack,
  onSubmit,
  error,
}: {
  initialMode: "login" | "register";
  onBack: () => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  error: string;
}) {
  const [mode, setMode] = useState<"login" | "register">(initialMode);
  return (
    <main className="auth-layout">
      <section className="auth-story">
        <button className="brand brand-light brand-home-button" type="button" onClick={onBack}>
          <BrandMark />
          <span>AgriHerd<small>HERD MANAGEMENT</small></span>
        </button>
        <div className="story-copy">
          <span className="story-label">GOOD RECORDS. BETTER DECISIONS.</span>
          <h1>Know your herd.<br /><em>Care with confidence.</em></h1>
          <p>Keep farm and cattle records clear, useful, and ready when you need them.</p>
        </div>
        <div className="story-art" aria-hidden="true">
          <span className="sun" /><span className="hill hill-back" /><span className="hill hill-front" />
          <span className="art-cow">◉<span>⌁</span></span>
          <span className="art-stem stem-one">✳</span><span className="art-stem stem-two">✳</span>
        </div>
        <span className="story-caption">Designed for the everyday work of caring for livestock.</span>
      </section>
      <section className="auth-main">
        <button className="auth-back" type="button" onClick={onBack}><span aria-hidden="true">←</span> Back to AgriHerd</button>
        <div className="auth-card">
          <div className="section-kicker">{mode === "login" ? "WELCOME BACK" : "GET STARTED"}</div>
          <h2>{mode === "login" ? "Sign in to your farm" : "Create your farmer account"}</h2>
          <p className="auth-description">
            {mode === "login" ? "Pick up where you left off with your herd records." : "Start with your details. You can add your farm right after."}
          </p>
          {error && <div className="alert alert-error" role="alert">{error}</div>}
          <form className="form-stack" onSubmit={onSubmit}>
            <input type="hidden" name="mode" value={mode} />
            {mode === "register" && <FormField label="Full name" name="fullName" placeholder="Your name" autoComplete="name" required />}
            <FormField label="Email address" name="email" type="email" placeholder="you@example.com" autoComplete="email" required />
            <FormField label="Password" name="password" type="password" placeholder={mode === "register" ? "At least 12 characters" : "Enter your password"} autoComplete={mode === "register" ? "new-password" : "current-password"} minLength={mode === "register" ? 12 : 1} required />
            <button className="button button-primary button-full" type="submit">{mode === "login" ? "Sign in" : "Create account"} <span aria-hidden="true">→</span></button>
          </form>
          <p className="auth-toggle">
            {mode === "login" ? "New to AgriHerd?" : "Already have an account?"}
            <button type="button" onClick={() => setMode(mode === "login" ? "register" : "login")}>
              {mode === "login" ? "Create account" : "Sign in"}
            </button>
          </p>
          <p className="auth-security"><span aria-hidden="true">▣</span> Your farm information is private to your account.</p>
        </div>
        <span className="auth-footer">AgriHerd · Better herd management.</span>
      </section>
    </main>
  );
}

function FormField({
  label,
  name,
  type = "text",
  placeholder,
  required = false,
  autoComplete,
  minLength,
}: {
  label: string;
  name: string;
  type?: string;
  placeholder?: string;
  required?: boolean;
  autoComplete?: string;
  minLength?: number;
}) {
  return (
    <label className="form-field">
      <span>{label}</span>
      <input name={name} type={type} placeholder={placeholder} required={required} autoComplete={autoComplete} minLength={minLength} />
    </label>
  );
}

function FarmForm({ onSubmit, compact = false }: { onSubmit: (event: FormEvent<HTMLFormElement>) => void; compact?: boolean }) {
  return (
    <form className={`farm-form${compact ? " farm-form-compact" : ""}`} onSubmit={onSubmit}>
      <FormField label="Farm name" name="name" placeholder="e.g. Green Valley Farm" required autoComplete="organization" />
      <FormField label="Location (optional)" name="locationLabel" placeholder="Town, county or area" />
      <label className="form-field">
        <span>Preferred units</span>
        <select name="preferredUnits" defaultValue="METRIC">
          <option value="METRIC">Metric (kg, litres)</option>
          <option value="IMPERIAL">Imperial (lb, gallons)</option>
        </select>
      </label>
      <button className="button button-primary" type="submit">Save farm profile <span aria-hidden="true">→</span></button>
    </form>
  );
}

function AnimalForm({ onSubmit }: { onSubmit: (event: FormEvent<HTMLFormElement>) => void }) {
  const [ageMode, setAgeMode] = useState<"estimated" | "birthDate">("estimated");
  return (
    <form className="form-stack animal-form" onSubmit={onSubmit}>
      <div className="form-two">
        <FormField label="Animal name" name="name" placeholder="e.g. Daisy" required />
        <FormField label="Ear tag (optional)" name="earTag" placeholder="e.g. KE-104" />
      </div>
      <div className="form-two">
        <FormField label="Breed" name="breed" placeholder="e.g. Friesian" required />
        <label className="form-field">
          <span>Sex</span>
          <select name="sex" defaultValue="FEMALE">
            <option value="FEMALE">Female</option>
            <option value="MALE">Male</option>
            <option value="UNKNOWN">Unknown</option>
          </select>
        </label>
      </div>
      <label className="form-field">
        <span>Herd purpose</span>
        <select name="purpose" defaultValue="DAIRY">
          <option value="DAIRY">Dairy</option>
          <option value="BEEF">Beef</option>
        </select>
      </label>
      <fieldset className="age-choice">
        <legend>Age information</legend>
        <div className="choice-tabs">
          <label><input type="radio" name="ageMode" value="estimated" checked={ageMode === "estimated"} onChange={() => setAgeMode("estimated")} /> Estimated age</label>
          <label><input type="radio" name="ageMode" value="birthDate" checked={ageMode === "birthDate"} onChange={() => setAgeMode("birthDate")} /> Birth date</label>
        </div>
        {ageMode === "estimated"
          ? <label className="form-field"><span>Estimated age (months)</span><input name="estimatedAgeMonths" type="number" min="0" max="600" step="1" placeholder="e.g. 30" required /></label>
          : <label className="form-field"><span>Birth date</span><input name="birthDate" type="date" required /></label>}
      </fieldset>
      <div className="form-helper"><span aria-hidden="true">ⓘ</span> An internal animal ID will be assigned automatically.</div>
      <button className="button button-primary button-full" type="submit">Register animal <span aria-hidden="true">→</span></button>
    </form>
  );
}

function StatCard({ label, value, icon, color, footnote }: { label: string; value: number; icon: string; color: string; footnote: string }) {
  return (
    <article className="stat-card">
      <div className={`stat-icon ${color}`} aria-hidden="true">{icon}</div>
      <div className="stat-label">{label}</div>
      <div className="stat-value">{value.toLocaleString()}</div>
      <div className="stat-footnote"><span className="tiny-dot" /> {footnote}</div>
    </article>
  );
}

function AnimalRow({ animal }: { animal: Animal }) {
  const initials = animal.name.trim().slice(0, 1).toUpperCase() || "A";
  return (
    <article className="animal-row">
      <div className={`animal-avatar ${animal.purpose.toLowerCase()}`}>{initials}</div>
      <div className="animal-main">
        <strong>{animal.name}</strong>
        <span>{animal.internalCode}{animal.earTag ? ` · Tag ${animal.earTag}` : ""}</span>
      </div>
      <div className="animal-detail"><span className="detail-label">BREED</span><span>{animal.breed}</span></div>
      <div className="animal-detail"><span className="detail-label">AGE / DOB</span><span>{displayAge(animal)}</span></div>
      <span className={`purpose-badge ${animal.purpose.toLowerCase()}`}>{displayPurpose(animal.purpose)}</span>
    </article>
  );
}
