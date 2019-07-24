import { NodePath } from '@babel/traverse';

export interface GlobalFixContext {
  warnOnce(...args: any): void;
  // import from typescript module
  import(moduleName: string, exportName: string): void;
  // import form other flow module which is also to be fixed
  importFlow(moduleName: string, exportName: string): void;
  // references to all identifiers with usign export or global
  referencePaths: NodePath[];
}

export interface NamedFixContext {
  warnOnce(...args: any): void;
  renameExport(newExportName: string): void;
  // references to all identifiers with usign export or global
  referencePaths: NodePath[];
}

export interface RuleSet {
  globals: {
    [k: string]: {
      fix(context: GlobalFixContext): void;
    };
  };
  modules: {
    [k: string]: {
      // typings package to install for module
      types?: string;
      exports: {
        [k: string]: {
          fix(context: NamedFixContext): void;
        };
      };
    };
  };
}