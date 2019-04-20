import { Crypt } from './shared';

export class Util {

    static Log(messages?: any): void {
        console.log(messages);
    }

    static PrintBuffer(buffer: Buffer, bytesPerRow: number): void {
        let bytesRead: number = 0;
        let totalBytesRead: number = 0;
        let bufferLine: string = "";

        for (let i = 0; i < buffer.byteLength; i++) {
            bufferLine += buffer.toString('hex', totalBytesRead, totalBytesRead + 1);
            bufferLine += " ";
            bytesRead++;
            totalBytesRead++;

            if (bytesRead == bytesPerRow || totalBytesRead == buffer.byteLength) {

                Util.Log("0000:  " + bufferLine);
                bufferLine = "";
                bytesRead = 0;
            }
        }
    }

    static PrintObject(object: any): void {
        console.log(JSON.stringify(object, null, 2));
    }

    static ParseMACAddressBuffer(macBuffer: Buffer): string {
        let out: string = "";
        if (macBuffer.length != 6) {
            return "";
        } else {

            for (let x: number = 0; x < macBuffer.length; x++) {
                if (x > 0) {
                    out += ":";
                }
                out += macBuffer[x].toString(16);
            }

            return out;
        }
    }

    static PasswordHash(salt: string, password: string) {
        return salt + Crypt.CreateSha1Hash(Buffer.from(password + salt, 'utf8'));
    }

    static VerifyPassword(dbHash: Buffer, password: string): boolean {

        let testPW: string = this.PasswordHash(dbHash.slice(0, 5).toString('hex').toLowerCase(), password);
        let fromDB: string = dbHash.slice(0, dbHash.length).toString('hex').toLowerCase();

        return testPW === fromDB ? true : false;
    }

    static inet_ntoa(ipaddr: number): string {
        let nBuffer: ArrayBuffer = new ArrayBuffer(4);
        let nDataView: DataView = new DataView(nBuffer);
        nDataView.setUint32(0, ipaddr);

        let a = new Array();
        for (let i: number = 0; i < 4; i++) {
            a[i] = nDataView.getUint8(i);
        }
        return a.join(".");
    }

    static inet_aton(ipaddr: string): number {
        // Split into octets
        let a: string[] = ipaddr.split(".");
        let nBuffer: ArrayBuffer = new ArrayBuffer(4);
        let nDataView: DataView = new DataView(nBuffer);
        for (let i: number = 0; i < 4; i++) {
            nDataView.setUint8(i, parseInt(a[i], 10));
        }

        // Return result as 32 bit unsigned int
        return (nDataView.getUint32(0));
    }
}