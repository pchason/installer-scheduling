import { db } from '@/lib/database/client';
import * as fs from 'fs';
import * as path from 'path';

async function backupDatabase() {
  try {
    console.log('Starting database backup...');

    // Get all table names
    const tables = await db.execute(`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
      ORDER BY table_name
    `);

    const tableNames = (tables.rows as any[]).map((row) => row.table_name);
    console.log(`Found ${tableNames.length} tables to backup`);

    let backupContent = `-- Database Backup\n-- Created: ${new Date().toISOString()}\n\n`;

    // Backup each table
    for (const tableName of tableNames) {
      console.log(`Backing up table: ${tableName}`);

      // Get table schema
      const schemaResult = await db.execute(`
        SELECT column_name, data_type, is_nullable, column_default
        FROM information_schema.columns
        WHERE table_name = '${tableName}'
        ORDER BY ordinal_position
      `);

      // Get table data
      const dataResult = await db.execute(`SELECT * FROM "${tableName}"`);

      // Add CREATE TABLE statement
      backupContent += `\n-- Table: ${tableName}\n`;
      backupContent += `DROP TABLE IF EXISTS "${tableName}" CASCADE;\n`;

      // Build CREATE TABLE statement
      const columns = (schemaResult.rows as any[]).map((col) => {
        let columnDef = `"${col.column_name}" ${col.data_type}`;
        if (col.column_default) {
          columnDef += ` DEFAULT ${col.column_default}`;
        }
        if (col.is_nullable === 'NO') {
          columnDef += ` NOT NULL`;
        }
        return columnDef;
      });

      backupContent += `CREATE TABLE "${tableName}" (\n  ${columns.join(',\n  ')}\n);\n`;

      // Add INSERT statements for data
      if ((dataResult.rows as any[]).length > 0) {
        for (const row of dataResult.rows as any[]) {
          const columns = Object.keys(row);
          const values = columns.map((col) => {
            const value = row[col];
            if (value === null) {
              return 'NULL';
            } else if (typeof value === 'string') {
              return `'${value.replace(/'/g, "''")}'`;
            } else if (value instanceof Date) {
              return `'${value.toISOString()}'`;
            } else {
              return String(value);
            }
          });

          backupContent += `INSERT INTO "${tableName}" (${columns
            .map((c) => `"${c}"`)
            .join(', ')}) VALUES (${values.join(', ')});\n`;
        }
      }
    }

    // Write to file
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = path.join(process.cwd(), `installer-scheduling-${timestamp}.sql`);
    fs.writeFileSync(filename, backupContent);

    console.log(`✅ Database backup completed successfully!`);
    console.log(`📁 Backup saved to: ${filename}`);
    console.log(`📊 Backup size: ${(fs.statSync(filename).size / 1024).toFixed(2)} KB`);
  } catch (error) {
    console.error('❌ Error backing up database:', error);
    process.exit(1);
  }
}

backupDatabase();
