import { MatchDict } from "./MatchDict";
import type { matcher_callback } from "./MatchCallback";

export function match_list(matchers: matcher_callback[]) : matcher_callback {
    return (data: string[], dictionary: MatchDict, succeed: (dictionary: MatchDict, nEaten: number) => any): any => {
        const loop = (data_index: number, matcher_index: number, dictionary: MatchDict): any => {
            if (matcher_index < matchers.length){
                const matcher = matchers[matcher_index] 
                const result = matcher(data.slice(data_index), dictionary, (new_dict, nEaten) => loop(data_index + nEaten, matcher_index + 1, new_dict))
                return result
            } 
            else if (data_index < data.length){
               return false  
            } 
            else if (data_index >= data.length){
                return succeed(dictionary, data_index)
            }
            else {
                return false
            }
        };

        if (data.length === 0) {
            return false;
        }
        return loop(0, 0, dictionary)
    };
}

export function match_choose(matchers: matcher_callback[]): matcher_callback {
    return (data: string[], dictionary: MatchDict, succeed: (dictionary: MatchDict, nEaten: number) => any): any => {
        for (const matcher of matchers) {
            const result = matcher(data, dictionary, succeed)
            if (result !== false) {
                return result
            }
        }
        return false
    }
}


export function run_matcher(matchers: matcher_callback[], data: string[], dictionary: MatchDict, succeed: (dictionary: MatchDict, nEaten: number) => any): any {
   const ml = match_list(matchers)
   return ml(data, dictionary, succeed)
}