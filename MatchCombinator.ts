import { MatchDict, emptyMatchDict } from "./MatchDict";
import { match_constant, match_element, match_segment } from "./MatchCallback";
import type { matcher_callback } from "./MatchCallback";
import { inspect } from "util";


// match_element match_segment match_compose(match_constant, match_segment))

function isNestedArray(obj: any): boolean {
    if (Array.isArray(obj)) {
        return obj.some(item => Array.isArray(item));
    }
    return false;
}

function isPurelyNestedArray(obj: any): boolean {
    return Array.isArray(obj) && obj.every(item => Array.isArray(item));
}





export function match_compose(matchers: matcher_callback[]) : matcher_callback {
    return (data: any[], dictionary: MatchDict, succeed: (dictionary: MatchDict, nEaten: number) => any): any => {
        const loop = (data_index: number, matcher_index: number, dictionary: MatchDict): any => {
            if (matcher_index < matchers.length){
                const matcher = matchers[matcher_index];
                const currentSlice = data.slice(data_index);

                if (isPurelyNestedArray(currentSlice)){
                    const result = matcher(currentSlice[0], dictionary, (new_dict, nEaten) => {
                        return loop(data_index + nEaten, matcher_index + 1, new_dict);
                    });
                    return result;
                }
                else{
                    const result = matcher(currentSlice, dictionary, (new_dict, nEaten) => {
                        return loop(data_index + nEaten, matcher_index + 1, new_dict);
                    });
                    return result;
                }
            } else if (data_index < data.length){
            // means data is not fully consumed
               return false  
            } 
            else if (data_index >= data.length){
                return succeed(dictionary, data_index)
            }
            else {
                return false
            }
        };
        
        if  (data === undefined || data === null || data.length === 0) {
            return false;
        }
        else{
            return loop(0, 0, dictionary)
        }
    };
}


export function match_choose(matchers: matcher_callback[]): matcher_callback {
    return (data: any[], dictionary: MatchDict, succeed: (dictionary: MatchDict, nEaten: number) => any): any => {
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
    match_compose([
       match_compose([
        match_element("symbol"),
        match_constant("d")
       ])
    ])

])

const result = nested_matcher_test(["a", "b", [["c", "d"]]], new MatchDict(new Map()), (dict, nEaten) => {
   return dict 
})

console.log(inspect(result))


// const matcher_test = match_compose([
//     match_constant("a"),
// ]
// )

// const result2 = matcher_test(["a", "b"], new MatchDict(new Map()), (dict, nEaten) => {
//     return nEaten
// })

// console.log(inspect(result2))