import { queryCommercial } from "@/lib/commercial-db";

type CreditApplicability = "credit-note" | "not-applicable";
type ClaimStatusKey = "registered" | "pending-approval" | "rejected" | "pending-application" | "applied";

export type ClaimScopeFilter = "quality" | "commercial" | "all";

type ClaimDashboardRow = {
  claim_id: string;
  claim_code: string;
  claim_scope: "quality" | "commercial";
  credit_note_applicability: CreditApplicability;
  status_key: ClaimStatusKey;
  customer_name: string | null;
  commercializer_name: string | null;
  account_executive_name: string | null;
  problem_family_name: string | null;
  problem_name: string | null;
  reference_order_number: string | null;
  reference_invoice_number: string | null;
  claimed_bunches_qty: number | string | null;
  claimed_amount_usd: number | string | null;
  event_date: string | null;
  subject: string;
  description: string | null;
  attachment_count: number | string | null;
  created_at: string;
};

export type QualityClaimDashboardBreakdownRow = {
  key: string;
  label: string;
  count: number;
  pct: number;
  totalUsd: number;
  totalBunches: number;
};

export type QualityClaimProblemBreakdown = {
  problemName: string;
  count: number;
  pctWithinFamily: number;
  totalUsd: number;
  totalBunches: number;
};

export type QualityClaimProblemFamilyBreakdown = {
  familyName: string;
  count: number;
  pct: number;
  totalUsd: number;
  totalBunches: number;
  creditNoteCount: number;
  alertCount: number;
  problems: QualityClaimProblemBreakdown[];
};

export type QualityClaimEntityFamilyBreakdown = {
  familyName: string;
  count: number;
  pctWithinEntity: number;
  totalUsd: number;
  totalBunches: number;
};

export type QualityClaimEntityBreakdown = {
  key: string;
  label: string;
  count: number;
  pct: number;
  totalUsd: number;
  totalBunches: number;
  creditNoteCount: number;
  alertCount: number;
  appliedCount: number;
  pendingCount: number;
  rejectedCount: number;
  registeredCount: number;
  families: QualityClaimEntityFamilyBreakdown[];
};

export type QualityClaimRecentRecord = {
  claimId: string;
  claimCode: string;
  claimScope: "quality" | "commercial";
  statusKey: ClaimStatusKey;
  statusLabel: string;
  creditApplicability: CreditApplicability;
  creditApplicabilityLabel: string;
  customerName: string;
  commercializerName: string;
  accountExecutiveName: string;
  problemFamilyName: string;
  problemName: string;
  referenceOrderNumber: string | null;
  referenceInvoiceNumber: string | null;
  claimedBunchesQty: number;
  claimedAmountUsd: number;
  eventDate: string | null;
  createdAt: string;
  attachmentCount: number;
  subject: string;
};

export type QualityClaimDashboardData = {
  generatedAt: string;
  appliedScope: ClaimScopeFilter;
  summary: {
    totalClaims: number;
    creditNoteClaims: number;
    alertClaims: number;
    appliedClaims: number;
    pendingClaims: number;
    pendingApprovalClaims: number;
    pendingApplicationClaims: number;
    rejectedClaims: number;
    registeredClaims: number;
    totalClaimedUsd: number;
    totalClaimedBunches: number;
    claimsWithPhotos: number;
  };
  statusBreakdown: QualityClaimDashboardBreakdownRow[];
  applicabilityBreakdown: QualityClaimDashboardBreakdownRow[];
  familyBreakdown: QualityClaimProblemFamilyBreakdown[];
  topCustomers: QualityClaimEntityBreakdown[];
  topCommercializers: QualityClaimEntityBreakdown[];
  topExecutives: QualityClaimDashboardBreakdownRow[];
  monthlyTrend: Array<{
    month: string;
    count: number;
    creditNoteCount: number;
    alertCount: number;
    totalUsd: number;
    totalBunches: number;
  }>;
  recentClaims: QualityClaimRecentRecord[];
  notes: string[];
};

function toNumber(value: number | string | null | undefined) {
  if (value === null || value === undefined || value === "") return 0;
  const numeric = typeof value === "number" ? value : Number(value);
  return Number.isFinite(numeric) ? numeric : 0;
}

function pct(count: number, total: number) {
  if (!total) return 0;
  return Math.round((count / total) * 10000) / 100;
}

function statusLabel(statusKey: ClaimStatusKey) {
  switch (statusKey) {
    case "registered":
      return "Registrado";
    case "pending-approval":
      return "Pendiente aprobacion";
    case "rejected":
      return "Rechazado";
    case "pending-application":
      return "Pendiente aplicacion";
    case "applied":
      return "Aplicado";
    default:
      return statusKey;
  }
}

function creditApplicabilityLabel(value: CreditApplicability) {
  return value === "credit-note" ? "Con nota de credito" : "Alerta / sin nota";
}

function scopeLabel(scope: ClaimScopeFilter) {
  if (scope === "quality") return "calidad";
  if (scope === "commercial") return "comercial";
  return "todos los reclamos";
}

function monthKey(row: ClaimDashboardRow) {
  const base = row.event_date?.slice(0, 7) || row.created_at.slice(0, 7);
  return /^\d{4}-\d{2}$/.test(base) ? base : "Sin mes";
}

function normalizeLabel(value: string | null | undefined, fallback: string) {
  const normalized = String(value ?? "").trim();
  return normalized || fallback;
}

export function createEmptyQualityClaimDashboardData(scope: ClaimScopeFilter = "quality"): QualityClaimDashboardData {
  return {
    generatedAt: new Date(0).toISOString(),
    appliedScope: scope,
    summary: {
      totalClaims: 0,
      creditNoteClaims: 0,
      alertClaims: 0,
      appliedClaims: 0,
      pendingClaims: 0,
      pendingApprovalClaims: 0,
      pendingApplicationClaims: 0,
      rejectedClaims: 0,
      registeredClaims: 0,
      totalClaimedUsd: 0,
      totalClaimedBunches: 0,
      claimsWithPhotos: 0,
    },
    statusBreakdown: [],
    applicabilityBreakdown: [],
    familyBreakdown: [],
    topCustomers: [],
    topCommercializers: [],
    topExecutives: [],
    monthlyTrend: [],
    recentClaims: [],
    notes: [],
  };
}

export async function getClaimDashboardPlanData(scope: ClaimScopeFilter = "quality"): Promise<QualityClaimDashboardData> {
  const scopeClause = scope === "all" ? "" : `and claim.claim_scope = '${scope}'`;

  const result = await queryCommercial<ClaimDashboardRow>(
    `
      select
        claim.claim_id,
        claim.claim_code,
        claim.claim_scope,
        claim.credit_note_applicability,
        claim.status_key,
        customer.entity_name as customer_name,
        commercializer.entity_name as commercializer_name,
        executive.entity_name as account_executive_name,
        family.problem_name as problem_family_name,
        problem.problem_name as problem_name,
        claim.reference_order_number,
        claim.reference_invoice_number,
        claim.claimed_bunches_qty,
        claim.claimed_amount_usd,
        claim.event_date,
        claim.subject,
        claim.description,
        claim.created_at,
        coalesce(att.attachment_count, 0) as attachment_count
      from public.sls_claim_case_cur claim
      left join public.sls_dim_customer_profile_scd2 customer
        on customer.entity_id = claim.customer_id
       and customer.is_current = true
       and customer.is_valid = true
      left join public.sls_dim_commercializer_profile_scd2 commercializer
        on commercializer.entity_id = claim.commercializer_id
       and commercializer.is_current = true
       and commercializer.is_valid = true
      left join public.sls_dim_account_executive_profile_scd2 executive
        on executive.entity_id = claim.account_executive_id
       and executive.is_current = true
       and executive.is_valid = true
      left join public.sls_dim_claim_problem_profile_scd2 family
        on family.problem_id = claim.problem_family_id
       and family.is_current = true
       and family.is_valid = true
      left join public.sls_dim_claim_problem_profile_scd2 problem
        on problem.problem_id = claim.problem_id
       and problem.is_current = true
       and problem.is_valid = true
      left join (
        select claim_id, count(*)::int as attachment_count
        from public.sls_claim_attachment_cur
        group by claim_id
      ) att
        on att.claim_id = claim.claim_id
      where claim.is_active = true
        ${scopeClause}
      order by coalesce(claim.event_date::timestamp, claim.created_at) desc, claim.created_at desc
    `,
  );

  const rows = result.rows;
  const totalClaims = rows.length;

  const summary = {
    totalClaims,
    creditNoteClaims: 0,
    alertClaims: 0,
    appliedClaims: 0,
    pendingClaims: 0,
    pendingApprovalClaims: 0,
    pendingApplicationClaims: 0,
    rejectedClaims: 0,
    registeredClaims: 0,
    totalClaimedUsd: 0,
    totalClaimedBunches: 0,
    claimsWithPhotos: 0,
  };

  const statusMap = new Map<string, QualityClaimDashboardBreakdownRow>();
  const applicabilityMap = new Map<string, QualityClaimDashboardBreakdownRow>();
  const familyMap = new Map<
    string,
    Omit<QualityClaimProblemFamilyBreakdown, "pct" | "problems"> & {
      problemsMap: Map<string, Omit<QualityClaimProblemBreakdown, "pctWithinFamily">>;
    }
  >();
  const customerMap = new Map<
    string,
    Omit<QualityClaimEntityBreakdown, "pct" | "families"> & {
      familiesMap: Map<string, Omit<QualityClaimEntityFamilyBreakdown, "pctWithinEntity">>;
    }
  >();
  const commercializerMap = new Map<
    string,
    Omit<QualityClaimEntityBreakdown, "pct" | "families"> & {
      familiesMap: Map<string, Omit<QualityClaimEntityFamilyBreakdown, "pctWithinEntity">>;
    }
  >();
  const executiveMap = new Map<string, QualityClaimDashboardBreakdownRow>();
  const monthMap = new Map<
    string,
    {
      month: string;
      count: number;
      creditNoteCount: number;
      alertCount: number;
      totalUsd: number;
      totalBunches: number;
    }
  >();

  const recentClaims: QualityClaimRecentRecord[] = [];

  for (const row of rows) {
    const claimedAmountUsd = toNumber(row.claimed_amount_usd);
    const claimedBunchesQty = toNumber(row.claimed_bunches_qty);
    const attachmentCount = toNumber(row.attachment_count);
    const applicabilityLabel = creditApplicabilityLabel(row.credit_note_applicability);
    const currentStatusLabel = statusLabel(row.status_key);
    const familyName = normalizeLabel(row.problem_family_name, "Sin tipo");
    const problemName = normalizeLabel(row.problem_name, "Sin problema");
    const customerName = normalizeLabel(row.customer_name, "Sin cliente");
    const commercializerName = normalizeLabel(row.commercializer_name, "Sin comercializadora");
    const accountExecutiveName = normalizeLabel(row.account_executive_name, "Sin ejecutivo");

    summary.totalClaimedUsd += claimedAmountUsd;
    summary.totalClaimedBunches += claimedBunchesQty;
    if (attachmentCount > 0) summary.claimsWithPhotos += 1;

    if (row.credit_note_applicability === "credit-note") summary.creditNoteClaims += 1;
    else summary.alertClaims += 1;

    if (row.status_key === "applied") summary.appliedClaims += 1;
    else if (row.status_key === "rejected") summary.rejectedClaims += 1;
    else if (row.status_key === "registered") summary.registeredClaims += 1;
    else if (row.status_key === "pending-approval") {
      summary.pendingClaims += 1;
      summary.pendingApprovalClaims += 1;
    } else if (row.status_key === "pending-application") {
      summary.pendingClaims += 1;
      summary.pendingApplicationClaims += 1;
    }

    const statusBucket = statusMap.get(row.status_key) ?? {
      key: row.status_key,
      label: currentStatusLabel,
      count: 0,
      pct: 0,
      totalUsd: 0,
      totalBunches: 0,
    };
    statusBucket.count += 1;
    statusBucket.totalUsd += claimedAmountUsd;
    statusBucket.totalBunches += claimedBunchesQty;
    statusMap.set(row.status_key, statusBucket);

    const applicabilityBucket = applicabilityMap.get(row.credit_note_applicability) ?? {
      key: row.credit_note_applicability,
      label: applicabilityLabel,
      count: 0,
      pct: 0,
      totalUsd: 0,
      totalBunches: 0,
    };
    applicabilityBucket.count += 1;
    applicabilityBucket.totalUsd += claimedAmountUsd;
    applicabilityBucket.totalBunches += claimedBunchesQty;
    applicabilityMap.set(row.credit_note_applicability, applicabilityBucket);

    const familyBucket = familyMap.get(familyName) ?? {
      familyName,
      count: 0,
      totalUsd: 0,
      totalBunches: 0,
      creditNoteCount: 0,
      alertCount: 0,
      problemsMap: new Map<string, Omit<QualityClaimProblemBreakdown, "pctWithinFamily">>(),
    };
    familyBucket.count += 1;
    familyBucket.totalUsd += claimedAmountUsd;
    familyBucket.totalBunches += claimedBunchesQty;
    if (row.credit_note_applicability === "credit-note") familyBucket.creditNoteCount += 1;
    else familyBucket.alertCount += 1;

    const problemBucket = familyBucket.problemsMap.get(problemName) ?? {
      problemName,
      count: 0,
      totalUsd: 0,
      totalBunches: 0,
    };
    problemBucket.count += 1;
    problemBucket.totalUsd += claimedAmountUsd;
    problemBucket.totalBunches += claimedBunchesQty;
    familyBucket.problemsMap.set(problemName, problemBucket);
    familyMap.set(familyName, familyBucket);

    for (const [map, key, label] of [
      [customerMap, customerName, customerName],
      [commercializerMap, commercializerName, commercializerName],
    ] as const) {
      const bucket = map.get(key) ?? {
        key,
        label,
        count: 0,
        totalUsd: 0,
        totalBunches: 0,
        creditNoteCount: 0,
        alertCount: 0,
        appliedCount: 0,
        pendingCount: 0,
        rejectedCount: 0,
        registeredCount: 0,
        familiesMap: new Map<string, Omit<QualityClaimEntityFamilyBreakdown, "pctWithinEntity">>(),
      };
      bucket.count += 1;
      bucket.totalUsd += claimedAmountUsd;
      bucket.totalBunches += claimedBunchesQty;
      if (row.credit_note_applicability === "credit-note") bucket.creditNoteCount += 1;
      else bucket.alertCount += 1;

      if (row.status_key === "applied") bucket.appliedCount += 1;
      else if (row.status_key === "rejected") bucket.rejectedCount += 1;
      else if (row.status_key === "registered") bucket.registeredCount += 1;
      else bucket.pendingCount += 1;

      const entityFamily = bucket.familiesMap.get(familyName) ?? {
        familyName,
        count: 0,
        totalUsd: 0,
        totalBunches: 0,
      };
      entityFamily.count += 1;
      entityFamily.totalUsd += claimedAmountUsd;
      entityFamily.totalBunches += claimedBunchesQty;
      bucket.familiesMap.set(familyName, entityFamily);

      map.set(key, bucket);
    }

    {
      const bucket = executiveMap.get(accountExecutiveName) ?? {
        key: accountExecutiveName,
        label: accountExecutiveName,
        count: 0,
        pct: 0,
        totalUsd: 0,
        totalBunches: 0,
      };
      bucket.count += 1;
      bucket.totalUsd += claimedAmountUsd;
      bucket.totalBunches += claimedBunchesQty;
      executiveMap.set(accountExecutiveName, bucket);
    }

    const month = monthKey(row);
    const monthBucket = monthMap.get(month) ?? {
      month,
      count: 0,
      creditNoteCount: 0,
      alertCount: 0,
      totalUsd: 0,
      totalBunches: 0,
    };
    monthBucket.count += 1;
    monthBucket.totalUsd += claimedAmountUsd;
    monthBucket.totalBunches += claimedBunchesQty;
    if (row.credit_note_applicability === "credit-note") monthBucket.creditNoteCount += 1;
    else monthBucket.alertCount += 1;
    monthMap.set(month, monthBucket);

    if (recentClaims.length < 12) {
      recentClaims.push({
        claimId: row.claim_id,
        claimCode: row.claim_code,
        claimScope: row.claim_scope,
        statusKey: row.status_key,
        statusLabel: currentStatusLabel,
        creditApplicability: row.credit_note_applicability,
        creditApplicabilityLabel: applicabilityLabel,
        customerName,
        commercializerName,
        accountExecutiveName,
        problemFamilyName: familyName,
        problemName,
        referenceOrderNumber: row.reference_order_number,
        referenceInvoiceNumber: row.reference_invoice_number,
        claimedBunchesQty,
        claimedAmountUsd,
        eventDate: row.event_date,
        createdAt: row.created_at,
        attachmentCount,
        subject: row.subject,
      });
    }
  }

  const statusOrder: ClaimStatusKey[] = [
    "registered",
    "pending-approval",
    "rejected",
    "pending-application",
    "applied",
  ];

  const statusBreakdown = statusOrder
    .map((key) => statusMap.get(key))
    .filter((item): item is QualityClaimDashboardBreakdownRow => Boolean(item))
    .map((item) => ({ ...item, pct: pct(item.count, totalClaims) }));

  const applicabilityOrder: CreditApplicability[] = ["credit-note", "not-applicable"];
  const applicabilityBreakdown = applicabilityOrder
    .map((key) => applicabilityMap.get(key))
    .filter((item): item is QualityClaimDashboardBreakdownRow => Boolean(item))
    .map((item) => ({ ...item, pct: pct(item.count, totalClaims) }));

  const familyBreakdown = Array.from(familyMap.values())
    .map((family) => ({
      familyName: family.familyName,
      count: family.count,
      pct: pct(family.count, totalClaims),
      totalUsd: family.totalUsd,
      totalBunches: family.totalBunches,
      creditNoteCount: family.creditNoteCount,
      alertCount: family.alertCount,
      problems: Array.from(family.problemsMap.values())
        .sort((left, right) => right.count - left.count || right.totalUsd - left.totalUsd || left.problemName.localeCompare(right.problemName))
        .map((problem) => ({
          problemName: problem.problemName,
          count: problem.count,
          pctWithinFamily: pct(problem.count, family.count),
          totalUsd: problem.totalUsd,
          totalBunches: problem.totalBunches,
        })),
    }))
    .sort((left, right) => right.count - left.count || right.totalUsd - left.totalUsd || left.familyName.localeCompare(right.familyName));

  function toTopBreakdown(map: Map<string, QualityClaimDashboardBreakdownRow>, limit = 8) {
    return Array.from(map.values())
      .sort((left, right) => right.count - left.count || right.totalUsd - left.totalUsd || left.label.localeCompare(right.label))
      .slice(0, limit)
      .map((item) => ({ ...item, pct: pct(item.count, totalClaims) }));
  }

  function toTopEntityBreakdown(
    map: Map<
      string,
      Omit<QualityClaimEntityBreakdown, "pct" | "families"> & {
        familiesMap: Map<string, Omit<QualityClaimEntityFamilyBreakdown, "pctWithinEntity">>;
      }
    >,
    limit = 8,
  ) {
    return Array.from(map.values())
      .sort((left, right) => right.count - left.count || right.totalUsd - left.totalUsd || left.label.localeCompare(right.label))
      .slice(0, limit)
      .map((item) => ({
        key: item.key,
        label: item.label,
        count: item.count,
        pct: pct(item.count, totalClaims),
        totalUsd: item.totalUsd,
        totalBunches: item.totalBunches,
        creditNoteCount: item.creditNoteCount,
        alertCount: item.alertCount,
        appliedCount: item.appliedCount,
        pendingCount: item.pendingCount,
        rejectedCount: item.rejectedCount,
        registeredCount: item.registeredCount,
        families: Array.from(item.familiesMap.values())
          .sort((left, right) => right.count - left.count || right.totalUsd - left.totalUsd || left.familyName.localeCompare(right.familyName))
          .map((family) => ({
            familyName: family.familyName,
            count: family.count,
            pctWithinEntity: pct(family.count, item.count),
            totalUsd: family.totalUsd,
            totalBunches: family.totalBunches,
          })),
      }));
  }

  const monthlyTrend = Array.from(monthMap.values())
    .sort((left, right) => left.month.localeCompare(right.month))
    .slice(-12);

  return {
    generatedAt: new Date().toISOString(),
    appliedScope: scope,
    summary: {
      ...summary,
      totalClaimedUsd: Math.round(summary.totalClaimedUsd * 100) / 100,
      totalClaimedBunches: Math.round(summary.totalClaimedBunches),
    },
    statusBreakdown,
    applicabilityBreakdown,
    familyBreakdown,
    topCustomers: toTopEntityBreakdown(customerMap),
    topCommercializers: toTopEntityBreakdown(commercializerMap, 6),
    topExecutives: toTopBreakdown(executiveMap, 6),
    monthlyTrend,
    recentClaims,
    notes: [
      scope === "quality"
        ? "Este dashboard filtra exclusivamente reclamos con claim_scope = quality."
        : scope === "commercial"
          ? "Este dashboard filtra exclusivamente reclamos con claim_scope = commercial."
          : "Este dashboard consolida todos los reclamos historicos y permite comparar los dos frentes: calidad y comercial.",
      "Se separa visualmente el frente de notas de credito frente a alertas o reclamos sin nota.",
      "La desagregacion principal parte de Tipo de problema y baja al Problema especifico para concentrar la lectura gerencial.",
      "Los montos en dolares se interpretan solo donde aplica nota de credito; en alertas pueden venir en cero o nulos.",
      scope === "all"
        ? "Usa el selector de alcance para aislar la lectura de Calidad o Comercial sin salir del mismo dashboard."
        : `La lectura actual corresponde al frente de ${scopeLabel(scope)}.`,
    ],
  };
}

export async function getQualityClaimDashboardPlanData(): Promise<QualityClaimDashboardData> {
  return getClaimDashboardPlanData("quality");
}
