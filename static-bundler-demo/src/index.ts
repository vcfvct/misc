// have a static function using a static getter from another class. call the static function

import { SampleService } from "./service/sample.service";
import { StaticGetter } from "./utils/static.getter";

export async function handler() {
  StaticGetter.setInstance();
  const service = new SampleService();
  await service.run();
};
