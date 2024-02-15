import { Injectable } from '@angular/core';

export abstract class IGigPlatformService {

  public abstract getEmployerInfo(employer: string): {
    name: string,
    light: string,
    dark: string,
    iconPath: string
  };

  public abstract getEmployerColorLight(employer: string): string;
  public abstract getEmployerColorDark(employer: string): string;
  public abstract getEmployerIconPath(employer: string): string;
}

@Injectable({
  providedIn: 'root'
})
export class GigPlatformService implements IGigPlatformService {

  private readonly _employers: any;

  constructor() {

    this._employers = {};

    this._employers[this.normalizeEmployer("gopuff")] = {
      name: "Gopuff",
      light: "#04477080",
      dark: "#044770",
      iconPath: "assets/imgs/logos/GoPuffBlue.svg"
    };

    this._employers[this.normalizeEmployer("instacart")] = {
      name: "Instacart",
      light: "#13ac1080",
      dark: "#13ac10",
      iconPath: "assets/imgs/logos/InstacartBlack.svg"
    };

    this._employers[this.normalizeEmployer("amazon_flex")] = {
      name: "Amazon Flex",
      light: "#fe6f0480",
      dark: "#fe6f04",
      iconPath: "assets/imgs/logos/AmazonFlexBlack.svg"
    };

    this._employers[this.normalizeEmployer("cornershop")] = {
      name: "Cornershop by Uber",
      light: "#e63b3980",
      dark: "#e63b39",
      iconPath: "assets/imgs/logos/CornershopBlack.svg"
    };

    this._employers[this.normalizeEmployer("uber_eats")] = {
      name: "Uber Eats",
      light: "#10975680",
      dark: "#109756",
      iconPath: "assets/imgs/logos/UberEatsBlack.svg"
    };

    this._employers[this.normalizeEmployer("spark_driver")] = {
      name: "Spark Driver",
      light: "#0d3d9280",
      dark: "#0d3d92",
      iconPath: "assets/imgs/logos/SparkDriverBlack.svg"
    };

    this._employers[this.normalizeEmployer("doordash")] = {
      name: "Doordash",
      light: "#ff310a80",
      dark: "#ff310a",
      iconPath: "assets/imgs/logos/DoordashBlack.svg"
    };

    this._employers[this.normalizeEmployer("lyft")] = {
      name: "Lyft",
      light: "#ff04ee80",
      dark: "#ff04ee",
      iconPath: "assets/imgs/logos/LyftBlack.svg"
    };

    this._employers[this.normalizeEmployer("uber")] = {
      name: "Uber",
      light: "#00000080",
      dark: "#000000AA",
      iconPath: "assets/imgs/logos/UberBlack.svg"
    };

    this._employers[this.normalizeEmployer("roadie")] = {
      name: "Roadie",
      light: "#3bb9bb80",
      dark: "#3bb9bb",
      iconPath: "assets/imgs/logos/roadie.png"
    };

    this._employers[this.normalizeEmployer("grubhub")] = {
      name: "Grubhub",
      light: "#ff850f80",
      dark: "#ff850f",
      iconPath: "assets/imgs/logos/GrubhubBlack.svg"
    };

    this._employers[this.normalizeEmployer("postmates")] = {
      name: "Postmates",
      light: "#00000080",
      dark: "#000000AA",
      iconPath: "assets/imgs/logos/PostmatesBlack.svg"
    };

    this._employers[this.normalizeEmployer("shipt")] = {
      name: "Shipt",
      light: "#00000080",
      dark: "#000000AA",
      iconPath: "assets/imgs/logos/ShiptBlack.png"
    };

    this._employers[this.normalizeEmployer("favor_delivery")] = {
      name: "Favor",
      light: "#2fa1df80",
      dark: "#2fa1df",
      iconPath: "assets/imgs/logos/favor.png"
    };
  }

  private normalizeEmployer(employer: string): string {
    return employer?.toLowerCase()?.replace("-", " ")?.replace("_", " ");
  }

  private getEmployerInfo_impl(employer: string): any {
    return this._employers[this.normalizeEmployer(employer)];
  }

  public getEmployerInfo(employer: string): any {
    const result = this.getEmployerInfo_impl(employer);
    if (!result) {
      return null;
    }

    return { ...result };
  }

  public getEmployerColorLight(employer: string): string {
    return this.getEmployerInfo_impl(employer)?.light;
  }

  public getEmployerColorDark(employer: string): string {
    return this.getEmployerInfo_impl(employer)?.dark;
  }

  public getEmployerIconPath(employer: string): string {
    return this.getEmployerInfo_impl(employer)?.iconPath;
  }
}
