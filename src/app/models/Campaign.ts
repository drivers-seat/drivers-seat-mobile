import { ChartOptions, IDescriptor } from "./Survey";

export class Campaign implements IDescriptor, IActionable {
  public id: string;
  public title: string[];
  public description: string[];
  public type: "content_cta" | "survey" | "checklist";
  
  public state: any;
  
  public categories: string[];
  public status: "new" | "presented" | "postponed" | "accepted" | "dismissed"
  public display_class: string[];
  public presented_on?: Date;
  public accepted_on?: Date;
  public dismissed_on?: Date;
  public postponed_until?: Date;
  public actions: CampaignAction[];
  public preview?: CampaignPreview;
}

export class CampaignPreview implements IDescriptor, IActionable {
  public title: string[];
  public description: string[];
  public image_url_left: string;
  public image_url_right: null;
  public content_url: string;
  public display_class: string[];
  public actions: CampaignAction[];
  public chart_top: ChartOptions;
  public chart_bottom: ChartOptions;
}

export class CampaignAction {
  public id: string;
  public text: string[];
  public type: "accept" | "postpone" | "dismiss" | "logout" | "next" | "prev" | "custom" | "detail" | "help" | "close";
  public display_class: string[];
  public postpone_minutes?: number;
  public is_default: boolean;
  public is_header: boolean;
  public url: string;
  public reengage_delay_seconds: number;
  public popup_message: CampaignPopup;
  public data: any;
}

export class ContentCTACampaign extends Campaign implements IActionable {
  public header: string[];
  public footer: string[];
  public content_url: string;
}

export class Checklist extends Campaign implements IDescriptor, IActionable {
  public title: string[];
  public description: string[];
  public show_progress: boolean;
  public items: ChecklistItem[];
  
}

export class ChecklistItem  implements IDescriptor {
  public id: string;
  public title: string[];
  public description: string[];
  public is_enabled: boolean;
  public status: "new" | "not_started" | "in_process" | "complete" | "requires_attention" | "unknown" | "none";
  public action: CampaignAction;
  public display_class: string[];
}

export class CampaignPopup implements IDescriptor {
  public title: string[];
  public description: string[];
  public display_class: string[];
  public actions: CampaignPopupAction[];
}

export class CampaignPopupAction{
  public id: string;
  public text: string;
  public url?: string;
  public is_close: boolean;
}

export interface IActionable {
  actions: CampaignAction[]
}