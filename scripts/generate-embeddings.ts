/**
 * Standalone Script: Generate and Store Schema Embeddings
 *
 * This script generates embeddings for the database schema and stores them in PostgreSQL.
 * Run with: npx ts-node scripts/generate-embeddings.ts
 *
 * Or add to package.json scripts:
 *   "generate-embeddings": "ts-node scripts/generate-embeddings.ts"
 */

import { openai } from '@ai-sdk/openai';
import { embed } from 'ai';
import { db } from '@/lib/database/client';
import { schemaEmbeddings } from '@/lib/database/schema';
import { generateSchemaDescriptions } from '@/lib/database/schema-embeddings';

interface EmbeddingRecord {
  schemaKey: string;
  description: string;
  embedding: number[];
  category: 'table' | 'field' | 'relationship' | 'enum';
  metadata?: Record<string, any>;
}

async function generateEmbeddings() {
  console.log('🚀 Starting schema embedding generation...');

  try {
    // Generate schema descriptions
    const descriptions = generateSchemaDescriptions();
    console.log(`Generated ${descriptions.length} schema descriptions`);

    // Categorize descriptions
    const records: EmbeddingRecord[] = [];

    descriptions.forEach((desc) => {
      let category: 'table' | 'field' | 'relationship' | 'enum' = 'table';
      let schemaKey = '';
      let metadata = {};

      if (desc.startsWith('Table:')) {
        category = 'table';
        schemaKey = desc.match(/Table: (\w+)/)?.[1] || desc;
      } else if (desc.startsWith('Relationship:')) {
        category = 'relationship';
        schemaKey = `relationship_${descriptions.indexOf(desc)}`;
      } else if (desc.startsWith('Enum:')) {
        category = 'enum';
        schemaKey = desc.match(/Enum: (\w+)/)?.[1] || desc;
      } else if (desc.includes('(') && desc.includes(')')) {
        category = 'field';
        const match = desc.match(/(\w+\.\w+)/);
        schemaKey = match?.[1] || desc;
      }

      records.push({
        schemaKey,
        description: desc,
        embedding: [], // Will be filled by API
        category,
        metadata,
      });
    });

    console.log(`Categorized descriptions into:`);
    console.log(`  - Tables: ${records.filter((r) => r.category === 'table').length}`);
    console.log(`  - Fields: ${records.filter((r) => r.category === 'field').length}`);
    console.log(`  - Relationships: ${records.filter((r) => r.category === 'relationship').length}`);
    console.log(`  - Enums: ${records.filter((r) => r.category === 'enum').length}`);

    // Generate embeddings using OpenAI
    console.log('\n📡 Generating embeddings with OpenAI...');
    const embeddingsData: EmbeddingRecord[] = [];

    for (let i = 0; i < records.length; i++) {
      const record = records[i];
      try {
        const embeddingResult = await embed({
          model: openai.embedding('text-embedding-3-small'),
          value: record.description,
        });

        embeddingsData.push({
          ...record,
          embedding: embeddingResult.embedding,
        });

        if ((i + 1) % 10 === 0) {
          console.log(`  Processed ${i + 1}/${records.length} descriptions`);
        }
      } catch (error) {
        console.error(`Error embedding description for ${record.schemaKey}:`, error);
      }
    }

    console.log(`✅ Generated ${embeddingsData.length} embeddings`);

    // Clear existing embeddings
    console.log('\n🗑️ Clearing existing embeddings...');
    await db.delete(schemaEmbeddings);

    // Store embeddings in database
    console.log('💾 Storing embeddings in database...');
    for (const embeddingData of embeddingsData) {
      await db.insert(schemaEmbeddings).values({
        schemaKey: embeddingData.schemaKey,
        description: embeddingData.description,
        embedding: JSON.stringify(embeddingData.embedding),
        category: embeddingData.category,
        metadata: embeddingData.metadata || {},
      });
    }

    console.log(`✅ Successfully stored ${embeddingsData.length} embeddings in the database`);
    console.log('\n🎉 Schema embedding generation complete!');
  } catch (error) {
    console.error('❌ Error during embedding generation:', error);
    process.exit(1);
  }
}

// Run the function
generateEmbeddings();
