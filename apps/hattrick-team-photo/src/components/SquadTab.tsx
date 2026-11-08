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
  /** Player ids that currently have a style override. */
  overriddenIds: Set<number>;
  /** Open the full style studio for a player. */
  onEditPlayer: (id: number) => void;
}): JSX.Element {
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
              className={`${styles.name} ${props.overriddenIds.has(item.id) ? styles.selected : ""}`}
              title="Open the style studio for this player"
              onClick={() => props.onEditPlayer(item.id)}
            >
              {item.number ? `${item.number}. ${item.name}` : item.name}
              {props.overriddenIds.has(item.id) && <span className={styles.poseTag}>styled</span>}
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

      <p className={styles.note}>
        Click a player to open the full style studio (pose, body, face, kit).
      </p>
    </div>
  );
}
