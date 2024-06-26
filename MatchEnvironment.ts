

import { MatchDict } from "./MatchDict";

export class MatchEnvironment{
    public readonly parentEnvironment: MatchEnvironment | null;
    public readonly currentDict: MatchDict;

    constructor(parentEnvironment: MatchEnvironment | null, currentDict: MatchDict){
        this.parentEnvironment = parentEnvironment;
        this.currentDict = currentDict;
    }

    public get(key: string): any{
        if(this.currentDict.has(key)){
            console.log("Getting key", key, "from current dict");
            const result = this.currentDict.get(key);
            console.log("Got key", key, "from current dict", result);
            return result;
        }
        const result = this.parentEnvironment?.get(key) ?? null;
        if (this.parentEnvironment === null){
            console.log("No parent environment");
        }

        if (result === null){
            console.log("undefined key", key);
            return undefined;
        }
        return result;
    }

    public extend(key: string, value: any): MatchEnvironment{
        console.log("Extending environment with", key, value);
        return new MatchEnvironment(this.parentEnvironment, this.currentDict.extend(key, value));

    } 

    public spawnChild(): MatchEnvironment{
        return new MatchEnvironment(this, new MatchDict(new Map()));
    }

    public extendsToNewChild(key: string, value: any): MatchEnvironment{
        return new MatchEnvironment(this, new MatchDict(new Map([[key, value]])));
    }
}

export function createEnvironment(key: string, value: any): MatchEnvironment{
    return new MatchEnvironment(null, new MatchDict(new Map([[key, value]])));
}

export function emptyEnvironment(): MatchEnvironment{
    return new MatchEnvironment(null, new MatchDict(new Map()));
}