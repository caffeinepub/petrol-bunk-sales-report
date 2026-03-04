import Text "mo:core/Text";
import Map "mo:core/Map";
import Array "mo:core/Array";
import Runtime "mo:core/Runtime";



actor {
  type Nozzle = {
    openReading : Float;
    closeReading : Float;
  };

  type EngineOilRow = {
    name : Text;
    quantity : Float;
    price : Float;
  };

  type DeductionRow = {
    expenseLabel : Text;
    amount : Float;
  };

  type DeductionsTab = {
    tabName : Text;
    rows : [DeductionRow];
  };

  type DailyReport = {
    date : Text;
    hsdPrice : Float;
    msPrice : Float;
    hsdNozzles : [Nozzle];
    msNozzles : [Nozzle];
    hsdTesting : Float;
    msTesting : Float;
    engineOilRows : [EngineOilRow];
    deductionsTabs : [DeductionsTab];
    notes : Text;
  };

  let reports = Map.empty<Text, DailyReport>();

  func validateDate(date : Text) {
    switch (date.size()) {
      case (10) {};
      case (_) { Runtime.trap("Date string must be 10 characters in format YYYY-MM-DD") };
    };
  };

  public shared ({ caller }) func saveReport(date : Text, report : DailyReport) : async () {
    validateDate(date);

    if (report.hsdNozzles.size() != 2) {
      Runtime.trap("HSD must have exactly 2 nozzles");
    };

    if (report.msNozzles.size() != 2) {
      Runtime.trap("MS must have exactly 2 nozzles");
    };

    reports.add(date, report);
  };

  public query ({ caller }) func getReport(date : Text) : async ?DailyReport {
    reports.get(date);
  };

  public query ({ caller }) func listReportDates() : async [Text] {
    reports.keys().toArray();
  };

  public shared ({ caller }) func deleteReport(date : Text) : async () {
    switch (reports.get(date)) {
      case (null) { Runtime.trap("Report not found") };
      case (?_) {
        reports.remove(date);
      };
    };
  };
};
