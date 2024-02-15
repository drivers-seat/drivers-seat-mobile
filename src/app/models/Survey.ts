import { Campaign, CampaignAction, IActionable } from "./Campaign";

export class Survey extends Campaign{
  public sections: SurveySection[]
}

export interface IDescriptor{
  description: string[]
  title: string[]
}

export interface IDependencies {
  dependencies: { [key: string]: Dependency }
}

export class SurveySection implements IDescriptor, IDependencies, IActionable {
  public id: string;
  public description: string[]
  public title: string[]
  public items: SurveyItem[]
  public dependencies: { [key: string]: Dependency }
  public validations: { [key: string]: SurveyValidation }
  public isEnabled: boolean
  public isValid: boolean;
  public messages: { [key: string]: string[] }
  public actions: CampaignAction[]
  public hide_page_markers: boolean;
  public hide_page_navigation: boolean;
  public content_url: string;
  public display_class: string[]

  public video_play_duration_seconds: number;
  public video_play_count: number;
  public video_completed: boolean;
}


export enum SurveyItemType {
  info = "info",
  short_text = "short_text",
  long_text = "long_text",
  boolean = "boolean",
  option = "option",
  numeric = "numeric",
  date = "date",
  segment_options = "segment_options",
  action = "action",
  chart = "chart"
}

export class SurveyItem implements IDescriptor, IDependencies {
  public type: SurveyItemType
  public description: string[]
  public level_left: number
  public level_right: number
  public field: string
  public title: string[]
  public label: string
  public hint: string
  public uom_left: string
  public uom_right: string
  public value: any
  public scale: number
  public options: SurveyOption[]
  public dependencies: { [key: string]: Dependency }
  public isEnabled: boolean
  public isValid: boolean
  public messages: string[];
  public url: string;
  public display_class: string[];
  public isRequired: boolean;
  public hasFocused: boolean;

  public chart: ChartOptions;
  public action: CampaignAction;
}

export class ChartOptions{
  public type: 'bar' | 'line' | 'scatter' | 'bubble' | 'pie' | 'doughnut' | 'polarArea' | 'radar'
  public data: any;
  public options: any;
  public height: string;
  public add_ons: { [key: string]: any };
  public legend_options: { [key: string]: any };
  public tooltip_options: { [key: string]: any };
}

export class SurveyOption implements IDescriptor {
  public id: any
  public title: string[]
  public description: string[]
}

export class SurveyValidation {
  public required: boolean
  public min_value: any
  public max_value: any
  public reg_ex: string
}

export class Dependency{
  public include_values: any[]
  public exclude_values: any[]
}