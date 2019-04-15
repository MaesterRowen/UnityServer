import { Struct, MType } from './struct';

export class DTPacketHeader extends Struct {
    constructor(data?: Buffer) {
        super();
        this.AddMember("Magic", 4, MType.STRING, 0);
        this.AddMember("Direction", 2, MType.WORD, 4);
        this.AddMember("Version", 2, MType.WORD, 6);
        this.AddMember("Hash", 20, MType.HEX, 8);
        this.AddMember("PayloadSize", 4, MType.DWORD, 28);

        // Initialize our buffer contents
        this.SetBuffer(data);
    }
}

export class DTPayloadHeader extends Struct {
    constructor(data?: Buffer) {
        super();
        this.AddMember("Magic", 4, MType.STRING, 0);
        this.AddMember("Version", 2, MType.WORD, 4);
        this.AddMember("Flags", 2, MType.WORD, 6);
        this.AddMember("MessageUID", 4, MType.DWORD, 8);
        this.AddMember("CommandID", 4, MType.STRING, 12);
        this.AddMember("PayloadSize", 4, MType.DWORD, 16);

        // Initialize our buffer contents
        this.SetBuffer(data);
    }
}