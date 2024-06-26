import type { Int } from "./types";

/**
 * Class representing the metadata for a generic procedure.
 */
export class GenericProcedureMetadata {
    name: string;
    arity: Int;
    metaData: Array<{
        predicate: (...args: any) => boolean,
        handler: (...args: any) => any
    }>;
    defaultHandler: (...args: any) => any;

    /**
     * Constructs an instance of GenericProcedureMetadata.
     * @param name - The name of the procedure.
     * @param arity - The arity of the procedure.
     * @param metaData - An array of objects containing predicates and handlers.
     * @param defaultHandler - The default handler to use if no predicates match.
     */
    constructor(name: string, arity: Int, metaData: Array<{ predicate: (...args: any) => boolean, handler: (...args: any) => any }>, defaultHandler: (...args: any) => any) {
        this.name = name;
        this.arity = arity;
        this.metaData = metaData;
        this.defaultHandler = defaultHandler;
    }

    /**
     * Adds a handler to the metadata.
     * @param predicate - A function to determine if the handler should be used.
     * @param handler - The handler function to be used if the predicate matches.
     */
    public addHandler(predicate: (...args: any) => boolean, handler: (...args: any) => any): void {
        this.metaData.unshift({ predicate, handler });
    }
}