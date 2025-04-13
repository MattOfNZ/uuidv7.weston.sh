import { useState, useEffect } from "react";
import {
  TimeReference,
  Transition,
  MonthlyCalendar,
  DateInfo,
} from "./types/AppTypes";

const UUIDv7DateParser = () => {
  const [uuid, setUuid] = useState<string>("");
  const [dateInfo, setDateInfo] = useState<DateInfo | null>(null);
  const [timeRefs, setTimeRefs] = useState<TimeReference[]>([]);
  const [monthlyCalendar, setMonthlyCalendar] = useState<MonthlyCalendar[]>([]);
  const [prefixTransitions, setPrefixTransitions] = useState<{
    threeDigits: Transition[];
    fourDigits: Transition[];
  }>({ threeDigits: [], fourDigits: [] });
  const [error, setError] = useState<string>("");
  const [activeTab, setActiveTab] = useState<string>("references");
  const [transitionDigits, setTransitionDigits] = useState<number>(3);

  // Generate UUID v7 for a given timestamp
  const generateUUIDv7Prefix = (timestamp: Date): string => {
    const milliseconds = BigInt(timestamp.getTime());
    return milliseconds.toString(16).padStart(12, "0");
  };

  // Parse a UUIDv7 timestamp
  const parseUUIDv7Timestamp = (uuid: string): Date => {
    const cleanUuid = uuid.replace(/-/g, "");
    const timestampHex = cleanUuid.substring(0, 12);
    const milliseconds = BigInt(`0x${timestampHex}`);
    return new Date(Number(milliseconds));
  };

  // Generate time references
  const generateTimeReferences = (): TimeReference[] => {
    const now = new Date();
    const refs = [
      {
        label: "-3 days",
        date: new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000),
      },
      { label: "-1 day", date: new Date(now.getTime() - 24 * 60 * 60 * 1000) },
      { label: "-3 hours", date: new Date(now.getTime() - 3 * 60 * 60 * 1000) },
      { label: "-1 hour", date: new Date(now.getTime() - 60 * 60 * 1000) },
      { label: "-30 minutes", date: new Date(now.getTime() - 30 * 60 * 1000) },
      { label: "-15 minutes", date: new Date(now.getTime() - 15 * 60 * 1000) },
      { label: "Now", date: now, highlight: true },
      { label: "+15 minutes", date: new Date(now.getTime() + 15 * 60 * 1000) },
      { label: "+30 minutes", date: new Date(now.getTime() + 30 * 60 * 1000) },
      { label: "+1 hour", date: new Date(now.getTime() + 60 * 60 * 1000) },
      { label: "+3 hours", date: new Date(now.getTime() + 3 * 60 * 60 * 1000) },
      { label: "+1 day", date: new Date(now.getTime() + 24 * 60 * 60 * 1000) },
      {
        label: "+3 days",
        date: new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000),
      },
    ];

    const thisYear = new Date(now.getFullYear(), 0, 1);
    refs.push({ label: "This year", date: thisYear });

    const lastYear = new Date(now.getFullYear() - 1, 0, 1);
    refs.push({ label: "Last year", date: lastYear });

    const thisMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    refs.push({ label: "This month", date: thisMonth });

    const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    refs.push({ label: "Last month", date: lastMonth });

    return refs.map((ref) => ({
      ...ref,
      uuidPrefix: generateUUIDv7Prefix(ref.date),
      formattedDate: ref.date.toLocaleString(),
    }));
  };

  // Generate calendar of months from 2020 to 2030
  const generateMonthlyCalendar = (): MonthlyCalendar[] => {
    const calendar: MonthlyCalendar[] = [];

    for (let year = 2020; year <= 2030; year++) {
      const yearEntries = [];

      for (let month = 0; month < 12; month++) {
        const date = new Date(year, month, 1);
        const uuidPrefix = generateUUIDv7Prefix(date);

        yearEntries.push({
          year,
          month: month + 1,
          monthName: date.toLocaleString("default", { month: "long" }),
          date,
          uuidPrefix,
        });
      }

      calendar.push({
        year,
        months: yearEntries,
      });
    }

    return calendar;
  };

  // Find all prefix transitions (for 3 and 4 digits) between 2020-2030
  const findPrefixTransitions = (): {
    threeDigits: Transition[];
    fourDigits: Transition[];
  } => {
    const transitions3Digits: Transition[] = [];
    const transitions4Digits: Transition[] = [];
    const startPrefix = 0x0160;
    const endPrefix = 0x01c0;

    for (let prefix = startPrefix; prefix <= endPrefix; prefix++) {
      const hexPrefix = prefix.toString(16).padStart(4, "0");
      const uuid = `${hexPrefix}0000-0000-0000-000000000000`;

      const date = parseUUIDv7Timestamp(uuid);

      const firstThreeDigits = hexPrefix.substring(0, 3);
      if (
        transitions3Digits.length === 0 ||
        transitions3Digits[transitions3Digits.length - 1].newPrefix !==
          firstThreeDigits
      ) {
        transitions3Digits.push({
          date,
          oldPrefix:
            transitions3Digits.length > 0
              ? transitions3Digits[transitions3Digits.length - 1].newPrefix
              : "—",
          newPrefix: firstThreeDigits,
          fullPrefix: hexPrefix,
          digits: 3,
        });
      }

      const firstFourDigits = hexPrefix.substring(0, 4);
      if (
        transitions4Digits.length === 0 ||
        transitions4Digits[transitions4Digits.length - 1].newPrefix !==
          firstFourDigits
      ) {
        transitions4Digits.push({
          date,
          oldPrefix:
            transitions4Digits.length > 0
              ? transitions4Digits[transitions4Digits.length - 1].newPrefix
              : "—",
          newPrefix: firstFourDigits,
          fullPrefix: hexPrefix,
          digits: 4,
        });
      }
    }

    return {
      threeDigits: transitions3Digits,
      fourDigits: transitions4Digits,
    };
  };

  // Calculate the minimum prefix length needed to uniquely identify each month
  const getMinPrefixLength = (): number => {
    if (monthlyCalendar.length < 2) return 6;

    let minLength = 1;
    const allPrefixes = monthlyCalendar.flatMap((year) =>
      year.months.map((month: { uuidPrefix: string }) => month.uuidPrefix)
    );

    let uniqueLengthFound = false;

    while (!uniqueLengthFound && minLength <= 12) {
      const prefixSet = new Set();
      uniqueLengthFound = true;

      for (const prefix of allPrefixes) {
        const shortened = prefix.substring(0, minLength);
        if (prefixSet.has(shortened)) {
          uniqueLengthFound = false;
          minLength++;
          break;
        }
        prefixSet.add(shortened);
      }

      if (uniqueLengthFound) break;
    }

    return Math.min(minLength + 1, 12);
  };

  // Handle UUID input change
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>): void => {
    const value = e.target.value;
    setUuid(value);

    try {
      if (value.length >= 12) {
        const date = parseUUIDv7Timestamp(value);
        setDateInfo({
          date,
          formatted: date.toLocaleString(),
          iso: date.toISOString(),
        });
        setError("");
      } else {
        setDateInfo(null);
        setError("UUID needs to be at least 12 characters");
      }
    } catch (err) {
      setDateInfo(null);
      setError("Invalid UUID format");
    }
  };

  // Initialize data on component mount
  useEffect(() => {
    setTimeRefs(generateTimeReferences());
    setMonthlyCalendar(generateMonthlyCalendar());
    setPrefixTransitions(findPrefixTransitions());

    const interval = setInterval(() => {
      setTimeRefs(generateTimeReferences());
    }, 60000);

    return () => clearInterval(interval);
  }, []);

  const prefixLength = getMinPrefixLength();

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-4">UUIDv7 Date Parser</h1>

      {/* UUID Parser - Always visible */}
      <div className="mb-8 p-4 bg-gray-50 rounded border">
        <label className="block text-sm font-medium mb-1">Enter UUIDv7:</label>
        <input
          type="text"
          value={uuid}
          onChange={handleChange}
          placeholder="e.g., 01890c1c-35f1-7000-9c9f-4237c55a8d19"
          className="w-full p-2 border rounded"
        />

        {error && <p className="text-red-500 mt-1">{error}</p>}

        {dateInfo && (
          <div className="mt-4 p-4 bg-white rounded border">
            <h2 className="text-lg font-semibold mb-2">
              Parsed Date Information
            </h2>
            <p>
              <strong>Local:</strong> {dateInfo.formatted}
            </p>
            <p>
              <strong>ISO:</strong> {dateInfo.iso}
            </p>
          </div>
        )}
      </div>

      {/* Navigation Tabs */}
      <div className="flex border-b mb-6">
        <button
          className={`px-4 py-2 font-medium ${
            activeTab === "references"
              ? "border-b-2 border-blue-500 text-blue-600"
              : "text-gray-500"
          }`}
          onClick={() => setActiveTab("references")}
        >
          Quick References
        </button>
        <button
          className={`px-4 py-2 font-medium ${
            activeTab === "transitions"
              ? "border-b-2 border-blue-500 text-blue-600"
              : "text-gray-500"
          }`}
          onClick={() => setActiveTab("transitions")}
        >
          Prefix Transitions
        </button>
        <button
          className={`px-4 py-2 font-medium ${
            activeTab === "calendar"
              ? "border-b-2 border-blue-500 text-blue-600"
              : "text-gray-500"
          }`}
          onClick={() => setActiveTab("calendar")}
        >
          Monthly Calendar
        </button>
      </div>

      {/* Quick References */}
      {activeTab === "references" && (
        <div>
          <h2 className="text-xl font-semibold mb-4">
            UUID Prefix Quick Reference
          </h2>
          <div className="overflow-auto">
            <table className="min-w-full border-collapse">
              <thead>
                <tr className="bg-gray-200">
                  <th className="p-2 border">Time Reference</th>
                  <th className="p-2 border">UUID Prefix</th>
                  <th className="p-2 border">Date & Time</th>
                </tr>
              </thead>
              <tbody>
                {timeRefs.map((ref, idx) => (
                  <tr
                    key={idx}
                    className={
                      ref.highlight
                        ? "bg-yellow-100"
                        : idx % 2 === 0
                        ? "bg-white"
                        : "bg-gray-50"
                    }
                  >
                    <td className="p-2 border font-medium">{ref.label}</td>
                    <td className="p-2 border font-mono">{ref.uuidPrefix}</td>
                    <td className="p-2 border">{ref.formattedDate}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Prefix Transitions */}
      {activeTab === "transitions" && (
        <div>
          <h2 className="text-xl font-semibold mb-4">
            UUID Prefix Transitions
          </h2>

          <div className="mb-4">
            <div className="flex space-x-2 mb-2">
              <button
                className={`px-3 py-1 border rounded ${
                  transitionDigits === 3
                    ? "bg-blue-100 border-blue-500"
                    : "bg-gray-100"
                }`}
                onClick={() => setTransitionDigits(3)}
              >
                3-Digit Prefixes
              </button>
              <button
                className={`px-3 py-1 border rounded ${
                  transitionDigits === 4
                    ? "bg-blue-100 border-blue-500"
                    : "bg-gray-100"
                }`}
                onClick={() => setTransitionDigits(4)}
              >
                4-Digit Prefixes
              </button>
            </div>

            <p className="mb-4">
              This table shows when the first {transitionDigits} digits of
              UUIDv7 prefixes change, helping you quickly estimate when a UUID
              was created just by looking at its first few characters.
            </p>
          </div>

          <div className="overflow-auto">
            <table className="min-w-full border-collapse">
              <thead>
                <tr className="bg-gray-200">
                  <th className="p-2 border">Transition</th>
                  <th className="p-2 border">Precise Date & Time</th>
                  <th className="p-2 border">Full Prefix</th>
                </tr>
              </thead>
              <tbody>
                {(transitionDigits === 3
                  ? prefixTransitions.threeDigits
                  : prefixTransitions.fourDigits
                ).map((transition, idx) => (
                  <tr
                    key={idx}
                    className={idx % 2 === 0 ? "bg-white" : "bg-gray-50"}
                  >
                    <td className="p-2 border font-mono">
                      <span
                        className={
                          transition.oldPrefix === "—" ? "text-gray-400" : ""
                        }
                      >
                        {transition.oldPrefix}
                      </span>{" "}
                      →{" "}
                      <span className="font-bold">{transition.newPrefix}</span>
                    </td>
                    <td className="p-2 border">
                      {transition.date ? (
                        <>
                          <div>
                            {transition.date
                              .toISOString()
                              .replace("T", " ")
                              .slice(0, -1)}
                          </div>
                        </>
                      ) : (
                        <span>Initial</span>
                      )}
                    </td>
                    <td className="p-2 border font-mono">
                      <span className="bg-yellow-100 px-1">
                        {transition.fullPrefix.substring(0, transitionDigits)}
                      </span>
                      <span className="text-gray-500">
                        {transition.fullPrefix.substring(transitionDigits)}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="mt-4 p-3 bg-gray-100 rounded text-sm">
            <p>
              <strong>Example Usage:</strong> If you see a UUID starting with{" "}
              <code>{transitionDigits === 3 ? "018" : "0189"}</code>, you know
              it was created between{" "}
              {transitionDigits === 3
                ? "April 2022 and June 2024"
                : "a specific time period"}
              .
            </p>
          </div>
        </div>
      )}

      {/* Monthly Calendar */}
      {activeTab === "calendar" && (
        <div>
          <h2 className="text-xl font-semibold mb-4">
            Monthly Calendar (2020-2030)
          </h2>
          <p className="mb-4">
            Showing the first {prefixLength} characters of UUID prefix - enough
            to uniquely identify each month.
          </p>

          <div className="overflow-auto">
            {monthlyCalendar.map((yearData) => (
              <div key={yearData.year} className="mb-8">
                <h3 className="text-lg font-semibold mb-2">{yearData.year}</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {yearData.months.map(
                    (month: {
                      month: number;
                      monthName: string;
                      date: Date;
                      uuidPrefix: string;
                    }) => (
                      <div
                        key={`${yearData.year}-${month.month}`}
                        className="border rounded p-3"
                      >
                        <div className="font-semibold">
                          {month.monthName} {yearData.year}
                        </div>
                        <div className="font-mono text-sm mt-2">
                          Prefix:{" "}
                          <span className="bg-yellow-100 px-1">
                            {month.uuidPrefix.substring(0, prefixLength)}
                          </span>
                          <span className="text-gray-400">
                            {month.uuidPrefix.substring(prefixLength)}
                          </span>
                        </div>
                        <div className="text-xs text-gray-500 mt-1">
                          {month.date.toISOString().split("T")[0]}
                        </div>
                      </div>
                    )
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="mt-8 p-4 bg-blue-50 rounded">
        <h3 className="text-lg font-semibold mb-2">About UUIDv7</h3>
        <p>
          UUIDv7 uses the first 48 bits for a millisecond-precision timestamp
          since the Unix epoch. This makes UUIDv7 sortable by creation time.
        </p>
      </div>
    </div>
  );
};

export default UUIDv7DateParser;
