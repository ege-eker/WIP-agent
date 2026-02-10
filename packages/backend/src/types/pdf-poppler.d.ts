declare module 'pdf-poppler' {
  interface Options {
    format?: 'png' | 'jpeg' | 'tiff' | 'ppm';
    out_dir?: string;
    out_prefix?: string;
    page?: number | null;
    scale?: number;
    resolution?: number;
  }

  function convert(pdfPath: string, opts: Options): Promise<void>;
  function info(pdfPath: string): Promise<any>;

  export { Options, convert, info };
}
