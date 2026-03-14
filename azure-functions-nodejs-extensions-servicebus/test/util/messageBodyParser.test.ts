// Copyright (c) .NET Foundation. All rights reserved.
// Licensed under the MIT License.

import { expect } from 'chai';
import { messageBodyAsText, messageBodyAsJson } from '../../src/util/messageBodyParser';

describe('messageBodyParser', () => {
    describe('messageBodyAsText', () => {
        it('should convert a Buffer body to a UTF-8 string', () => {
            const message = { body: Buffer.from('hello world', 'utf8') };
            expect(messageBodyAsText(message)).to.equal('hello world');
        });

        it('should return a string body as-is', () => {
            const message = { body: 'already a string' };
            expect(messageBodyAsText(message)).to.equal('already a string');
        });

        it('should JSON.stringify an object body', () => {
            const obj = { key: 'value', num: 42 };
            const message = { body: obj };
            expect(messageBodyAsText(message)).to.equal(JSON.stringify(obj));
        });

        it('should JSON.stringify an array body', () => {
            const arr = [1, 2, 3];
            const message = { body: arr };
            expect(messageBodyAsText(message)).to.equal(JSON.stringify(arr));
        });

        it('should handle a Buffer containing JSON', () => {
            const json = '{"orderId":"abc-123","amount":99.95}';
            const message = { body: Buffer.from(json, 'utf8') };
            expect(messageBodyAsText(message)).to.equal(json);
        });

        it('should handle an empty Buffer', () => {
            const message = { body: Buffer.alloc(0) };
            expect(messageBodyAsText(message)).to.equal('');
        });

        it('should handle an empty string body', () => {
            const message = { body: '' };
            expect(messageBodyAsText(message)).to.equal('');
        });

        it('should handle a numeric body', () => {
            const message = { body: 42 };
            expect(messageBodyAsText(message)).to.equal('42');
        });

        it('should handle a boolean body', () => {
            const message = { body: true };
            expect(messageBodyAsText(message)).to.equal('true');
        });

        it('should handle a null body', () => {
            const message = { body: null };
            expect(messageBodyAsText(message)).to.equal('null');
        });

        it('should handle a Buffer with multi-byte UTF-8 characters', () => {
            const text = '日本語テスト 🎉';
            const message = { body: Buffer.from(text, 'utf8') };
            expect(messageBodyAsText(message)).to.equal(text);
        });

        it('should throw TypeError for a Buffer with invalid UTF-8 bytes', () => {
            const message = { body: Buffer.from([0x80, 0x81, 0xFF]) };
            expect(() => messageBodyAsText(message)).to.throw(TypeError);
        });
    });

    describe('messageBodyAsJson', () => {
        it('should parse a Buffer containing JSON into an object', () => {
            const obj = { orderId: 'abc-123', amount: 99.95 };
            const message = { body: Buffer.from(JSON.stringify(obj), 'utf8') };
            const result = messageBodyAsJson<typeof obj>(message);
            expect(result).to.deep.equal(obj);
        });

        it('should parse a string body containing JSON', () => {
            const obj = { name: 'test', value: 123 };
            const message = { body: JSON.stringify(obj) };
            const result = messageBodyAsJson<typeof obj>(message);
            expect(result).to.deep.equal(obj);
        });

        it('should parse an object body that gets JSON.stringified then re-parsed', () => {
            const obj = { key: 'value' };
            const message = { body: obj };
            const result = messageBodyAsJson<typeof obj>(message);
            expect(result).to.deep.equal(obj);
        });

        it('should support generic type parameter for type-safe results', () => {
            interface OrderMessage {
                orderId: string;
                amount: number;
                items: string[];
            }
            const order: OrderMessage = { orderId: 'ord-1', amount: 50, items: ['A', 'B'] };
            const message = { body: Buffer.from(JSON.stringify(order), 'utf8') };
            const result = messageBodyAsJson<OrderMessage>(message);
            expect(result.orderId).to.equal('ord-1');
            expect(result.amount).to.equal(50);
            expect(result.items).to.deep.equal(['A', 'B']);
        });

        it('should accept a reviver function to transform values', () => {
            const json = '{"name":"test","createdAt":"2026-01-15T10:30:00.000Z"}';
            const message = { body: Buffer.from(json, 'utf8') };
            const result = messageBodyAsJson<{ name: string; createdAt: Date }>(
                message,
                (key: string, value: unknown) => {
                    if (key === 'createdAt' && typeof value === 'string') {
                        return new Date(value);
                    }
                    return value;
                }
            );
            expect(result.name).to.equal('test');
            expect(result.createdAt).to.be.instanceOf(Date);
            expect(result.createdAt.toISOString()).to.equal('2026-01-15T10:30:00.000Z');
        });

        it('should throw SyntaxError for invalid JSON in Buffer', () => {
            const message = { body: Buffer.from('not valid json', 'utf8') };
            expect(() => messageBodyAsJson(message)).to.throw(SyntaxError);
        });

        it('should throw SyntaxError for invalid JSON string', () => {
            const message = { body: 'not valid json' };
            expect(() => messageBodyAsJson(message)).to.throw(SyntaxError);
        });

        it('should parse a JSON array', () => {
            const arr = [1, 'two', { three: 3 }];
            const message = { body: Buffer.from(JSON.stringify(arr), 'utf8') };
            const result = messageBodyAsJson<typeof arr>(message);
            expect(result).to.deep.equal(arr);
        });

        it('should parse JSON primitives', () => {
            expect(messageBodyAsJson<number>({ body: Buffer.from('42', 'utf8') })).to.equal(42);
            expect(messageBodyAsJson<string>({ body: Buffer.from('"hello"', 'utf8') })).to.equal('hello');
            expect(messageBodyAsJson<boolean>({ body: Buffer.from('true', 'utf8') })).to.equal(true);
            expect(messageBodyAsJson<null>({ body: Buffer.from('null', 'utf8') })).to.equal(null);
        });

        it('should handle nested objects in Buffer', () => {
            const nested = {
                level1: {
                    level2: {
                        value: 'deep',
                    },
                },
            };
            const message = { body: Buffer.from(JSON.stringify(nested), 'utf8') };
            const result = messageBodyAsJson<typeof nested>(message);
            expect(result.level1.level2.value).to.equal('deep');
        });
    });
});
