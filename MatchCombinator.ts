import { MatchDict, emptyMatchDict } from "./MatchDict";
import { match_constant, match_element, match_segment } from "./MatchCallback";
import type { matcher_callback } from "./MatchCallback";
import { inspect } from "util";
import { first, rest, isPair, isEmpty } from "./utility";

// match_element match_segment match_compose(match_constant, match_segment))



export function match_compose(all_matchers: matcher_callback[]) : matcher_callback {
    return (data: any[], dictionary: MatchDict, succeed: (dictionary: MatchDict, nEaten: number) => any): any => {
        const loop = (data_list: any[], matchers: matcher_callback[], dictionary: MatchDict): any => {
        
                // const matcher = matchers[matcher_index];
            if (isPair(matchers)){
                const matcher = first(matchers)
                const result = matcher(data_list, dictionary, (new_dict: MatchDict, nEaten: number) => {
                    return loop(data_list.slice(nEaten), rest(matchers), new_dict);
                });
                return result;
            }
             else if (isPair(data_list)){
               return false  
            } 
            else if (isEmpty(data_list)){
                return succeed(dictionary, 1)
            }
            else{
                return false
            }

        };
        
        if  (!isPair(data)) {
            return false;
        }
        else{
            return loop(first(data), all_matchers, dictionary)
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


// export function run_matcher(matchers: matcher_callback[], data: any[], dictionary: MatchDict, succeed: (dictionary: MatchDict, nEaten: number) => any): any {
//    const ml = match_compose(matchers)
//    return ml(data, dictionary, succeed)
// }

// const nested_matcher_test = match_compose([
//     match_constant("a"),
//     match_constant("b"),
//     match_compose([
//        match_compose([
//         match_element("symbol"),
//         match_constant("d")
//        ])
//     ])

// ])

// const result = nested_matcher_test([["a", "b", [["c", "d"]]]], new MatchDict(new Map()), (dict, nEaten) => {
//    return dict 
// })

// console.log(inspect(result))


