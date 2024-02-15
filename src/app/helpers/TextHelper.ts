export class TextHelper {

  private static _instance: TextHelper;

  public static get instance(): TextHelper {
    this._instance = this._instance || new TextHelper();
    return this._instance;
  }


  public static isEmailValid(text: string): boolean {
    return this.instance.isEmailValid(text);
  }

  public static isPasswordValid(text: string): boolean {
    return this.instance.isPasswordValid(text);
  }

  public static isPhoneNumberValid(text: string): boolean {
    return this.instance.isPasswordValid(text);
  }

  public static removeNonAlphaChar(text: string): string {
    return this.instance.removeNonAlphaChar(text);
  }

  public static isValidPostalCode(text: string): boolean {
    return this.instance.isValidPostalCode(text);
  }

  public static toFriendlyCsv<T>(delimiter: string, items: T[]): string {
    return this.instance.toFriendlyCsv(delimiter, items);
  }

  public static isEmpty(value: string): boolean {
    return this.instance.isEmpty(value);
  }

  public static isString(value: any): boolean {
    return this.instance.isString(value);
  }

  public static isValidString(value: any): boolean {
    return this.instance.isValidString(value);
  }

  public static capitalizeFirstLetter(value: any): string {
    return this.instance.capitalizeFirstLetter(value);
  }



  public isEmailValid(text: string): boolean {
    return /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/.test(text)
  }

  public isPasswordValid(text: string): boolean {
    return text?.replace(' ', '').length >= 8;
  }

  public isPhoneNumberValid(text: string): boolean {
    return /^\d{10}$/.test(text);
  }


  public removeNonAlphaChar(text: string): string {
    return text?.replace(/[^a-z0-9]/gi, '');
  }

  public isValidPostalCode(text: string): boolean {

    text = text?.replace("-", "");
    text = text?.replace(" ", "");
    text = text?.replace("_", "");
    text = text?.replace(".", "");
    text = text?.replace(",", "");

    return text?.length >= 5;
  }

  public toFriendlyCsv<T>(delimiter: string, items: T[]): string {

    const values = items?.filter(x => x != null);
    if (!values || values.length == 0) {
      return "";
    }

    if (values.length == 1) {
      return `${values[0]}`.trim();
    }

    return `${items.slice(0, -1).join(', ')} ${delimiter} ${items[items.length - 1]}`;
  }

  public isEmpty(value: string): boolean {
    return !(value == undefined || value.trim() == "");
  }

  public isString(value: any): boolean {
    if (value == undefined) {
      return false;
    }
    return (typeof value === 'string' || value instanceof String)
  }

  public isValidString(value: any): boolean {
    return this.isString(value) && !this.isEmpty(value);
  }

  public capitalizeFirstLetter(value: any): string {
    if (!value || value.trim() == "") {
      return "";
    }

    const str = `${value.trim()}`
    return str[0].toUpperCase() + str.slice(1);
  }
}