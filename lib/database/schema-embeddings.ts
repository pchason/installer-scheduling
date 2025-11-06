/**
 * Database Schema Embedding Generation
 *
 * This file generates semantic descriptions of the database schema
 * and creates embeddings for RAG-based question answering.
 */

export const databaseSchema = {
  tables: [
    {
      name: 'installers',
      description: 'Stores information about installation workers including their trade specialty',
      fields: [
        { name: 'installerId', type: 'serial', description: 'Unique identifier for the installer' },
        { name: 'firstName', type: 'varchar', description: 'Installer first name' },
        { name: 'lastName', type: 'varchar', description: 'Installer last name' },
        { name: 'trade', type: 'enum', values: ['trim', 'stairs', 'doors'], description: 'Type of installation work the installer specializes in' },
        { name: 'phone', type: 'varchar', description: 'Contact phone number' },
        { name: 'email', type: 'varchar', description: 'Contact email address' },
        { name: 'isActive', type: 'boolean', description: 'Whether the installer is currently active' },
      ],
      relatedTables: ['installer_locations', 'installer_assignments'],
      sampleQuery: 'Find all active trim installers',
    },
    {
      name: 'geographic_locations',
      description: 'Represents geographic service areas where installations can be performed',
      fields: [
        { name: 'locationId', type: 'serial', description: 'Unique identifier for the location' },
        { name: 'locationName', type: 'varchar', description: 'Name of the geographic location' },
        { name: 'zipCode', type: 'varchar', description: 'Zip code for the location' },
        { name: 'city', type: 'varchar', description: 'City name' },
        { name: 'state', type: 'varchar', description: 'State abbreviation (2 characters)' },
      ],
      relatedTables: ['jobs', 'installer_locations'],
      sampleQuery: 'Which installers serve the Denver area?',
    },
    {
      name: 'installer_locations',
      description: 'Junction table linking installers to geographic locations they serve',
      fields: [
        { name: 'installerId', type: 'integer', description: 'Reference to installer' },
        { name: 'locationId', type: 'integer', description: 'Reference to location' },
      ],
      relatedTables: ['installers', 'geographic_locations'],
      sampleQuery: 'Which areas does installer John Smith cover?',
    },
    {
      name: 'jobs',
      description: 'Represents installation jobs/projects at customer homes with location and scheduling information',
      fields: [
        { name: 'jobId', type: 'serial', description: 'Unique identifier for the job' },
        { name: 'jobNumber', type: 'varchar', description: 'Business-friendly job identifier (unique)' },
        { name: 'streetAddress', type: 'varchar', description: 'Street address where work will be performed' },
        { name: 'city', type: 'varchar', description: 'City of the job location' },
        { name: 'state', type: 'varchar', description: 'State of the job location' },
        { name: 'zipCode', type: 'varchar', description: 'Zip code of the job location' },
        { name: 'locationId', type: 'integer', description: 'Reference to geographic location' },
        { name: 'status', type: 'enum', values: ['pending', 'scheduled', 'in_progress', 'completed', 'cancelled'], description: 'Current status of the job' },
        { name: 'startDate', type: 'date', description: 'Scheduled start date for the job' },
        { name: 'endDate', type: 'date', description: 'Scheduled end date for the job' },
      ],
      relatedTables: ['purchase_orders', 'job_schedules', 'geographic_locations'],
      sampleQuery: 'What jobs are scheduled for next week?',
    },
    {
      name: 'purchase_orders',
      description: 'Specifies the materials and quantities needed for each job trade (trim, stairs, doors)',
      fields: [
        { name: 'poId', type: 'serial', description: 'Unique identifier for the purchase order' },
        { name: 'jobId', type: 'integer', description: 'Reference to the associated job' },
        { name: 'poNumber', type: 'varchar', description: 'Business identifier for the PO (unique)' },
        { name: 'trimLinearFeet', type: 'decimal', description: 'Amount of trim material needed in linear feet' },
        { name: 'stairRisers', type: 'integer', description: 'Number of stair risers to install' },
        { name: 'doorCount', type: 'integer', description: 'Number of doors to install' },
        { name: 'status', type: 'enum', values: ['pending', 'scheduled', 'completed', 'cancelled'], description: 'Status of the purchase order' },
      ],
      relatedTables: ['jobs', 'installer_assignments'],
      sampleQuery: 'How much trim is needed for job 456?',
    },
    {
      name: 'job_schedules',
      description: 'Scheduled dates for when jobs will be performed',
      fields: [
        { name: 'scheduleId', type: 'serial', description: 'Unique identifier for the schedule' },
        { name: 'jobId', type: 'integer', description: 'Reference to the job being scheduled' },
        { name: 'scheduledDate', type: 'date', description: 'Date when the work is scheduled' },
        { name: 'status', type: 'enum', values: ['scheduled', 'completed', 'cancelled'], description: 'Status of the scheduled date' },
        { name: 'notes', type: 'text', description: 'Any notes about the scheduled work' },
      ],
      relatedTables: ['jobs', 'installer_assignments'],
      sampleQuery: 'What jobs are scheduled for December 7?',
    },
    {
      name: 'installer_assignments',
      description: 'Assigns specific installers to job schedules and purchase order items',
      fields: [
        { name: 'assignmentId', type: 'serial', description: 'Unique identifier for the assignment' },
        { name: 'scheduleId', type: 'integer', description: 'Reference to the job schedule' },
        { name: 'installerId', type: 'integer', description: 'Reference to the installer being assigned' },
        { name: 'poId', type: 'integer', description: 'Reference to the purchase order item being assigned' },
        { name: 'assignmentStatus', type: 'enum', values: ['assigned', 'completed', 'cancelled'], description: 'Status of the assignment' },
        { name: 'notes', type: 'text', description: 'Notes about the assignment' },
      ],
      relatedTables: ['job_schedules', 'installers', 'purchase_orders'],
      sampleQuery: 'Who is assigned to install trim for job 456 on December 7?',
    },
    {
      name: 'chat_messages',
      description: 'Stores conversation history between users and the AI assistant',
      fields: [
        { name: 'messageId', type: 'serial', description: 'Unique identifier for the message' },
        { name: 'userId', type: 'integer', description: 'User who sent the message' },
        { name: 'messageText', type: 'text', description: 'The user question or statement' },
        { name: 'responseText', type: 'text', description: 'The AI assistant response' },
      ],
      sampleQuery: 'Show chat history for user 1',
    },
  ],
  relationships: [
    {
      from: 'installers',
      to: 'installer_locations',
      type: 'one-to-many',
      description: 'Each installer can serve multiple geographic locations',
    },
    {
      from: 'geographic_locations',
      to: 'jobs',
      type: 'one-to-many',
      description: 'Each location can have multiple jobs',
    },
    {
      from: 'jobs',
      to: 'purchase_orders',
      type: 'one-to-many',
      description: 'Each job has multiple purchase orders for different trades',
    },
    {
      from: 'jobs',
      to: 'job_schedules',
      type: 'one-to-many',
      description: 'Each job can have multiple scheduled dates',
    },
    {
      from: 'job_schedules',
      to: 'installer_assignments',
      type: 'one-to-many',
      description: 'Each schedule can have multiple installer assignments',
    },
    {
      from: 'installers',
      to: 'installer_assignments',
      type: 'one-to-many',
      description: 'Each installer can have multiple assignments',
    },
    {
      from: 'purchase_orders',
      to: 'installer_assignments',
      type: 'one-to-many',
      description: 'Each purchase order can have multiple installer assignments',
    },
  ],
  enums: {
    trade: {
      values: ['trim', 'stairs', 'doors'],
      description: 'Types of installation work that can be performed',
    },
    jobStatus: {
      values: ['pending', 'scheduled', 'in_progress', 'completed', 'cancelled'],
      description: 'Possible states for a job',
    },
    poStatus: {
      values: ['pending', 'scheduled', 'completed', 'cancelled'],
      description: 'Possible states for a purchase order',
    },
    scheduleStatus: {
      values: ['scheduled', 'completed', 'cancelled'],
      description: 'Possible states for a job schedule',
    },
    assignmentStatus: {
      values: ['assigned', 'completed', 'cancelled'],
      description: 'Possible states for an installer assignment',
    },
  },
};

/**
 * Generates human-readable descriptions of database schema for embedding
 */
export function generateSchemaDescriptions() {
  const descriptions: string[] = [];

  // Add table descriptions
  databaseSchema.tables.forEach((table) => {
    descriptions.push(`Table: ${table.name}. ${table.description}`);

    // Add field descriptions
    table.fields.forEach((field) => {
      descriptions.push(`${table.name}.${field.name} (${field.type}): ${field.description}`);
    });

    // Add sample queries
    if (table.sampleQuery) {
      descriptions.push(`Example question about ${table.name}: ${table.sampleQuery}`);
    }
  });

  // Add relationship descriptions
  databaseSchema.relationships.forEach((rel) => {
    descriptions.push(
      `Relationship: ${rel.from} has a ${rel.type} relationship with ${rel.to}. ${rel.description}`
    );
  });

  // Add enum descriptions
  Object.entries(databaseSchema.enums).forEach(([enumName, enumData]) => {
    descriptions.push(
      `Enum: ${enumName} can have values: ${enumData.values.join(', ')}. ${enumData.description}`
    );
  });

  return descriptions;
}

/**
 * Generates a single consolidated schema context string for the LLM
 */
export function generateSchemaContext(): string {
  const descriptions = generateSchemaDescriptions();
  return descriptions.join('\n\n');
}
