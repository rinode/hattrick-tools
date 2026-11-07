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
import {
  composeTeamPhoto,
  computeLayout,
  DEFAULT_FRONT,
  DEFAULT_LAYOUT,
  naturalSize,
  stairRowRise,
  stairTileUrl,
  type LayoutOptions,
  type PhotoMeta,
} from "hattrick-team-photo-compose";
import {
  customFonts,
  defaultStyle,
  ensureVariant,
  loadFontList,
  styleParts,
} from "./fonts.js";
import { Loader } from "./components/Loader.js";
import { SquadTab, type Role, type SquadRow } from "./components/SquadTab.js";
import { LayoutTab } from "./components/LayoutTab.js";
import { TextTab } from "./components/TextTab.js";
import { BackgroundTab } from "./components/BackgroundTab.js";
import { LogoTab } from "./components/LogoTab.js";
import { KitsTab } from "./components/KitsTab.js";
import { ExportTab } from "./components/ExportTab.js";
import styles from "./App.module.css";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");
const API_BASE = (import.meta.env.VITE_API_BASE ?? BASE).replace(/\/$/, "");
const ENGINE = {
  assetOrigin: location.origin + BASE,
  slimKitUrl: `${BASE}/Club/Players/Avatars/slimkitrender.js`,
  fullBodiesUrl: `${BASE}/Club/Players/Avatars/HT.FullBodies.js`,
};

interface SquadItem extends SquadRow {
  staff: boolean;
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

export function App(): JSX.Element {
  // Squad + roster
  const [squad, setSquad] = useState<SquadItem[]>([]);
  const [teamName, setTeamName] = useState("");
  const [crest, setCrest] = useState<HTMLImageElement | null>(null);
  const kitsRef = useRef<{ home: string | null; away: string | null }>({ home: null, away: null });
  const [teams, setTeams] = useState<{ id: number; name: string; primary: boolean }[]>([]);
  const [authState, setAuthState] = useState<"connected" | "demo" | "">("");

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
  const [uploadedFonts, setUploadedFonts] = useState<string[]>([]);
  const [headerFont, setHeaderFont] = useState("Rosetta");
  const [headerStyle, setHeaderStyle] = useState("400:0");
  const [headerSize, setHeaderSize] = useState(52);
  const [headerColor, setHeaderColor] = useState("#ffffff");
  const [headerShadow, setHeaderShadow] = useState(true);
  const [namesFont, setNamesFont] = useState("Roboto");
  const [namesStyle, setNamesStyle] = useState("400:0");
  const [namesSize, setNamesSize] = useState(15);
  const [namesColor, setNamesColor] = useState("#ffffff");
  const [namesShadow, setNamesShadow] = useState(true);

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
    if (loading > 0) return; // the loader overlay owns the stage while rendering
    const enabled = squad.filter((i) => i.enabled);
    if (enabled.length === 0) {
      composed.current = null;
      const empty = document.createElement("div");
      empty.className = styles.msg ?? "";
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
      headerShadow,
      namesFont: namesFont || undefined,
      namesWeight: ns.weight,
      namesItalic: ns.italic,
      namesSize,
      namesColor,
      namesShadow,
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
    squad,
    rows,
    stairH,
    stagger,
    showName,
    showNames,
    showStairs,
    showBg,
    showCrest,
    showBadge,
    teamName,
    crest,
    crestOverride,
    crestShadow,
    crestScale,
    badge,
    badgeShadow,
    badgeScale,
    bgColor,
    bgAlpha,
    bgFit,
    bgPosition,
    background,
    headerFont,
    headerStyle,
    headerSize,
    headerColor,
    headerShadow,
    namesFont,
    namesStyle,
    namesSize,
    namesColor,
    namesShadow,
    loading,
    tick,
    playersKit,
    keepersKit,
    staffKit,
    customKits,
  ]);

  useEffect(() => {
    recompose();
  }, [recompose]);

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
        setAuthState("demo");
        await loadDemo();
        return;
      }
      setAuthState("connected");
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
    })().catch((err) => setStatus("Error: " + (err instanceof Error ? err.message : String(err))));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const reportError = (err: unknown): void =>
    setStatus("Error: " + (err instanceof Error ? err.message : String(err)));

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
  const disconnect = (): void => {
    fetch(`${API_BASE}/api/auth/logout`, { method: "POST", credentials: "include" }).finally(() =>
      location.reload(),
    );
  };

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
  function removeKit(name: string): void {
    setCustomKits((c) => {
      const next = { ...c };
      delete next[name];
      return next;
    });
  }
  async function onFontUpload(files: FileList | null): Promise<void> {
    if (!files) return;
    const added: string[] = [];
    for (const file of Array.from(files)) {
      const family = file.name.replace(/\.(ttf|otf|woff2?)$/i, "").trim() || "Custom font";
      try {
        const face = new FontFace(family, await file.arrayBuffer());
        await face.load();
        document.fonts.add(face);
        customFonts.add(family);
        added.push(family);
      } catch (err) {
        console.error("font upload", err);
      }
    }
    setUploadedFonts((u) => [...new Set([...u, ...added])]);
    setAllFonts((f) => [...new Set([...customFonts, ...f])]);
  }
  function removeFont(name: string): void {
    customFonts.delete(name);
    setUploadedFonts((u) => u.filter((n) => n !== name));
    setAllFonts((f) => f.filter((n) => n !== name));
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
  function pickHeaderStyle(v: string): void {
    setHeaderStyle(v);
    const { weight, italic } = styleParts(v);
    void ensureVariant(headerFont, weight, italic).then(() => setTick((t) => t + 1));
  }
  function pickNamesStyle(v: string): void {
    setNamesStyle(v);
    const { weight, italic } = styleParts(v);
    void ensureVariant(namesFont, weight, italic).then(() => setTick((t) => t + 1));
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

  const fontUploads = uploadedFonts.map((n) => ({ name: n, onRemove: () => removeFont(n) }));

  return (
    <AppShell
      title="Team Photo"
      controls={
        <Tabs
          storageKey="ht-team-photo-tab"
          tabs={[
            {
              id: "squad",
              label: "Squad",
              content: (
                <SquadTab
                  authState={authState}
                  loginUrl={`${API_BASE}/api/auth/login`}
                  onDisconnect={disconnect}
                  teams={teams}
                  onSelectTeam={(id) => loadRoster(id).catch(reportError)}
                  teamName={teamName}
                  squad={squad}
                  onToggle={toggle}
                  onSetRole={setRole}
                  onMove={move}
                />
              ),
            },
            {
              id: "layout",
              label: "Layout",
              content: (
                <LayoutTab
                  rows={rows}
                  setRows={setRows}
                  maxRows={Math.max(8, squad.length || 8)}
                  stairH={stairH}
                  setStairH={setStairH}
                  stairTop={stairTop}
                  setStairTop={setStairTop}
                  stairFront={stairFront}
                  setStairFront={setStairFront}
                  stagger={stagger}
                  setStagger={setStagger}
                  showStairs={showStairs}
                  setShowStairs={setShowStairs}
                />
              ),
            },
            {
              id: "text",
              label: "Text",
              content: (
                <TextTab
                  allFonts={allFonts}
                  showName={showName}
                  setShowName={setShowName}
                  headerFont={headerFont}
                  onHeaderFont={pickHeaderFont}
                  headerStyle={headerStyle}
                  onHeaderStyle={pickHeaderStyle}
                  headerSize={headerSize}
                  setHeaderSize={setHeaderSize}
                  headerColor={headerColor}
                  setHeaderColor={setHeaderColor}
                  headerShadow={headerShadow}
                  setHeaderShadow={setHeaderShadow}
                  showNames={showNames}
                  setShowNames={setShowNames}
                  namesFont={namesFont}
                  onNamesFont={pickNamesFont}
                  namesStyle={namesStyle}
                  onNamesStyle={pickNamesStyle}
                  namesSize={namesSize}
                  setNamesSize={setNamesSize}
                  namesColor={namesColor}
                  setNamesColor={setNamesColor}
                  namesShadow={namesShadow}
                  setNamesShadow={setNamesShadow}
                  fontUploads={fontUploads}
                  onFontUpload={(f) => void onFontUpload(f)}
                />
              ),
            },
            {
              id: "bg",
              label: "Background",
              content: (
                <BackgroundTab
                  bgColor={bgColor}
                  setBgColor={setBgColor}
                  bgAlpha={bgAlpha}
                  setBgAlpha={setBgAlpha}
                  showBg={showBg}
                  setShowBg={setShowBg}
                  onUpload={(f) => onImageUpload(f, setBackground, setBgName)}
                  bgName={background ? bgName : ""}
                  onRemove={() => {
                    setBackground(null);
                    setBgName("");
                  }}
                  bgFit={bgFit}
                  setBgFit={setBgFit}
                  bgPosition={bgPosition}
                  setBgPosition={setBgPosition}
                />
              ),
            },
            {
              id: "badge",
              label: "Logo (top left)",
              content: (
                <LogoTab
                  showLabel="Show logo (top left)"
                  imageLabel="Image"
                  show={showBadge}
                  setShow={setShowBadge}
                  onUpload={(f) => onImageUpload(f, setBadge, setBadgeName)}
                  name={badge ? badgeName : ""}
                  onRemove={() => {
                    setBadge(null);
                    setBadgeName("");
                  }}
                  scale={badgeScale}
                  setScale={setBadgeScale}
                  scaleMin={50}
                  scaleMax={150}
                  shadow={badgeShadow}
                  setShadow={setBadgeShadow}
                />
              ),
            },
            {
              id: "crest",
              label: "Logo (top right)",
              content: (
                <LogoTab
                  showLabel="Show logo (top right)"
                  imageLabel="Image (overrides the team logo)"
                  show={showCrest}
                  setShow={setShowCrest}
                  onUpload={(f) => onImageUpload(f, setCrestOverride, setCrestName)}
                  name={crestOverride ? crestName : ""}
                  onRemove={() => {
                    setCrestOverride(null);
                    setCrestName("");
                  }}
                  scale={crestScale}
                  setScale={setCrestScale}
                  scaleMin={50}
                  scaleMax={130}
                  shadow={crestShadow}
                  setShadow={setCrestShadow}
                />
              ),
            },
            {
              id: "kits",
              label: "Kits",
              content: (
                <KitsTab
                  playersKit={playersKit}
                  setPlayersKit={setPlayersKit}
                  keepersKit={keepersKit}
                  setKeepersKit={setKeepersKit}
                  staffKit={staffKit}
                  setStaffKit={setStaffKit}
                  customKits={customKits}
                  onKitUpload={onKitUpload}
                  onRemoveKit={removeKit}
                />
              ),
            },
            {
              id: "export",
              label: "Export",
              content: <ExportTab onExport={exportPng} status={status} />,
            },
          ]}
        />
      }
    >
      <div className={styles.stage}>
        <div className={styles.host} ref={stageRef} />
        {loading > 0 && (
          <div className={styles.overlay}>
            <Loader n={loading} total={total} />
          </div>
        )}
      </div>
    </AppShell>
  );
}
