declare module 'word-extractor' {
  interface Document {
    getBody(): string;
    getHeaders(): string;
    getFooters(): string;
    getAnnotations(): string;
    getEndnotes(): string;
    getFootnotes(): string;
  }

  class WordExtractor {
    extract(input: Buffer | string): Promise<Document>;
  }

  export = WordExtractor;
}
