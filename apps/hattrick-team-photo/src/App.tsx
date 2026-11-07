import { type JSX, useCallback, useEffect, useRef, useState } from "react";
import { AppShell, Tabs } from "hattrick-ui";
import {
  randomRenderInputs,
  renderInputs,
  renderInputsFromAvatar,
  type PlayerAvatar,
  type RenderInputs,
  type RenderOutput,
} from "hattrick-player-renderer";
import { composeTeamPhoto, naturalSize, type PhotoMeta } from "./compose.js";
import { computeLayout, DEFAULT_LAYOUT, type LayoutOptions } from "./layout.js";
import { DEFAULT_FRONT, stairRowRise, stairTileUrl } from "./stairs.js";
import { FontCombo } from "./FontCombo.js";
import {
  customFonts,
  defaultStyle,
  ensureVariant,
  loadFontList,
  styleParts,
  variantsFor,
} from "./fonts.js";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");
const API_BASE = (import.meta.env.VITE_API_BASE ?? BASE).replace(/\/$/, "");
const ENGINE = {
  assetOrigin: location.origin + BASE,
  slimKitUrl: `${BASE}/Club/Players/Avatars/slimkitrender.js`,
  fullBodiesUrl: `${BASE}/Club/Players/Avatars/HT.FullBodies.js`,
};

type Role = "player" | "keeper" | "staff";
interface SquadItem {
  id: number;
  number: number;
  name: string;
  enabled: boolean;
  staff: boolean;
  role: Role;
  inputs: RenderInputs;
}
interface SquadPlayer {
  id: number;
  name: string;
  number: number;
  gender: number;
  keeper: boolean;
  avatar: PlayerAvatar | null;
}

function avatarInputs(avatar: PlayerAvatar, gender: number): RenderInputs {
  const inputs = renderInputsFromAvatar(avatar, { gender });
  inputs.kitJson = inputs.kitJson.replace(/^(?:https?:)?\/\/res\.hattrick\.org\//, "/_kit/");
  return inputs;
}
function bgFill(hex: string, alphaPct: number): string {
  const a = alphaPct / 100;
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r}, ${g}, ${b}, ${a})`;
}
function loadImage(src: string | null): Promise<HTMLImageElement | null> {
  if (!src) return Promise.resolve(null);
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = src;
  });
}

const KIT_OPTS: [string, string][] = [
  ["home", "Home"],
  ["away", "Away"],
  ["default", "Hattrick default"],
  ["blank", "Blank"],
];

export function App(): JSX.Element {
  // Squad + roster
  const [squad, setSquad] = useState<SquadItem[]>([]);
  const [teamName, setTeamName] = useState("");
  const [crest, setCrest] = useState<HTMLImageElement | null>(null);
  const kitsRef = useRef<{ home: string | null; away: string | null }>({ home: null, away: null });
  const [teams, setTeams] = useState<{ id: number; name: string; primary: boolean }[]>([]);
  const [authHtml, setAuthHtml] = useState<"connected" | "demo" | "">("");

  // Layout
  const [rows, setRows] = useState(3);
  const [stairH, setStairH] = useState(25);
  const [stairTop, setStairTop] = useState("#d3d3d3");
  const [stairFront, setStairFront] = useState("#dccece");
  const [stagger, setStagger] = useState(true);

  // Show
  const [showName, setShowName] = useState(true);
  const [showNames, setShowNames] = useState(true);
  const [showStairs, setShowStairs] = useState(true);

  // Text
  const [allFonts, setAllFonts] = useState<string[]>([]);
  const [headerFont, setHeaderFont] = useState("Rosetta");
  const [headerStyle, setHeaderStyle] = useState("400:0");
  const [headerSize, setHeaderSize] = useState(52);
  const [headerColor, setHeaderColor] = useState("#ffffff");
  const [namesFont, setNamesFont] = useState("Roboto");
  const [namesStyle, setNamesStyle] = useState("400:0");
  const [namesSize, setNamesSize] = useState(15);
  const [namesColor, setNamesColor] = useState("#ffffff");

  // Background
  const [bgColor, setBgColor] = useState("#3f7137");
  const [bgAlpha, setBgAlpha] = useState(100);
  const [showBg, setShowBg] = useState(true);
  const [bgFit, setBgFit] = useState("cover");
  const [bgPosition, setBgPosition] = useState("center");
  const [background, setBackground] = useState<HTMLImageElement | null>(null);
  const [bgName, setBgName] = useState("");

  // Badge (top-left)
  const [showBadge, setShowBadge] = useState(true);
  const [badgeScale, setBadgeScale] = useState(100);
  const [badgeShadow, setBadgeShadow] = useState(false);
  const [badge, setBadge] = useState<HTMLImageElement | null>(null);
  const [badgeName, setBadgeName] = useState("");

  // Crest (top-right)
  const [showCrest, setShowCrest] = useState(true);
  const [crestScale, setCrestScale] = useState(100);
  const [crestShadow, setCrestShadow] = useState(false);
  const [crestOverride, setCrestOverride] = useState<HTMLImageElement | null>(null);
  const [crestName, setCrestName] = useState("");

  // Kits
  const [playersKit, setPlayersKit] = useState("home");
  const [keepersKit, setKeepersKit] = useState("away");
  const [staffKit, setStaffKit] = useState("blank");
  const [customKits, setCustomKits] = useState<Record<string, string>>({});

  const [status, setStatus] = useState("");
  const [loading, setLoading] = useState(0); // 0 = idle, else count rendered
  const [total, setTotal] = useState(0);
  const [tick, setTick] = useState(0); // bumped when figures/stairs/fonts change

  const figureCache = useRef(new Map<string, RenderOutput | null>());
  const composed = useRef<HTMLCanvasElement | null>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const stairsImg = useRef<HTMLImageElement | null>(null);

  // --- Fonts: load the list once, seed default styles. ----------------------
  useEffect(() => {
    void loadFontList().then(setAllFonts);
    void document.fonts.ready.then(() => setTick((t) => t + 1));
  }, []);

  // --- Stairs tile: regenerate when height/colours change; recompose on load.
  useEffect(() => {
    const img = new Image();
    img.onload = () => {
      stairsImg.current = img;
      setTick((t) => t + 1);
    };
    img.src = stairTileUrl(stairH || DEFAULT_FRONT, { top: stairTop, front: stairFront });
  }, [stairH, stairTop, stairFront]);

  function kitUrlFor(choice: string): string | null {
    if (choice === "home") return kitsRef.current.home;
    if (choice === "away") return kitsRef.current.away;
    if (choice === "default") return "/default-kit.json";
    if (choice === "blank") return "/blank-kit.json";
    if (choice.startsWith("upload:")) return customKits[choice.slice(7)] ?? null;
    return null;
  }
  const kitChoiceFor = (item: SquadItem): string =>
    item.role === "keeper" ? keepersKit : item.role === "staff" ? staffKit : playersKit;
  const figureKey = (item: SquadItem): string =>
    `${item.id}|${kitUrlFor(kitChoiceFor(item)) ?? "own"}`;
  const inputsFor = (item: SquadItem): RenderInputs => {
    const override = kitUrlFor(kitChoiceFor(item));
    return override ? { ...item.inputs, kitJson: override } : item.inputs;
  };

  // --- Render every figure once into the cache (keyed by id|kit). -----------
  const renderSig = squad.map((i) => `${i.id}:${i.role}`).join(",");
  useEffect(() => {
    if (!squad.length) return;
    let cancelled = false;
    (async () => {
      const temp = document.createElement("div");
      temp.style.cssText = "position:absolute;left:-9999px;top:0";
      document.body.appendChild(temp);
      setTotal(squad.length);
      let done = 0;
      for (const item of squad) {
        if (cancelled) break;
        setLoading(done + 1);
        const key = figureKey(item);
        if (!figureCache.current.has(key)) {
          const holder = document.createElement("div");
          temp.appendChild(holder);
          try {
            figureCache.current.set(key, await renderInputs(inputsFor(item), holder, ENGINE));
          } catch (err) {
            console.error(`figure ${item.id}`, err);
            figureCache.current.set(key, null);
          }
        }
        done++;
      }
      temp.remove();
      if (!cancelled) {
        setLoading(0);
        setTick((t) => t + 1);
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [renderSig, playersKit, keepersKit, staffKit, customKits]);

  // --- Recompose the canvas whenever anything composition-related changes. ---
  const recompose = useCallback(() => {
    const stage = stageRef.current;
    if (!stage) return;
    if (loading > 0) return; // the loader effect owns the stage while rendering
    const enabled = squad.filter((i) => i.enabled);
    if (enabled.length === 0) {
      composed.current = null;
      const empty = document.createElement("div");
      empty.className = "stage-msg";
      empty.textContent = squad.length ? "No players selected." : "Loading…";
      stage.replaceChildren(empty);
      return;
    }
    const opts: LayoutOptions = {
      ...DEFAULT_LAYOUT,
      rows,
      rowRise: stairRowRise(stairH || DEFAULT_FRONT),
      stagger,
    };
    const rendered: RenderOutput[] = [];
    const widths: number[] = [];
    const members: { number: number; name: string }[] = [];
    for (const item of enabled) {
      const c = figureCache.current.get(figureKey(item));
      if (!c) continue;
      const { w, h } = naturalSize(c);
      rendered.push(c);
      widths.push(h > 0 ? w * (opts.figureHeight / h) : opts.figureWidth);
      members.push({ number: item.number, name: item.name });
    }
    const hs = styleParts(headerStyle);
    const ns = styleParts(namesStyle);
    const meta: PhotoMeta = {
      teamName: showName ? teamName : undefined,
      crest: showCrest ? (crestOverride ?? crest) : null,
      crestShadow,
      crestScale: crestScale / 100,
      badge: showBadge ? badge : null,
      badgeShadow,
      badgeScale: badgeScale / 100,
      members: showNames ? members : [],
      bgColor: bgFill(bgColor, bgAlpha),
      headerFont: headerFont || undefined,
      headerWeight: hs.weight,
      headerItalic: hs.italic,
      headerSize,
      headerColor,
      namesFont: namesFont || undefined,
      namesWeight: ns.weight,
      namesItalic: ns.italic,
      namesSize,
      namesColor,
      bgFit: bgFit as PhotoMeta["bgFit"],
      bgPosition,
    };
    const canvas = composeTeamPhoto(
      rendered,
      computeLayout(widths, opts),
      opts,
      showBg ? background : null,
      meta,
      showStairs ? stairsImg.current : null,
    );
    canvas.style.maxWidth = "100%";
    composed.current = canvas;
    stage.replaceChildren(canvas);
  }, [
    squad, rows, stairH, stagger, showName, showNames, showStairs, showBg, showCrest, showBadge,
    teamName, crest, crestOverride, crestShadow, crestScale, badge, badgeShadow, badgeScale,
    bgColor, bgAlpha, bgFit, bgPosition, background, headerFont, headerStyle, headerSize,
    headerColor, namesFont, namesStyle, namesSize, namesColor, loading, tick,
    playersKit, keepersKit, staffKit, customKits,
  ]);

  useEffect(() => {
    recompose();
  }, [recompose]);

  // --- Loader in the stage while figures render. ----------------------------
  useEffect(() => {
    const stage = stageRef.current;
    if (!stage || loading === 0) return;
    stage.innerHTML =
      `<div class="loader"><div class="spinner-wrap"><div class="spinner"></div>` +
      `<div class="loader-count">${loading}/${total}</div></div></div>`;
  }, [loading, total]);

  // --- Roster loading. ------------------------------------------------------
  async function loadRoster(teamId?: number): Promise<void> {
    const url = `${API_BASE}/api/squad${teamId ? `?teamId=${teamId}` : ""}`;
    const res = await fetch(url, { credentials: "include" });
    if (!res.ok) throw new Error(await res.text());
    const data = (await res.json()) as {
      teamName: string;
      crest: string | null;
      homeKit: string | null;
      awayKit: string | null;
      players: SquadPlayer[];
      staff?: { id: number; name: string; avatar: PlayerAvatar | null }[];
    };
    kitsRef.current = { home: data.homeKit, away: data.awayKit };
    const players: SquadItem[] = data.players
      .filter((p) => p.avatar)
      .map((p) => {
        const number = p.number === 100 ? 0 : p.number;
        return {
          id: p.id,
          number,
          name: p.name || (number ? `#${number}` : "Unnamed"),
          enabled: true,
          staff: false,
          role: (p.keeper ? "keeper" : "player") as Role,
          inputs: avatarInputs(p.avatar!, p.gender),
        };
      });
    const staff: SquadItem[] = (data.staff ?? [])
      .filter((s) => s.avatar)
      .map((s) => ({
        id: s.id,
        number: 0,
        name: s.name || "Staff",
        enabled: true,
        staff: true,
        role: "staff" as Role,
        inputs: avatarInputs(s.avatar!, 1),
      }));
    figureCache.current.clear();
    setTeamName(data.teamName);
    setCrest(await loadImage(data.crest));
    setSquad([...players, ...staff]);
  }

  async function loadDemo(): Promise<void> {
    kitsRef.current = { home: null, away: null };
    figureCache.current.clear();
    setTeamName("Demo FC");
    setCrest(null);
    setSquad(
      Array.from({ length: 22 }, (_, i) => ({
        id: i + 1,
        number: i + 1,
        name: `Player ${i + 1}`,
        enabled: true,
        staff: false,
        role: (i === 0 ? "keeper" : "player") as Role,
        inputs: randomRenderInputs(),
      })),
    );
  }

  useEffect(() => {
    (async () => {
      let connected = false;
      try {
        const res = await fetch(`${API_BASE}/api/auth/status`, { credentials: "include" });
        connected = res.ok && (await res.json()).connected === true;
      } catch {
        /* backend unreachable */
      }
      if (!connected) {
        setAuthHtml("demo");
        await loadDemo();
        return;
      }
      setAuthHtml("connected");
      try {
        const res = await fetch(`${API_BASE}/api/teams`, { credentials: "include" });
        if (res.ok) {
          const { teams: ts } = (await res.json()) as {
            teams: { id: number; name: string; primary: boolean }[];
          };
          if (ts.length > 1) setTeams(ts);
        }
      } catch {
        /* ignore */
      }
      await loadRoster();
    })().catch((err) =>
      setStatus("Error: " + (err instanceof Error ? err.message : String(err))),
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // --- Squad list ops. ------------------------------------------------------
  const toggle = (id: number): void =>
    setSquad((s) => s.map((i) => (i.id === id ? { ...i, enabled: !i.enabled } : i)));
  const setRole = (id: number, role: Role): void =>
    setSquad((s) => s.map((i) => (i.id === id ? { ...i, role } : i)));
  const move = (index: number, delta: number): void =>
    setSquad((s) => {
      const to = index + delta;
      if (to < 0 || to >= s.length) return s;
      const next = [...s];
      [next[index], next[to]] = [next[to]!, next[index]!];
      return next;
    });

  // --- File uploads. --------------------------------------------------------
  function onImageUpload(
    file: File | undefined,
    setImg: (i: HTMLImageElement | null) => void,
    setName: (n: string) => void,
  ): void {
    if (!file) return;
    const img = new Image();
    img.onload = () => {
      setImg(img);
      setName(file.name);
    };
    img.src = URL.createObjectURL(file);
  }
  function onKitUpload(files: FileList | null): void {
    if (!files) return;
    const add: Record<string, string> = {};
    for (const file of Array.from(files)) {
      const name = file.name.replace(/\.json$/i, "").trim() || "Custom kit";
      add[name] = URL.createObjectURL(file);
    }
    setCustomKits((c) => ({ ...c, ...add }));
  }
  async function onFontUpload(files: FileList | null): Promise<void> {
    if (!files) return;
    for (const file of Array.from(files)) {
      const family = file.name.replace(/\.(ttf|otf|woff2?)$/i, "").trim() || "Custom font";
      try {
        const face = new FontFace(family, await file.arrayBuffer());
        await face.load();
        document.fonts.add(face);
        customFonts.add(family);
      } catch (err) {
        console.error("font upload", err);
      }
    }
    setAllFonts((f) => [...new Set([...customFonts, ...f])]);
  }

  function pickHeaderFont(family: string): void {
    setHeaderFont(family);
    const v = defaultStyle(family, "header");
    setHeaderStyle(v);
    const { weight, italic } = styleParts(v);
    void ensureVariant(family, weight, italic).then(() => setTick((t) => t + 1));
  }
  function pickNamesFont(family: string): void {
    setNamesFont(family);
    const v = defaultStyle(family, "names");
    setNamesStyle(v);
    const { weight, italic } = styleParts(v);
    void ensureVariant(family, weight, italic).then(() => setTick((t) => t + 1));
  }

  function exportPng(): void {
    if (!composed.current) {
      setStatus("Nothing to export yet.");
      return;
    }
    const link = document.createElement("a");
    link.download = "team-photo.png";
    link.href = composed.current.toDataURL("image/png");
    link.click();
  }

  const kitSelect = (
    value: string,
    set: (v: string) => void,
  ): JSX.Element => (
    <select className="font-style" value={value} onChange={(e) => set(e.target.value)}>
      {KIT_OPTS.map(([v, t]) => (
        <option key={v} value={v}>
          {t}
        </option>
      ))}
      {Object.keys(customKits).map((n) => (
        <option key={n} value={`upload:${n}`}>
          Uploaded: {n}
        </option>
      ))}
    </select>
  );

  // --- Tab content. ---------------------------------------------------------
  const squadTab = (
    <div className="section-body" style={{ display: "flex", flexDirection: "column", minHeight: "100%" }}>
      <div style={{ marginBottom: 12 }}>
        {authHtml === "demo" && (
          <>
            <a href={`${API_BASE}/api/auth/login`} style={{ display: "block" }}>
              <button type="button">Connect</button>
            </a>
            <p className="demo-note">Not connected. Showing a random demo squad.</p>
          </>
        )}
        {authHtml === "connected" && (
          <span>
            Connected ·{" "}
            <a
              href="#"
              style={{ color: "var(--accent)" }}
              onClick={(e) => {
                e.preventDefault();
                fetch(`${API_BASE}/api/auth/logout`, { method: "POST", credentials: "include" }).finally(
                  () => location.reload(),
                );
              }}
            >
              disconnect
            </a>
          </span>
        )}
      </div>
      {teams.length > 1 && (
        <>
          <label htmlFor="team">Team</label>
          <select
            id="team"
            onChange={(e) =>
              loadRoster(Number(e.target.value)).catch((err) =>
                setStatus("Error: " + (err instanceof Error ? err.message : String(err))),
              )
            }
          >
            {teams.map((t) => (
              <option key={t.id} value={t.id} selected={t.primary}>
                {t.name}
              </option>
            ))}
          </select>
        </>
      )}
      <label>
        Squad <span className="team-name">{teamName}</span>
      </label>
      <div className="squad">
        {squad.map((item, i) => (
          <div key={item.id} className={`squad-item${item.enabled ? "" : " disabled"}`}>
            <input type="checkbox" checked={item.enabled} onChange={() => toggle(item.id)} />
            <span className="name">{item.number ? `${item.number}. ${item.name}` : item.name}</span>
            <select
              className="role"
              title="Kit group"
              value={item.role}
              onChange={(e) => setRole(item.id, e.target.value as Role)}
            >
              <option value="player">Player</option>
              <option value="keeper">Goalkeeper</option>
              <option value="staff">Staff</option>
            </select>
            <button type="button" className="mv" disabled={i === 0} onClick={() => move(i, -1)}>
              ↑
            </button>
            <button
              type="button"
              className="mv"
              disabled={i === squad.length - 1}
              onClick={() => move(i, 1)}
            >
              ↓
            </button>
          </div>
        ))}
      </div>
    </div>
  );

  const slider = (
    label: string,
    value: number,
    set: (n: number) => void,
    min: number,
    max: number,
    suffix = "",
  ): JSX.Element => (
    <>
      <label>{label}</label>
      <div className="slider-row">
        <input
          type="range"
          min={min}
          max={max}
          step={1}
          value={value}
          onChange={(e) => set(Number(e.target.value))}
        />
        <span className="slider-val">
          {value}
          {suffix}
        </span>
      </div>
    </>
  );

  const check = (label: string, value: boolean, set: (b: boolean) => void): JSX.Element => (
    <div className="check">
      <input type="checkbox" checked={value} onChange={(e) => set(e.target.checked)} />
      <label style={{ margin: 0 }}>{label}</label>
    </div>
  );

  const layoutTab = (
    <div className="section-body">
      {slider("Rows", rows, setRows, 1, Math.max(8, squad.length || 8))}
      {slider("Row height", stairH, setStairH, 20, 90)}
      <label>Step top colour</label>
      <input type="color" className="swatch" value={stairTop} onChange={(e) => setStairTop(e.target.value)} />
      <label>Step front colour</label>
      <input type="color" className="swatch" value={stairFront} onChange={(e) => setStairFront(e.target.value)} />
      {check("Stagger rows", stagger, setStagger)}
    </div>
  );

  const showTab = (
    <div className="section-body">
      {check("Team name", showName, setShowName)}
      {check("Player names", showNames, setShowNames)}
      {check("Stairs", showStairs, setShowStairs)}
    </div>
  );

  const styleSelect = (
    family: string,
    value: string,
    set: (v: string) => void,
    role: "header" | "names",
  ): JSX.Element => (
    <select
      className="font-style"
      value={value}
      onChange={(e) => {
        set(e.target.value);
        const { weight, italic } = styleParts(e.target.value);
        void ensureVariant(family, weight, italic).then(() => setTick((t) => t + 1));
      }}
    >
      {variantsFor(family).map((v) => (
        <option key={v.value} value={v.value}>
          {v.label}
        </option>
      ))}
    </select>
  );

  const textTab = (
    <div className="section-body">
      <label>Team name font</label>
      <div className="slider-row">
        <FontCombo value={headerFont} fonts={allFonts} onPick={pickHeaderFont} />
        <input
          type="color"
          className="swatch swatch-sm"
          value={headerColor}
          onChange={(e) => setHeaderColor(e.target.value)}
        />
      </div>
      {styleSelect(headerFont, headerStyle, setHeaderStyle, "header")}
      <div className="slider-row" style={{ marginTop: 6 }}>
        <input type="range" min={28} max={80} value={headerSize} onChange={(e) => setHeaderSize(Number(e.target.value))} />
        <span className="slider-val">{headerSize}</span>
      </div>

      <label>Player names font</label>
      <div className="slider-row">
        <FontCombo value={namesFont} fonts={allFonts} onPick={pickNamesFont} />
        <input
          type="color"
          className="swatch swatch-sm"
          value={namesColor}
          onChange={(e) => setNamesColor(e.target.value)}
        />
      </div>
      {styleSelect(namesFont, namesStyle, setNamesStyle, "names")}
      <div className="slider-row" style={{ marginTop: 6 }}>
        <input type="range" min={10} max={24} value={namesSize} onChange={(e) => setNamesSize(Number(e.target.value))} />
        <span className="slider-val">{namesSize}</span>
      </div>

      <label>Upload fonts</label>
      <input type="file" accept=".ttf,.otf,.woff,.woff2" multiple onChange={(e) => void onFontUpload(e.target.files)} />
    </div>
  );

  const bgTab = (
    <div className="section-body">
      <label>Colour</label>
      <input type="color" className="swatch" value={bgColor} onChange={(e) => setBgColor(e.target.value)} />
      {slider("Opacity", bgAlpha, setBgAlpha, 0, 100, "%")}
      {check("Show image", showBg, setShowBg)}
      <label>Image</label>
      <input type="file" accept="image/*" onChange={(e) => onImageUpload(e.target.files?.[0], setBackground, setBgName)} />
      {background && bgName && (
        <div className="uploads">
          <div className="upload-item">
            <span className="name">{bgName}</span>
            <button type="button" className="upload-del" aria-label="Remove" onClick={() => { setBackground(null); setBgName(""); }}>
              ×
            </button>
          </div>
        </div>
      )}
      <label>Image fit</label>
      <select className="font-style" value={bgFit} onChange={(e) => setBgFit(e.target.value)}>
        <option value="cover">Cover</option>
        <option value="contain">Contain</option>
        <option value="stretch">Stretch</option>
        <option value="tile">Tile</option>
      </select>
      <label>Image position</label>
      <select className="font-style" value={bgPosition} onChange={(e) => setBgPosition(e.target.value)}>
        {["center", "top", "bottom", "left", "right", "top-left", "top-right", "bottom-left", "bottom-right"].map(
          (p) => (
            <option key={p} value={p}>
              {p.replace("-", " ").replace(/^\w/, (c) => c.toUpperCase())}
            </option>
          ),
        )}
      </select>
    </div>
  );

  const imageTab = (
    which: "badge" | "crest",
  ): JSX.Element => {
    const isBadge = which === "badge";
    const show = isBadge ? showBadge : showCrest;
    const setShow = isBadge ? setShowBadge : setShowCrest;
    const scale = isBadge ? badgeScale : crestScale;
    const setScale = isBadge ? setBadgeScale : setCrestScale;
    const shadow = isBadge ? badgeShadow : crestShadow;
    const setShadow = isBadge ? setBadgeShadow : setCrestShadow;
    const img = isBadge ? badge : crestOverride;
    const name = isBadge ? badgeName : crestName;
    const setImg = isBadge ? setBadge : setCrestOverride;
    const setName = isBadge ? setBadgeName : setCrestName;
    return (
      <div className="section-body">
        {check(isBadge ? "Show logo (top left)" : "Show logo (top right)", show, setShow)}
        <label>{isBadge ? "Image" : "Image (overrides the team logo)"}</label>
        <input type="file" accept="image/*" onChange={(e) => onImageUpload(e.target.files?.[0], setImg, setName)} />
        {img && name && (
          <div className="uploads">
            <div className="upload-item">
              <span className="name">{name}</span>
              <button type="button" className="upload-del" aria-label="Remove" onClick={() => { setImg(null); setName(""); }}>
                ×
              </button>
            </div>
          </div>
        )}
        {slider("Size", scale, setScale, isBadge ? 50 : 50, isBadge ? 150 : 130, "%")}
        {check("Drop shadow", shadow, setShadow)}
      </div>
    );
  };

  const kitsTab = (
    <div className="section-body">
      <label>Players kit</label>
      {kitSelect(playersKit, setPlayersKit)}
      <label>Keepers kit</label>
      {kitSelect(keepersKit, setKeepersKit)}
      <label>Staff kit</label>
      {kitSelect(staffKit, setStaffKit)}
      <label>Upload kits</label>
      <input type="file" accept=".json,application/json" multiple onChange={(e) => onKitUpload(e.target.files)} />
    </div>
  );

  const exportTab = (
    <div className="section-body">
      <button type="button" onClick={exportPng}>
        PNG
      </button>
      <div id="status">{status}</div>
    </div>
  );

  return (
    <AppShell
      title="Team Photo"
      controls={
        <Tabs
          tabs={[
            { id: "squad", label: "Squad", content: squadTab },
            { id: "layout", label: "Layout", content: layoutTab },
            { id: "display", label: "Show", content: showTab },
            { id: "text", label: "Text", content: textTab },
            { id: "bg", label: "Background", content: bgTab },
            { id: "badge", label: "Logo (top left)", content: imageTab("badge") },
            { id: "crest", label: "Logo (top right)", content: imageTab("crest") },
            { id: "kits", label: "Kits", content: kitsTab },
            { id: "export", label: "Export", content: exportTab },
          ]}
        />
      }
    >
      <div id="stage" className="panel" ref={stageRef} />
    </AppShell>
  );
}
