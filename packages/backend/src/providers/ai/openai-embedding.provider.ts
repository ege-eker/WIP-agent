import OpenAI from 'openai';
import { IEmbeddingProvider } from '../../core/interfaces/embedding-provider.interface';
import { AIProviderError } from '../../core/errors/ai.errors';
import { withRetry } from '../../utils/retry';

export class OpenAIEmbeddingProvider implements IEmbeddingProvider {
  private client: OpenAI;
  private model: string;

  constructor(apiKey: string, model = 'text-embedding-3-small') {
    this.client = new OpenAI({ apiKey });
    this.model = model;
  }

  async embed(text: string): Promise<number[]> {
    const results = await this.embedBatch([text]);
    return results[0];
  }

  async embedBatch(texts: string[]): Promise<number[][]> {
    try {
      const results: number[][] = [];
      const maxTokensPerBatch = 6000;
      let currentBatch: string[] = [];
      let currentTokenCount = 0;

      const estimateTokens = (text: string) => Math.ceil(text.length / 4);

      for (const text of texts) {
        const textTokens = estimateTokens(text);

        if (currentTokenCount + textTokens > maxTokensPerBatch && currentBatch.length > 0) {
          const batchResults = await this.embedSingleBatch(currentBatch);
          results.push(...batchResults);
          currentBatch = [];
          currentTokenCount = 0;
        }

        currentBatch.push(text);
        currentTokenCount += textTokens;
      }

      if (currentBatch.length > 0) {
        const batchResults = await this.embedSingleBatch(currentBatch);
        results.push(...batchResults);
      }

      return results;
    } catch (err) {
      throw new AIProviderError(err instanceof Error ? err.message : 'Embedding failed');
    }
  }

  private async embedSingleBatch(texts: string[]): Promise<number[][]> {
    return await withRetry(async () => {
      const response = await this.client.embeddings.create({
        model: this.model,
        input: texts,
      });
      return response.data.map((d) => d.embedding);
    }, { maxRetries: 3 });
  }

  getDimensions(): number {
    return 1536;
  }
}
