import { NextResponse } from 'next/server';
import { AIResponse } from '@/lib/schemas';

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const id = formData.get('id') as string;
    
    // Simulate a 2-second network delay
    await new Promise((resolve) => setTimeout(resolve, 2000));

    // Randomly succeed or fail (80% success rate)
    const isSuccess = Math.random() > 0.2;

    if (!isSuccess) {
      return NextResponse.json(
        { error: 'Simulated network or parsing failure' },
        { status: 500 }
      );
    }

    const mockResponse: AIResponse = {
      id: id || crypto.randomUUID(),
      status: 'completed',
      summary: 'This is a mock AI summary generated after successful ingestion.',
      metrics: {
        word_count: 42,
        confidence_score: 0.95,
      },
      timestamp: new Date().toISOString(),
    };

    return NextResponse.json(mockResponse, { status: 200 });
  } catch (error) {
    console.error('Ingest API Error:', error);
    return NextResponse.json(
      { error: 'Failed to process ingestion request' },
      { status: 500 }
    );
  }
}
