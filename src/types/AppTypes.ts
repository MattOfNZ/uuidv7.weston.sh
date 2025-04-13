export interface UUIDv7Prefix {
  timestamp: number;
}

export interface UUID {
  uuid: string;
}

export interface Transition {
  date: Date;
  oldPrefix: string;
  newPrefix: string;
  fullPrefix: string;
  digits: number;
}

export interface Month {
  year: number;
  month: number;
  monthName: string;
  date: Date;
  uuidPrefix: string;
}

export interface YearData {
  year: number;
  months: Month[];
}

export interface TimeReference {
  uuidPrefix: string;
  formattedDate: string;
  label: string;
  date: Date;
  highlight?: boolean;
}

export interface TimeReferences {
  threeDigits: Transition[];
  fourDigits: Transition[];
}

export interface DateInfo {
  date: Date;
  formatted: string;
  iso: string;
}

export interface MonthlyCalendar {
  year: number;
  months: {
    year: number;
    month: number;
    monthName: string;
    date: Date;
    uuidPrefix: string;
  }[];
}
