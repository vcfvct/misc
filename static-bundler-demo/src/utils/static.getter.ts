export class StaticGetter{
  private static _instance: Instance;

  static get instance(): Instance {
    return this._instance;
  }

  static setInstance() {
    this._instance = {name: 'Han Li'};
  }
}

export interface Instance {
  name: string;
}
