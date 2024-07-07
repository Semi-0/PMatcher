import {
    DictValue, MatchDict, empty_dict_value, construct_dict_value,
    has_default_value, get_default_value, has_multi_scope_definition,
    has_scope_reference, extend, get_value, is_empty_dict_value,
    is_match_key, is_match_dict, has_key, is_dict_item, format_match_dict_item,
    is_dict_key, is_key_and_scoped_ref
} from '../MatchDict';
import type { ScopeReference, NestedValue, DictItem, KeyAndScopedRef } from '../MatchDict';
import {test, expect, describe, beforeEach} from "bun:test";

describe('MatchDict', () => {
    let dictValue: DictValue;
    let matchDict: MatchDict;

    beforeEach(() => {
        dictValue = empty_dict_value();
        matchDict = new MatchDict();
    });

    describe('DictValue operations', () => {
        test('empty_dict_value', () => {
            expect(is_empty_dict_value(dictValue)).toBe(true);
        });

        test('construct_dict_value', () => {
            dictValue = construct_dict_value(0, 'default');
            expect(has_default_value(dictValue)).toBe(true);
            expect(get_default_value(dictValue)).toBe('default');

            dictValue = construct_dict_value(1, 'non-default');
            expect(has_default_value(dictValue)).toBe(false);
            expect(has_scope_reference(1, dictValue)).toBe(true);
        });

        test('has_multi_scope_definition', () => {
            dictValue = construct_dict_value(1, 'value1');
            expect(has_multi_scope_definition(dictValue)).toBe(false);

            dictValue = extend({value: 'value2', scopeRef: 2}, dictValue);
            expect(has_multi_scope_definition(dictValue)).toBe(true);
        });
    });

    describe('MatchDict operations', () => {
        test('extend and get_value', () => {
            extend({key: 'test', value: 'value'}, matchDict);
            expect(get_value('test', matchDict)).toBe('value');

            const complexValue = construct_dict_value(1, 'complex');
            extend({key: 'complex', value: complexValue}, matchDict);
            expect(get_value({key: 'complex', scopeRef: 1}, matchDict)).toBe('complex');
        });

        test('has_key', () => {
            extend({key: 'test', value: 'value'}, matchDict);
            expect(has_key('test', matchDict)).toBe(true);
            expect(has_key('nonexistent', matchDict)).toBe(false);
        });
    });

    describe('Type guards', () => {
        test('is_match_key', () => {
            expect(is_match_key('test')).toBe(true);
            expect(is_match_key(123)).toBe(false);
        });

        test('is_match_dict', () => {
            expect(is_match_dict(matchDict)).toBe(true);
            expect(is_match_dict({})).toBe(false);
        });

        test('is_dict_item', () => {
            expect(is_dict_item({key: 'test', value: 'value'})).toBe(true);
            expect(is_dict_item({key: 'test'})).toBe(false);
        });

        test('format_match_dict_item', () => {
            expect(format_match_dict_item({key: 'test', value: 'value'})).toBe(true);
            expect(format_match_dict_item({key: 'test'})).toBe(false);
        });

        test('is_dict_key', () => {
            expect(is_dict_key('test')).toBe(true);
            expect(is_dict_key(123)).toBe(false);
        });

        test('is_key_and_scoped_ref', () => {
            expect(is_key_and_scoped_ref({key: 'test', scopeRef: 1})).toBe(true);
            expect(is_key_and_scoped_ref({key: 'test'})).toBe(false);
        });
    });

    describe('Error cases', () => {
        test('get_default_value on empty DictValue', () => {
            expect(() => get_default_value(dictValue)).toThrow();
        });

        test('get_value on nonexistent key', () => {
            expect(() => get_value('nonexistent', matchDict)).toThrow();
        });

        test('extend with invalid arguments', () => {
            expect(() => extend('invalid', matchDict)).toThrow();
        });

        test('get_value with invalid arguments', () => {
            expect(() => get_value('invalid', 'not a MatchDict')).toThrow();
        });
    });
});

// ... existing imports ...
import type { KeyAndScopeIndex } from '../MatchDict';
import { is_key_and_scoped_index } from '../MatchDict';

describe('MatchDict', () => {
    // ... existing test suites ...

    describe('KeyAndScopeIndex operations', () => {
        let matchDict: MatchDict;

        beforeEach(() => {
            matchDict = new MatchDict();
            const complexValue = new DictValue();
            complexValue.referenced_definition.set(0, 'outer');
            complexValue.referenced_definition.set(1, 'inner');
            complexValue.referenced_definition.set(2, 'innermost');
            extend({key: 'complex', value: complexValue}, matchDict);
        });

        test('is_key_and_scoped_index', () => {
            expect(is_key_and_scoped_index({key: 'test', scopeIndex: 0})).toBe(true);
            expect(is_key_and_scoped_index({key: 'test', scopeIndex: '0'})).toBe(true);
            expect(is_key_and_scoped_index({key: 'test'})).toBe(false);
            expect(is_key_and_scoped_index({scopeIndex: 0})).toBe(false);
            expect(is_key_and_scoped_index(null)).toBe(false);
        });

        test('get_value with KeyAndScopeIndex', () => {
            expect(get_value({key: 'complex', scopeIndex: 0}, matchDict)).toBe('outer');
            expect(get_value({key: 'complex', scopeIndex: 1}, matchDict)).toBe('inner');
            expect(get_value({key: 'complex', scopeIndex: 2}, matchDict)).toBe('innermost');
        });

        test('get_value with invalid scopeIndex', () => {
            expect(() => get_value({key: 'complex', scopeIndex: 3}, matchDict)).toThrow(/attempt to get scope index exceeds from the value size/);
        });

        test('get_value with non-existent key', () => {
            expect(() => get_value({key: 'nonexistent', scopeIndex: 0}, matchDict)).toThrow(/attempt to get the scope value from a undefined index/);
        });
    });
});