import Map "mo:core/Map";
import Float "mo:core/Float";
import List "mo:core/List";
import Text "mo:core/Text";
import Runtime "mo:core/Runtime";
import Iter "mo:core/Iter";
import Array "mo:core/Array";

actor {
  type Deduction = {
    type_ : Text;
    description : Text;
    amount : Float;
  };

  type FuelData = {
    pricePerLitre : Float;
    openingReading : Float;
    closingReading : Float;
  };

  type DailyReport = {
    ms : FuelData;
    hsd : FuelData;
    deductions : [Deduction];
  };

  let reports = Map.empty<Text, DailyReport>();

  public shared ({ caller }) func saveReport(date : Text, ms : FuelData, hsd : FuelData, deductions : [(Text, Text, Float)]) : async () {
    let mutableDeductions = List.empty<Deduction>();
    for ((type_, description, amount) in deductions.values()) {
      let deduction : Deduction = {
        type_;
        description;
        amount;
      };
      mutableDeductions.add(deduction);
    };

    let newReport : DailyReport = {
      ms;
      hsd;
      deductions = mutableDeductions.toArray();
    };

    reports.add(date, newReport);
  };

  public query ({ caller }) func getReport(date : Text) : async DailyReport {
    switch (reports.get(date)) {
      case (null) { Runtime.trap("Report not found") };
      case (?report) { report };
    };
  };

  public query ({ caller }) func listReportDates() : async [Text] {
    reports.keys().toArray();
  };
};
