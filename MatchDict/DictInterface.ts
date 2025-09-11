import { guard } from "../utility";
import { construct_simple_generic_procedure, define_generic_procedure_handler } from "generic-procedure/GenericProcedure";


export const get_value = construct_simple_generic_procedure("get_value", 2, 
    (referece: any, source: any) => {
        throw Error("args not matched for get_value, ref: "  + referece + " source: " + source)
    }
)

export const extend = construct_simple_generic_procedure("extend", 2,
    (item: any, to: any) => {
        throw Error("args not matched for extend, item: " + item+ " to: " + to)
    }
)