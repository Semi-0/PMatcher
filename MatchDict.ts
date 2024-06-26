export class MatchDict{
    public readonly dict: Map<string, any>;
    constructor(_dict: Map<string, any>) {
        this.dict = _dict;
    }

    public has(key: string): boolean {
        return this.dict.has(key);
    }

    public extend(key: string, value: any): MatchDict {
        const new_dict = new Map(this.dict);
        new_dict.set(key, value);
        return new MatchDict(new_dict);
    } 

    public get(key: string): any {
        return this.dict.get(key);
    }
}

export function emptyMatchDict(): MatchDict {
    return new MatchDict(new Map());
}