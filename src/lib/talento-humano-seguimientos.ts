/**
 * Fachada pública del módulo Seguimientos Trabajo Social / TTHH.
 * Re-exporta los submódulos de dominio para que los API handlers
 * importen desde un solo punto.
 */

export {
  loadFollowupCatalogs,
  loadFollowupCatalogItems,
} from "@/lib/talento-humano-seguimientos-catalogs";

export {
  deriveFollowupRoute,
  searchPersons,
  getPersonDetail,
  loadAssociatedWorkers,
} from "@/lib/talento-humano-seguimientos-person";

export {
  loadScheduledFollowups,
} from "@/lib/talento-humano-seguimientos-schedule";

export {
  listFollowupResponses,
  getFollowupResponseDetail,
  createFollowupResponse,
  updateFollowupResponse,
} from "@/lib/talento-humano-seguimientos-responses";

export {
  createFollowupResponseSchema,
  updateFollowupResponseSchema,
  followupFiltersSchema,
  employeeFollowupSelectionInputSchema,
} from "@/lib/talento-humano-seguimientos-schemas";
