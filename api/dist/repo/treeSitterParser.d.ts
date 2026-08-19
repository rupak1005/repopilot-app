import Parser = require('tree-sitter');
export type ParsedSymbolType = 'function' | 'class' | 'interface' | 'type';
export type ParsedSymbol = {
    name: string;
    type: ParsedSymbolType;
    startLine: number;
    endLine: number;
};
export type ParsedImport = {
    module: string;
    specifiers: string[];
};
export type ParsedExport = {
    name: string;
};
export type ParsedFile = {
    symbols: ParsedSymbol[];
    imports: ParsedImport[];
    exports: ParsedExport[];
};
export declare function createTreeSitterParser(filePath: string): Parser;
export declare function parseCodeToRecords(filePath: string, code: string): ParsedFile;
