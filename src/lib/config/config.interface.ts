import { ConfigType } from '@nestjs/config';
import { app, database, jwt, mail, redis, oauth2 } from './configs';

export interface Configs {
  app: ConfigType<typeof app>;
  database: ConfigType<typeof database>;
  jwt: ConfigType<typeof jwt>;
  mail: ConfigType<typeof mail>;
  redis: ConfigType<typeof redis>;
  oauth2: ConfigType<typeof oauth2>;
}
