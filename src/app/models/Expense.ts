import { parse } from "date-fns";

export class ExpenseType {
  colorHex: string;
  image: string;
  name: string;
  isDeductible: boolean;
}

export class Expense {

  public category?: string;
  public name?: string;
  public date?: Date;
  public dateFmt?: string;
  public money?: number;
  public id?: number;

  static parse(data: any): Expense {

    const result = new Expense();

    result.id = data["id"];
    result.category = data["category"];
    result.name = data["name"];

    if (data["date"]) {
      result.date = parse(data["date"],"yyyy-MM-dd", new Date());
      result.dateFmt = data["date"];
    }

    if (data["money"]) {
      result.money = data["money"] / 100;
    }

    return result;
  }
}
