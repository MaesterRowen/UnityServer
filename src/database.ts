import { mysql, Constants } from './shared';
import { MysqlError } from 'mysql';
import { Util } from './util';

export class Database {

  public static Pool: mysql.Pool = mysql.createPool({
    host: "localhost",
    user: "linkuser",
    password: "linkpass",
    database: "xboxunity",
    acquireTimeout: 10000,
    waitForConnections: true,
    connectionLimit: 100,
    queueLimit: 0,
    multipleStatements: true
  });

  public static PrintError(err: MysqlError): void {
    Util.Log("SQL Error >> " + err.message);
  }

  public static PrintQueryResults(results?: any): void {
    if (results) {
      Util.Log(JSON.stringify(results, null, 2));
    }
  }
}