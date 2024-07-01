export class MatchDict{
    public readonly dict: Map<string, any>;
    constructor(_dict: Map<string, any>) {
        this.dict = _dict;
    }

    public has(key: string): boolean {
        return this.dict.has(key);
    }

    public toString(): string{
        return `MatchDict(${Array.from(this.dict).map(([key, value]) => `${key}: ${value}`).join(", ")})`;
    }
    public extend(key: string, value: any): MatchDict {
        const new_dict = new Map(this.dict);
        new_dict.set(key, value);
        return new MatchDict(new_dict);
    } 

    public get(key: string): any {
        return this.dict.get(key);
    }

    public set(key: string, value: any) {
        this.dict.set(key, value);
    }

    public merge(dict_to_merge: MatchDict): MatchDict {
        const new_dict = new Map(this.dict);
        // check if two keys overlaps merge the value if not just return the new dict
        dict_to_merge.dict.forEach((value, key) => {
            if (new_dict.has(key)) {
                const current_value = new_dict.get(key)
                console.log(current_value)
                if(Array.isArray(current_value) && Array.isArray(value)){
                    new_dict.set(key, [...value, ...current_value]);
                }
                else if (Array.isArray(current_value)){
                    new_dict.set(key, [value, ...current_value]);
                }
                else if (Array.isArray(value)){
                    new_dict.set(key, [...value, current_value]);
                }
                else{
                    new_dict.set(key, [value, current_value]);
                }
            }
            else{
                new_dict.set(key, value);
            }
        });
        return new MatchDict(new_dict);
    }
}

export function emptyMatchDict(): MatchDict {
    return new MatchDict(new Map());
}