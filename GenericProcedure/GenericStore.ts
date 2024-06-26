import { GenericProcedureMetadata } from "./GenericProcedureMetadata";
export type GenericProcedureStore = Map<(...args: any) => any, GenericProcedureMetadata>
const stores =  new Map<(...args: any) => any, GenericProcedureMetadata>()

export function set_metaData(procedure: (...args: any) => any, metaData: GenericProcedureMetadata){
    stores.set(procedure, metaData)
}

export function get_metaData(procedure: (...args: any) => any): GenericProcedureMetadata | undefined{
    return stores.get(procedure)
}

export function construct_store(): GenericProcedureStore{
    return new Map<(...args: any) => any, GenericProcedureMetadata>()
}

export function get_default_store(): GenericProcedureStore{
    return stores
}