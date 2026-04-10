import { ConfigType } from '@nestjs/config';
import { app, database, jwt } from './configs';

export interface Configs {
  app: ConfigType<typeof app>;
  database: ConfigType<typeof database>;
  jwt: ConfigType<typeof jwt>;
}
