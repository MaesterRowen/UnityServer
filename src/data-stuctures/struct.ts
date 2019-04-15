import { Util } from "../util";

export enum MType {
    DWORD = 0,
    WORD = 1,
    STRING = 2,
    HEX = 3,
    BYTE = 4
}

export interface IMember {
    size: number;
    type: MType;
    offset: number;
}


export class Struct {

    protected mMembers: IMember[] = [];
    protected mBuffer: Buffer = null;
    protected mSize: number = 0;
    protected mCommandID: string = "";

    constructor(cmdId?: string) {
        this.mBuffer = Buffer.alloc(0, 0);
        this.mCommandID = cmdId;
    }

    GetCommandId(): string {
        return this.mCommandID;
    }

    GetSize(): number {
        return this.mSize;
    }
    PrintData(): void {
        console.log("Structue: ");
        for (let n in this.mMembers) {
            Util.Log(" " + n + " = " + this.Get(n));
        }
    }
    GetBuffer(): Buffer {
        return Buffer.from(this.mBuffer, 0);
    }
    SetBuffer(input?: Buffer): void {
        if (Buffer.isBuffer(input) == false || input.length == 0) {
            this.mBuffer = Buffer.alloc(this.mSize, 0);
        } else if (input.length > this.mSize) {
            this.mBuffer = input.slice(0, this.mSize);
        } else {
            // Copy the entire buffer then fill the rest with 0s
            this.mBuffer = Buffer.alloc(this.mSize, 0);
            input.copy(this.mBuffer, 0, 0, input.length);
        }
    }
    AddMember(name: string, size: number, type: MType, offset: number) {
        this.mMembers[name] = {
            size: size,
            type: type,
            offset: offset
        };

        this.mSize += size;
    }
    Get(name: string): any {
        if (name in this.mMembers) {
            switch (this.mMembers[name].type) {
                case MType.DWORD:
                    return this.mBuffer.readUInt32BE(this.mMembers[name].offset);
                    break;
                case MType.WORD:
                    return this.mBuffer.readUInt16BE(this.mMembers[name].offset);
                    break;
                case MType.STRING:
                    return this.mBuffer.toString('utf8', this.mMembers[name].offset, this.mMembers[name].offset + this.mMembers[name].size).replace(/\0/g, '');
                    break;
                case MType.HEX:
                    let outBuff: Buffer = Buffer.alloc(this.mMembers[name].size, 0);
                    for (let x: number = 0; x < this.mMembers[name].size; x++) {
                        outBuff.writeUInt8(this.mBuffer.readUInt8(this.mMembers[name].offset + x), x);
                    }
                    return outBuff.toString('hex');
                    break;
                case MType.BYTE:
                    return this.mBuffer.readUInt8(this.mMembers[name].offset);
                    break;
            }
        }
    }
    Set(name: string, value: any): void {
        if (name in this.mMembers) {
            switch (this.mMembers[name].type) {
                case MType.DWORD:
                    this.mBuffer.writeUInt32BE(value, this.mMembers[name].offset);
                    break;
                case MType.WORD:
                    this.mBuffer.writeUInt16BE(value, this.mMembers[name].offset);
                    break;
                case MType.STRING:
                    this.mBuffer.write(value, this.mMembers[name].offset, this.mMembers[name].offset + this.mMembers[name].size, 'utf8');
                    break;
                case MType.HEX:
                    let inBuff: Buffer = Buffer.from(value);
                    for (let x: number = 0; x < this.mMembers[name].size; x++) {
                        this.mBuffer.writeUInt8(inBuff.readUInt8(x), this.mMembers[name].offset + x);
                    }
                    break;
                case MType.BYTE:
                    this.mBuffer.writeUInt8(value, this.mMembers[name].offset);
                    break;
            }
        }
    }
}