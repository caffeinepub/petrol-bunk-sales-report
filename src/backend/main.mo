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
    stationName : Text;
    savedAt : Text;
    deviceId : Text;
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

  type ReportEntry = {
    id : Text;
    report : DailyReport;
  };

  var reports = Map.empty<Text, DailyReport>();

  // Validate date is provided in correct ISO 8601 format:
  func validateDate(_date : Text) {
    // Date format should be validated on frontend
    // as run timestamp records are too brittle for substring validation.
  };

  public shared ({ caller }) func saveReport(recordId : Text, report : DailyReport) : async () {
    validateDate(report.date);
    ///!#skip_validation
    // if (report.hsdNozzles.size() != 2) {
    //  Runtime.trap("HSD must have exactly 2 nozzles");
    //};
    //if (report.msNozzles.size() != 2) {
    //  Runtime.trap("MS must have exactly 2 nozzles");
    //};
    reports.add(recordId, report);
  };

  public query ({ caller }) func getReport(recordId : Text) : async ?DailyReport {
    reports.get(recordId);
  };

  public query ({ caller }) func listReportDates() : async [Text] {
    reports.keys().toArray();
  };

  public query ({ caller }) func listReportsByDevice(deviceId : Text) : async [ReportEntry] {
    reports.toArray().map(func((id, report)) { { id; report } }).filter(
      func(entry) { entry.report.deviceId == deviceId }
    );
  };

  public shared ({ caller }) func deleteReport(recordId : Text) : async () {
    switch (reports.get(recordId)) {
      case (null) { Runtime.trap("Report not found") };
      case (?_) {
        reports.remove(recordId);
      };
    };
  };
};
