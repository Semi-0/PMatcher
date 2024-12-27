var referenceCount = 0

export function clearRefHistory(){
    referenceCount = 0
}


export type ScopeReference = number

export function default_ref(): ScopeReference{
    return 0
}

export function new_ref(): ScopeReference{
    referenceCount = referenceCount + 1
    return referenceCount
}

export function is_scope_reference(A: any): boolean{
    return typeof A === "number"
}

