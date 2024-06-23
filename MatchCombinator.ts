import { MatchDict, emptyMatchDict } from "./MatchDict";
import { match_constant, match_element, match_segment } from "./MatchCallback";
import type { matcher_callback } from "./MatchCallback";



// match_element match_segment match_compose(match_constant, match_segment))

export function match_compose(matchers: matcher_callback[]) : matcher_callback {
    return (data: any[], dictionary: MatchDict, succeed: (dictionary: MatchDict, nEaten: number) => any): any => {
        const loop = (data_index: number, matcher_index: number, dictionary: MatchDict): any => {
            if (matcher_index < matchers.length){
                const matcher = matchers[matcher_index] 
                const result = matcher(data.slice(data_index), 
                                       dictionary, 
                                       (new_dict, nEaten) => {
                                            return loop(data_index + nEaten, matcher_index + 1, new_dict)
                                        })
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
        else{
            return loop(0, 0, dictionary)
        }
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
// .constant "("   (choose (. compose (.segment('symbol') .segment('whitespace'))  ))


export function run_matcher(matchers: matcher_callback[], data: any[], dictionary: MatchDict, succeed: (dictionary: MatchDict, nEaten: number) => any): any {
   const ml = match_compose(matchers)
   return ml(data, dictionary, succeed)
}

const nested_matcher_test = match_compose([
    match_constant("a"),
    match_constant("b"),
])

const result = nested_matcher_test(["a", "b"], new MatchDict(new Map()), (dict, nEaten) => {
   return nEaten 
})

console.log(result)