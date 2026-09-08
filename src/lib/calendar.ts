import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import { DEFAULT_CALENDAR, type Holiday, type WorkCalendar } from "@/lib/calendar-types";
export * from "@/lib/calendar-types";

/** Calendrier de travail (jours ouvres, heures, feries), memoise par requete. */
export const getCalendar = cache(async (): Promise<WorkCalendar> => {
  const supabase = await createClient();
  const [{ data: s }, { data: h }] = await Promise.all([
    supabase.from("calendar_settings").select("work_days,hours_per_day").eq("id", 1).maybeSingle(),
    supabase.from("holidays").select("id,day,label,recurring").order("day"),
  ]);
  return {
    workDays: s?.work_days?.length ? (s.work_days as number[]) : DEFAULT_CALENDAR.workDays,
    hoursPerDay: s ? Number(s.hours_per_day) : DEFAULT_CALENDAR.hoursPerDay,
    holidays: ((h ?? []) as Holiday[]),
  };
});
