import { Number, type Static } from 'runtypes';
const Integer = Number.withConstraint(n => n % 1 === 0, { name: 'Integer' });
export type Int = Static<typeof Integer>;