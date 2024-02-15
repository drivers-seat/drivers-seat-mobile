
export class ServiceClass {

  public static ToServiceClassId(service_class_name: string): number {
    switch (service_class_name.toLowerCase()) {
      case "rideshare":
        return 1;
      case "delivery":
        return 2;
      default:
        return -1;
    }
  }

  public static ToServiceClassName(service_class_id: number): string {
    switch (service_class_id) {
      case 1:
        return "rideshare";
      case 2:
        return "delivery";
      default:
        return "other";
    }
  }
}
