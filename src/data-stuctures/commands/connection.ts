import { Struct, MType } from '../struct';

export class DTQConnect extends Struct {
    constructor(data?: Buffer) {
        super("CONN");
        this.AddMember("ServiceVersion", 4, MType.DWORD, 0);
        this.AddMember("PublicKey", 96, MType.HEX, 4);

        // Initialize our buffer contents
        this.SetBuffer(data);
    }
}

export class DTQPing extends Struct {
    constructor(data?: Buffer) {
        super("PING");
        this.AddMember("Magic", 4, MType.STRING, 0);

        // Initialize our buffer ontents
        this.SetBuffer(data);
    }
}

export class DTQAuthenticate extends Struct {
    constructor(data?: Buffer) {
        super("AUTH");
        this.AddMember("Username", 32, MType.STRING, 0);
        this.AddMember("APIKey", 16, MType.HEX, 32);
        this.AddMember("GamerTag", 16, MType.STRING, 48);
        this.AddMember("Flags", 2, MType.STRING, 64);

        // Initailize the buffer contents
        this.SetBuffer(data);
    }
}
