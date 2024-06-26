function matchArgs(...predicates: ((args: any) => boolean)[]): (...args: any) => boolean{
    return (...args: any) => {
       if(predicates.length !== args.length){
        throw new Error("Predicates and arguments length mismatch", { cause: { predicates, args } })
       }
       else{
        return predicates.every((predicate, index) => predicate(args[index]))
       }
    }
}

export const match_args = matchArgs