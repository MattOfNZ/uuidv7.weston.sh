import { useState, useEffect } from "react";
import {
  TimeReference,
  Transition,
  MonthlyCalendar,
  DateInfo,
} from "./types/AppTypes";

const UUIDv7DateParser = () => {
  const [uuid, setUuid] = useState<string>("");
  const [generatedUuid, setGeneratedUuid] = useState<string>("");
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
  const [displayFormat, setDisplayFormat] = useState<"uuid" | "guid">("uuid");
  const [copyMessage, setCopyMessage] = useState<string>("");

  const formatUuidForDisplay = (rawUuid: string): string => {
    if (!rawUuid) return "";

    if (displayFormat === "guid") {
      const upper = rawUuid.toUpperCase();
      return `{${upper}}`;
    }

    return rawUuid.toLowerCase();
  };

  const formatPrefixForDisplay = (prefix: string): string => {
    return displayFormat === "guid" ? prefix.toUpperCase() : prefix;
  };

  const cleanUuidForParsing = (value: string): string => {
    return value.replace(/[{}-]/g, "").toLowerCase();
  };

  const generateUUIDv7Value = (timestamp: Date = new Date()): string => {
    const unixMs = BigInt(timestamp.getTime());
    const bytes = new Uint8Array(16);
    crypto.getRandomValues(bytes);

    bytes[0] = Number((unixMs >> 40n) & 0xffn);
    bytes[1] = Number((unixMs >> 32n) & 0xffn);
    bytes[2] = Number((unixMs >> 24n) & 0xffn);
    bytes[3] = Number((unixMs >> 16n) & 0xffn);
    bytes[4] = Number((unixMs >> 8n) & 0xffn);
    bytes[5] = Number(unixMs & 0xffn);

    bytes[6] = (bytes[6] & 0x0f) | 0x70;
    bytes[8] = (bytes[8] & 0x3f) | 0x80;

    const hex = Array.from(bytes, (b) => b.toString(16).padStart(2, "0"));
    return `${hex.slice(0, 4).join("")}-${hex.slice(4, 6).join("")}-${hex
      .slice(6, 8)
      .join("")}-${hex.slice(8, 10).join("")}-${hex.slice(10).join("")}`;
  };

  const generateUUIDv7 = (
    timestamp: Date
  ): { prefix: string; fullUUID: string } => {
    const fullUUID = generateUUIDv7Value(timestamp).toLowerCase();
    const prefix = cleanUuidForParsing(fullUUID).substring(0, 12);
    return { prefix, fullUUID };
  };

  const parseUUIDv7Timestamp = (uuid: string): Date => {
    const cleanUuid = cleanUuidForParsing(uuid);

    if (!/^[0-9a-f]+$/.test(cleanUuid)) {
      throw new Error("Invalid characters in UUID");
    }

    const timestampHex = cleanUuid.substring(0, 12);
    const milliseconds = BigInt(`0x${timestampHex}`);
    return new Date(Number(milliseconds));
  };

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
      { label: "-30 min", date: new Date(now.getTime() - 30 * 60 * 1000) },
      { label: "-15 min", date: new Date(now.getTime() - 15 * 60 * 1000) },
      { label: "Now", date: now, highlight: true },
      { label: "+15 min", date: new Date(now.getTime() + 15 * 60 * 1000) },
      { label: "+30 min", date: new Date(now.getTime() + 30 * 60 * 1000) },
      { label: "+1 hour", date: new Date(now.getTime() + 60 * 60 * 1000) },
      { label: "+3 hours", date: new Date(now.getTime() + 3 * 60 * 60 * 1000) },
      { label: "+1 day", date: new Date(now.getTime() + 24 * 60 * 60 * 1000) },
      {
        label: "+3 days",
        date: new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000),
      },
    ];

    return refs.map((ref) => {
      const { prefix, fullUUID } = generateUUIDv7(ref.date);
      return {
        ...ref,
        uuidPrefix: prefix,
        fullUUID,
        formattedDate: ref.date.toLocaleString(),
      };
    });
  };

  const generateMonthlyCalendar = (): MonthlyCalendar[] => {
    const calendar: MonthlyCalendar[] = [];

    for (let year = 2020; year <= 2030; year++) {
      const yearEntries = [];

      for (let month = 0; month < 12; month++) {
        const date = new Date(year, month, 1);
        const { prefix, fullUUID } = generateUUIDv7(date);

        yearEntries.push({
          year,
          month: month + 1,
          monthName: date.toLocaleString("default", { month: "short" }),
          date,
          uuidPrefix: prefix,
          fullUUID,
        });
      }

      calendar.push({
        year,
        months: yearEntries,
      });
    }

    return calendar;
  };

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

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>): void => {
    const value = e.target.value;
    setUuid(value);

    const cleanedValue = cleanUuidForParsing(value);

    if (value && !/^[0-9a-fA-F{}-]+$/.test(value)) {
      setDateInfo(null);
      setError("Please use only hexadecimal characters, braces, or hyphens");
      return;
    }

    try {
      if (cleanedValue.length >= 12) {
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
    } catch {
      setDateInfo(null);
      setError("Invalid UUID format");
    }
  };

  const handleGenerateUuid = () => {
    const fresh = generateUUIDv7Value();
    setGeneratedUuid(fresh);
    setUuid(fresh);

    const date = parseUUIDv7Timestamp(fresh);
    setDateInfo({
      date,
      formatted: date.toLocaleString(),
      iso: date.toISOString(),
    });
    setError("");
  };

  const handleCopy = async () => {
    if (!generatedUuid) return;
    const formatted = formatUuidForDisplay(generatedUuid);

    try {
      await navigator.clipboard.writeText(formatted);
      setCopyMessage("Copied!");
      setTimeout(() => setCopyMessage(""), 1500);
    } catch {
      setCopyMessage("Clipboard unavailable");
    }
  };

  useEffect(() => {
    handleGenerateUuid();
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
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-slate-100 font-[Inter,system-ui,sans-serif]">
      {/* Header */}
      <header className="border-b border-slate-700/50 bg-slate-900/50 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-4">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center text-white font-bold text-lg shadow-lg shadow-violet-500/25">
                7
              </div>
              <div>
                <h1 className="text-xl font-semibold tracking-tight">UUIDv7 Tools</h1>
                <p className="text-sm text-slate-400">Generate & parse time-sortable UUIDs</p>
              </div>
            </div>
            <div className="flex items-center gap-2 bg-slate-800/50 p-1 rounded-lg border border-slate-700/50">
              <button
                className={`px-4 py-2 text-sm font-medium rounded-md transition-all ${
                  displayFormat === "uuid"
                    ? "bg-gradient-to-r from-violet-600 to-indigo-600 text-white shadow-lg shadow-violet-500/25"
                    : "text-slate-400 hover:text-slate-200"
                }`}
                onClick={() => setDisplayFormat("uuid")}
              >
                UUID
              </button>
              <button
                className={`px-4 py-2 text-sm font-medium rounded-md transition-all ${
                  displayFormat === "guid"
                    ? "bg-gradient-to-r from-violet-600 to-indigo-600 text-white shadow-lg shadow-violet-500/25"
                    : "text-slate-400 hover:text-slate-200"
                }`}
                onClick={() => setDisplayFormat("guid")}
              >
                .NET GUID
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-8">
        {/* Generator Card */}
        <section className="mb-8">
          <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-violet-600/20 to-indigo-600/20 border border-violet-500/20 p-6 sm:p-8">
            <div className="absolute inset-0 bg-gradient-to-br from-violet-600/5 to-transparent" />
            <div className="relative">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-violet-300 mb-2">Fresh UUIDv7</p>
                  <p className="font-[JetBrains_Mono,monospace] text-lg sm:text-xl text-white break-all tracking-wide">
                    {formatUuidForDisplay(generatedUuid) || "Generating..."}
                  </p>
                </div>
                <div className="flex gap-3 shrink-0">
                  <button
                    className="px-5 py-2.5 bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white font-medium rounded-lg shadow-lg shadow-violet-500/25 transition-all hover:shadow-xl hover:shadow-violet-500/30 active:scale-95"
                    onClick={handleGenerateUuid}
                  >
                    Generate
                  </button>
                  <button
                    className="px-5 py-2.5 bg-slate-700/50 hover:bg-slate-600/50 text-slate-200 font-medium rounded-lg border border-slate-600/50 transition-all active:scale-95 disabled:opacity-50"
                    onClick={handleCopy}
                    disabled={!generatedUuid}
                  >
                    {copyMessage || "Copy"}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Parser Card */}
        <section className="mb-8">
          <div className="rounded-2xl bg-slate-800/50 border border-slate-700/50 p-6">
            <label className="block text-sm font-medium text-slate-300 mb-3">
              Parse UUIDv7
            </label>
            <input
              type="text"
              value={uuid}
              onChange={handleChange}
              placeholder="Paste a UUIDv7 to extract its timestamp..."
              className="w-full px-4 py-3 bg-slate-900/50 border border-slate-700 rounded-xl text-slate-100 font-[JetBrains_Mono,monospace] placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-violet-500/50 focus:border-violet-500/50 transition-all"
            />

            {error && (
              <p className="mt-3 text-sm text-rose-400 flex items-center gap-2">
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
                {error}
              </p>
            )}

            {dateInfo && (
              <div className="mt-4 p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
                <h3 className="text-sm font-medium text-emerald-400 mb-3 flex items-center gap-2">
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  Parsed Timestamp
                </h3>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div>
                    <p className="text-xs text-slate-400 uppercase tracking-wider mb-1">Local Time</p>
                    <p className="text-slate-200 font-medium">{dateInfo.formatted}</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-400 uppercase tracking-wider mb-1">ISO 8601</p>
                    <p className="text-slate-200 font-[JetBrains_Mono,monospace] text-sm">{dateInfo.iso}</p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </section>

        {/* Tab Navigation */}
        <nav className="mb-6">
          <div className="flex gap-2 p-1 bg-slate-800/50 rounded-xl border border-slate-700/50 overflow-x-auto">
            {[
              { id: "references", label: "Quick Reference" },
              { id: "transitions", label: "Prefix Transitions" },
              { id: "calendar", label: "Monthly Calendar" },
            ].map((tab) => (
              <button
                key={tab.id}
                className={`flex-1 min-w-max px-4 py-2.5 text-sm font-medium rounded-lg transition-all whitespace-nowrap ${
                  activeTab === tab.id
                    ? "bg-slate-700 text-white shadow"
                    : "text-slate-400 hover:text-slate-200 hover:bg-slate-700/50"
                }`}
                onClick={() => setActiveTab(tab.id)}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </nav>

        {/* Tab Content */}
        <div className="rounded-2xl bg-slate-800/50 border border-slate-700/50 overflow-hidden">
          {/* Quick References Tab */}
          {activeTab === "references" && (
            <div className="p-6">
              <h2 className="text-lg font-semibold mb-4 text-slate-100">UUID Prefix Quick Reference</h2>
              <p className="text-sm text-slate-400 mb-6">
                Reference UUIDs for different time offsets from now. Updated every minute.
              </p>
              <div className="overflow-x-auto -mx-6 px-6">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-700/50">
                      <th className="py-3 px-4 text-left font-medium text-slate-400 uppercase tracking-wider text-xs">Offset</th>
                      <th className="py-3 px-4 text-left font-medium text-slate-400 uppercase tracking-wider text-xs">Prefix</th>
                      <th className="py-3 px-4 text-left font-medium text-slate-400 uppercase tracking-wider text-xs hidden lg:table-cell">Full UUID</th>
                      <th className="py-3 px-4 text-left font-medium text-slate-400 uppercase tracking-wider text-xs">Date & Time</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-700/30">
                    {timeRefs.map((ref, idx) => (
                      <tr
                        key={idx}
                        className={`transition-colors ${
                          ref.highlight
                            ? "bg-violet-500/10"
                            : "hover:bg-slate-700/30"
                        }`}
                      >
                        <td className="py-3 px-4">
                          <span className={`font-medium ${ref.highlight ? "text-violet-400" : "text-slate-300"}`}>
                            {ref.label}
                          </span>
                        </td>
                        <td className="py-3 px-4 font-[JetBrains_Mono,monospace] text-amber-400/90">
                          {formatPrefixForDisplay(ref.uuidPrefix)}
                        </td>
                        <td className="py-3 px-4 font-[JetBrains_Mono,monospace] text-slate-400 text-xs hidden lg:table-cell">
                          {formatUuidForDisplay(ref.fullUUID)}
                        </td>
                        <td className="py-3 px-4 text-slate-400">{ref.formattedDate}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Prefix Transitions Tab */}
          {activeTab === "transitions" && (
            <div className="p-6">
              <h2 className="text-lg font-semibold mb-4 text-slate-100">UUID Prefix Transitions</h2>
              <p className="text-sm text-slate-400 mb-6">
                Track when the first {transitionDigits} digits of UUIDv7 prefixes change.
                Useful for quickly estimating UUID age at a glance.
              </p>

              <div className="flex gap-2 mb-6">
                <button
                  className={`px-4 py-2 text-sm font-medium rounded-lg transition-all ${
                    transitionDigits === 3
                      ? "bg-violet-600 text-white"
                      : "bg-slate-700/50 text-slate-300 hover:bg-slate-700"
                  }`}
                  onClick={() => setTransitionDigits(3)}
                >
                  3-Digit
                </button>
                <button
                  className={`px-4 py-2 text-sm font-medium rounded-lg transition-all ${
                    transitionDigits === 4
                      ? "bg-violet-600 text-white"
                      : "bg-slate-700/50 text-slate-300 hover:bg-slate-700"
                  }`}
                  onClick={() => setTransitionDigits(4)}
                >
                  4-Digit
                </button>
              </div>

              <div className="overflow-x-auto -mx-6 px-6">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-700/50">
                      <th className="py-3 px-4 text-left font-medium text-slate-400 uppercase tracking-wider text-xs">Transition</th>
                      <th className="py-3 px-4 text-left font-medium text-slate-400 uppercase tracking-wider text-xs">Date & Time (UTC)</th>
                      <th className="py-3 px-4 text-left font-medium text-slate-400 uppercase tracking-wider text-xs">Full Prefix</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-700/30">
                    {(transitionDigits === 3
                      ? prefixTransitions.threeDigits
                      : prefixTransitions.fourDigits
                    ).map((transition, idx) => (
                      <tr key={idx} className="hover:bg-slate-700/30 transition-colors">
                        <td className="py-3 px-4 font-[JetBrains_Mono,monospace]">
                          <span className={transition.oldPrefix === "—" ? "text-slate-600" : "text-slate-500"}>
                            {transition.oldPrefix}
                          </span>
                          <span className="text-slate-600 mx-2">→</span>
                          <span className="text-emerald-400 font-medium">{transition.newPrefix}</span>
                        </td>
                        <td className="py-3 px-4 text-slate-400">
                          {transition.date
                            .toISOString()
                            .replace("T", " ")
                            .slice(0, -1)}
                        </td>
                        <td className="py-3 px-4">
                          <span className="font-[JetBrains_Mono,monospace] px-2 py-1 rounded bg-amber-500/10 text-amber-400">
                            {formatPrefixForDisplay(transition.fullPrefix)}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="mt-6 p-4 rounded-xl bg-slate-700/30 border border-slate-700/50">
                <p className="text-sm text-slate-300">
                  <span className="text-violet-400 font-medium">Tip:</span> If you see a UUID starting with{" "}
                  <code className="px-1.5 py-0.5 rounded bg-slate-800 text-amber-400 font-[JetBrains_Mono,monospace]">
                    {transitionDigits === 3 ? "018" : "0193"}
                  </code>
                  , you can quickly narrow down when it was created by checking this table.
                </p>
              </div>
            </div>
          )}

          {/* Monthly Calendar Tab */}
          {activeTab === "calendar" && (
            <div className="p-6">
              <h2 className="text-lg font-semibold mb-4 text-slate-100">Monthly Calendar (2020-2030)</h2>
              <p className="text-sm text-slate-400 mb-6">
                UUID prefixes for the first day of each month. Showing {prefixLength} characters
                for unique identification.
              </p>

              <div className="space-y-8">
                {monthlyCalendar.map((yearData) => (
                  <div key={yearData.year}>
                    <h3 className="text-base font-semibold text-slate-200 mb-4 flex items-center gap-2">
                      <span className="w-8 h-8 rounded-lg bg-slate-700/50 flex items-center justify-center text-sm">
                        {yearData.year.toString().slice(-2)}
                      </span>
                      {yearData.year}
                    </h3>
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
                      {yearData.months.map(
                        (month: {
                          month: number;
                          monthName: string;
                          date: Date;
                          uuidPrefix: string;
                          fullUUID: string;
                        }) => (
                          <div
                            key={`${yearData.year}-${month.month}`}
                            className="p-3 rounded-xl bg-slate-700/30 border border-slate-700/50 hover:border-violet-500/30 transition-all group"
                          >
                            <div className="text-sm font-medium text-slate-300 mb-2">
                              {month.monthName}
                            </div>
                            <div className="font-[JetBrains_Mono,monospace] text-xs text-amber-400/90 break-all">
                              {formatPrefixForDisplay(month.uuidPrefix.substring(0, prefixLength))}
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
        </div>

        {/* About Section */}
        <section className="mt-8">
          <div className="rounded-2xl bg-slate-800/30 border border-slate-700/50 p-6">
            <h3 className="text-lg font-semibold text-slate-100 mb-3">About UUIDv7</h3>
            <p className="text-slate-400 leading-relaxed">
              UUIDv7 encodes a millisecond-precision Unix timestamp in its first 48 bits,
              making these identifiers naturally sortable by creation time. This format
              is ideal for distributed systems where time-ordered IDs improve database
              indexing and query performance.
            </p>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-700/50 mt-12">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-slate-500">
            <p>UUIDv7 Tools — Generate and parse time-sortable UUIDs</p>
            <p>
              Built with React & Tailwind CSS
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default UUIDv7DateParser;
