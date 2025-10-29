import {
  pgTable,
  text,
  uuid,
  timestamp,
  varchar,
  integer,
  boolean,
  index,
  uniqueIndex,
  pgEnum,
  jsonb,
} from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

// Enums
export const tradeEnum = pgEnum('trade_category', [
  'electrical',
  'plumbing',
  'hvac',
  'roofing',
  'framing',
  'drywall',
  'flooring',
  'painting',
  'carpentry',
  'masonry',
  'landscaping',
  'inspection',
  'other',
]);

export const bookingStatusEnum = pgEnum('booking_status', [
  'pending',
  'confirmed',
  'in_progress',
  'completed',
  'cancelled',
]);

// Installers table
export const installers = pgTable(
  'installers',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    name: varchar('name', { length: 255 }).notNull(),
    email: varchar('email', { length: 255 }).unique().notNull(),
    phone: varchar('phone', { length: 20 }),
    tradeCategory: tradeEnum('trade_category').notNull(),
    isAvailable: boolean('is_available').default(true),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  (table) => ({
    emailIdx: uniqueIndex('installers_email_idx').on(table.email),
    tradeIdx: index('installers_trade_idx').on(table.tradeCategory),
    availableIdx: index('installers_available_idx').on(table.isAvailable),
  })
);

// Locations table
export const locations = pgTable(
  'locations',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    address: varchar('address', { length: 255 }).notNull(),
    city: varchar('city', { length: 100 }).notNull(),
    state: varchar('state', { length: 2 }).notNull(),
    zipCode: varchar('zip_code', { length: 10 }),
    jobId: varchar('job_id', { length: 100 }),
    startDate: timestamp('start_date').notNull(),
    endDate: timestamp('end_date'),
    notes: text('notes'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  (table) => ({
    jobIdIdx: index('locations_job_id_idx').on(table.jobId),
    dateIdx: index('locations_date_idx').on(table.startDate),
  })
);

// Bookings table - Core scheduling table
export const bookings = pgTable(
  'bookings',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    installerId: uuid('installer_id')
      .notNull()
      .references(() => installers.id, { onDelete: 'cascade' }),
    locationId: uuid('location_id')
      .notNull()
      .references(() => locations.id, { onDelete: 'cascade' }),
    tradeType: tradeEnum('trade_type').notNull(),
    startTime: timestamp('start_time').notNull(),
    endTime: timestamp('end_time').notNull(),
    status: bookingStatusEnum('status').default('pending').notNull(),
    notes: text('notes'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  (table) => ({
    installerIdx: index('bookings_installer_idx').on(table.installerId),
    locationIdx: index('bookings_location_idx').on(table.locationId),
    tradeIdx: index('bookings_trade_idx').on(table.tradeType),
    timeIdx: index('bookings_time_idx').on(table.startTime, table.endTime),
    statusIdx: index('bookings_status_idx').on(table.status),
    // Composite index for constraint checking
    constraintIdx: index('bookings_constraint_idx').on(
      table.locationId,
      table.tradeType,
      table.startTime
    ),
  })
);

// Installer availability/preferences
export const installerAvailability = pgTable(
  'installer_availability',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    installerId: uuid('installer_id')
      .notNull()
      .references(() => installers.id, { onDelete: 'cascade' }),
    dayOfWeek: integer('day_of_week').notNull(), // 0-6 (Sunday-Saturday)
    startTime: varchar('start_time', { length: 5 }).notNull(), // HH:mm
    endTime: varchar('end_time', { length: 5 }).notNull(), // HH:mm
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  (table) => ({
    installerIdx: index('availability_installer_idx').on(table.installerId),
  })
);

// Chat messages table
export const chatMessages = pgTable(
  'chat_messages',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: varchar('user_id', { length: 255 }).notNull(),
    content: text('content').notNull(),
    role: varchar('role', { length: 20 }).notNull(), // 'user' or 'assistant'
    metadata: jsonb('metadata'), // Additional context like installer_id, location_id, etc.
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (table) => ({
    userIdx: index('chat_messages_user_idx').on(table.userId),
    createdIdx: index('chat_messages_created_idx').on(table.createdAt),
  })
);

// Scheduling constraints/rules
export const schedulingRules = pgTable(
  'scheduling_rules',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    ruleType: varchar('rule_type', { length: 50 }).notNull(), // e.g., 'max_trades_per_location', 'installer_conflict'
    installerId: uuid('installer_id').references(() => installers.id, {
      onDelete: 'cascade',
    }),
    locationId: uuid('location_id').references(() => locations.id, {
      onDelete: 'cascade',
    }),
    ruleData: jsonb('rule_data').notNull(), // Flexible storage for rule-specific data
    isActive: boolean('is_active').default(true),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  (table) => ({
    ruleTypeIdx: index('rules_type_idx').on(table.ruleType),
    installerIdx: index('rules_installer_idx').on(table.installerId),
    locationIdx: index('rules_location_idx').on(table.locationId),
  })
);

// Relations
export const installersRelations = relations(installers, ({ many }) => ({
  bookings: many(bookings),
  availability: many(installerAvailability),
}));

export const locationsRelations = relations(locations, ({ many }) => ({
  bookings: many(bookings),
}));

export const bookingsRelations = relations(bookings, ({ one }) => ({
  installer: one(installers, {
    fields: [bookings.installerId],
    references: [installers.id],
  }),
  location: one(locations, {
    fields: [bookings.locationId],
    references: [locations.id],
  }),
}));

export const installerAvailabilityRelations = relations(
  installerAvailability,
  ({ one }) => ({
    installer: one(installers, {
      fields: [installerAvailability.installerId],
      references: [installers.id],
    }),
  })
);
