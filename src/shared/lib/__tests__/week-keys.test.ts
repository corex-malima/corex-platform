import { describe, expect, it } from "vitest";

import {
  getIsoWeekKey,
  getSunSatWeekKey,
  getWeekKey,
  getWeekStartIso,
  getWeekEndIso,
} from "../week-keys";

describe("week-keys", () => {
  describe("getIsoWeekKey", () => {
    it("devuelve YYWW para una fecha cualquiera (ISO 8601)", () => {
      // 2026-03-09 (lunes) → semana ISO 11 de 2026
      expect(getIsoWeekKey("2026-03-09")).toBe("2611");
    });

    it("aplica regla del jueves: 2025-12-30 (martes) pertenece a ISO semana 1 de 2026", () => {
      // jueves de la semana de 2025-12-30 es 2026-01-01 → semana ISO 1 / año 2026
      expect(getIsoWeekKey("2025-12-30")).toBe("2601");
    });

    it("aplica regla del jueves: 2027-01-01 (viernes) pertenece a ISO semana 53 de 2026", () => {
      // jueves de esa semana es 2026-12-31 → semana 53 / año 2026
      expect(getIsoWeekKey("2027-01-01")).toBe("2653");
    });

    it("primera semana del año regular: 2024-01-04 → semana 1 de 2024", () => {
      expect(getIsoWeekKey("2024-01-04")).toBe("2401");
    });

    it("devuelve null para fecha inválida", () => {
      expect(getIsoWeekKey("no-es-fecha")).toBe(null);
    });
  });

  describe("getSunSatWeekKey", () => {
    it("primer domingo del año empieza la semana 1", () => {
      // 2026-01-04 es domingo → semana 1
      expect(getSunSatWeekKey("2026-01-04")).toBe("2601");
      // 2026-01-05 (lunes) cae dentro de la misma semana sun→sat (4 al 10)
      expect(getSunSatWeekKey("2026-01-05")).toBe("2601");
      // 2026-01-10 (sábado) misma semana
      expect(getSunSatWeekKey("2026-01-10")).toBe("2601");
    });

    it("días antes del primer domingo pertenecen a la última semana del año previo", () => {
      // 2026-01-01 (jueves) — antes del primer domingo (2026-01-04) → última semana 2025
      const key = getSunSatWeekKey("2026-01-01");
      expect(key).not.toBeNull();
      expect(key!.startsWith("25")).toBe(true);
    });

    it("semana 2 inicia el segundo domingo", () => {
      // segundo domingo 2026 = 2026-01-11
      expect(getSunSatWeekKey("2026-01-11")).toBe("2602");
    });

    it("difiere de ISO en bordes de año", () => {
      // 2025-12-30 (martes): ISO lo cuenta como semana 1 de 2026; sun-sat lo cuenta dentro de la semana del 2025-12-28 (último domingo de 2025)
      const iso = getIsoWeekKey("2025-12-30");
      const sun = getSunSatWeekKey("2025-12-30");
      expect(iso).toBe("2601");
      expect(sun).not.toBe(iso);
      expect(sun!.startsWith("25")).toBe(true);
    });
  });

  describe("getWeekKey (dispatcher)", () => {
    it("delega correctamente según el tipo", () => {
      expect(getWeekKey("2026-03-09", "iso")).toBe(getIsoWeekKey("2026-03-09"));
      expect(getWeekKey("2026-03-09", "sunsat")).toBe(getSunSatWeekKey("2026-03-09"));
    });
  });

  describe("getWeekStartIso / getWeekEndIso", () => {
    it("ISO: lunes de la semana", () => {
      // 2026-03-09 (lun) → semana lun 09 a dom 15
      expect(getWeekStartIso("2026-03-11", "iso")).toBe("2026-03-09");
      expect(getWeekEndIso("2026-03-11", "iso")).toBe("2026-03-15");
    });

    it("sunsat: domingo de la semana", () => {
      // 2026-03-11 (mié) en semana dom 08 a sáb 14
      expect(getWeekStartIso("2026-03-11", "sunsat")).toBe("2026-03-08");
      expect(getWeekEndIso("2026-03-11", "sunsat")).toBe("2026-03-14");
    });

    it("devuelve null para fecha inválida", () => {
      expect(getWeekStartIso("xxx", "iso")).toBe(null);
    });
  });
});
