import type { ScopeReference } from "./MatchDict/ScopeReference"
import { define_generic_procedure_handler } from "generic-handler/GenericProcedure"
import { copy } from "./utility"
import { extend } from "./MatchDict/DictInterface"
import { is_scope_reference } from "./MatchDict/ScopeReference"
export type MatchEnvironment = ScopeReference[]
// MatchEnvironment is a record of the address of scope reference
import { first } from "./utility"
export function is_match_env(A: any): boolean{
    return Array.isArray(A)
        && A.every((item) => {
            return typeof item === "number"
        })
}

export function default_match_env(){
    return [0]
}

define_generic_procedure_handler(copy,
    (A: any) =>{
        return is_match_env(A)
    }, (env: MatchEnvironment) => {
        var copy: MatchEnvironment = []
        env.forEach(item => copy.push(item))
        return copy
    }
)

define_generic_procedure_handler(extend, 
    (A: any, B: any) => {
        return is_scope_reference(A) && is_match_env(B)
    },
    (ref: ScopeReference, env: MatchEnvironment) => {
        var c: MatchEnvironment = copy(env)
        c.unshift(ref)
        return c
    }
)

export function get_current_scope(env: MatchEnvironment){
    return first(env)
}

// import { MatchDict } from "./MatchDict/MatchDict";

// export class MatchEnvironment{
//     public readonly parentEnvironment: MatchEnvironment | null;
//     public readonly currentDict: MatchDict;
//     // public readonly childEnvironments: MatchEnvironment[] ;

//     constructor(parentEnvironment: MatchEnvironment | null, currentDict: MatchDict, childEnvironments: MatchEnvironment[] = []){
//         this.parentEnvironment = parentEnvironment;
//         this.currentDict = currentDict;
//         // this.childEnvironments = childEnvironments;
//     }

//     public get(key: string): any{
//         console.log("get", key, this.to_String())
//         if(this.currentDict.has(key)){
//             const result = this.currentDict.get(key);
//             return result;
//         }
//         return this.parentEnvironment?.get(key) ?? null;
//     }

//     public extend(key: string, value: any): MatchEnvironment{
//         return new MatchEnvironment(this.parentEnvironment, this.currentDict.extend(key, value), []);

//     }

//     public set(key: string, value: any): MatchEnvironment{
//         this.currentDict.set(key, value);
//         return this;
//     }
    
//     public merge(key: string, value: any): MatchEnvironment{
//         if (this.currentDict.has(key)){
//             const v = this.currentDict.get(key);
//             if (Array.isArray(v)){
//                 v.push(value);
//                 this.set(key, v);
//                 return this;
//             }
//             else{
//                 this.set(key, [v, value]);
//                 return this;
//             }
//         }
//         else{
//             return this.extend(key, value);
//         }
//     }

//     public merge_environment(env: MatchEnvironment): MatchEnvironment{
//         return new MatchEnvironment(this.parentEnvironment, this.currentDict.merge(env.currentDict));
//     }

//     public to_String(): string{
//         return `MatchEnvironment(${this.currentDict.toString()})`;
//     }

//     public spawnChild(): MatchEnvironment{
//         const childEnv = new MatchEnvironment(this, new MatchDict(new Map()), []);
//         console.log("childEnv_spawned", childEnv.to_String())
//         // this.childEnvironments.push(childEnv);
//         return childEnv;
//     }

//     public extendsToNewChild(key: string, value: any): MatchEnvironment{
//         const childEnv = new MatchEnvironment(this, new MatchDict(new Map([[key, value]])));
//         // this.childEnvironments.push(childEnv);
//         return childEnv;
//     }
// }

// export function createEnvironment(key: string, value: any): MatchEnvironment{
//     return new MatchEnvironment(null, new MatchDict(new Map([[key, value]])));
// }

// export function emptyEnvironment(): MatchEnvironment{
//     return new MatchEnvironment(null, new MatchDict(new Map()));
// }