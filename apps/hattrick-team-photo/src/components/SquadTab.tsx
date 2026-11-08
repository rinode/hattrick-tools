import type { JSX } from "react";
import { Checkbox } from "@base-ui/react/checkbox";
import { Select, type SelectOption } from "hattrick-ui";
import styles from "./SquadTab.module.css";

export type Role = "player" | "keeper" | "staff";

const ROLE_OPTS: SelectOption[] = [
  { value: "player", label: "Player" },
  { value: "keeper", label: "Goalkeeper" },
  { value: "staff", label: "Staff" },
];

export interface SquadRow {
  id: number;
  number: number;
  name: string;
  enabled: boolean;
  role: Role;
}

function poseLabel(n: number): string {
  return n === 13 ? "Seated" : `Style ${n}`;
}

export function SquadTab(props: {
  authState: "connected" | "demo" | "";
  loginUrl: string;
  onDisconnect: () => void;
  teams: { id: number; name: string; primary: boolean }[];
  onSelectTeam: (id: number) => void;
  teamName: string;
  squad: SquadRow[];
  onToggle: (id: number) => void;
  onSetRole: (id: number, role: Role) => void;
  onMove: (index: number, delta: number) => void;
  /** Player currently selected for a style override, or null. */
  styledId: number | null;
  onSelectPlayer: (id: number) => void;
  /** Per-player body-type (pose) overrides, by player id. */
  poses: Record<number, number>;
  bodyTypes: readonly number[];
  onSetPose: (id: number, bodyType: number) => void;
  onResetPose: (id: number) => void;
}): JSX.Element {
  const styled = props.squad.find((p) => p.id === props.styledId) ?? null;
  const poseOpts: SelectOption[] = [
    { value: "", label: "Default" },
    ...props.bodyTypes.map((n) => ({ value: String(n), label: poseLabel(n) })),
  ];
  return (
    <div className={styles.body}>
      <div className={styles.auth}>
        {props.authState === "demo" && (
          <>
            <a href={props.loginUrl} className={styles.connect}>
              <button type="button">Connect</button>
            </a>
            <p className={styles.note}>Not connected. Showing a random demo squad.</p>
          </>
        )}
        {props.authState === "connected" && (
          <span>
            Connected ·{" "}
            <a
              href="#"
              className={styles.disconnect}
              onClick={(e) => {
                e.preventDefault();
                props.onDisconnect();
              }}
            >
              disconnect
            </a>
          </span>
        )}
      </div>

      {props.teams.length > 1 && (
        <>
          <label>Team</label>
          <Select
            value={String(props.teams.find((t) => t.primary)?.id ?? props.teams[0]?.id ?? "")}
            onChange={(v) => props.onSelectTeam(Number(v))}
            options={props.teams.map((t) => ({ value: String(t.id), label: t.name }))}
          />
        </>
      )}

      <label>
        Squad <span className={styles.teamName}>{props.teamName}</span>
      </label>
      <div className={styles.squad}>
        {props.squad.map((item, i) => (
          <div key={item.id} className={`${styles.item} ${item.enabled ? "" : styles.disabled}`}>
            <Checkbox.Root
              className={styles.box}
              checked={item.enabled}
              onCheckedChange={() => props.onToggle(item.id)}
            >
              <Checkbox.Indicator className={styles.indicator}>
                <svg viewBox="0 0 14 14" width="10" height="10" aria-hidden="true">
                  <path
                    d="M11.5 3.5 5.5 10 2.5 7"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </Checkbox.Indicator>
            </Checkbox.Root>
            <button
              type="button"
              className={`${styles.name} ${item.id === props.styledId ? styles.selected : ""}`}
              title="Override this player's style"
              onClick={() => props.onSelectPlayer(item.id)}
            >
              {item.number ? `${item.number}. ${item.name}` : item.name}
              {props.poses[item.id] != null && (
                <span className={styles.poseTag}>{poseLabel(props.poses[item.id]!)}</span>
              )}
            </button>
            <Select
              compact
              title="Kit group"
              value={item.role}
              onChange={(v) => props.onSetRole(item.id, v as Role)}
              options={ROLE_OPTS}
            />
            <button
              type="button"
              className={styles.mv}
              disabled={i === 0}
              onClick={() => props.onMove(i, -1)}
            >
              ↑
            </button>
            <button
              type="button"
              className={styles.mv}
              disabled={i === props.squad.length - 1}
              onClick={() => props.onMove(i, 1)}
            >
              ↓
            </button>
          </div>
        ))}
      </div>

      <label>Player style</label>
      {styled ? (
        <div className={styles.style}>
          <span className={styles.styleName}>{styled.name}</span>
          <Select
            compact
            title="Pose"
            value={String(props.poses[styled.id] ?? "")}
            onChange={(v) =>
              v === "" ? props.onResetPose(styled.id) : props.onSetPose(styled.id, Number(v))
            }
            options={poseOpts}
          />
          <button
            type="button"
            className={styles.reset}
            disabled={props.poses[styled.id] == null}
            onClick={() => props.onResetPose(styled.id)}
          >
            Reset
          </button>
        </div>
      ) : (
        <p className={styles.note}>Select a player above to override their pose.</p>
      )}
    </div>
  );
}
