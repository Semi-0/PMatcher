import { define_generic_procedure_handler } from "generic-handler/GenericProcedure";
import { match_args } from "generic-handler/Predicates";
import { is_match_env, type MatchEnvironment } from "../MatchEnvironment";
import { DictValue, is_dict_value } from "./DictValue";
import type { ScopeReference } from "./ScopeReference";
import { guard } from "generic-handler/built_in_generics/other_generic_helper";
import { get_value } from "./DictInterface";

define_generic_procedure_handler(get_value,
    match_args(is_match_env, is_dict_value),
     (env: MatchEnvironment, value: DictValue) => {

        guard(env.length !== 0, () => {
            throw Error("error try to get value from a empty env, env: " + env)
        })

        for (var index = 0; index < env.length; index++){
            const ref: ScopeReference = env[index]
            
            guard(value.referenced_definition.size !== 0, () =>{
                throw Error("error try to get value from a empty dict, dict: " + value)
            })
            const result = value.referenced_definition.get(ref)

             if ((result != undefined) && (result != null)){
                return result
            }
            else{
                continue
            }
        }
        return undefined
    }
)

