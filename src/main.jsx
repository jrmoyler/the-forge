import React, { useEffect, useState, useRef, Suspense, lazy } from "react";
import { createRoot } from "react-dom/client";
import {
  Flame,
  Compass,
  BookOpen,
  Layers,
  FlaskConical,
  Users,
  Trophy,
  ArrowUpRight,
  ArrowRight,
  ChevronRight,
  Check,
  Clock,
  Lock,
  Search,
  X,
  LogIn,
  LogOut,
  Download,
  Send,
  ShieldCheck,
  Target,
  FileText,
  Code2,
  CheckCircle2,
  HelpCircle,
  Menu,
  Plus,
  Copy,
  AlertCircle,
  MessageSquare,
  GraduationCap,
  Settings2,
  RefreshCw,
} from "lucide-react";
import { supabase, rpc } from "./backend";
import { demo, districts } from "./demo";
import {
  rubric,
  scorePrompt,
  rank,
  earned,
  isSafeUrl,
  parseRoute,
  missionState,
  nextMission,
} from "./logic";
import "./style.css";
const World = lazy(() => import("./World"));
const nav = [
  ["campus", "The campus", Compass],
  ["missions", "Learning paths", Layers],
  ["library", "Field guide", BookOpen],
  ["sandbox", "Practice lab", FlaskConical],
  ["team", "Your circle", Users],
  ["rewards", "Achievements", Trophy],
];
const safeLoad = (k) => {
  try {
    return JSON.parse(localStorage.getItem(k) || "{}");
  } catch {
    return {};
  }
};
function App() {
  const [view, setView] = useState(() => parseRoute(location.hash).view),
    [district, setDistrict] = useState(null),
    [menu, setMenu] = useState(false),
    [member, setMember] = useState(null),
    [data, setData] = useState(demo),
    [progress, setProgress] = useState(safeLoad("forge-guest")),
    [submissions, setSubmissions] = useState([]),
    [attempts, setAttempts] = useState([]),
    [assignments, setAssignments] = useState([]),
    [members, setMembers] = useState([]),
    [auth, setAuth] = useState(false),
    [notice, setNotice] = useState(""),
    [loading, setLoading] = useState(false),
    [activeMission, setActiveMission] = useState(null),
    [reader, setReader] = useState(null);
  const [dirty, setDirty] = useState(false),
    [pendingNavigation, setPendingNavigation] = useState(null);
  const routeRef = useRef(location.hash),
    dirtyRef = useRef(false);
  dirtyRef.current = dirty;
  const [joinToken] = useState(
    () => new URLSearchParams(location.hash.slice(1)).get("invite") || "",
  );
  const mentor = member && ["owner", "mentor"].includes(member.role),
    mine = submissions.filter((s) => s.user_id === member?.id),
    xp = earned(mine, data.missions),
    passed = new Set(
      mine.filter((s) => s.status === "passed").map((s) => s.mission_id),
    );
  const toast = (msg) => setNotice(msg);
  const act = async (fn) => {
    try {
      return await fn();
    } catch (e) {
      toast(e.message || "Something went wrong. Please try again.");
      return null;
    }
  };
  useEffect(() => {
    if (notice) {
      const t = setTimeout(() => setNotice(""), 6500);
      return () => clearTimeout(t);
    }
  }, [notice]);
  async function refresh() {
    const tables = ["submissions", "attempts", "assignments", "members"];
    const results = await Promise.all(
      tables.map((t) => supabase.from(t).select("*")),
    );
    for (const r of results) if (r.error) throw r.error;
    setSubmissions(results[0].data || []);
    setAttempts(results[1].data || []);
    setAssignments(results[2].data || []);
    setMembers(results[3].data || []);
  }
  async function hydrate(user) {
    setLoading(true);
    try {
      const { data: m, error } = await supabase
        .from("members")
        .select("*")
        .eq("id", user.id)
        .single();
      if (error)
        throw new Error(
          "This account has no Forge membership. Use your invitation to join.",
        );
      setMember(m);
      const [c, p] = await Promise.all([
        supabase.from("curriculum").select("content").eq("id", 1).single(),
        supabase
          .from("progress")
          .select("data")
          .eq("user_id", user.id)
          .maybeSingle(),
      ]);
      if (c.error) throw c.error;
      if (p.error) throw p.error;
      setData(c.data.content);
      setProgress(p.data?.data || {});
      await refresh();
      setAuth(false);
      if (location.hash.includes("invite="))
        history.replaceState(null, "", location.pathname);
    } catch (e) {
      toast(e.message);
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => {
    let live = true;
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (live && session) hydrate(session.user);
    });
    const { data: listener } = supabase.auth.onAuthStateChange(
      (event, session) => {
        if (event === "SIGNED_IN" && session)
          setTimeout(() => hydrate(session.user), 0);
        if (event === "SIGNED_OUT") {
          setMember(null);
          setData(demo);
          setProgress(safeLoad("forge-guest"));
          setSubmissions([]);
          setAttempts([]);
          setAssignments([]);
          setMembers([]);
        }
      },
    );
    if (joinToken) setAuth(true);
    return () => {
      live = false;
      listener.subscription.unsubscribe();
    };
  }, []);
  async function save(next) {
    if (member) {
      const { error } = await supabase.from("progress").upsert({
        user_id: member.id,
        data: next,
        updated_at: new Date().toISOString(),
      });
      if (error) throw error;
    } else {
      try {
        localStorage.setItem("forge-guest", JSON.stringify(next));
      } catch {
        throw new Error(
          "Browser storage is unavailable. Export your work before leaving.",
        );
      }
    }
    setProgress(next);
  }
  function navigate(v, m = null) {
    const perform = () => {
      setDirty(false);
      setView(v);
      setActiveMission(m);
      setMenu(false);
      const hash = v === "mission" ? "#/mission/" + m.id : "#/" + v;
      history.pushState(null, "", hash);
      routeRef.current = hash;
      window.scrollTo({ top: 0, behavior: "instant" });
    };
    if (dirtyRef.current) {
      setPendingNavigation(() => perform);
      return;
    }
    perform();
  }
  const signOut = () => {
    const perform = () =>
      act(async () => {
        const { error } = await supabase.auth.signOut();
        if (error) throw error;
        setDirty(false);
      });
    if (dirtyRef.current) setPendingNavigation(() => perform);
    else perform();
  };
  const openMission = (m) => {
    if (m) navigate("mission", m);
  };
  const go = (v) => navigate(v);
  useEffect(() => {
    const apply = () => {
      const route = parseRoute(location.hash);
      setView(route.view);
      setActiveMission(
        data.missions.find((m) => m.id === route.missionId) || null,
      );
      setMenu(false);
      routeRef.current = location.hash;
      window.scrollTo({ top: 0, behavior: "instant" });
    };
    const changed = () => {
      if (dirtyRef.current) {
        const hash = location.hash;
        history.replaceState(null, "", routeRef.current);
        setPendingNavigation(() => () => {
          setDirty(false);
          history.pushState(null, "", hash);
          apply();
        });
      } else apply();
    };
    const initial = parseRoute(location.hash);
    if (initial.view === "mission")
      setActiveMission(
        data.missions.find((m) => m.id === initial.missionId) || null,
      );
    window.addEventListener("popstate", changed);
    return () => window.removeEventListener("popstate", changed);
  }, [data]);
  useEffect(() => {
    const unload = (e) => {
      if (dirtyRef.current) {
        e.preventDefault();
        e.returnValue = "";
      }
    };
    window.addEventListener("beforeunload", unload);
    return () => window.removeEventListener("beforeunload", unload);
  }, []);
  const next = nextMission(
    data.missions,
    mine,
    progress,
    assignments.filter((a) => a.user_id === member?.id),
  );
  function exportRecord() {
    const blob = new Blob(
      [
        JSON.stringify(
          {
            exportedAt: new Date().toISOString(),
            member: member ? { name: member.name, role: member.role } : null,
            practice: progress,
            submissions: mine,
            attempts: attempts.filter((a) => a.user_id === member?.id),
            assignments: assignments.filter((a) => a.user_id === member?.id),
          },
          null,
          2,
        ),
      ],
      { type: "application/json" },
    );
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "forge-training-record.json";
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  }
  return (
    <div className="app">
      <a
        className="skip-link"
        href="#main-content"
        onClick={(e) => {
          e.preventDefault();
          document.getElementById("main-content")?.focus();
        }}
      >
        Skip to workspace
      </a>
      <aside className={menu ? "sidebar open" : "sidebar"}>
        <a
          className="brand"
          href="#"
          onClick={(e) => {
            e.preventDefault();
            go("campus");
          }}
        >
          <span className="brand-mark">
            <Flame size={25} />
          </span>
          <span>
            THE FORGE<small>COLLECTIVE AI</small>
          </span>
        </a>
        <div className="nav-label">YOUR WORKSPACE</div>
        <nav>
          {nav.map(([id, label, Icon]) => (
            <button
              className={
                view === id || (id === "missions" && view === "mission")
                  ? "active"
                  : ""
              }
              key={id}
              onClick={() => go(id)}
            >
              <Icon size={19} />
              {label}
              {id === "missions" && <span className="count">12</span>}
            </button>
          ))}
        </nav>
        <div className="sidebar-note">
          <span className="tiny">THE FORGE STANDARD</span>
          <p>
            The artifact
            <br />
            is the evidence.
          </p>
          <span>
            Learn it. Build it. Prove it.
            <br />
            Then teach it forward.
          </span>
          <div className="rule" />
          <small>John-Ross Moyler / Hataalii</small>
        </div>
        <button
          className="profile"
          onClick={() => (member ? signOut() : setAuth(true))}
        >
          <div className="avatar">
            {member ? member.name.slice(0, 2).toUpperCase() : "FG"}
          </div>
          <div>
            <strong>{member?.name || "Explore the Forge"}</strong>
            <span>
              {member ? member.role + " · " + rank(xp) : "Visitor preview"}
            </span>
          </div>
          {member ? <LogOut size={17} /> : <LogIn size={17} />}
        </button>
      </aside>
      {menu && (
        <button
          aria-label="Close navigation"
          className="nav-scrim"
          onClick={() => setMenu(false)}
        />
      )}
      <div className="main-shell">
        <header className="topbar">
          <div>
            <button
              className="mobile-menu icon-btn"
              onClick={() => setMenu(!menu)}
              aria-label="Open navigation"
            >
              <Menu size={22} />
            </button>
            <span className="top-context">
              Personal practice <ChevronRight size={14} /> Trusted team
            </span>
          </div>
          <div className="top-actions">
            <span className="workspace-status">
              <span /> {member ? "Private workspace" : "Visitor preview"}
            </span>
            <button
              className="icon-btn"
              title="Export my training record"
              onClick={exportRecord}
            >
              <Download size={18} />
            </button>
            <button
              className="small-btn"
              onClick={() => (member ? go("team") : setAuth(true))}
            >
              {member ? "Your circle" : "Member sign in"}
              <ArrowUpRight size={15} />
            </button>
          </div>
        </header>
        {loading ? (
          <div className="loading-page">
            <Flame className="pulse" size={36} />
            <h2>Opening your workspace…</h2>
          </div>
        ) : (
          <main id="main-content" tabIndex={-1}>
            {view === "campus" && (
              <>
                <div className="page-heading">
                  <div>
                    <div className="eyebrow">YOUR NEXT CHAPTER STARTS HERE</div>
                    <h1>
                      {member
                        ? "Welcome back, " + member.name.split(" ")[0] + "."
                        : "Enter the Forge."}
                    </h1>
                    <p>
                      Turn knowledge into craft. Turn craft into something that
                      works.
                    </p>
                  </div>
                  <button
                    className="btn primary"
                    onClick={() => openMission(next)}
                  >
                    {member ? "Resume your mission" : "Begin your journey"}{" "}
                    <ArrowRight size={17} />
                  </button>
                </div>
                <div className="journey-strip">
                  <div>
                    <span className="journey-index">{next?.id}</span>
                    <span>
                      <small>YOUR NEXT MISSION</small>
                      <strong>{next?.title}</strong>
                    </span>
                  </div>
                  <span className="journey-route">{next?.role}</span>
                  <button
                    className="text-btn"
                    onClick={() => openMission(next)}
                  >
                    Open workbench <ArrowRight size={17} />
                  </button>
                </div>
                <div className="campus-layout">
                  <section className="campus-main">
                    <Suspense
                      fallback={
                        <div className="world-placeholder">
                          Opening the 3D campus…
                        </div>
                      }
                    >
                      <World
                        selected={district}
                        onSelect={setDistrict}
                        missionCount={12}
                        onEnter={() => {
                          document
                            .getElementById("district-paths")
                            ?.scrollIntoView({
                              behavior: matchMedia(
                                "(prefers-reduced-motion: reduce)",
                              ).matches
                                ? "instant"
                                : "smooth",
                              block: "start",
                            });
                        }}
                      />
                    </Suspense>
                    <div className="district-strip">
                      {districts.map((d, i) => (
                        <button
                          key={i}
                          className={district === i ? "selected" : ""}
                          onClick={() => setDistrict(district === i ? null : i)}
                        >
                          <span style={{ color: d.color }}>0{i + 1}</span>
                          {d.short}
                        </button>
                      ))}
                    </div>
                    <div className="section-heading" id="district-paths">
                      <div>
                        <span className="eyebrow">
                          {district === null
                            ? "CHOOSE YOUR NEXT MOVE"
                            : "DISTRICT 0" + (district + 1)}
                        </span>
                        <h2>
                          {district === null
                            ? "A path for the work you do."
                            : districts[district].name}
                        </h2>
                      </div>
                      <button
                        className="text-btn"
                        onClick={() => go("missions")}
                      >
                        All paths <ArrowUpRight size={16} />
                      </button>
                    </div>
                    <div className="mission-grid compact">
                      {data.missions
                        .filter(
                          (m) =>
                            district === null ||
                            districts[district].ids.includes(m.id),
                        )
                        .slice(0, 3)
                        .map((m) => (
                          <MissionCard
                            key={m.id}
                            m={m}
                            onClick={() => openMission(m)}
                            passed={passed.has(m.id)}
                            state={missionState(m.id, mine, progress)}
                          />
                        ))}
                    </div>
                    {district !== null &&
                      !data.missions.some((m) =>
                        districts[district].ids.includes(m.id),
                      ) && (
                        <div className="empty">
                          <Lock size={22} />
                          <p>
                            This district’s missions are available to members.
                          </p>
                          <button className="btn" onClick={() => setAuth(true)}>
                            Enter with an invitation
                          </button>
                        </div>
                      )}
                  </section>
                  <aside className="right-rail">
                    <section className="rank-panel">
                      <div className="eyebrow">YOUR FORGE PASSPORT</div>
                      <div className="medallion">
                        <Flame size={43} strokeWidth={1.1} />
                      </div>
                      <span className="tiny">CURRENT RANK</span>
                      <h2>{rank(xp)}</h2>
                      <p>
                        {xp
                          ? "Your work is becoming your reputation."
                          : "Every master starts at the bench."}
                      </p>
                      <div className="xp-row">
                        <strong>{xp.toLocaleString()} XP</strong>
                        <span>
                          {xp >= 2500
                            ? "Architect rank"
                            : (xp < 400 ? 400 : xp < 1200 ? 1200 : 2500) +
                              " next rank"}
                        </span>
                      </div>
                      <div className="progressbar">
                        <i
                          style={{
                            width:
                              Math.min(
                                100,
                                (xp /
                                  (xp < 400 ? 400 : xp < 1200 ? 1200 : 2500)) *
                                  100,
                              ) + "%",
                          }}
                        />
                      </div>
                      <div className="passport-stats">
                        <div>
                          <strong>{passed.size}</strong>
                          <span>Missions mastered</span>
                        </div>
                        <div>
                          <strong>
                            {
                              attempts.filter((a) => a.user_id === member?.id)
                                .length
                            }
                          </strong>
                          <span>Knowledge checks</span>
                        </div>
                      </div>
                    </section>
                    <section className="rail-panel">
                      <span className="eyebrow">THE WORKING LOOP</span>
                      <h3>Small steps. Real proof.</h3>
                      {["Brief", "Route", "Build", "Verify", "Hand off"].map(
                        (t, i) => (
                          <div className="loop-step" key={t}>
                            <span>0{i + 1}</span>
                            <strong>{t}</strong>
                            {i === 0 && <span className="tag">Start here</span>}
                          </div>
                        ),
                      )}
                      <button
                        className="text-btn"
                        onClick={() => {
                          go("library");
                          if (member)
                            setReader(data.pages.find((p) => p.page === 4));
                        }}
                      >
                        Read the operating method <ArrowUpRight size={15} />
                      </button>
                    </section>
                    <div className="quote-note">
                      <ShieldCheck size={20} />
                      <span>
                        Mastery is awarded for reviewed work.
                        <br />
                        No points for just showing up.
                      </span>
                    </div>
                  </aside>
                </div>
              </>
            )}
            {view === "missions" && (
              <Paths
                data={data}
                submissions={mine}
                progress={progress}
                passed={passed}
                open={openMission}
                assignments={assignments.filter(
                  (a) => a.user_id === member?.id,
                )}
              />
            )}
            {view === "mission" && activeMission && (
              <Mission
                onDirty={setDirty}
                key={activeMission.id}
                m={activeMission}
                member={member}
                progress={progress}
                save={save}
                act={act}
                toast={toast}
                submissions={mine.filter(
                  (s) => s.mission_id === activeMission.id,
                )}
                attempts={attempts.filter(
                  (a) =>
                    a.user_id === member?.id &&
                    a.mission_id === activeMission.id,
                )}
                refresh={refresh}
                auth={() => setAuth(true)}
                back={() => go("missions")}
                openPage={() => {
                  setReader(
                    data.pages.find((p) => p.page === activeMission.page),
                  );
                  go("library");
                }}
              />
            )}
            {view === "mission" && !activeMission && (
              <Empty
                title="Your mission is inside the Forge"
                text="Sign in to open this private learning path."
              >
                <button className="btn primary" onClick={() => setAuth(true)}>
                  Member sign in
                </button>
              </Empty>
            )}
            {view === "library" && (
              <Library
                data={data}
                member={member}
                auth={() => setAuth(true)}
                reader={reader}
                setReader={setReader}
              />
            )}
            {view === "sandbox" && (
              <Sandbox
                progress={progress}
                save={save}
                act={act}
                toast={toast}
              />
            )}
            {view === "team" && (
              <Team
                member={member}
                members={members}
                submissions={submissions}
                assignments={assignments}
                missions={data.missions}
                attempts={attempts}
                mentor={mentor}
                act={act}
                toast={toast}
                refresh={refresh}
                auth={() => setAuth(true)}
              />
            )}
            {view === "rewards" && (
              <Rewards
                xp={xp}
                passed={passed}
                missions={data.missions}
                mine={mine}
                open={openMission}
                exportRecord={exportRecord}
              />
            )}
            <footer>
              <span>
                THE FORGE <b>/</b> Collective AI Inc.
              </span>
              <span>Tools. Judgment. Execution.</span>
              <button onClick={exportRecord}>
                Export your record <Download size={13} />
              </button>
            </footer>
          </main>
        )}
      </div>
      {pendingNavigation && (
        <LeaveDialog
          onKeep={() => setPendingNavigation(null)}
          onLeave={() => {
            pendingNavigation();
            setPendingNavigation(null);
          }}
        />
      )}
      {auth && (
        <Auth close={() => setAuth(false)} token={joinToken} toast={toast} />
      )}{" "}
      {notice && (
        <div className="toast" role="status">
          <AlertCircle size={18} />
          <span>{notice}</span>
          <button
            aria-label="Dismiss notification"
            onClick={() => setNotice("")}
          >
            <X size={16} />
          </button>
        </div>
      )}
    </div>
  );
}
function MissionCard({ m, onClick, passed, state }) {
  return (
    <button
      className="mission-card"
      style={{
        "--district-color": districts.find((d) => d.ids.includes(m.id))?.color,
      }}
      onClick={onClick}
    >
      <div className="card-top">
        <span className="tiny">
          {m.id} / {m.division}
        </span>
        {passed ? (
          <CheckCircle2 size={19} className="green" />
        ) : (
          <ArrowUpRight size={18} />
        )}
      </div>
      <div className="mission-card-art" aria-hidden="true">
        <span>{m.id.slice(1)}</span>
        <div>
          <Target size={35} strokeWidth={1} />
          <span>{m.level}</span>
        </div>
      </div>
      <span className="card-role">{m.role}</span>
      <h3>{m.title}</h3>
      <div className="mission-state">
        <span className={passed ? "mastered" : ""}>
          {state || (passed ? "Mastered" : "Ready to begin")}
        </span>
        <ArrowRight size={16} />
      </div>
      <div className="card-bottom">
        <span>
          <Clock size={13} />
          {m.duration}
        </span>
        <strong>{m.xp} XP</strong>
      </div>
    </button>
  );
}
function Paths({ data, submissions, progress, passed, open, assignments }) {
  const [filter, setFilter] = useState("All"),
    [search, setSearch] = useState("");
  const list = data.missions.filter(
    (m) =>
      (filter === "All" || m.level === filter) &&
      (m.title + " " + m.role + " " + m.stack)
        .toLowerCase()
        .includes(search.toLowerCase()),
  );
  return (
    <>
      <PageTitle
        eyebrow="BUILD YOUR CAPABILITY"
        title="Learning paths"
        text="Twelve real-world missions. One shared standard of work."
      />
      <div className="toolbar">
        <div className="tabs">
          {["All", "Beginner", "Intermediate", "Advanced"].map((f) => (
            <button
              className={filter === f ? "active" : ""}
              onClick={() => setFilter(f)}
              key={f}
            >
              {f}
            </button>
          ))}
        </div>
        <label className="search">
          <Search size={17} />
          <input
            placeholder="Find a role or tool…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </label>
      </div>
      {assignments.length > 0 && (
        <div className="assigned-banner">
          <Target size={20} />
          <div>
            <strong>{assignments.length} assigned missions</strong>
            {assignments.map((a) => (
              <p key={a.id}>
                <button
                  className="text-btn"
                  onClick={() =>
                    open(data.missions.find((m) => m.id === a.mission_id))
                  }
                >
                  {a.mission_id}
                </button>{" "}
                {a.due_date ? "Due " + a.due_date : "No due date"} — {a.notes}
              </p>
            ))}
          </div>
        </div>
      )}
      <div className="mission-grid">
        {list.map((m) => (
          <MissionCard
            key={m.id}
            m={m}
            passed={passed.has(m.id)}
            state={missionState(m.id, submissions, progress)}
            onClick={() => open(m)}
          />
        ))}
      </div>
      {!list.length && (
        <Empty
          title="No matching paths"
          text="Try another role, tool, or difficulty."
        />
      )}
      {data.missions.length < 12 && (
        <div className="callout">
          <Lock size={20} />
          <p>
            You’re exploring three sample paths. Members have all 12 missions
            and the complete private field guide.
          </p>
        </div>
      )}
    </>
  );
}
function PageTitle({ eyebrow, title, text, children }) {
  return (
    <div className="page-heading">
      <div>
        <div className="eyebrow">{eyebrow}</div>
        <h1>{title}</h1>
        <p>{text}</p>
      </div>
      {children}
    </div>
  );
}
function Empty({ title, text, children }) {
  return (
    <div className="empty">
      <Layers size={27} />
      <h3>{title}</h3>
      <p>{text}</p>
      {children}
    </div>
  );
}
function Auth({ close, token, toast }) {
  useEffect(() => {
    const prior = document.activeElement;
    const modal = document.querySelector(".auth-modal");
    modal?.querySelector("input")?.focus();
    const key = (e) => {
      if (e.key === "Escape") close();
      if (e.key === "Tab") {
        const els = Array.from(
          modal.querySelectorAll(
            "button:not(:disabled),input,select,textarea,a[href]",
          ),
        );
        if (e.shiftKey && document.activeElement === els[0]) {
          e.preventDefault();
          els.at(-1)?.focus();
        } else if (!e.shiftKey && document.activeElement === els.at(-1)) {
          e.preventDefault();
          els[0]?.focus();
        }
      }
    };
    document.addEventListener("keydown", key);
    return () => {
      document.removeEventListener("keydown", key);
      prior?.focus();
    };
  }, []);
  const [mode, setMode] = useState(token ? "join" : "login"),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  async function submit(e) {
    e.preventDefault();
    const f = Object.fromEntries(new FormData(e.target));
    setBusy(true);
    setError("");
    try {
      if (mode === "join") {
        const { data, error } = await supabase.functions.invoke("enroll", {
          body: f,
        });
        if (error) {
          let detail;
          try {
            detail = await error.context.json();
          } catch {}
          throw new Error(detail?.error || error.message);
        }
        if (data?.error) throw new Error(data.error);
      }
      const { error } = await supabase.auth.signInWithPassword({
        email: f.email,
        password: f.password,
      });
      if (error) throw error;
      close();
      toast("Welcome to your private Forge workspace.");
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="modal-backdrop" onClick={close}>
      <section
        className="modal auth-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="auth-title"
        onClick={(e) => e.stopPropagation()}
      >
        <button className="close icon-btn" aria-label="Close" onClick={close}>
          <X />
        </button>
        <div className="brand-mark">
          <Flame size={27} />
        </div>
        <span className="eyebrow">TRUSTED PEOPLE. SHARED STANDARDS.</span>
        <h2 id="auth-title">
          {mode === "join" ? "Your place at the Forge." : "Welcome back."}
        </h2>
        <p>
          {mode === "join"
            ? "Join with your private invitation. Already joined? Sign in with your existing account."
            : "Sign in to continue your work and see your circle."}
        </p>
        <div className="tabs">
          <button
            className={mode === "login" ? "active" : ""}
            onClick={() => setMode("login")}
          >
            Sign in
          </button>
          <button
            className={mode === "join" ? "active" : ""}
            onClick={() => setMode("join")}
          >
            Redeem invitation
          </button>
        </div>
        <form onSubmit={submit}>
          {mode === "join" && (
            <>
              <label>
                Your name
                <input
                  name="name"
                  required
                  maxLength={80}
                  autoComplete="name"
                />
              </label>
              <label>
                Invitation code
                <input
                  name="token"
                  required
                  defaultValue={token}
                  minLength={48}
                  maxLength={48}
                  autoComplete="off"
                />
              </label>
            </>
          )}
          <label>
            Email
            <input name="email" type="email" required autoComplete="email" />
          </label>
          <label>
            Password
            <input
              name="password"
              type="password"
              required
              minLength={mode === "join" ? 12 : 1}
              autoComplete={
                mode === "join" ? "new-password" : "current-password"
              }
            />
          </label>
          {mode === "join" && (
            <small>
              Use at least 12 characters. Your private invitation grants access;
              it does not verify ownership of the email address.
            </small>
          )}
          {error && (
            <p className="error" role="alert">
              {error}
            </p>
          )}
          <button className="btn primary full" disabled={busy}>
            {busy
              ? "Opening workspace…"
              : mode === "join"
                ? "Create my membership"
                : "Enter the Forge"}
            <ArrowRight size={17} />
          </button>
        </form>
        <p className="muted small">
          Need access or help signing in? Contact the mentor who invited you.
        </p>
      </section>
    </div>
  );
}
function Mission({
  m,
  member,
  progress,
  save,
  act,
  toast,
  submissions,
  attempts,
  refresh,
  auth,
  back,
  openPage,
  onDirty,
}) {
  const [tab, setTab] = useState("Brief"),
    [artifact, setArtifact] = useState(progress["artifact-" + m.id] || ""),
    [evidence, setEvidence] = useState(progress["evidence-" + m.id] || ""),
    [answers, setAnswers] = useState({}),
    [result, setResult] = useState(null),
    [busy, setBusy] = useState(false),
    [checks, setChecks] = useState(progress["checks-" + m.id] || []);
  useEffect(() => {
    onDirty(
      artifact !== (progress["artifact-" + m.id] || "") ||
        evidence !== (progress["evidence-" + m.id] || "") ||
        JSON.stringify(checks) !==
          JSON.stringify(progress["checks-" + m.id] || []),
    );
    return () => onDirty(false);
  }, [artifact, evidence, checks, progress, m.id]);
  const best = Math.max(0, ...attempts.map((a) => a.score)),
    approved = submissions.some((s) => s.status === "passed");
  const run = async (fn) => {
    setBusy(true);
    await act(fn);
    setBusy(false);
  };
  async function submit() {
    if (!member) {
      auth();
      return;
    }
    if (best < 80)
      throw new Error(
        "Pass the knowledge check before submitting your artifact.",
      );
    await save({
      ...progress,
      ["artifact-" + m.id]: artifact,
      ["evidence-" + m.id]: evidence,
      ["checks-" + m.id]: checks,
    });
    const { error } = await supabase
      .from("submissions")
      .insert({ user_id: member.id, mission_id: m.id, artifact, evidence });
    if (error) throw error;
    await refresh();
    toast("Submitted. A mentor can now review your work.");
    setTab("Feedback");
  }
  return (
    <>
      <button className="text-btn breadcrumb" onClick={back}>
        Learning paths <ChevronRight size={15} /> {m.id}
      </button>
      <PageTitle
        eyebrow={m.division + " / " + m.level}
        title={m.title}
        text={m.role}
      >
        <span className="xp-badge">
          <Trophy size={21} />
          {m.xp} XP
        </span>
      </PageTitle>
      <div className="mission-summary">
        <span>
          <Clock size={16} />
          {m.duration}
        </span>
        <span>
          <ShieldCheck size={16} />
          {approved ? "Mastered" : "Mentor-reviewed mastery"}
        </span>
        <button className="text-btn" onClick={member ? openPage : auth}>
          Guide page {m.page}
          <ArrowUpRight size={15} />
        </button>
      </div>
      <div className="mission-stepper">
        {[
          ["01", "Read the brief", true],
          ["02", "Build & document", !!artifact.trim()],
          ["03", "Check understanding", best >= 80],
          ["04", "Earn mastery", approved],
        ].map(([n, t, done]) => (
          <div className={done ? "done" : ""} key={n}>
            <span>{done ? <Check size={14} /> : n}</span>
            <strong>{t}</strong>
          </div>
        ))}
      </div>
      <div className="tabs wide">
        {["Brief", "Workbench", "Knowledge check", "Feedback"].map((t) => (
          <button
            key={t}
            className={tab === t ? "active" : ""}
            onClick={() => setTab(t)}
          >
            {t}
          </button>
        ))}
      </div>
      {tab === "Brief" && (
        <div className="two-col">
          <article className="panel mission-brief">
            <span className="eyebrow">THE MISSION</span>
            <h2>{m.mission}</h2>
            <h3>Your input pack</h3>
            <p>{m.inputs}</p>
            <h3>The core route</h3>
            <div className="stack-route">
              {m.stack.split(" → ").map((s, i) => (
                <React.Fragment key={i}>
                  {i > 0 && <ChevronRight size={16} />}
                  <span>{s}</span>
                </React.Fragment>
              ))}
            </div>
            <h3>What you’ll deliver</h3>
            <p>{m.deliver}</p>
            <div className="gate">
              <ShieldCheck size={23} />
              <div>
                <strong>The pass gate</strong>
                <p>{m.gate}</p>
              </div>
            </div>
            <button className="btn primary" onClick={() => setTab("Workbench")}>
              Open your workbench
              <ArrowRight size={17} />
            </button>
          </article>
          <aside className="panel">
            <span className="eyebrow">HOW YOUR WORK IS REVIEWED</span>
            <h2>
              Score the work.
              <br />
              Not the confidence.
            </h2>
            {rubric.map(([name, max]) => (
              <div className="rubric-row" key={name}>
                <span>{name}</span>
                <strong>{max}</strong>
              </div>
            ))}
            <p className="muted">
              80/100 to pass, with no fabricated evidence, missing deliverable,
              broken critical flow, or unapproved action.
            </p>
            {m.repair && (
              <>
                <h3>If it misses</h3>
                <p>{m.repair}</p>
              </>
            )}
            {m.stretch && (
              <>
                <h3>Go further</h3>
                <p>{m.stretch}</p>
              </>
            )}
          </aside>
        </div>
      )}
      {tab === "Workbench" && (
        <div className="two-col">
          <section className="panel">
            <span className="eyebrow">BUILD SOMETHING REVIEWABLE</span>
            <h2>Your artifact & evidence</h2>
            <p>
              Work in your chosen tools, then bring the editable result and
              checks here. Drafts stay separate from submitted work.
            </p>
            <label>
              Artifact or working deliverable
              <textarea
                rows={8}
                value={artifact}
                onChange={(e) => setArtifact(e.target.value)}
                placeholder="Paste your draft, or include a shareable artifact URL with a description of what you built. Minimum 30 characters."
                maxLength={30000}
              />
            </label>
            <label>
              Evidence & handoff
              <textarea
                rows={6}
                value={evidence}
                onChange={(e) => setEvidence(e.target.value)}
                placeholder="Record source IDs, test results, versions, known gaps, and reproduction steps. Minimum 20 characters."
                maxLength={20000}
              />
            </label>
            <div className="button-row">
              <button
                className="btn"
                disabled={busy}
                onClick={() =>
                  run(async () => {
                    await save({
                      ...progress,
                      ["artifact-" + m.id]: artifact,
                      ["evidence-" + m.id]: evidence,
                      ["checks-" + m.id]: checks,
                    });
                    toast(
                      member
                        ? "Draft saved to your workspace."
                        : "Draft saved on this device.",
                    );
                  })
                }
              >
                Save draft
              </button>
              <button
                className="btn primary"
                disabled={
                  busy ||
                  artifact.trim().length < 30 ||
                  evidence.trim().length < 20 ||
                  approved
                }
                onClick={() => run(submit)}
              >
                <Send size={16} />
                {approved ? "Already mastered" : "Submit for review"}
              </button>
            </div>
            {best < 80 && (
              <p className="muted small">
                Pass the knowledge check before submitting. It does not replace
                the mentor’s artifact review.
              </p>
            )}
          </section>
          <aside className="panel">
            <span className="eyebrow">PRE-FLIGHT CHECK</span>
            <h2>Leave a clear trail.</h2>
            {[
              "My artifact answers the brief.",
              "I can trace consequential claims.",
              "I tested the meaningful failure path.",
              "My handoff includes editable work.",
              "I documented known gaps.",
            ].map((t, i) => (
              <label className="check-label" key={t}>
                <input
                  type="checkbox"
                  checked={checks.includes(i)}
                  onChange={() =>
                    setChecks(
                      checks.includes(i)
                        ? checks.filter((x) => x !== i)
                        : [...checks, i],
                    )
                  }
                />
                {t}
              </label>
            ))}
            <div className="callout">
              <FileText size={20} />
              <p>{m.deliver}</p>
            </div>
          </aside>
        </div>
      )}
      {tab === "Knowledge check" &&
        (!member ? (
          <Empty
            title="Knowledge checks are for members"
            text="Sign in to save attempts and receive a server-scored result."
          >
            <button className="btn primary" onClick={auth}>
              Member sign in
            </button>
          </Empty>
        ) : (
          <section className="panel quiz">
            <span className="eyebrow">UNDERSTAND BEFORE YOU SHIP</span>
            <h2>Apply the standard.</h2>
            <p>
              Best score: {best}% · Pass at 80%. Retakes are recorded; there is
              no XP farming.
            </p>
            {m.quiz?.map((q, i) => (
              <fieldset key={i}>
                <legend>
                  <span>0{i + 1}</span>
                  {q.q}
                </legend>
                {q.options.map((o, j) => (
                  <label
                    className={"answer " + (answers[i] === j ? "chosen" : "")}
                    key={j}
                  >
                    <input
                      type="radio"
                      name={"q" + i}
                      checked={answers[i] === j}
                      onChange={() => setAnswers({ ...answers, [i]: j })}
                    />
                    {o}
                  </label>
                ))}
              </fieldset>
            ))}
            <button
              className="btn primary"
              disabled={busy || Object.keys(answers).length !== m.quiz?.length}
              onClick={() =>
                run(async () => {
                  const r = await rpc("grade_quiz", {
                    mission: m.id,
                    responses: m.quiz.map((_, i) => answers[i]),
                  });
                  setResult(r);
                  await refresh();
                })
              }
            >
              Check my understanding
              <ArrowRight size={17} />
            </button>
            {result && (
              <div
                className={"result " + (result.passed ? "success" : "")}
                role="status"
              >
                <strong>
                  {result.score}% —{" "}
                  {result.passed ? "Knowledge check passed" : "Keep practicing"}
                </strong>
                <p>
                  {result.passed
                    ? "Bring your artifact to the workbench for review."
                    : "Revisit the mission’s pass gate and the five review criteria, then try again."}
                </p>
              </div>
            )}
          </section>
        ))}
      {tab === "Feedback" && (
        <section className="panel">
          <h2>Your review history</h2>
          {!submissions.length ? (
            <Empty
              title="Your work belongs here"
              text="Submit an artifact when you’re ready for a mentor’s review."
            />
          ) : (
            submissions
              .slice()
              .reverse()
              .map((s) => (
                <article className="review-item" key={s.id}>
                  <div className="card-top">
                    <span className={"tag " + s.status}>
                      {s.status === "passed"
                        ? "Mastered"
                        : s.status === "revision"
                          ? "Revision requested"
                          : "Awaiting review"}
                    </span>
                    <span className="muted small">
                      {new Date(s.created_at).toLocaleDateString()}
                    </span>
                  </div>
                  <p className="prewrap">{s.artifact}</p>
                  {s.feedback && (
                    <div className="feedback">
                      <MessageSquare size={18} />
                      <p>{s.feedback}</p>
                    </div>
                  )}
                  {s.scores && (
                    <div className="rubric-row">
                      <span>
                        Review score{" "}
                        {s.critical_failure
                          ? "· critical failure recorded"
                          : ""}
                      </span>
                      <strong>{s.scores.reduce((a, b) => a + b, 0)}/100</strong>
                    </div>
                  )}
                </article>
              ))
          )}
        </section>
      )}
    </>
  );
}
function Library({ data, member, auth, reader, setReader }) {
  const [kind, setKind] = useState("Tools"),
    [search, setSearch] = useState("");
  if (!member)
    return (
      <>
        <PageTitle
          eyebrow="YOUR PERSONAL FIELD GUIDE"
          title="The reference shelf"
          text="Your complete guide, kept inside your trusted circle."
        />
        <Empty
          title="81 cards. 125 combinations. All yours."
          text="Members can search all 94 pages, model prompting cards, tool briefs, role missions, and developer reading links."
        >
          <button className="btn primary" onClick={auth}>
            <Lock size={16} />
            Enter with your invitation
          </button>
        </Empty>
      </>
    );
  const source =
    kind === "Tools"
      ? data.tools
      : kind === "Models"
        ? data.models
        : kind === "Combinations"
          ? data.combos
          : kind === "Developer shelf"
            ? data.pages.filter((p) => p.page >= 84 && p.page <= 90)
            : data.pages;
  const filtered = source.filter((x) =>
    JSON.stringify(x).toLowerCase().includes(search.toLowerCase()),
  );
  return (
    <>
      <PageTitle
        eyebrow="SOURCE: THE FORGE PERSONAL FIELD GUIDE"
        title="The reference shelf"
        text="Search the source. Adapt the brief. Inspect the result."
      />
      <div className="callout compact-callout">
        <BookOpen size={18} />
        <p>
          Imported from your September 15, 2026 guide. Model names and
          capabilities are the guide’s dated snapshot; follow its source links
          to verify current availability.
        </p>
      </div>
      <div className="toolbar">
        <div className="tabs">
          {[
            "Tools",
            "Models",
            "Combinations",
            "Developer shelf",
            "All pages",
          ].map((k) => (
            <button
              className={kind === k ? "active" : ""}
              onClick={() => {
                setKind(k);
                setReader(null);
              }}
              key={k}
            >
              {k}
            </button>
          ))}
        </div>
        <label className="search">
          <Search size={17} />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search your guide…"
          />
        </label>
      </div>
      {reader ? (
        <article className="panel reader">
          <button className="text-btn" onClick={() => setReader(null)}>
            ← Back to the shelf
          </button>
          <span className="eyebrow">
            PAGE {reader.page} {reader.id && " / " + reader.id}
          </span>
          <h2>{reader.name || reader.section || "Field guide"}</h2>
          {reader.stack && <div className="stack-route">{reader.stack}</div>}
          <div className="guide-text">{reader.text}</div>
          {reader.links?.length > 0 && (
            <div className="source-links">
              <h3>Original source links</h3>
              {[...new Set(reader.links)].filter(isSafeUrl).map((url, i) => (
                <a href={url} key={i} target="_blank" rel="noreferrer">
                  {new URL(url).hostname}
                  {new URL(url).pathname.slice(0, 65)}{" "}
                  <ArrowUpRight size={14} />
                </a>
              ))}
            </div>
          )}
        </article>
      ) : (
        <>
          <p className="muted small">{filtered.length} entries</p>
          <div className="library-grid">
            {filtered.map((x, i) => (
              <button
                key={i}
                className="library-card"
                onClick={() => setReader(x)}
              >
                <span className="tiny">
                  {x.id || "PAGE " + x.page}
                  {x.alias ? " / " + x.alias : ""}
                </span>
                <h3>{x.name || x.section}</h3>
                <p>{x.stack || x.text.slice(0, 150)}</p>
                <span className="text-btn">
                  Read entry
                  <ArrowUpRight size={15} />
                </span>
              </button>
            ))}
          </div>
          {!filtered.length && (
            <Empty
              title="Nothing on this shelf matches"
              text="Try a tool name, Forge alias, or a shorter phrase."
            />
          )}
        </>
      )}
    </>
  );
}
function Sandbox({ progress, save, act, toast }) {
  const [tab, setTab] = useState("Prompt studio"),
    [fields, setFields] = useState(
      progress.prompt || {
        Outcome: "",
        Context: "",
        Inputs: "",
        Constraints: "",
        Delivery: "",
        "Pass criteria": "",
      },
    ),
    [code, setCode] = useState(
      progress.code ||
        "<style>body{font:20px system-ui;background:#14221d;color:#efe7d6;padding:40px}button{padding:12px;background:#d1ac70;border:0;border-radius:6px}</style>\n<h1>Hello, Forge.</h1>\n<p>Build one complete interaction.</p>\n<button onclick=\"this.textContent='It works. Now test the failure path.'\">Test this interaction</button>",
    ),
    [preview, setPreview] = useState(""),
    [review, setReview] = useState(false),
    [claims, setClaims] = useState(progress.claims || ""),
    [audit, setAudit] = useState(null),
    [pack, setPack] = useState("");
  const prompt = Object.entries(fields)
    .map(([k, v]) => k.toUpperCase() + ":\n" + v)
    .join("\n\n");
  function buildPreview() {
    setPreview(
      "<meta http-equiv=\"Content-Security-Policy\" content=\"default-src 'none'; script-src 'unsafe-inline'; style-src 'unsafe-inline'; img-src data:; connect-src 'none'; form-action 'none'; base-uri 'none'\"><meta name=\"viewport\" content=\"width=device-width,initial-scale=1\">" +
        code,
    );
  }
  return (
    <>
      <PageTitle
        eyebrow="LOW STAKES. HIGH STANDARDS."
        title="The practice lab"
        text="A place to experiment, break things, and understand why."
      />
      <div className="tabs wide">
        {["Prompt studio", "Code sandbox", "Evidence lab"].map((t) => (
          <button
            className={tab === t ? "active" : ""}
            onClick={() => setTab(t)}
            key={t}
          >
            {t}
          </button>
        ))}
      </div>
      {tab === "Prompt studio" && (
        <div className="two-col">
          <section className="panel">
            <span className="eyebrow">THE SIX-PART PROMPT CONTRACT</span>
            <h2>Give the model a real brief.</h2>
            <p>
              This studio checks completeness, not model quality. It does not
              call an AI service or spend credits.
            </p>
            <div className="prompt-fields">
              {Object.entries(fields).map(([k, v]) => (
                <label key={k}>
                  {k}
                  <textarea
                    rows={3}
                    value={v}
                    onChange={(e) =>
                      setFields({ ...fields, [k]: e.target.value })
                    }
                    placeholder={
                      {
                        Outcome: "What decision or artifact must exist?",
                        Context: "Who is it for? What source is authoritative?",
                        Inputs: "Files, references, IDs, and examples.",
                        Constraints:
                          "What must be preserved? What actions are permitted?",
                        Delivery:
                          "Format, destination, editable files, and naming.",
                        "Pass criteria":
                          "Observable checks that distinguish done from plausible.",
                      }[k]
                    }
                  />
                </label>
              ))}
            </div>
            <div className="button-row">
              <button className="btn primary" onClick={() => setReview(true)}>
                Inspect the contract
                <Target size={16} />
              </button>
              <button
                className="btn"
                onClick={() =>
                  act(async () => {
                    await save({ ...progress, prompt: fields });
                    toast("Prompt draft saved.");
                  })
                }
              >
                Save draft
              </button>
            </div>
          </section>
          <aside className="panel">
            <span className="eyebrow">READY TO ADAPT</span>
            <h2>Your working prompt</h2>
            <pre className="prompt-preview">{prompt}</pre>
            <button
              className="btn"
              onClick={() =>
                act(async () => {
                  await navigator.clipboard.writeText(prompt);
                  toast("Prompt copied.");
                })
              }
            >
              <Copy size={16} />
              Copy prompt
            </button>
            {review && (
              <div className="result">
                <strong>{scorePrompt(fields)}/6 sections developed</strong>
                <p>
                  Heuristic: each section needs at least 20 characters. A person
                  must still judge the brief’s accuracy and specificity.
                </p>
                {Object.entries(fields)
                  .filter(([, v]) => v.trim().length < 20)
                  .map(([k]) => (
                    <p key={k}>↳ Add a concrete detail to {k.toLowerCase()}.</p>
                  ))}
              </div>
            )}
          </aside>
        </div>
      )}
      {tab === "Code sandbox" && (
        <>
          <div className="callout">
            <ShieldCheck size={20} />
            <p>
              HTML, CSS, and inline JavaScript run in an isolated preview.
              Network requests, forms, popups, and access to your account are
              blocked. Use small experiments; infinite loops can still freeze
              this browser tab.
            </p>
          </div>
          <div className="two-col code-layout">
            <section className="panel">
              <div className="section-heading">
                <h2>Build</h2>
                <Code2 size={21} />
              </div>
              <textarea
                className="code-editor"
                spellCheck="false"
                aria-label="HTML CSS and JavaScript code"
                value={code}
                onChange={(e) => setCode(e.target.value)}
              />
              <div className="button-row">
                <button className="btn primary" onClick={buildPreview}>
                  Run preview
                  <ArrowRight size={17} />
                </button>
                <button
                  className="btn"
                  onClick={() =>
                    act(async () => {
                      await save({ ...progress, code });
                      toast("Code saved.");
                    })
                  }
                >
                  Save code
                </button>
                <button className="btn" onClick={() => setPreview("")}>
                  Clear preview
                </button>
              </div>
            </section>
            <section className="panel">
              <h2>Inspect</h2>
              {preview ? (
                <iframe
                  title="Isolated code preview"
                  sandbox="allow-scripts"
                  srcDoc={preview}
                  className="code-preview"
                />
              ) : (
                <Empty
                  title="Your experiment runs here"
                  text="Write a small interaction and choose Run preview."
                />
              )}
            </section>
          </div>
        </>
      )}
      {tab === "Evidence lab" && (
        <div className="two-col">
          <section className="panel">
            <span className="eyebrow">
              SYNTHETIC SOURCE PACK / NO LIVE CLIENT DATA
            </span>
            <h2>Find the conflict. Keep the unknown.</h2>
            <div className="source-packet">
              <p>
                <b>[A] Operations note, Monday</b>
                <br />
                Northline Kitchen receives 40 catering inquiries per week. Maya
                can spend 3 hours on a pilot. The budget is $200 per month.
              </p>
              <p>
                <b>[B] Sales spreadsheet, last quarter</b>
                <br />
                Average inquiries: 25 per week. The column for conversion rate
                is empty.
              </p>
              <p>
                <b>[C] Vendor advertisement</b>
                <br />
                “Guaranteed to double your revenue.” No test method or evidence
                is supplied.
              </p>
            </div>
            <label>
              Your claim ledger
              <textarea
                rows={8}
                value={claims}
                onChange={(e) => setClaims(e.target.value)}
                placeholder="Name the conflicting source IDs, the missing information, and the unsupported claim. Then propose a measurable pilot."
              />
            </label>
            <div className="button-row">
              <button
                className="btn primary"
                onClick={() =>
                  setAudit({
                    conflict: /40/.test(claims) && /25/.test(claims),
                    missing:
                      /conversion/i.test(claims) &&
                      /unknown|missing|empty|not provided/i.test(claims),
                    unsupported:
                      /guarantee|double|revenue/i.test(claims) &&
                      /unsupported|unverified|no evidence|not supported/i.test(
                        claims,
                      ),
                  })
                }
              >
                Check the planted issues
              </button>
              <button
                className="btn"
                onClick={() =>
                  act(async () => {
                    await save({ ...progress, claims });
                    toast("Evidence draft saved.");
                  })
                }
              >
                Save ledger
              </button>
            </div>
          </section>
          <aside className="panel">
            <h2>The reviewer’s lens</h2>
            <p>
              Different dates do not automatically mean either figure is wrong.
              Describe the scope, ask for current counts, and leave conversion
              unknown.
            </p>
            {audit && (
              <div className="result">
                {Object.entries(audit).map(([k, v]) => (
                  <p key={k}>
                    {v ? "✓" : "○"}{" "}
                    {k === "conflict"
                      ? "Both inquiry figures identified"
                      : k === "missing"
                        ? "Conversion marked unknown"
                        : "Advertising claim flagged"}
                  </p>
                ))}
                <small>
                  This keyword check is practice feedback, not a mentor
                  assessment.
                </small>
              </div>
            )}
            <h3>Ask for process help</h3>
            <label>
              What is blocking you?
              <textarea
                rows={4}
                value={pack}
                onChange={(e) => setPack(e.target.value)}
                placeholder="Describe the step, what you tried, and the observed failure."
              />
            </label>
            <button
              className="btn"
              onClick={() =>
                act(async () => {
                  await navigator.clipboard.writeText(
                    "Forge help request\nStep / issue: " +
                      pack +
                      "\nEvidence draft:\n" +
                      claims,
                  );
                  toast("Help request copied. Share it with your mentor.");
                })
              }
            >
              <Copy size={16} />
              Copy a mentor help request
            </button>
          </aside>
        </div>
      )}
    </>
  );
}
function Team({
  member,
  members,
  submissions,
  assignments,
  missions,
  attempts,
  mentor,
  act,
  toast,
  refresh,
  auth,
}) {
  const [tab, setTab] = useState("Members"),
    [invite, setInvite] = useState(""),
    [inviteRole, setInviteRole] = useState("learner"),
    [selected, setSelected] = useState(null),
    [scores, setScores] = useState([0, 0, 0, 0, 0]),
    [feedback, setFeedback] = useState(""),
    [critical, setCritical] = useState(false),
    [busy, setBusy] = useState(false);
  const run = async (fn) => {
    setBusy(true);
    await act(fn);
    setBusy(false);
  };
  if (!member)
    return (
      <>
        <PageTitle
          eyebrow="GROW TOGETHER"
          title="Your trusted circle"
          text="A private space to train, guide, and recognize your people."
        />
        <Empty
          title="Learning gets better with good people"
          text="Members can view assignments and feedback. Mentors invite learners, assign missions, and review the work."
        >
          <button className="btn primary" onClick={auth}>
            Member sign in
            <ArrowRight size={16} />
          </button>
        </Empty>
      </>
    );
  async function assign(e) {
    e.preventDefault();
    const f = Object.fromEntries(new FormData(e.target));
    await run(async () => {
      const { error } = await supabase
        .from("assignments")
        .upsert(
          { ...f, due_date: f.due_date || null, mentor_id: member.id },
          { onConflict: "user_id,mission_id" },
        );
      if (error) throw error;
      await refresh();
      toast(
        "Mission assigned. The member will see it in their learning paths.",
      );
    });
  }
  return (
    <>
      <PageTitle
        eyebrow={mentor ? "MENTOR WORKSPACE" : "YOUR LEARNING CIRCLE"}
        title="Better, together."
        text={
          mentor
            ? "Give direction. Inspect the work. Help the next person level up."
            : "Your assigned work and the feedback that moves it forward."
        }
      >
        <button className="btn" disabled={busy} onClick={() => run(refresh)}>
          <RefreshCw size={16} />
          Refresh
        </button>
      </PageTitle>
      {!mentor ? (
        <section className="panel">
          <h2>Your assignments</h2>
          {assignments.length ? (
            assignments.map((a) => (
              <article className="review-item" key={a.id}>
                <h3>{missions.find((m) => m.id === a.mission_id)?.title}</h3>
                <p>
                  {a.notes ||
                    "Read the mission brief, complete the check, and submit your artifact."}
                </p>
                <span className="muted">
                  {a.due_date ? "Due " + a.due_date : "No due date"}
                </span>
              </article>
            ))
          ) : (
            <Empty
              title="No assignments yet"
              text="You can begin any learning path while your mentor prepares your next mission."
            />
          )}
        </section>
      ) : (
        <>
          <div className="tabs wide">
            {["Members", "Assign work", "Review queue", "Invite people"].map(
              (t) => (
                <button
                  key={t}
                  className={tab === t ? "active" : ""}
                  onClick={() => setTab(t)}
                >
                  {t}
                  {t === "Review queue" && (
                    <span className="count">
                      {submissions.filter((s) => s.status === "pending").length}
                    </span>
                  )}
                </button>
              ),
            )}
          </div>
          {tab === "Members" && (
            <section className="panel">
              <div className="section-heading">
                <h2>Your circle · {members.length}</h2>
                <span className="muted small">
                  Real progress. No demo members.
                </span>
              </div>
              <div className="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>Member</th>
                      <th>Role</th>
                      <th>Mastered</th>
                      <th>XP</th>
                      <th>Assigned</th>
                      <th>Latest activity</th>
                    </tr>
                  </thead>
                  <tbody>
                    {members.map((m) => {
                      const ss = submissions.filter((s) => s.user_id === m.id),
                        count = new Set(
                          ss
                            .filter((s) => s.status === "passed")
                            .map((s) => s.mission_id),
                        ).size;
                      const dates = [
                        ...ss,
                        ...attempts.filter((a) => a.user_id === m.id),
                      ]
                        .map((a) => a.created_at)
                        .sort();
                      return (
                        <tr key={m.id}>
                          <td>
                            <div className="member-name">
                              <span className="avatar">
                                {m.name.slice(0, 2).toUpperCase()}
                              </span>
                              <strong>{m.name}</strong>
                            </div>
                          </td>
                          <td>
                            <span className="tag">{m.role}</span>
                          </td>
                          <td>{count}/12</td>
                          <td>{earned(ss, missions)}</td>
                          <td>
                            {
                              assignments.filter((a) => a.user_id === m.id)
                                .length
                            }
                          </td>
                          <td>
                            {dates.length
                              ? new Date(dates.at(-1)).toLocaleDateString()
                              : "Not started"}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </section>
          )}
          {tab === "Assign work" && (
            <div className="two-col">
              <form className="panel" onSubmit={assign}>
                <h2>Set the next mission.</h2>
                <label>
                  Member
                  <select name="user_id" required>
                    <option value="">Choose a member</option>
                    {members.map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.name}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  Mission
                  <select name="mission_id" required>
                    {missions.map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.id} — {m.role}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  Due date (optional)
                  <input type="date" name="due_date" />
                </label>
                <label>
                  Mentor guidance
                  <textarea
                    name="notes"
                    rows={5}
                    maxLength={3000}
                    placeholder="Context, boundaries, and the outcome you want this person to practice."
                  />
                </label>
                <button disabled={busy} className="btn primary">
                  Assign mission
                  <Send size={17} />
                </button>
                <p className="muted small">
                  Assigning an existing member–mission pair updates its deadline
                  and guidance.
                </p>
              </form>
              <aside className="panel">
                <span className="eyebrow">FROM YOUR FIELD GUIDE / PAGE 64</span>
                <h2>Teach in four sessions.</h2>
                {[
                  [
                    "45 min",
                    "Read and inspect",
                    "Demonstrate a complete run, including one failed output. Ask the learner to identify the evidence.",
                  ],
                  [
                    "60 min",
                    "Repeat with support",
                    "Use different inputs. Answer process questions without rewriting their artifact.",
                  ],
                  [
                    "90 min",
                    "Work independently",
                    "Use a new pack with a contradiction, missing field, and irrelevant document.",
                  ],
                  [
                    "45 min",
                    "Teach it back",
                    "Have the learner explain a trade-off, teach another person, and re-run a failed case.",
                  ],
                ].map(([t, n, d], i) => (
                  <div className="training-step" key={n}>
                    <span>
                      0{i + 1} / {t}
                    </span>
                    <h3>{n}</h3>
                    <p>{d}</p>
                  </div>
                ))}
              </aside>
            </div>
          )}
          {tab === "Invite people" && (
            <section className="panel narrow">
              <span className="eyebrow">INVITATION ONLY</span>
              <h2>Make room at the bench.</h2>
              <p>
                Create a single-use invitation. It expires after seven days.
                Anyone holding the link can redeem it, so share it directly with
                the intended person.
              </p>
              <label>
                Member role
                <select
                  value={inviteRole}
                  onChange={(e) => setInviteRole(e.target.value)}
                >
                  <option value="learner">Learner</option>
                  {member.role === "owner" && (
                    <option value="mentor">Mentor</option>
                  )}
                </select>
              </label>
              <button
                className="btn primary"
                disabled={busy}
                onClick={() =>
                  run(async () => {
                    const token = await rpc("create_invite", {
                      member_role: inviteRole,
                    });
                    setInvite(location.origin + "/#invite=" + token);
                  })
                }
              >
                <Plus size={16} />
                Create invitation
              </button>
              {invite && (
                <div className="result">
                  <label>
                    Private invitation link
                    <input readOnly value={invite} />
                  </label>
                  <button
                    className="btn"
                    onClick={() =>
                      act(async () => {
                        await navigator.clipboard.writeText(invite);
                        toast("Private invitation copied.");
                      })
                    }
                  >
                    <Copy size={16} />
                    Copy invitation
                  </button>
                  <p className="small muted">
                    No message has been sent. Share this link yourself.
                  </p>
                </div>
              )}
            </section>
          )}
          {tab === "Review queue" && (
            <div className="two-col">
              <section className="panel">
                <h2>Artifacts awaiting review</h2>
                {submissions
                  .filter((s) => s.status === "pending")
                  .map((s) => (
                    <button
                      className={
                        "queue-item " +
                        (selected?.id === s.id ? "selected" : "")
                      }
                      key={s.id}
                      onClick={() => {
                        setSelected(s);
                        setScores([0, 0, 0, 0, 0]);
                        setFeedback("");
                        setCritical(false);
                      }}
                    >
                      <span className="tiny">
                        {s.mission_id} /{" "}
                        {members.find((m) => m.id === s.user_id)?.name ||
                          "Member"}
                      </span>
                      <h3>
                        {missions.find((m) => m.id === s.mission_id)?.title}
                      </h3>
                      <p>{s.artifact.slice(0, 150)}</p>
                      <span className="text-btn">
                        Inspect submission
                        <ArrowRight size={15} />
                      </span>
                    </button>
                  ))}
                {!submissions.some((s) => s.status === "pending") && (
                  <Empty
                    title="The queue is clear"
                    text="Submitted artifacts will appear here when members are ready."
                  />
                )}
              </section>
              <section className="panel">
                {selected ? (
                  <>
                    <span className="eyebrow">
                      REVIEW / {selected.mission_id}
                    </span>
                    <h2>Inspect before you award.</h2>
                    <h3>Artifact</h3>
                    <p className="prewrap artifact-text">{selected.artifact}</p>
                    <h3>Evidence</h3>
                    <p className="prewrap artifact-text">{selected.evidence}</p>
                    <div className="gate">
                      <p>
                        {
                          missions.find((m) => m.id === selected.mission_id)
                            ?.gate
                        }
                      </p>
                    </div>
                    {rubric.map(([n, max], i) => (
                      <label className="rubric-input" key={n}>
                        <span>
                          {n}
                          <small> / {max}</small>
                        </span>
                        <input
                          type="number"
                          min="0"
                          max={max}
                          value={scores[i]}
                          onChange={(e) =>
                            setScores(
                              scores.map((s, j) =>
                                j === i ? Number(e.target.value) : s,
                              ),
                            )
                          }
                        />
                      </label>
                    ))}
                    <strong className="review-total">
                      {scores.reduce((a, b) => a + b, 0)} / 100
                    </strong>
                    <label className="check-label">
                      <input
                        type="checkbox"
                        checked={critical}
                        onChange={(e) => setCritical(e.target.checked)}
                      />
                      Critical failure: fabricated evidence, missing
                      deliverable, broken critical flow, or unapproved action.
                    </label>
                    <label>
                      Actionable feedback
                      <textarea
                        rows={4}
                        minLength={10}
                        value={feedback}
                        onChange={(e) => setFeedback(e.target.value)}
                        placeholder="Name what passed, the exact defect if any, and the next check."
                      />
                    </label>
                    <button
                      className="btn primary"
                      disabled={
                        busy ||
                        feedback.trim().length < 10 ||
                        selected.user_id === member.id
                      }
                      onClick={() =>
                        run(async () => {
                          const status = await rpc("review_submission", {
                            submission_id: selected.id,
                            rubric: scores,
                            comments: feedback,
                            critical,
                          });
                          await refresh();
                          setSelected(null);
                          toast(
                            status === "passed"
                              ? "Mastery awarded. XP is now reflected on the member’s passport."
                              : "Revision requested with your feedback.",
                          );
                        })
                      }
                    >
                      Publish review
                      <ShieldCheck size={17} />
                    </button>
                    {selected.user_id === member.id && (
                      <p className="muted">
                        A different mentor must review your own work.
                      </p>
                    )}
                  </>
                ) : (
                  <Empty
                    title="Choose an artifact"
                    text="The brief, evidence, and weighted rubric belong in the same review."
                  />
                )}
              </section>
            </div>
          )}
        </>
      )}
    </>
  );
}
function Rewards({ xp, passed, missions, mine, open, exportRecord }) {
  const badges = [
    {
      name: "First proof",
      desc: "Earn mentor approval on your first artifact.",
      done: passed.size >= 1,
      Icon: ShieldCheck,
    },
    {
      name: "Versatile builder",
      desc: "Master three different role missions.",
      done: passed.size >= 3,
      Icon: Layers,
    },
    {
      name: "Teach it forward",
      desc: "Master the educator / team trainer mission.",
      done: passed.has("S09"),
      Icon: GraduationCap,
    },
    {
      name: "Forge architect",
      desc: "Earn 2,500 XP through approved work.",
      done: xp >= 2500,
      Icon: Flame,
    },
  ];
  return (
    <>
      <PageTitle
        eyebrow="EARNED, NOT GIVEN"
        title="Your work leaves a mark."
        text="A record of the capability you have demonstrated."
      >
        <button className="btn" onClick={exportRecord}>
          <Download size={16} />
          Export passport
        </button>
      </PageTitle>
      <div className="achievement-hero">
        <div className="medallion">
          <Flame size={52} />
        </div>
        <div>
          <span className="eyebrow">{rank(xp)}</span>
          <h2>
            {xp.toLocaleString()} <span>experience points</span>
          </h2>
          <p>{passed.size} of 12 role missions mastered</p>
        </div>
      </div>
      <div className="badge-grid">
        {badges.map(({ name, desc, done, Icon }) => (
          <div
            className={"badge-card " + (done ? "earned" : "locked")}
            key={name}
          >
            <Icon size={37} strokeWidth={1.25} />
            <span className="tiny">{done ? "EARNED" : "TO UNLOCK"}</span>
            <h3>{name}</h3>
            <p>{desc}</p>
            {done ? <CheckCircle2 size={17} /> : <Lock size={17} />}
          </div>
        ))}
      </div>
      <div className="section-heading">
        <h2>Mastery collection</h2>
        <span className="muted small">Repeat approvals never multiply XP.</span>
      </div>
      <div className="mission-grid">
        {missions
          .filter((m) => passed.has(m.id))
          .map((m) => (
            <MissionCard key={m.id} m={m} passed onClick={() => open(m)} />
          ))}
      </div>
      {!passed.size && (
        <Empty
          title="Your first proof is ahead of you"
          text="Complete a learning path, pass its knowledge check, and submit your work to a mentor."
        />
      )}
    </>
  );
}
function LeaveDialog({ onKeep, onLeave }) {
  const ref = useRef();
  useEffect(() => {
    const old = document.activeElement;
    ref.current?.focus();
    const listener = (e) => {
      if (e.key === "Escape") onKeep();
      if (e.key === "Tab") {
        e.preventDefault();
        const buttons = e.currentTarget
          .querySelector?.(".leave-modal")
          ?.querySelectorAll("button");
        if (buttons) {
          (document.activeElement === buttons[0]
            ? buttons[1]
            : buttons[0]
          )?.focus();
        }
      }
    };
    document.addEventListener("keydown", listener);
    return () => {
      document.removeEventListener("keydown", listener);
      old?.focus();
    };
  }, []);
  return (
    <div className="modal-backdrop">
      <section
        className="modal leave-modal"
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="leave-title"
      >
        <span className="eyebrow">KEEP YOUR WORK</span>
        <h2 id="leave-title">You have unsaved changes.</h2>
        <p>
          Stay on this mission to save your artifact and evidence before moving
          on.
        </p>
        <div className="button-row">
          <button ref={ref} className="btn primary" onClick={onKeep}>
            Keep editing
          </button>
          <button className="btn" onClick={onLeave}>
            Leave without saving
          </button>
        </div>
      </section>
    </div>
  );
}
createRoot(document.getElementById("root")).render(<App />);
