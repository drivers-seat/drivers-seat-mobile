import { addSeconds } from "date-fns";
import { ILogService } from "../services/logging/log.service";
import { Logger } from "../services/logging/logger";

export class Cache<T> {

  private readonly _logger: Logger
  private _items: { [key: string]: CacheItem<Promise<T>> } = {};

  constructor(
    public readonly name: string,
    public readonly expiration_seconds: number,
    logSvc: ILogService
  ) {
    this._logger = logSvc.getLogger('Cache<${name}>');
    setInterval(this.maintain.bind(this), expiration_seconds * 1000 * 2);
  }

  public clear() {
    this._items = {};
  }

  public removeItem(key: string) {
    delete this._items[key];
  }

  public tryGetItem(key: string): Promise<T> {

    const now = new Date();
    let item = this._items[key];

    if (item?.expireTime > now) {
      item.updateAccessRef(now);
      return item.value;
    }

    return null;
  }

  public getItem(key: string, accessor: (k: string) => Promise<T>): Promise<T> {

    const cacheItem = this.tryGetItem(key);
    if (cacheItem) {
      return cacheItem
    }

    const value = accessor(key);
    this.setItemImpl(key, value);

    return value;
  }

  public setItem(key: string, value: T) {

    const promise = Promise.resolve(value);
    this.setItemImpl(key, promise);
  }

  private setItemImpl(key: string, valuePromise: Promise<T>) {

    const now = new Date();
    this._items[key] = new CacheItem<Promise<T>>(valuePromise, addSeconds(now, this.expiration_seconds));
  }

  private maintain() {

    this._logger.LogDebug("Maintain Cache", "start");
    const now = new Date();

    [...Object.keys(this._items)].forEach(key => {
      const item = this._items[key];
      if (item && item.expireTime < now) {
        this._logger.LogDebug(this.name, "Removing expired item", key);
        delete this._items[key];
      }
    });

    this._logger.LogDebug("Maintain Cache", "end");
  }
}

export class CacheItem<T> {

  get value(): T {
    return this._valuePromise;
  }

  get expireTime(): Date {
    return this._expireTime;
  }

  get lastAccessTime(): Date {
    return this._lastAccessTime;
  }

  private _lastAccessTime: Date = new Date();

  constructor(
    private _valuePromise: T,
    private _expireTime: Date
  ) {
    this.updateAccessRef();
  }

  updateAccessRef(dtm: Date = null) {
    this._lastAccessTime = dtm || new Date();
  }

  setValue(valuePromise: T, expireTime: Date) {
    this._valuePromise = valuePromise;
    this._expireTime = expireTime;

    this.updateAccessRef();
  }
}
