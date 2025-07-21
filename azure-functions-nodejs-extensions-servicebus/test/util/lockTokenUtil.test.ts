// Copyright (c) .NET Foundation. All rights reserved.
// Licensed under the MIT License.

import { expect } from 'chai';
import { LockTokenUtil } from '../../src/util/lockTokenUtil';

describe('LockTokenUtil', () => {
    describe('convertToString', () => {
        it('should convert a valid 16-byte lock token buffer to a UUID string format', () => {
            const lockToken = Buffer.from([
                0xbd, 0xb0, 0x8a, 0xee, 0x3e, 0xa8, 0x06, 0x45, 0xba, 0x30, 0x19, 0xcc, 0xb4, 0x0b, 0x50, 0x73,
            ]);

            const result = LockTokenUtil.convertToString(lockToken);
            expect(result).to.equal('ee8ab0bd-a83e-4506-ba30-19ccb40b5073');

            // Check UUID pattern
            expect(result).to.match(/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/);
        });

        it('should handle leading zeros correctly in lock token', () => {
            const lockToken = Buffer.from([
                0x00, 0x00, 0x00, 0x01, 0x00, 0x02, 0x00, 0x03, 0x04, 0x05, 0x06, 0x07, 0x08, 0x09, 0x0a, 0x0b,
            ]);

            const result = LockTokenUtil.convertToString(lockToken);
            expect(result).to.equal('01000000-0200-0300-0405-060708090a0b');
        });

        it('should throw or produce incorrect output if buffer size < 16', () => {
            const shortBuffer = Buffer.from([0x01, 0x02]);
            const result = LockTokenUtil.convertToString(shortBuffer);

            // Output would be malformed UUID string due to missing segments
            expect(result)
                .to.be.a('string')
                .and.not.match(/^[a-f0-9]{8}-/);
        });

        it('should throw or produce incorrect output if buffer is empty', () => {
            const emptyBuffer = Buffer.from([]);
            const result = LockTokenUtil.convertToString(emptyBuffer);
            expect(result).to.be.a('string').and.equal('----');
        });
    });

    describe('extractFromMessage', () => {
        const tokenBytes = [
            0xbd, 0xb0, 0x8a, 0xee, 0x3e, 0xa8, 0x06, 0x45, 0xba, 0x30, 0x19, 0xcc, 0xb4, 0x0b, 0x50, 0x73,
        ];
        const expected = 'ee8ab0bd-a83e-4506-ba30-19ccb40b5073';

        it('should extract and convert token from a Buffer', () => {
            const buffer = Buffer.from([...tokenBytes, 0x01, 0x02]); // extra trailing bytes
            const result = LockTokenUtil.extractFromMessage(buffer, 16);
            expect(result).to.equal(expected);
        });

        it('should extract and convert token from a number[] array', () => {
            const byteArray = [...tokenBytes, 0xaa, 0xbb];
            const result = LockTokenUtil.extractFromMessage(byteArray, 16);
            expect(result).to.equal(expected);
        });

        it('should extract only first 16 bytes even if index > 16', () => {
            const buffer = Buffer.from([...tokenBytes, 0xff, 0xee, 0xdd]);
            const result = LockTokenUtil.extractFromMessage(buffer, 32);
            expect(result).to.equal(expected);
        });

        it('should behave poorly or throw if index < 16 (truncated token)', () => {
            const buffer = Buffer.from(tokenBytes);
            const result = LockTokenUtil.extractFromMessage(buffer, 10);
            expect(result)
                .to.be.a('string')
                .and.not.match(/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/);
        });

        it('should throw or error if message is empty buffer', () => {
            const result = LockTokenUtil.extractFromMessage(Buffer.from([]), 16);
            expect(result).to.be.a('string').and.equal('----');
        });

        it('should throw or error if message is array with insufficient bytes', () => {
            const result = LockTokenUtil.extractFromMessage([0x01, 0x02], 16);
            expect(result)
                .to.be.a('string')
                .and.not.match(/^[a-f0-9]{8}-/);
        });
    });

    describe('X_OPT_LOCK_TOKEN constant', () => {
        it('should match expected value', () => {
            const token = LockTokenUtil.X_OPT_LOCK_TOKEN;
            expect(token).to.be.instanceOf(Buffer);
            expect(token.toString()).to.equal('x-opt-lock-token');
        });
    });
});
