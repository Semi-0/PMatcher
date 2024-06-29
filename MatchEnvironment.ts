

import { MatchDict } from "./MatchDict";

export class MatchEnvironment{
    public readonly parentEnvironment: MatchEnvironment | null;
    public readonly currentDict: MatchDict;
    public readonly childEnvironments: MatchEnvironment[] ;

    constructor(parentEnvironment: MatchEnvironment | null, currentDict: MatchDict, childEnvironments: MatchEnvironment[] = []){
        this.parentEnvironment = parentEnvironment;
        this.currentDict = currentDict;
        this.childEnvironments = childEnvironments;
    }

    public get(key: string): any{
        if(this.currentDict.has(key)){
            const result = this.currentDict.get(key);
            return result;
        }
        return this.parentEnvironment?.get(key) ?? null;
    }

    public extend(key: string, value: any): MatchEnvironment{
        return new MatchEnvironment(this.parentEnvironment, this.currentDict.extend(key, value), []);

    } 

    public spawnChild(): MatchEnvironment{
        const childEnv = new MatchEnvironment(this, new MatchDict(new Map()), []);
        this.childEnvironments.push(childEnv);
        return childEnv;
    }

    public extendsToNewChild(key: string, value: any): MatchEnvironment{
        const childEnv = new MatchEnvironment(this, new MatchDict(new Map([[key, value]])));
        this.childEnvironments.push(childEnv);
        return childEnv;
    }
}

export function createEnvironment(key: string, value: any): MatchEnvironment{
    return new MatchEnvironment(null, new MatchDict(new Map([[key, value]])));
}

export function emptyEnvironment(): MatchEnvironment{
    return new MatchEnvironment(null, new MatchDict(new Map()));
}