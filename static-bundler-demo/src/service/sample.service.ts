import { StaticGetter } from "../../src/utils/static.getter";

export class SampleService{
  async run() {
    console.log(`in service, ${StaticGetter.instance.name}`);
  }
}
