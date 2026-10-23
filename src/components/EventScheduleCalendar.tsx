import React, { useState, useEffect, useMemo } from "react";
import {
  CalendarDays,
  Clock,
  MapPin,
  Users,
  Plus,
  Trash2,
  Edit2,
  ChevronLeft,
  ChevronRight,
  Building2,
  Maximize2,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  Phone,
  Search,
  Filter,
  Layers,
  Calendar as CalendarIcon,
  HelpCircle,
  X
} from "lucide-react";
import { Event as ImpactEvent, OrgMember } from "../types";
import { useCurrencyStore } from "../store/currencyStore";
import { useToast } from "./Toast";

export interface SpaceEntity {
  id: string;
  org_id: string;
  name: string;
  type: string;
  capacity: number;
  size_sqm: number;
  hourly_rate: number;
  amenities: string[];
  manager_name: string;
  manager_phone: string;
  status: "available" | "maintenance";
}

export interface SpaceBooking {
  id: string;
  org_id: string;
  space_id: string;
  space_name: string;
  date: string; // YYYY-MM-DD
  start_time: string; // HH:MM (24h)
  end_time: string; // HH:MM (24h)
  title: string;
  reserved_by: string;
  contact_phone: string;
  attendees_count: number;
  notes?: string;
  status: "confirmed" | "pending";
}

// Hardcoded Rwandan National Public Holidays
export interface PublicHoliday {
  month: number; // 1-12
  day: number; // 1-31
  name: string;
  kinyarwanda: string;
  description: string;
  year?: number; // optional if fixed or variable
}

export const RWANDA_NATIONAL_HOLIDAYS: PublicHoliday[] = [
  { month: 1, day: 1, name: "New Year's Day", kinyarwanda: "Umunsi w'Ubunani", description: "Celebration of the New Year" },
  { month: 1, day: 2, name: "Day After New Year", kinyarwanda: "Umunsi ukurikira Ubunani", description: "Public holiday following New Year's Day" },
  { month: 2, day: 1, name: "National Heroes' Day", kinyarwanda: "Umunsi w'Intwari", description: "Honoring national heroes in Imanzi, Imena, and Ingenzi categories" },
  { month: 4, day: 7, name: "Genocide Memorial Day (Kwibuka)", kinyarwanda: "Kwibuka Jenoside yakorewe Abatutsi", description: "Commemoration of the 1994 Genocide against the Tutsi" },
  { month: 5, day: 1, name: "Labor Day", kinyarwanda: "Umunsi Mpuzamahanga w'Umurimo", description: "International Workers' Day" },
  { month: 7, day: 1, name: "Independence Day", kinyarwanda: "Umunsi w'Ubwigenge", description: "Commemorating national independence achieved on July 1, 1962" },
  { month: 7, day: 4, name: "Liberation Day (Kwibohora)", kinyarwanda: "Umunsi wo Kwibohora", description: "Commemorating the end of the 1994 Genocide and liberation of Rwanda" },
  { month: 8, day: 1, name: "Umuganura (National Harvest Day)", kinyarwanda: "Umuganura", description: "Traditional national Thanksgiving and First Fruits Harvest celebration" },
  { month: 8, day: 15, name: "Assumption Day", kinyarwanda: "Ijyanwa mu Ijuru rya Bikira Mariya", description: "Feast of the Assumption of Mary" },
  { month: 12, day: 25, name: "Christmas Day", kinyarwanda: "Noheli", description: "Christmas celebration" },
  { month: 12, day: 26, name: "Boxing Day", kinyarwanda: "Umunsi ukurikira Noheli", description: "Day after Christmas" },
  // Variable religious public holidays (2025/2026 dates)
  { month: 3, day: 30, year: 2025, name: "Eid al-Fitr", kinyarwanda: "Idil-Fitri", description: "Islamic holiday marking the end of Ramadan" },
  { month: 3, day: 20, year: 2026, name: "Eid al-Fitr", kinyarwanda: "Idil-Fitri", description: "Islamic holiday marking the end of Ramadan" },
  { month: 4, day: 18, year: 2025, name: "Good Friday", kinyarwanda: "Kuwa Gatanu Mutagatifu", description: "Christian holy day commemorating the crucifixion of Jesus" },
  { month: 4, day: 3, year: 2026, name: "Good Friday", kinyarwanda: "Kuwa Gatanu Mutagatifu", description: "Christian holy day commemorating the crucifixion of Jesus" },
  { month: 4, day: 21, year: 2025, name: "Easter Monday", kinyarwanda: "Kuwa Mbere wa Pasika", description: "Easter Monday celebration" },
  { month: 4, day: 6, year: 2026, name: "Easter Monday", kinyarwanda: "Kuwa Mbere wa Pasika", description: "Easter Monday celebration" },
  { month: 6, day: 6, year: 2025, name: "Eid al-Adha", kinyarwanda: "Idil-Adha", description: "Feast of the Sacrifice" },
  { month: 5, day: 27, year: 2026, name: "Eid al-Adha", kinyarwanda: "Idil-Adha", description: "Feast of the Sacrifice" }
];

interface EventScheduleCalendarProps {
  events: ImpactEvent[];
  activeOrg: any;
  isAdmin: boolean;
  onEditEvent?: (event: ImpactEvent) => void;
  onDeleteEvent?: (event: ImpactEvent) => void;
  onSelectEvent?: (event: ImpactEvent) => void;
  selectedEventId?: string;
  onAddEventClick?: () => void;
}

export const EventScheduleCalendar: React.FC<EventScheduleCalendarProps> = ({
  events,
  activeOrg,
  isAdmin,
  onEditEvent,
  onDeleteEvent,
  onSelectEvent,
  selectedEventId,
  onAddEventClick
}) => {
  const { addToast } = useToast();
  const { formatAmount } = useCurrencyStore();

  const orgId = activeOrg?.id || "default";

  // Selected date in calendar view (default today)
  const today = useMemo(() => new Date(), []);
  const [currentMonthDate, setCurrentMonthDate] = useState(() => new Date(today.getFullYear(), today.getMonth(), 1));
  const [selectedDate, setSelectedDate] = useState(() => {
    const y = today.getFullYear();
    const m = String(today.getMonth() + 1).padStart(2, "0");
    const d = String(today.getDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
  });

  // Calendar display tab: 'calendar' (Interactive month view) | 'spaces' (Room lending & 24h occupancy) | 'agenda' (List view)
  const [subTab, setSubTab] = useState<"calendar" | "spaces" | "agenda">("calendar");

  // Spaces list persistent storage
  const [spaces, setSpaces] = useState<SpaceEntity[]>(() => {
    const key = `org_spaces_${orgId}`;
    const raw = localStorage.getItem(key);
    if (raw) {
      try {
        return JSON.parse(raw);
      } catch (e) {
        console.error("Failed to parse spaces", e);
      }
    }
    // Default spaces for any organization lending facilities
    return [
      {
        id: "space-1",
        org_id: orgId,
        name: "Main Community Conference Hall",
        type: "Hall / Auditorium",
        capacity: 180,
        size_sqm: 220,
        hourly_rate: 15000,
        amenities: ["High-speed WiFi", "HD Projector", "PA Sound System", "Air Conditioning", "Stage & Podium"],
        manager_name: "Jean Paul Habimana",
        manager_phone: "0788123456",
        status: "available"
      },
      {
        id: "space-2",
        org_id: orgId,
        name: "Executive Boardroom & Meeting Hub",
        type: "Boardroom",
        capacity: 22,
        size_sqm: 45,
        hourly_rate: 8000,
        amenities: ["Smart TV Screen", "Video Conference Camera", "Whiteboard", "Executive Chairs", "AC"],
        manager_name: "Aline Mukamana",
        manager_phone: "0789654321",
        status: "available"
      },
      {
        id: "space-3",
        org_id: orgId,
        name: "Digital Training & Coworking Lab",
        type: "Training Lab",
        capacity: 40,
        size_sqm: 85,
        hourly_rate: 10000,
        amenities: ["Power Outlets on Desks", "Fast Fiber Internet", "Dual Projectors", "Ergonomic Chairs"],
        manager_name: "Eric Ndayisaba",
        manager_phone: "0788776655",
        status: "available"
      }
    ];
  });

  // Space bookings persistent storage
  const [bookings, setBookings] = useState<SpaceBooking[]>(() => {
    const key = `org_space_bookings_${orgId}`;
    const raw = localStorage.getItem(key);
    if (raw) {
      try {
        return JSON.parse(raw);
      } catch (e) {
        console.error("Failed to parse bookings", e);
      }
    }
    const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
    return [
      {
        id: "bk-1",
        org_id: orgId,
        space_id: "space-1",
        space_name: "Main Community Conference Hall",
        date: todayStr,
        start_time: "09:00",
        end_time: "13:00",
        title: "Youth Agribusiness & Digital Leadership Workshop",
        reserved_by: "Rwanda Youth Agritech Forum",
        contact_phone: "0788334455",
        attendees_count: 95,
        notes: "Requires microphone system and projector setup.",
        status: "confirmed"
      },
      {
        id: "bk-2",
        org_id: orgId,
        space_id: "space-2",
        space_name: "Executive Boardroom & Meeting Hub",
        date: todayStr,
        start_time: "14:00",
        end_time: "17:30",
        title: "Cooperative Supervisory Board Audit Review",
        reserved_by: "Internal Audit Committee",
        contact_phone: "0788998877",
        attendees_count: 14,
        notes: "Confidential financial review session.",
        status: "confirmed"
      }
    ];
  });

  // Save to localStorage when state changes
  useEffect(() => {
    localStorage.setItem(`org_spaces_${orgId}`, JSON.stringify(spaces));
  }, [spaces, orgId]);

  useEffect(() => {
    localStorage.setItem(`org_space_bookings_${orgId}`, JSON.stringify(bookings));
  }, [bookings, orgId]);

  // Modals state
  const [openAddSpaceModal, setOpenAddSpaceModal] = useState(false);
  const [openBookSpaceModal, setOpenBookSpaceModal] = useState(false);
  const [selectedSpaceForBooking, setSelectedSpaceForBooking] = useState<SpaceEntity | null>(null);

  // New space form fields
  const [newSpaceName, setNewSpaceName] = useState("");
  const [newSpaceType, setNewSpaceType] = useState("Meeting Room");
  const [newSpaceCapacity, setNewSpaceCapacity] = useState<number>(30);
  const [newSpaceSizeSqm, setNewSpaceSizeSqm] = useState<number>(50);
  const [newSpaceHourlyRate, setNewSpaceHourlyRate] = useState<number>(5000);
  const [newSpaceAmenities, setNewSpaceAmenities] = useState<string>("WiFi, Projector, Whiteboard");
  const [newSpaceManagerName, setNewSpaceManagerName] = useState("");
  const [newSpaceManagerPhone, setNewSpaceManagerPhone] = useState("");

  // New booking form fields
  const [bookingSpaceId, setBookingSpaceId] = useState("");
  const [bookingDate, setBookingDate] = useState(selectedDate);
  const [bookingStartTime, setBookingStartTime] = useState("09:00");
  const [bookingEndTime, setBookingEndTime] = useState("12:00");
  const [bookingTitle, setBookingTitle] = useState("");
  const [bookingReservedBy, setBookingReservedBy] = useState("");
  const [bookingContactPhone, setBookingContactPhone] = useState("");
  const [bookingAttendees, setBookingAttendees] = useState(25);
  const [bookingNotes, setBookingNotes] = useState("");

  // Keep booking date in sync with calendar date selection
  useEffect(() => {
    setBookingDate(selectedDate);
  }, [selectedDate]);

  // Calendar month math
  const year = currentMonthDate.getFullYear();
  const month = currentMonthDate.getMonth(); // 0-indexed

  const monthNames = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ];

  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDayOfWeek = new Date(year, month, 1).getDay(); // 0=Sun, 1=Mon, etc.

  // Preceding month filler
  const daysInPrevMonth = new Date(year, month, 0).getDate();

  // Navigation handlers
  const handlePrevMonth = () => {
    setCurrentMonthDate(new Date(year, month - 1, 1));
  };

  const handleNextMonth = () => {
    setCurrentMonthDate(new Date(year, month + 1, 1));
  };

  const handleGoToday = () => {
    const now = new Date();
    setCurrentMonthDate(new Date(now.getFullYear(), now.getMonth(), 1));
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, "0");
    const d = String(now.getDate()).padStart(2, "0");
    setSelectedDate(`${y}-${m}-${d}`);
  };

  // Helper to find national holiday for a given date
  const getHolidayForDate = (y: number, m: number, d: number): PublicHoliday | undefined => {
    const monthNum = m + 1;
    return RWANDA_NATIONAL_HOLIDAYS.find(h => {
      if (h.year && h.year !== y) return false;
      return h.month === monthNum && h.day === d;
    });
  };

  // Helper to find events on date
  const getEventsForDate = (dateStr: string): ImpactEvent[] => {
    return events.filter(ev => {
      if (!ev.date_time) return false;
      return ev.date_time.slice(0, 10) === dateStr;
    });
  };

  // Helper to find bookings for date
  const getBookingsForDate = (dateStr: string): SpaceBooking[] => {
    return bookings.filter(b => b.date === dateStr);
  };

  // 24 Hour timeline hours (0 to 23)
  const hours24 = Array.from({ length: 24 }, (_, i) => i);

  // Time conversion helper: "09:30" => 9.5
  const parseTimeToHours = (timeStr: string): number => {
    const [h, m] = timeStr.split(":").map(Number);
    return (h || 0) + ((m || 0) / 60);
  };

  // Check if a space is occupied at a specific hour on a date
  const getSpaceOccupancyAtHour = (spaceId: string, dateStr: string, hour: number) => {
    return bookings.find(b => {
      if (b.space_id !== spaceId || b.date !== dateStr) return false;
      const startH = parseTimeToHours(b.start_time);
      const endH = parseTimeToHours(b.end_time);
      return hour >= startH && hour < endH;
    });
  };

  // Handle add space
  const handleAddSpace = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSpaceName.trim()) {
      addToast("Space name is required.", "error");
      return;
    }
    const newSpace: SpaceEntity = {
      id: `space-${Date.now()}`,
      org_id: orgId,
      name: newSpaceName.trim(),
      type: newSpaceType,
      capacity: Number(newSpaceCapacity) || 20,
      size_sqm: Number(newSpaceSizeSqm) || 35,
      hourly_rate: Number(newSpaceHourlyRate) || 0,
      amenities: newSpaceAmenities.split(",").map(a => a.trim()).filter(Boolean),
      manager_name: newSpaceManagerName || "Front Desk",
      manager_phone: newSpaceManagerPhone || "N/A",
      status: "available"
    };

    setSpaces(prev => [...prev, newSpace]);
    setOpenAddSpaceModal(false);
    setNewSpaceName("");
    addToast(`Space "${newSpace.name}" added successfully!`, "success");
  };

  // Handle reserve space
  const handleReserveSpace = (e: React.FormEvent) => {
    e.preventDefault();
    if (!bookingSpaceId) {
      addToast("Please select a space/room to reserve.", "error");
      return;
    }
    if (!bookingTitle.trim() || !bookingReservedBy.trim()) {
      addToast("Please provide event title and organizer name.", "error");
      return;
    }

    const startH = parseTimeToHours(bookingStartTime);
    const endH = parseTimeToHours(bookingEndTime);

    if (endH <= startH) {
      addToast("End time must be after start time.", "error");
      return;
    }

    // Check conflict
    const conflict = bookings.find(b => {
      if (b.space_id !== bookingSpaceId || b.date !== bookingDate) return false;
      const bStart = parseTimeToHours(b.start_time);
      const bEnd = parseTimeToHours(b.end_time);
      // overlap exists if start < bEnd and end > bStart
      return startH < bEnd && endH > bStart;
    });

    if (conflict) {
      addToast(
        `Time Conflict! "${conflict.space_name}" is already occupied from ${conflict.start_time} to ${conflict.end_time} for "${conflict.title}".`,
        "error"
      );
      return;
    }

    const targetSpace = spaces.find(s => s.id === bookingSpaceId);

    const newBooking: SpaceBooking = {
      id: `bk-${Date.now()}`,
      org_id: orgId,
      space_id: bookingSpaceId,
      space_name: targetSpace?.name || "Reserved Room",
      date: bookingDate,
      start_time: bookingStartTime,
      end_time: bookingEndTime,
      title: bookingTitle.trim(),
      reserved_by: bookingReservedBy.trim(),
      contact_phone: bookingContactPhone.trim(),
      attendees_count: Number(bookingAttendees) || 10,
      notes: bookingNotes.trim(),
      status: "confirmed"
    };

    setBookings(prev => [...prev, newBooking]);
    setOpenBookSpaceModal(false);
    setBookingTitle("");
    setBookingReservedBy("");
    setBookingNotes("");
    addToast(`Room reserved successfully from ${newBooking.start_time} to ${newBooking.end_time}!`, "success");
  };

  // Delete booking
  const handleDeleteBooking = (id: string, name: string) => {
    if (confirm(`Cancel reservation for "${name}"?`)) {
      setBookings(prev => prev.filter(b => b.id !== id));
      addToast("Reservation cancelled and slot released.", "info");
    }
  };

  // Selected date breakdown
  const selectedDateObj = useMemo(() => {
    const [y, m, d] = selectedDate.split("-").map(Number);
    return new Date(y, m - 1, d);
  }, [selectedDate]);

  const selectedHoliday = useMemo(() => {
    const [y, m, d] = selectedDate.split("-").map(Number);
    return getHolidayForDate(y, m - 1, d);
  }, [selectedDate]);

  const selectedDateEvents = useMemo(() => {
    return getEventsForDate(selectedDate);
  }, [selectedDate, events]);

  const selectedDateBookings = useMemo(() => {
    return getBookingsForDate(selectedDate);
  }, [selectedDate, bookings]);

  return (
    <div className="flex flex-col gap-5 w-full">
      {/* TOP HEADER CONTROLS & SUB-TABS */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 bg-white dark:bg-slate-900 p-3.5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs">
        {/* Navigation Tabs */}
        <div className="flex flex-wrap items-center gap-1.5 p-1 bg-slate-100 dark:bg-slate-800 rounded-xl">
          <button
            type="button"
            onClick={() => setSubTab("calendar")}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer whitespace-nowrap shrink-0 ${
              subTab === "calendar"
                ? "bg-white dark:bg-slate-900 text-emerald-700 dark:text-emerald-400 shadow-xs"
                : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
            }`}
          >
            <CalendarIcon className="h-3.5 w-3.5 shrink-0" />
            <span>Interactive Calendar</span>
          </button>
          <button
            type="button"
            onClick={() => setSubTab("spaces")}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer whitespace-nowrap shrink-0 ${
              subTab === "spaces"
                ? "bg-white dark:bg-slate-900 text-emerald-700 dark:text-emerald-400 shadow-xs"
                : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
            }`}
          >
            <Building2 className="h-3.5 w-3.5 shrink-0" />
            <span>Space & Room Lending (24h)</span>
            <span className="text-[10px] bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 px-1.5 py-0.2 rounded-full font-bold shrink-0">
              {spaces.length}
            </span>
          </button>
          <button
            type="button"
            onClick={() => setSubTab("agenda")}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer whitespace-nowrap shrink-0 ${
              subTab === "agenda"
                ? "bg-white dark:bg-slate-900 text-emerald-700 dark:text-emerald-400 shadow-xs"
                : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
            }`}
          >
            <Layers className="h-3.5 w-3.5 shrink-0" />
            <span>Agenda & Roster</span>
          </button>
        </div>

        {/* Quick Actions */}
        <div className="flex flex-wrap items-center gap-2 shrink-0">
          {isAdmin && (
            <>
              <button
                type="button"
                onClick={() => {
                  setBookingSpaceId(spaces[0]?.id || "");
                  setOpenBookSpaceModal(true);
                }}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 text-xs font-semibold hover:bg-emerald-100 transition cursor-pointer shadow-3xs whitespace-nowrap shrink-0"
              >
                <Clock className="h-3.5 w-3.5 shrink-0" />
                <span>Reserve Room (24h)</span>
              </button>
              <button
                type="button"
                onClick={() => setOpenAddSpaceModal(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 dark:bg-emerald-600 dark:hover:bg-emerald-500 text-white text-xs font-semibold transition cursor-pointer shadow-xs whitespace-nowrap shrink-0"
              >
                <Plus className="h-3.5 w-3.5 shrink-0" />
                <span>Add Facility Space</span>
              </button>
            </>
          )}
        </div>
      </div>

      {/* VIEW A: INTERACTIVE REAL MONTH CALENDAR */}
      {subTab === "calendar" && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
          {/* Main Month Grid (8 Cols) */}
          <div className="lg:col-span-8 flex flex-col gap-3 bg-white dark:bg-slate-900 p-4 sm:p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs">
            {/* Month Header & Controls */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-3">
                <h3 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white">
                  {monthNames[month]} {year}
                </h3>
                <span className="text-xs font-mono text-slate-400 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-md">
                  Rwanda Calendar
                </span>
              </div>
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={handleGoToday}
                  className="px-2.5 py-1 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 transition cursor-pointer"
                >
                  Today
                </button>
                <button
                  type="button"
                  onClick={handlePrevMonth}
                  className="p-1.5 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition cursor-pointer"
                  title="Previous Month"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={handleNextMonth}
                  className="p-1.5 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition cursor-pointer"
                  title="Next Month"
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            </div>

            {/* Day of Week Headers */}
            <div className="grid grid-cols-7 gap-1 text-center font-bold text-[11px] text-slate-400 uppercase tracking-wider py-1 select-none">
              <span className="text-rose-500">Sun</span>
              <span>Mon</span>
              <span>Tue</span>
              <span>Wed</span>
              <span>Thu</span>
              <span>Fri</span>
              <span className="text-emerald-600 dark:text-emerald-400">Sat</span>
            </div>

            {/* Calendar Cells Grid */}
            <div className="grid grid-cols-7 gap-1.5 select-none">
              {/* Previous month trailing days */}
              {Array.from({ length: firstDayOfWeek }).map((_, idx) => {
                const prevDayNum = daysInPrevMonth - firstDayOfWeek + idx + 1;
                return (
                  <div
                    key={`prev-${idx}`}
                    className="min-h-[82px] sm:min-h-[96px] p-1.5 rounded-xl bg-slate-50/50 dark:bg-slate-950/20 border border-slate-100 dark:border-slate-800/40 opacity-40 text-slate-400"
                  >
                    <span className="text-xs font-medium">{prevDayNum}</span>
                  </div>
                );
              })}

              {/* Current month days */}
              {Array.from({ length: daysInMonth }).map((_, idx) => {
                const dayNum = idx + 1;
                const mStr = String(month + 1).padStart(2, "0");
                const dStr = String(dayNum).padStart(2, "0");
                const fullDateStr = `${year}-${mStr}-${dStr}`;

                const isToday =
                  today.getFullYear() === year &&
                  today.getMonth() === month &&
                  today.getDate() === dayNum;

                const isSelected = selectedDate === fullDateStr;

                const holiday = getHolidayForDate(year, month, dayNum);
                const dayEvents = getEventsForDate(fullDateStr);
                const dayBookings = getBookingsForDate(fullDateStr);

                return (
                  <div
                    key={`curr-${dayNum}`}
                    onClick={() => setSelectedDate(fullDateStr)}
                    className={`min-h-[82px] sm:min-h-[96px] p-1.5 rounded-xl border transition-all cursor-pointer flex flex-col justify-between group ${
                      isSelected
                        ? "bg-emerald-50/70 dark:bg-emerald-950/40 border-emerald-500 dark:border-emerald-500 ring-2 ring-emerald-500/20 shadow-xs"
                        : holiday
                        ? "bg-amber-50/40 dark:bg-amber-950/20 border-amber-200/80 dark:border-amber-900/40 hover:border-amber-400"
                        : "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700"
                    }`}
                  >
                    {/* Top Row: Date Number and Indicators */}
                    <div className="flex items-center justify-between">
                      <span
                        className={`text-xs font-bold h-5 w-5 flex items-center justify-center rounded-full ${
                          isToday
                            ? "bg-emerald-600 text-white shadow-3xs"
                            : isSelected
                            ? "text-emerald-700 dark:text-emerald-300 font-black"
                            : "text-slate-700 dark:text-slate-300"
                        }`}
                      >
                        {dayNum}
                      </span>
                      {holiday && (
                        <span
                          title={`${holiday.name} (${holiday.kinyarwanda}) - Public Holiday`}
                          className="text-[10px] px-1 py-0.2 rounded bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300 font-bold border border-amber-200 dark:border-amber-800 shrink-0"
                        >
                          🇷🇼 Off
                        </span>
                      )}
                    </div>

                    {/* Middle: Content Badges */}
                    <div className="flex flex-col gap-0.5 my-1 overflow-hidden">
                      {holiday && (
                        <div
                          className="text-[9px] font-semibold text-amber-900 dark:text-amber-200 bg-amber-100/70 dark:bg-amber-950/70 px-1 py-0.5 rounded truncate"
                          title={holiday.name}
                        >
                          ★ {holiday.name}
                        </div>
                      )}
                      {dayEvents.map(ev => (
                        <div
                          key={ev.id}
                          className="text-[9px] font-medium text-emerald-800 dark:text-emerald-200 bg-emerald-100/70 dark:bg-emerald-950/70 px-1 py-0.5 rounded truncate"
                          title={ev.title}
                        >
                          • {ev.title}
                        </div>
                      ))}
                      {dayBookings.length > 0 && (
                        <div className="text-[9px] font-mono font-semibold text-sky-800 dark:text-sky-300 bg-sky-100/70 dark:bg-sky-950/60 px-1 py-0.5 rounded truncate">
                          ◷ {dayBookings.length} {dayBookings.length === 1 ? "room" : "rooms"}
                        </div>
                      )}
                    </div>

                    {/* Bottom Indicator Dots */}
                    <div className="flex items-center gap-1">
                      {dayEvents.length > 0 && (
                        <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" title={`${dayEvents.length} Events`} />
                      )}
                      {dayBookings.length > 0 && (
                        <span className="h-1.5 w-1.5 rounded-full bg-sky-500" title={`${dayBookings.length} Space Bookings`} />
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Rwanda Holidays Legend Bar */}
            <div className="mt-2 pt-3 border-t border-slate-100 dark:border-slate-800 flex flex-wrap items-center justify-between text-xs text-slate-500 gap-2">
              <div className="flex items-center gap-3">
                <span className="flex items-center gap-1.5">
                  <span className="h-2.5 w-2.5 rounded-full bg-amber-400" />
                  <span>Rwandan Public Holiday</span>
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="h-2.5 w-2.5 rounded-full bg-emerald-500" />
                  <span>Org Event</span>
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="h-2.5 w-2.5 rounded-full bg-sky-500" />
                  <span>Space Occupied (24h)</span>
                </span>
              </div>
              <span className="text-[11px] font-medium text-slate-400">
                Click any date to inspect 24h occupancy & events
              </span>
            </div>
          </div>

          {/* Side Panel: Selected Date Overview & 24h Occupancy Breakdown (4 Cols) */}
          <div className="lg:col-span-4 flex flex-col gap-4">
            {/* Date Details Card */}
            <div className="bg-white dark:bg-slate-900 p-4 sm:p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col gap-3">
              <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
                <div>
                  <span className="text-[10px] font-mono uppercase tracking-wider text-slate-400 font-bold block">
                    Selected Date Details
                  </span>
                  <h4 className="text-base font-bold text-slate-900 dark:text-white">
                    {selectedDateObj.toLocaleDateString("en-US", {
                      weekday: "long",
                      month: "short",
                      day: "numeric",
                      year: "numeric"
                    })}
                  </h4>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setBookingDate(selectedDate);
                    setOpenBookSpaceModal(true);
                  }}
                  className="px-2.5 py-1 text-xs font-semibold rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white transition cursor-pointer shadow-3xs"
                >
                  + Book Space
                </button>
              </div>

              {/* Holiday Alert if applicable */}
              {selectedHoliday && (
                <div className="p-3 rounded-xl bg-gradient-to-r from-amber-50 to-amber-100/50 dark:from-amber-950/40 dark:to-amber-900/20 border border-amber-200 dark:border-amber-800/60 flex flex-col gap-1">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-amber-900 dark:text-amber-200">
                    <span>🇷🇼 Official Public Holiday</span>
                  </div>
                  <p className="text-xs font-semibold text-amber-800 dark:text-amber-300">
                    {selectedHoliday.name} • <span className="italic">{selectedHoliday.kinyarwanda}</span>
                  </p>
                  <p className="text-[11px] text-amber-700 dark:text-amber-400 leading-snug">
                    {selectedHoliday.description}
                  </p>
                </div>
              )}

              {/* Scheduled Events on Date */}
              <div className="flex flex-col gap-2">
                <div className="flex items-center justify-between text-xs font-bold text-slate-700 dark:text-slate-300">
                  <span className="flex items-center gap-1.5">
                    <CalendarDays className="h-3.5 w-3.5 text-emerald-600" />
                    <span>Scheduled Events ({selectedDateEvents.length})</span>
                  </span>
                  {isAdmin && onAddEventClick && (
                    <button
                      type="button"
                      onClick={onAddEventClick}
                      className="text-[11px] text-emerald-600 hover:underline font-semibold"
                    >
                      + Schedule Event
                    </button>
                  )}
                </div>

                {selectedDateEvents.length > 0 ? (
                  <div className="flex flex-col gap-2 max-h-48 overflow-y-auto">
                    {selectedDateEvents.map(ev => (
                      <div
                        key={ev.id}
                        className={`p-2.5 rounded-xl border text-xs flex flex-col gap-1 transition ${
                          selectedEventId === ev.id
                            ? "bg-emerald-50 dark:bg-emerald-950/50 border-emerald-500"
                            : "bg-slate-50 dark:bg-slate-800/40 border-slate-200 dark:border-slate-800 hover:border-slate-300"
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-slate-900 dark:text-white truncate">{ev.title}</span>
                          <span className="text-[10px] text-slate-500 font-mono">
                            {ev.date_time ? new Date(ev.date_time).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : ""}
                          </span>
                        </div>
                        <div className="flex items-center justify-between text-[11px] text-slate-500">
                          <span className="flex items-center gap-1">
                            <MapPin className="h-3 w-3" />
                            <span className="truncate max-w-[140px]">{ev.location}</span>
                          </span>
                          {onSelectEvent && (
                            <button
                              type="button"
                              onClick={() => onSelectEvent(ev)}
                              className="text-emerald-600 dark:text-emerald-400 hover:underline font-semibold"
                            >
                              Manage Roster
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-slate-400 italic py-2 text-center bg-slate-50 dark:bg-slate-800/20 rounded-xl">
                    No community events scheduled on this date.
                  </p>
                )}
              </div>

              {/* Space Occupancy on Date */}
              <div className="flex flex-col gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                <span className="flex items-center gap-1.5 text-xs font-bold text-slate-700 dark:text-slate-300">
                  <Building2 className="h-3.5 w-3.5 text-sky-600" />
                  <span>Space Lending Occupancy ({selectedDateBookings.length})</span>
                </span>

                {selectedDateBookings.length > 0 ? (
                  <div className="flex flex-col gap-2 max-h-56 overflow-y-auto">
                    {selectedDateBookings.map(bk => (
                      <div
                        key={bk.id}
                        className="p-2.5 rounded-xl bg-sky-50/60 dark:bg-sky-950/30 border border-sky-200 dark:border-sky-800/50 text-xs flex flex-col gap-1"
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-sky-950 dark:text-sky-200 truncate">{bk.title}</span>
                          {isAdmin && (
                            <button
                              type="button"
                              onClick={() => handleDeleteBooking(bk.id, bk.title)}
                              className="text-slate-400 hover:text-rose-600 transition"
                              title="Cancel / Release Space"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          )}
                        </div>
                        <span className="text-[11px] font-semibold text-slate-700 dark:text-slate-300">
                          {bk.space_name}
                        </span>
                        <div className="flex items-center justify-between text-[11px] text-slate-500 font-mono mt-0.5">
                          <span>◷ {bk.start_time} - {bk.end_time}</span>
                          <span>{bk.attendees_count} people</span>
                        </div>
                        <div className="text-[10px] text-slate-500 truncate">
                          Lent to: <strong>{bk.reserved_by}</strong> ({bk.contact_phone})
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="p-3 bg-emerald-50/50 dark:bg-emerald-950/20 rounded-xl border border-emerald-100 dark:border-emerald-900/30 text-center">
                    <span className="text-xs font-semibold text-emerald-800 dark:text-emerald-300 block">
                      All Spaces Available!
                    </span>
                    <span className="text-[11px] text-emerald-600 dark:text-emerald-400 mt-0.5 block">
                      No rooms are booked on this date.
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* VIEW B: SPACE & ROOM LENDING WITH FULL 24-HOUR TIME OCCUPANCY METERS */}
      {subTab === "spaces" && (
        <div className="flex flex-col gap-5">
          {/* Top Bar for Space Occupancy View */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs">
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Building2 className="h-4 w-4 text-emerald-600" />
                <span>Facility Space & Room Lending 24-Hour Schedule</span>
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Manage room availability, sizes, and 24-hour occupancy time slots. Set when spaces are occupied or open for lending.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <label className="text-xs font-semibold text-slate-600 dark:text-slate-300 flex items-center gap-1.5">
                <span>Date:</span>
                <input
                  type="date"
                  value={selectedDate}
                  onChange={e => setSelectedDate(e.target.value)}
                  className="px-2.5 py-1 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-white outline-none font-mono"
                />
              </label>
              <button
                type="button"
                onClick={() => {
                  setBookingDate(selectedDate);
                  setOpenBookSpaceModal(true);
                }}
                className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold transition cursor-pointer shadow-3xs"
              >
                + New 24h Reservation
              </button>
            </div>
          </div>

          {/* 24-Hour Visual Occupancy Matrix for all Organization Spaces */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs p-4 sm:p-5 flex flex-col gap-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 dark:border-slate-800 pb-3">
              <div>
                <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                  24-Hour Occupancy Timeline for {selectedDateObj.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric", year: "numeric" })}
                </h4>
                <p className="text-xs text-slate-400">
                  Green segments indicate free/available time. Amber segments indicate active bookings.
                </p>
              </div>
              <div className="flex items-center gap-3 text-xs">
                <span className="flex items-center gap-1.5 text-emerald-700 dark:text-emerald-400 font-semibold">
                  <span className="h-3 w-3 rounded bg-emerald-500" /> Free / Available
                </span>
                <span className="flex items-center gap-1.5 text-amber-700 dark:text-amber-400 font-semibold">
                  <span className="h-3 w-3 rounded bg-amber-500" /> Occupied
                </span>
              </div>
            </div>

            {/* Spaces timeline list */}
            <div className="flex flex-col gap-6">
              {spaces.map(space => {
                const spaceBookingsOnDate = bookings.filter(b => b.space_id === space.id && b.date === selectedDate);
                const isFullyAvailable = spaceBookingsOnDate.length === 0;

                return (
                  <div
                    key={space.id}
                    className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/40 dark:bg-slate-950/20 flex flex-col gap-3"
                  >
                    {/* Space info header */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div>
                        <div className="flex items-center gap-2">
                          <h5 className="font-bold text-sm text-slate-900 dark:text-white">
                            {space.name}
                          </h5>
                          <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                            {space.type}
                          </span>
                        </div>
                        <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500 mt-1">
                          <span className="flex items-center gap-1">
                            <Users className="h-3.5 w-3.5 text-slate-400" />
                            <span>Capacity: <strong>{space.capacity} seats</strong></span>
                          </span>
                          <span>•</span>
                          <span className="flex items-center gap-1">
                            <Maximize2 className="h-3.5 w-3.5 text-slate-400" />
                            <span>Size: <strong>{space.size_sqm} m²</strong></span>
                          </span>
                          <span>•</span>
                          <span>
                            Rate: <strong>{space.hourly_rate > 0 ? `${space.hourly_rate.toLocaleString()} RWF/hr` : "Free Community Access"}</strong>
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 self-start sm:self-auto">
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedSpaceForBooking(space);
                            setBookingSpaceId(space.id);
                            setBookingDate(selectedDate);
                            setOpenBookSpaceModal(true);
                          }}
                          className="px-2.5 py-1 text-xs font-semibold rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white transition cursor-pointer"
                        >
                          + Reserve Slot
                        </button>
                      </div>
                    </div>

                    {/* Amenities chips */}
                    <div className="flex flex-wrap gap-1.5">
                      {space.amenities.map((am, i) => (
                        <span
                          key={i}
                          className="text-[10px] bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 px-2 py-0.5 rounded-md"
                        >
                          ✓ {am}
                        </span>
                      ))}
                    </div>

                    {/* 24-HOUR TIMELINE BAR */}
                    <div className="flex flex-col gap-1.5 pt-2">
                      <div className="flex justify-between text-[10px] font-mono text-slate-400">
                        <span>00:00</span>
                        <span>06:00</span>
                        <span>12:00 (Noon)</span>
                        <span>18:00</span>
                        <span>23:59</span>
                      </div>

                      {/* 24-segment bar */}
                      <div
                        style={{ display: "grid", gridTemplateColumns: "repeat(24, minmax(0, 1fr))" }}
                        className="h-7 rounded-lg overflow-hidden border border-slate-200 dark:border-slate-700 bg-emerald-500/20"
                      >
                        {hours24.map(hour => {
                          const occupancy = getSpaceOccupancyAtHour(space.id, selectedDate, hour);
                          const isOccupied = Boolean(occupancy);

                          return (
                            <div
                              key={hour}
                              title={
                                isOccupied
                                  ? `${hour}:00 - Occupied by "${occupancy?.title}" (${occupancy?.start_time} to ${occupancy?.end_time})`
                                  : `${hour}:00 - Available for booking`
                              }
                              className={`h-full border-r border-slate-100 dark:border-slate-800 transition cursor-pointer relative group flex items-center justify-center ${
                                isOccupied
                                  ? "bg-amber-500 hover:bg-amber-600 text-white"
                                  : "bg-emerald-500/30 hover:bg-emerald-500/50"
                              }`}
                              onClick={() => {
                                if (isOccupied && occupancy) {
                                  addToast(
                                    `Occupied: "${occupancy.title}" by ${occupancy.reserved_by} (${occupancy.start_time} - ${occupancy.end_time})`,
                                    "info"
                                  );
                                } else {
                                  setSelectedSpaceForBooking(space);
                                  setBookingSpaceId(space.id);
                                  setBookingStartTime(`${String(hour).padStart(2, "0")}:00`);
                                  setBookingEndTime(`${String(Math.min(23, hour + 2)).padStart(2, "0")}:00`);
                                  setBookingDate(selectedDate);
                                  setOpenBookSpaceModal(true);
                                }
                              }}
                            >
                              <span className="text-[8px] font-mono opacity-0 group-hover:opacity-100 transition font-bold">
                                {hour}
                              </span>
                            </div>
                          );
                        })}
                      </div>

                      {/* Active Bookings Summary on Date */}
                      {spaceBookingsOnDate.length > 0 ? (
                        <div className="flex flex-col gap-1.5 mt-2">
                          <span className="text-[11px] font-bold text-slate-700 dark:text-slate-300">
                            Occupied Time Slots ({spaceBookingsOnDate.length}):
                          </span>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                            {spaceBookingsOnDate.map(bk => (
                              <div
                                key={bk.id}
                                className="p-2.5 rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 text-xs flex items-center justify-between"
                              >
                                <div>
                                  <span className="font-bold text-amber-900 dark:text-amber-200 block truncate max-w-[200px]">
                                    {bk.title}
                                  </span>
                                  <span className="text-[10px] text-amber-800 dark:text-amber-300 font-mono">
                                    Occupied: {bk.start_time} to {bk.end_time} • {bk.reserved_by}
                                  </span>
                                </div>
                                {isAdmin && (
                                  <button
                                    type="button"
                                    onClick={() => handleDeleteBooking(bk.id, bk.title)}
                                    className="p-1 text-slate-400 hover:text-rose-600 transition"
                                    title="Cancel booking"
                                  >
                                    <Trash2 className="h-3.5 w-3.5" />
                                  </button>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                      ) : (
                        <p className="text-[11px] text-emerald-600 dark:text-emerald-400 font-medium mt-1">
                          ✓ Space is completely unoccupied and available all 24 hours on this date.
                        </p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* VIEW C: AGENDA ROSTER & SESSIONS (Standard view with quick filters) */}
      {subTab === "agenda" && (
        <div className="bg-white dark:bg-slate-900 p-4 sm:p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col gap-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 dark:border-slate-800 pb-3">
            <div>
              <h4 className="text-base font-bold text-slate-900 dark:text-white">
                All Scheduled Community Sessions & Space Lends
              </h4>
              <p className="text-xs text-slate-400">
                Chronological list of all events, general assemblies, and room occupancies.
              </p>
            </div>
            {isAdmin && onAddEventClick && (
              <button
                type="button"
                onClick={onAddEventClick}
                className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold transition"
              >
                + Schedule Community Session
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {events.map(ev => (
              <div
                key={ev.id}
                className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/20 flex flex-col gap-3"
              >
                <div className="flex items-center justify-between">
                  <h5 className="font-bold text-sm text-slate-900 dark:text-white truncate">{ev.title}</h5>
                  <span className="text-xs font-medium px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                    {ev.status || "upcoming"}
                  </span>
                </div>
                <p className="text-xs text-slate-600 dark:text-slate-400 line-clamp-2">
                  {ev.description || "No description provided."}
                </p>
                <div className="flex items-center justify-between text-xs text-slate-500 pt-2 border-t border-slate-100 dark:border-slate-800 font-mono">
                  <span>{new Date(ev.date_time).toLocaleDateString()}</span>
                  <span>{ev.location}</span>
                </div>
                {onSelectEvent && (
                  <button
                    type="button"
                    onClick={() => onSelectEvent(ev)}
                    className="w-full py-1.5 text-xs font-semibold text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/40 rounded-lg hover:bg-emerald-100 transition"
                  >
                    Manage Attendance & Roster
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* MODAL: ADD FACILITY SPACE */}
      {openAddSpaceModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-3">
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 max-w-lg w-full p-5 sm:p-6 shadow-2xl flex flex-col gap-4 animate-in fade-in">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Building2 className="h-4 w-4 text-emerald-600" />
                <span>Add Facility Space or Room</span>
              </h3>
              <button
                type="button"
                onClick={() => setOpenAddSpaceModal(false)}
                className="text-slate-400 hover:text-slate-700 dark:hover:text-white"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleAddSpace} className="flex flex-col gap-3.5 text-xs">
              <div>
                <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                  Space / Room Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Cooperative Conference Hall B"
                  value={newSpaceName}
                  onChange={e => setNewSpaceName(e.target.value)}
                  className="w-full p-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white outline-none focus:ring-1 focus:ring-emerald-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                    Space Type
                  </label>
                  <select
                    value={newSpaceType}
                    onChange={e => setNewSpaceType(e.target.value)}
                    className="w-full p-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white outline-none"
                  >
                    <option value="Meeting Room">Meeting Room</option>
                    <option value="Hall / Auditorium">Hall / Auditorium</option>
                    <option value="Training Lab">Training Lab</option>
                    <option value="Boardroom">Boardroom</option>
                    <option value="Coworking Space">Coworking Space</option>
                    <option value="Outdoor Ground / Garden">Outdoor Ground / Garden</option>
                  </select>
                </div>
                <div>
                  <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                    Max Seating Capacity
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={newSpaceCapacity}
                    onChange={e => setNewSpaceCapacity(Number(e.target.value))}
                    className="w-full p-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                    Surface Size (m²)
                  </label>
                  <input
                    type="number"
                    min="5"
                    value={newSpaceSizeSqm}
                    onChange={e => setNewSpaceSizeSqm(Number(e.target.value))}
                    className="w-full p-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white outline-none"
                  />
                </div>
                <div>
                  <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                    Hourly Rate (RWF, 0 = Free)
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="500"
                    value={newSpaceHourlyRate}
                    onChange={e => setNewSpaceHourlyRate(Number(e.target.value))}
                    className="w-full p-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                  Amenities (comma-separated)
                </label>
                <input
                  type="text"
                  placeholder="WiFi, HD Projector, Sound System, AC, Smart TV"
                  value={newSpaceAmenities}
                  onChange={e => setNewSpaceAmenities(e.target.value)}
                  className="w-full p-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                    Room Manager / Keyholder
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Jean Habimana"
                    value={newSpaceManagerName}
                    onChange={e => setNewSpaceManagerName(e.target.value)}
                    className="w-full p-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white outline-none"
                  />
                </div>
                <div>
                  <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                    Contact Phone
                  </label>
                  <input
                    type="tel"
                    placeholder="078XXXXXXX"
                    value={newSpaceManagerPhone}
                    onChange={e => setNewSpaceManagerPhone(e.target.value)}
                    className="w-full p-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white outline-none"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800 mt-2">
                <button
                  type="button"
                  onClick={() => setOpenAddSpaceModal(false)}
                  className="px-4 py-2 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-semibold shadow-xs"
                >
                  Save Space
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: RESERVE SPACE (24H TIME OCCUPANCY) */}
      {openBookSpaceModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-3">
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 max-w-lg w-full p-5 sm:p-6 shadow-2xl flex flex-col gap-4 animate-in fade-in">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Clock className="h-4 w-4 text-emerald-600" />
                <span>Reserve Room / Space (24h Slot)</span>
              </h3>
              <button
                type="button"
                onClick={() => setOpenBookSpaceModal(false)}
                className="text-slate-400 hover:text-slate-700 dark:hover:text-white"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleReserveSpace} className="flex flex-col gap-3.5 text-xs">
              <div>
                <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                  Select Space / Facility *
                </label>
                <select
                  required
                  value={bookingSpaceId}
                  onChange={e => setBookingSpaceId(e.target.value)}
                  className="w-full p-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white outline-none focus:ring-1 focus:ring-emerald-500 font-semibold"
                >
                  {spaces.map(s => (
                    <option key={s.id} value={s.id}>
                      {s.name} ({s.capacity} seats • {s.size_sqm} m²)
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                  Date of Occupancy *
                </label>
                <input
                  type="date"
                  required
                  value={bookingDate}
                  onChange={e => setBookingDate(e.target.value)}
                  className="w-full p-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white outline-none font-mono"
                />
              </div>

              {/* 24h Time Slots */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                    Start Time (24h) *
                  </label>
                  <input
                    type="time"
                    required
                    value={bookingStartTime}
                    onChange={e => setBookingStartTime(e.target.value)}
                    className="w-full p-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white outline-none font-mono"
                  />
                </div>
                <div>
                  <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                    End Time (24h) *
                  </label>
                  <input
                    type="time"
                    required
                    value={bookingEndTime}
                    onChange={e => setBookingEndTime(e.target.value)}
                    className="w-full p-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white outline-none font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                  Purpose / Occupancy Title *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Partner NGO Agricultural Training"
                  value={bookingTitle}
                  onChange={e => setBookingTitle(e.target.value)}
                  className="w-full p-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                    Lent to / Reserved by *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Organization or Person name"
                    value={bookingReservedBy}
                    onChange={e => setBookingReservedBy(e.target.value)}
                    className="w-full p-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white outline-none"
                  />
                </div>
                <div>
                  <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                    Contact Phone Number
                  </label>
                  <input
                    type="tel"
                    placeholder="078XXXXXXX"
                    value={bookingContactPhone}
                    onChange={e => setBookingContactPhone(e.target.value)}
                    className="w-full p-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white outline-none font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                    Expected Attendees
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={bookingAttendees}
                    onChange={e => setBookingAttendees(Number(e.target.value))}
                    className="w-full p-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white outline-none"
                  />
                </div>
                <div>
                  <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                    Special Equipment / Notes
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Projector needed"
                    value={bookingNotes}
                    onChange={e => setBookingNotes(e.target.value)}
                    className="w-full p-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white outline-none"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800 mt-2">
                <button
                  type="button"
                  onClick={() => setOpenBookSpaceModal(false)}
                  className="px-4 py-2 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-semibold shadow-xs"
                >
                  Confirm 24h Reservation
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
