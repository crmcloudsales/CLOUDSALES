export type CRMActionKey =
  | "crm.connection.test"
  | "crm.capabilities.get"
  | "crm.contact.get"
  | "crm.contact.search"
  | "crm.contact.upsert"
  | "crm.contact.update"
  | "crm.company.get"
  | "crm.company.upsert"
  | "crm.lead.create"
  | "crm.lead.update"
  | "crm.lead.assign"
  | "crm.lead.qualify"
  | "crm.opportunity.get"
  | "crm.opportunity.create"
  | "crm.opportunity.update"
  | "crm.pipeline.list"
  | "crm.pipeline.configure"
  | "crm.stage.list"
  | "crm.stage.update"
  | "crm.appointment.list"
  | "crm.appointment.create"
  | "crm.appointment.update"
  | "crm.appointment.cancel"
  | "crm.task.create"
  | "crm.task.update"
  | "crm.note.create"
  | "conversation.read"
  | "conversation.send"
  | "crm.email.send"
  | "crm.call.request"
  | "crm.workflow.trigger"
  | "crm.form.get"
  | "crm.user.list"
  | "crm.product.list"
  | "crm.invoice.get"
  | "crm.payment.get"
  | "crm.marketing.event"
  | "crm.attribution.event"
  | "crm.sync.pull"
  | "crm.sync.push"
  | "crm.webhook.receive"
  | "crm.connection.disconnect";

export type CRMActionRisk =
  | "READ"
  | "SAFE_WRITE"
  | "EXTERNAL_COMMUNICATION"
  | "FINANCIAL"
  | "DESTRUCTIVE"
  | "ADMINISTRATIVE";

export type CapabilitySupport = "implemented" | "beta" | "planned" | "unsupported";

export interface CRMProviderCapability {
  providerKey: string;
  action: CRMActionKey;
  support: CapabilitySupport;
  writeCapable: boolean;
  requiresProviderReview?: boolean;
  notes?: string | null;
}

export interface CRMExecutionContext {
  organizationId: string;
  connectionId: string;
  actorUserId?: string | null;
  cloudyTaskId?: string | null;
  idempotencyKey?: string | null;
  source?: "cloudy" | "listia" | "user" | "automation" | "webhook" | string;
}

export interface CRMExecutionResult<T = unknown> {
  ok: boolean;
  providerKey: string;
  action: CRMActionKey;
  externalId?: string | null;
  data?: T;
  retryable?: boolean;
  providerStatus?: number | null;
  errorCode?: string | null;
}

/**
 * Contract Cloudy targets. Provider-specific APIs must stay behind this boundary.
 * An adapter may omit operations its provider cannot support; provider_capabilities
 * is authoritative and MUST be checked before an action is dispatched.
 */
export interface CRMProviderAdapter {
  readonly providerKey: string;

  healthCheck(ctx: CRMExecutionContext): Promise<CRMExecutionResult>;
  getCapabilities(ctx: CRMExecutionContext): Promise<CRMProviderCapability[]>;

  getContact?(ctx: CRMExecutionContext, input: unknown): Promise<CRMExecutionResult>;
  searchContacts?(ctx: CRMExecutionContext, input: unknown): Promise<CRMExecutionResult>;
  upsertContact?(ctx: CRMExecutionContext, input: unknown): Promise<CRMExecutionResult>;
  updateContact?(ctx: CRMExecutionContext, input: unknown): Promise<CRMExecutionResult>;

  getCompany?(ctx: CRMExecutionContext, input: unknown): Promise<CRMExecutionResult>;
  upsertCompany?(ctx: CRMExecutionContext, input: unknown): Promise<CRMExecutionResult>;

  createLead?(ctx: CRMExecutionContext, input: unknown): Promise<CRMExecutionResult>;
  updateLead?(ctx: CRMExecutionContext, input: unknown): Promise<CRMExecutionResult>;
  assignLead?(ctx: CRMExecutionContext, input: unknown): Promise<CRMExecutionResult>;
  qualifyLead?(ctx: CRMExecutionContext, input: unknown): Promise<CRMExecutionResult>;

  getOpportunity?(ctx: CRMExecutionContext, input: unknown): Promise<CRMExecutionResult>;
  createOpportunity?(ctx: CRMExecutionContext, input: unknown): Promise<CRMExecutionResult>;
  updateOpportunity?(ctx: CRMExecutionContext, input: unknown): Promise<CRMExecutionResult>;

  listPipelines?(ctx: CRMExecutionContext, input?: unknown): Promise<CRMExecutionResult>;
  configurePipeline?(ctx: CRMExecutionContext, input: unknown): Promise<CRMExecutionResult>;
  listStages?(ctx: CRMExecutionContext, input: unknown): Promise<CRMExecutionResult>;
  updateStage?(ctx: CRMExecutionContext, input: unknown): Promise<CRMExecutionResult>;

  listAppointments?(ctx: CRMExecutionContext, input: unknown): Promise<CRMExecutionResult>;
  createAppointment?(ctx: CRMExecutionContext, input: unknown): Promise<CRMExecutionResult>;
  updateAppointment?(ctx: CRMExecutionContext, input: unknown): Promise<CRMExecutionResult>;
  cancelAppointment?(ctx: CRMExecutionContext, input: unknown): Promise<CRMExecutionResult>;

  createTask?(ctx: CRMExecutionContext, input: unknown): Promise<CRMExecutionResult>;
  updateTask?(ctx: CRMExecutionContext, input: unknown): Promise<CRMExecutionResult>;
  createNote?(ctx: CRMExecutionContext, input: unknown): Promise<CRMExecutionResult>;

  readConversation?(ctx: CRMExecutionContext, input: unknown): Promise<CRMExecutionResult>;
  sendConversationMessage?(ctx: CRMExecutionContext, input: unknown): Promise<CRMExecutionResult>;
  triggerWorkflow?(ctx: CRMExecutionContext, input: unknown): Promise<CRMExecutionResult>;

  pullChanges?(ctx: CRMExecutionContext, input: unknown): Promise<CRMExecutionResult>;
  pushChanges?(ctx: CRMExecutionContext, input: unknown): Promise<CRMExecutionResult>;
  normalizeWebhook?(ctx: CRMExecutionContext, input: unknown): Promise<CRMExecutionResult>;
  verifyWebhook?(ctx: CRMExecutionContext, input: unknown): Promise<CRMExecutionResult>;
}

export const CRM_ACTION_RISK: Partial<Record<CRMActionKey, CRMActionRisk>> = {
  "crm.connection.test": "READ",
  "crm.capabilities.get": "READ",
  "crm.contact.get": "READ",
  "crm.contact.search": "READ",
  "crm.contact.upsert": "SAFE_WRITE",
  "crm.contact.update": "SAFE_WRITE",
  "crm.opportunity.get": "READ",
  "crm.opportunity.create": "SAFE_WRITE",
  "crm.opportunity.update": "SAFE_WRITE",
  "crm.pipeline.list": "READ",
  "crm.pipeline.configure": "ADMINISTRATIVE",
  "crm.stage.list": "READ",
  "crm.stage.update": "SAFE_WRITE",
  "crm.appointment.list": "READ",
  "crm.appointment.create": "SAFE_WRITE",
  "crm.appointment.update": "SAFE_WRITE",
  "crm.appointment.cancel": "SAFE_WRITE",
  "conversation.read": "READ",
  "conversation.send": "EXTERNAL_COMMUNICATION",
  "crm.email.send": "EXTERNAL_COMMUNICATION",
  "crm.call.request": "EXTERNAL_COMMUNICATION",
  "crm.payment.get": "READ",
  "crm.invoice.get": "READ",
  "crm.connection.disconnect": "ADMINISTRATIVE",
};
