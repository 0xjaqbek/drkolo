// @vitest-environment node

import { readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

const migration = readFileSync(
  new URL("../../migrations/009_agent_operations_hardening.sql", import.meta.url),
  "utf8",
);
const compactSql = migration.replace(/\s+/g, " ");
const canonicalSql = compactSql
  .replace(/\(\s+/g, "(")
  .replace(/\s+\)/g, ")");

function overlaps(
  leftStart: number,
  leftDuration: number,
  rightStart: number,
  rightDuration: number,
): boolean {
  return leftStart < rightStart + rightDuration &&
    leftStart + leftDuration > rightStart;
}

describe("migration 009 duration-aware scheduling", () => {
  it("uses full-duration half-open ranges for overlap decisions", () => {
    expect(overlaps(10 * 60, 60, 10 * 60 + 30, 60)).toBe(true);
    expect(overlaps(10 * 60, 60, 11 * 60, 60)).toBe(false);

    expect(compactSql).toMatch(
      /pg_catalog\.make_interval\(\s*mins => pg_catalog\.coalesce\(\s*appointment\.estimated_duration_minutes,\s*60\s*\)\s*\)/,
    );
    expect(compactSql).toContain(
      "candidate.slot_start + interval '60 minutes' > appointment.appointment_date + appointment.arrival_time",
    );
  });

  it("serializes public and admin scheduling by a stable date key", () => {
    expect(compactSql.match(/pg_catalog\.pg_advisory_xact_lock\(/g))
      .toHaveLength(3);
    expect(compactSql).toContain(
      "p_appointment_date - date '2000-01-01'",
    );
    expect(compactSql).toContain(
      "v_target_date - date '2000-01-01'",
    );
  });

  it("detects active duration overlaps before retaining the equal-start guard", () => {
    expect(compactSql).toContain(
      "existing.appointment_date = candidate.appointment_date",
    );
    expect(compactSql).toContain(
      "existing.id < candidate.id",
    );
    expect(compactSql).toContain(
      "Cannot create service_appointments_active_slot_unique: found",
    );
    expect(compactSql).toContain(
      "create unique index if not exists service_appointments_active_slot_unique",
    );
  });

  it("defines service-role-only admin appointment RPCs with explicit returns", () => {
    for (const signature of [
      "create or replace function public.create_admin_appointment(",
      "create or replace function public.update_admin_appointment(",
    ]) {
      expect(compactSql).toContain(signature);
    }

    expect(compactSql).toContain(
      "revoke execute on function public.create_admin_appointment(",
    );
    expect(compactSql).toContain(
      "grant execute on function public.create_admin_appointment(",
    );
    expect(compactSql).toContain(
      "revoke execute on function public.update_admin_appointment(",
    );
    expect(compactSql).toContain(
      "grant execute on function public.update_admin_appointment(",
    );
    expect(compactSql).toContain("to service_role");
  });

  it("keeps note-only updates outside schedule revalidation", () => {
    expect(canonicalSql).toContain(
      "v_scheduling_change := (p_apply_status and p_status is distinct from v_existing.status) or (p_apply_appointment_date and p_appointment_date is distinct from v_existing.appointment_date) or (p_apply_arrival_time and p_arrival_time is distinct from v_existing.arrival_time) or (p_apply_estimated_duration_minutes and p_estimated_duration_minutes is distinct from v_existing.estimated_duration_minutes)",
    );
    expect(compactSql).toContain(
      "technician_note = case when p_apply_technician_note then p_technician_note else appointment.technician_note end",
    );
    expect(compactSql.indexOf("if v_target_status is null")).toBeGreaterThan(
      compactSql.indexOf(
        "if pg_catalog.coalesce(v_scheduling_change, false) then",
      ),
    );
  });
});
