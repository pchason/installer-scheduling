/**
 * API Endpoint: Generate Schema Embeddings
 *
 * POST /api/admin/generate-embeddings
 *
 * Regenerates all schema embeddings and stores them in the database.
 * This can be triggered manually if the database schema changes.
 */

import { NextRequest, NextResponse } from 'next/server';
import { openai } from '@ai-sdk/openai';
import { embed } from 'ai';
import { db } from '@/lib/database/client';
import { schemaEmbeddings } from '@/lib/database/schema';
import { generateSchemaDescriptions } from '@/lib/database/schema-embeddings';
import { handleApiError } from '@/app/api/error-handler';

interface EmbeddingRecord {
  schemaKey: string;
  description: string;
  embedding: number[];
  category: 'table' | 'field' | 'relationship' | 'enum';
  metadata?: Record<string, any>;
}

export async function POST(request: NextRequest) {
  try {
    console.log('🚀 Starting schema embedding generation via API...');

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
        embedding: [],
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

        console.log(`  Processed ${i + 1}/${records.length}`);
      } catch (error) {
        console.error(`Error embedding description for ${record.schemaKey}:`, error);
        return NextResponse.json(
          { error: `Failed to embed schema description: ${error}` },
          { status: 500 }
        );
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

    console.log(`✅ Successfully stored ${embeddingsData.length} embeddings`);

    return NextResponse.json({
      success: true,
      message: 'Schema embeddings generated successfully',
      embeddingsCount: embeddingsData.length,
      breakdown: {
        tables: embeddingsData.filter((e) => e.category === 'table').length,
        fields: embeddingsData.filter((e) => e.category === 'field').length,
        relationships: embeddingsData.filter((e) => e.category === 'relationship').length,
        enums: embeddingsData.filter((e) => e.category === 'enum').length,
      },
    });
  } catch (error) {
    console.error('❌ Error generating embeddings:', error);
    return handleApiError(error);
  }
}
