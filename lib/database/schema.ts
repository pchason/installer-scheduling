import {
  pgTable,
  text,
  serial,
  timestamp,
  varchar,
  integer,
  boolean,
  index,
  uniqueIndex,
  pgEnum,
  jsonb,
  decimal,
  date,
  check,
} from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

// Enums
export const tradeEnum = pgEnum('trade', [
  'trim',
  'stairs',
  'doors',
]);

export const jobStatusEnum = pgEnum('job_status', [
  'pending',
  'scheduled',
  'in_progress',
  'completed',
  'cancelled',
]);

export const poStatusEnum = pgEnum('po_status', [
  'pending',
  'scheduled',
  'completed',
  'cancelled',
]);

export const scheduleStatusEnum = pgEnum('schedule_status', [
  'scheduled',
  'completed',
  'cancelled',
]);

export const assignmentStatusEnum = pgEnum('assignment_status', [
  'assigned',
  'completed',
  'cancelled',
]);

// Installers table
export const installers = pgTable(
  'installers',
  {
    installerId: serial('installer_id').primaryKey(),
    firstName: varchar('first_name', { length: 100 }).notNull(),
    lastName: varchar('last_name', { length: 100 }).notNull(),
    trade: tradeEnum('trade').notNull(),
    phone: varchar('phone', { length: 20 }),
    email: varchar('email', { length: 255 }),
    isActive: boolean('is_active').default(true),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  (table) => ({
    tradeIdx: index('installers_trade_idx').on(table.trade),
    activeIdx: index('installers_active_idx').on(table.isActive),
  })
);

// Geographic locations table
export const geographicLocations = pgTable(
  'geographic_locations',
  {
    locationId: serial('location_id').primaryKey(),
    locationName: varchar('location_name', { length: 100 }).notNull(),
    zipCode: varchar('zip_code', { length: 10 }),
    city: varchar('city', { length: 100 }),
    state: varchar('state', { length: 2 }),
    createdAt: timestamp('created_at').defaultNow().notNull(),
  }
);

// Installer locations - many-to-many
export const installerLocations = pgTable(
  'installer_locations',
  {
    installerId: integer('installer_id')
      .notNull()
      .references(() => installers.installerId, { onDelete: 'cascade' }),
    locationId: integer('location_id')
      .notNull()
      .references(() => geographicLocations.locationId, { onDelete: 'cascade' }),
  },
  (table) => ({
    pk: uniqueIndex('installer_locations_pk').on(table.installerId, table.locationId),
  })
);

// Jobs/Homes table
export const jobs = pgTable(
  'jobs',
  {
    jobId: serial('job_id').primaryKey(),
    jobNumber: varchar('job_number', { length: 50 }).notNull().unique(),
    streetAddress: varchar('street_address', { length: 255 }).notNull(),
    city: varchar('city', { length: 100 }).notNull(),
    state: varchar('state', { length: 2 }).notNull(),
    zipCode: varchar('zip_code', { length: 10 }).notNull(),
    locationId: integer('location_id').references(() => geographicLocations.locationId),
    status: jobStatusEnum('status').default('pending').notNull(),
    startDate: date('start_date'),
    endDate: date('end_date'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  (table) => ({
    locationIdx: index('jobs_location_idx').on(table.locationId),
    statusIdx: index('jobs_status_idx').on(table.status),
    jobNumberIdx: index('jobs_number_idx').on(table.jobNumber),
  })
);

// Purchase orders table
export const purchaseOrders = pgTable(
  'purchase_orders',
  {
    poId: serial('po_id').primaryKey(),
    jobId: integer('job_id')
      .notNull()
      .references(() => jobs.jobId, { onDelete: 'cascade' }),
    poNumber: varchar('po_number', { length: 50 }).notNull().unique(),
    trimLinearFeet: decimal('trim_linear_feet', { precision: 10, scale: 2 }),
    stairRisers: integer('stair_risers'),
    doorCount: integer('door_count'),
    status: poStatusEnum('status').default('pending').notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  (table) => ({
    jobIdx: index('po_job_idx').on(table.jobId),
    statusIdx: index('po_status_idx').on(table.status),
  })
);

// Job schedules table
export const jobSchedules = pgTable(
  'job_schedules',
  {
    scheduleId: serial('schedule_id').primaryKey(),
    jobId: integer('job_id')
      .notNull()
      .references(() => jobs.jobId, { onDelete: 'cascade' }),
    scheduledDate: date('scheduled_date').notNull(),
    status: scheduleStatusEnum('status').default('scheduled').notNull(),
    notes: text('notes'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (table) => ({
    jobDateUnique: uniqueIndex('schedule_job_date_unique').on(table.jobId, table.scheduledDate),
    dateIdx: index('schedule_date_idx').on(table.scheduledDate),
    jobIdx: index('schedule_job_idx').on(table.jobId),
  })
);

// Installer assignments table
export const installerAssignments = pgTable(
  'installer_assignments',
  {
    assignmentId: serial('assignment_id').primaryKey(),
    scheduleId: integer('schedule_id')
      .notNull()
      .references(() => jobSchedules.scheduleId, { onDelete: 'cascade' }),
    installerId: integer('installer_id')
      .notNull()
      .references(() => installers.installerId, { onDelete: 'cascade' }),
    poId: integer('po_id')
      .notNull()
      .references(() => purchaseOrders.poId, { onDelete: 'cascade' }),
    assignmentStatus: assignmentStatusEnum('assignment_status').default('assigned').notNull(),
    notes: text('notes'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (table) => ({
    scheduleIdx: index('assignments_schedule_idx').on(table.scheduleId),
    installerIdx: index('assignments_installer_idx').on(table.installerId),
    poIdx: index('assignments_po_idx').on(table.poId),
    scheduleInstallerPoUnique: uniqueIndex('assignments_unique').on(table.scheduleId, table.installerId, table.poId),
    availabilityIdx: index('assignments_availability_idx').on(table.installerId, table.scheduleId),
  })
);

// Chat messages table
export const chatMessages = pgTable(
  'chat_messages',
  {
    messageId: serial('message_id').primaryKey(),
    userId: integer('user_id'),
    messageText: text('message_text').notNull(),
    responseText: text('response_text'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (table) => ({
    createdIdx: index('chat_messages_created_idx').on(table.createdAt),
  })
);

// Schema embeddings table for RAG
export const schemaEmbeddings = pgTable(
  'schema_embeddings',
  {
    embeddingId: serial('embedding_id').primaryKey(),
    schemaKey: varchar('schema_key', { length: 255 }).notNull().unique(),
    description: text('description').notNull(),
    embedding: text('embedding').notNull(), // Store as JSON text since pgvector type might not be available
    category: varchar('category', { length: 50 }).notNull(), // 'table', 'field', 'relationship', 'enum'
    metadata: jsonb('metadata'), // Store additional metadata
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  (table) => ({
    schemaKeyIdx: index('schema_embeddings_key_idx').on(table.schemaKey),
    categoryIdx: index('schema_embeddings_category_idx').on(table.category),
    createdIdx: index('schema_embeddings_created_idx').on(table.createdAt),
  })
);

// Relations
export const installersRelations = relations(installers, ({ many }) => ({
  locations: many(installerLocations),
  assignments: many(installerAssignments),
}));

export const geographicLocationsRelations = relations(geographicLocations, ({ many }) => ({
  installers: many(installerLocations),
  jobs: many(jobs),
}));

export const installerLocationsRelations = relations(installerLocations, ({ one }) => ({
  installer: one(installers, {
    fields: [installerLocations.installerId],
    references: [installers.installerId],
  }),
  location: one(geographicLocations, {
    fields: [installerLocations.locationId],
    references: [geographicLocations.locationId],
  }),
}));

export const jobsRelations = relations(jobs, ({ many, one }) => ({
  location: one(geographicLocations, {
    fields: [jobs.locationId],
    references: [geographicLocations.locationId],
  }),
  purchaseOrders: many(purchaseOrders),
  schedules: many(jobSchedules),
}));

export const purchaseOrdersRelations = relations(purchaseOrders, ({ one, many }) => ({
  job: one(jobs, {
    fields: [purchaseOrders.jobId],
    references: [jobs.jobId],
  }),
  assignments: many(installerAssignments),
}));

export const jobSchedulesRelations = relations(jobSchedules, ({ one, many }) => ({
  job: one(jobs, {
    fields: [jobSchedules.jobId],
    references: [jobs.jobId],
  }),
  assignments: many(installerAssignments),
}));

export const installerAssignmentsRelations = relations(installerAssignments, ({ one }) => ({
  schedule: one(jobSchedules, {
    fields: [installerAssignments.scheduleId],
    references: [jobSchedules.scheduleId],
  }),
  installer: one(installers, {
    fields: [installerAssignments.installerId],
    references: [installers.installerId],
  }),
  purchaseOrder: one(purchaseOrders, {
    fields: [installerAssignments.poId],
    references: [purchaseOrders.poId],
  }),
}));
