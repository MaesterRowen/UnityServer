import { Struct, MType } from '../struct';

export class DTRConnect extends Struct {
    constructor(data?: Buffer) {
        super("KEYX");
        this.AddMember("PublicKey", 96, MType.HEX, 0);

        // Initialize our buffer contents
        this.SetBuffer(data);
    }
}

export class DTRPong extends Struct {
    constructor(data?: Buffer) {
        super("PONG");
        this.AddMember("Magic", 4, MType.STRING, 0);

        // Initialize our buffer ontents
        this.SetBuffer(data);
    }
}

export class DTRAuthStatus extends Struct {
    constructor(data?: Buffer) {
        super("STAT");
        this.AddMember("PlayerId", 4, MType.DWORD, 0);
        this.AddMember("UserPermissions", 4, MType.DWORD, 4);

        // Initialize our buffer ontents
        this.SetBuffer(data);
    }
}