import React, { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { getOrgSubscriptionLifecycle } from "../lib/subscriptionMatrix";
import {
  Building2,
  Plus,
  Clock,
  Users,
  Calendar,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Image as ImageIcon,
  Sparkles,
  Trash2,
  Edit2,
  Check,
  ExternalLink,
  Phone,
  Mail,
  User,
  ShieldCheck,
  ArrowRight,
  X,
  ListTodo,
  Timer,
  Maximize2,
  HelpCircle,
  DollarSign,
  Lock
} from "lucide-react";
import { RentableSpace, SpaceBookingRequest, EventTask, Event as ImpactEvent } from "../types";
import { useCurrencyStore } from "../store/currencyStore";
import { useAuthStore } from "../store/authStore";
import { useOrgStore } from "../store/orgStore";
import { useToast } from "./Toast";
import { useCreateEvent, useMembers, useBroadcastNotification } from "../hooks/useImpactoData";
import { MockDB } from "../lib/mockData";

export const PRESET_ROOM_IMAGES = [
  {
    name: "Modern Conference Hall",
    url: "https://images.unsplash.com/photo-1517457373958-b7bdd4587205?auto=format&fit=crop&w=1200&q=80",
    suggestedRange: "50 - 200 people"
  },
  {
    name: "Executive Boardroom",
    url: "https://images.unsplash.com/photo-1497366216548-37526070297c?auto=format&fit=crop&w=1200&q=80",
    suggestedRange: "10 - 25 people"
  },
  {
    name: "Digital Training Lab",
    url: "https://images.unsplash.com/photo-1524178232363-1fb2b075b655?auto=format&fit=crop&w=1200&q=80",
    suggestedRange: "20 - 45 people"
  },
  {
    name: "Garden Event Grounds",
    url: "https://images.unsplash.com/photo-1519167758481-83f550bb49b3?auto=format&fit=crop&w=1200&q=80",
    suggestedRange: "100 - 500 people"
  },
  {
    name: "Creative Co-working Hub",
    url: "https://images.unsplash.com/photo-1527192491265-7e15c55b1ed2?auto=format&fit=crop&w=1200&q=80",
    suggestedRange: "15 - 40 people"
  },
  {
    name: "Multipurpose Pavilion",
    url: "https://images.unsplash.com/photo-1511578314322-379afb476865?auto=format&fit=crop&w=1200&q=80",
    suggestedRange: "30 - 120 people"
  }
];

interface RentableSpacesManagerProps {
  activeOrg: any;
  isAdmin: boolean;
  onEventCreated?: (event: ImpactEvent) => void;
  onSwitchToCalendar?: () => void;
}

export const RentableSpacesManager: React.FC<RentableSpacesManagerProps> = ({
  activeOrg,
  isAdmin,
  onEventCreated,
  onSwitchToCalendar
}) => {
  const { addToast } = useToast();
  const { formatAmount } = useCurrencyStore();
  const { user } = useAuthStore();
  const { activeMember, setActiveOrg } = useOrgStore();
  const { data: orgMembers } = useMembers(activeOrg?.id);
  const createEventMutation = useCreateEvent();
  const broadcastMutation = useBroadcastNotification();

  const orgId = activeOrg?.id || "default";

  // Master Toggle: "We have space to rent" (default: false / no spaces by default)
  const [hasRentableSpaces, setHasRentableSpaces] = useState<boolean>(() => {
    if (activeOrg?.has_rentable_spaces !== undefined) {
      return Boolean(activeOrg.has_rentable_spaces);
    }
    const stored = localStorage.getItem(`org_has_rentable_spaces_${orgId}`);
    return stored === "true";
  });

  // Checkbox: "Allow the calendar to public page"
  const [showSpaceCalendarPublicly, setShowSpaceCalendarPublicly] = useState<boolean>(() => {
    if (activeOrg?.show_space_calendar_publicly !== undefined) {
      return Boolean(activeOrg.show_space_calendar_publicly);
    }
    const stored = localStorage.getItem(`org_show_space_calendar_${orgId}`);
    return stored !== "false";
  });

  // Rentable Spaces catalog: default empty!
  const [spaces, setSpaces] = useState<RentableSpace[]>(() => {
    const key = `org_spaces_${orgId}`;
    const raw = localStorage.getItem(key);
    if (raw) {
      try {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) return parsed;
      } catch (e) {
        console.error("Failed to parse spaces", e);
      }
    }
    if (activeOrg?.rentable_spaces && Array.isArray(activeOrg.rentable_spaces)) {
      return activeOrg.rentable_spaces;
    }
    return [];
  });

  // Space booking requests (from public page or members)
  const [requests, setRequests] = useState<SpaceBookingRequest[]>(() => {
    const key = `org_space_requests_${orgId}`;
    const raw = localStorage.getItem(key);
    if (raw) {
      try {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) return parsed;
      } catch (e) {
        console.error("Failed to parse requests", e);
      }
    }
    return [];
  });

  // Save changes to localStorage
  useEffect(() => {
    localStorage.setItem(`org_has_rentable_spaces_${orgId}`, String(hasRentableSpaces));
    localStorage.setItem(`org_show_space_calendar_${orgId}`, String(showSpaceCalendarPublicly));
    localStorage.setItem(`org_spaces_${orgId}`, JSON.stringify(spaces));
    localStorage.setItem(`org_space_requests_${orgId}`, JSON.stringify(requests));
  }, [hasRentableSpaces, showSpaceCalendarPublicly, spaces, requests, orgId]);

  // Sync with orgStore when master settings change
  const handleToggleSpaceRental = (enable: boolean) => {
    setHasRentableSpaces(enable);
    localStorage.setItem(`org_has_rentable_spaces_${orgId}`, String(enable));
    if (activeOrg) {
      const updatedOrg = {
        ...activeOrg,
        has_rentable_spaces: enable,
        show_space_calendar_publicly: showSpaceCalendarPublicly,
        rentable_spaces: spaces
      };
      setActiveOrg(updatedOrg, activeMember);
      const allOrgs = MockDB.getOrgs();
      const updatedOrgs = allOrgs.map((o) => (o.id === activeOrg.id ? updatedOrg : o));
      MockDB.saveOrgs(updatedOrgs);
    }
    if (enable) {
      addToast("Space rental enabled for this organization! You can now log your rooms.", "success");
    } else {
      addToast("Space rental disabled.", "info");
    }
  };

  const handleTogglePublicCalendar = (enable: boolean) => {
    setShowSpaceCalendarPublicly(enable);
    localStorage.setItem(`org_show_space_calendar_${orgId}`, String(enable));
    if (activeOrg) {
      const updatedOrg = {
        ...activeOrg,
        show_space_calendar_publicly: enable
      };
      setActiveOrg(updatedOrg, activeMember);
      const allOrgs = MockDB.getOrgs();
      const updatedOrgs = allOrgs.map((o) => (o.id === activeOrg.id ? updatedOrg : o));
      MockDB.saveOrgs(updatedOrgs);
    }
    addToast(enable ? "Calendar is now visible on public page!" : "Calendar hidden from public page.", "info");
  };

  // Spaces tab views: 'rooms' (catalog & occupancy) | 'requests' (approval queue)
  const [activeView, setActiveView] = useState<"rooms" | "requests">("rooms");

  // Room modal state
  const [openRoomModal, setOpenRoomModal] = useState(false);
  const [editingRoomId, setEditingRoomId] = useState<string | null>(null);
  const [roomName, setRoomName] = useState("");
  const [roomPeopleRange, setRoomPeopleRange] = useState("10 - 50 people");
  const [roomImage, setRoomImage] = useState(PRESET_ROOM_IMAGES[0].url);
  const [roomCost, setRoomCost] = useState("");
  const [roomCostUnit, setRoomCostUnit] = useState<"hour" | "day" | "event">("hour");
  const [roomDescription, setRoomDescription] = useState("");
  const [roomAmenities, setRoomAmenities] = useState("High-speed WiFi, HD Projector, Sound System, AC");

  // Save / Update Room
  const handleSaveRoom = (e: React.FormEvent) => {
    e.preventDefault();
    if (!roomName.trim()) {
      addToast("Room name is required.", "error");
      return;
    }
    if (!roomPeopleRange.trim()) {
      addToast("People range is required (e.g. 10 - 50 people).", "error");
      return;
    }

    const amenitiesList = roomAmenities
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);

    const costNum = roomCost.trim() !== "" ? Number(roomCost) : undefined;

    if (editingRoomId) {
      const updated = spaces.map((s) =>
        s.id === editingRoomId
          ? {
              ...s,
              name: roomName.trim(),
              people_range: roomPeopleRange.trim(),
              image_url: roomImage.trim() || undefined,
              cost: costNum,
              cost_unit: roomCostUnit,
              description: roomDescription.trim() || undefined,
              amenities: amenitiesList
            }
          : s
      );
      setSpaces(updated);
      addToast(`Room "${roomName.trim()}" updated successfully!`, "success");
    } else {
      const newSpace: RentableSpace = {
        id: `space-${Date.now()}`,
        org_id: orgId,
        name: roomName.trim(),
        people_range: roomPeopleRange.trim(),
        image_url: roomImage.trim() || undefined,
        cost: costNum,
        cost_unit: roomCostUnit,
        currency: "RWF",
        description: roomDescription.trim() || undefined,
        amenities: amenitiesList,
        is_active: true,
        created_at: new Date().toISOString()
      };
      setSpaces([newSpace, ...spaces]);
      addToast(`Room "${newSpace.name}" logged successfully!`, "success");
    }

    // Reset & Close
    setRoomName("");
    setRoomPeopleRange("10 - 50 people");
    setRoomCost("");
    setRoomDescription("");
    setEditingRoomId(null);
    setOpenRoomModal(false);
  };

  const handleEditRoom = (room: RentableSpace) => {
    setEditingRoomId(room.id);
    setRoomName(room.name);
    setRoomPeopleRange(room.people_range || "10 - 50 people");
    setRoomImage(room.image_url || PRESET_ROOM_IMAGES[0].url);
    setRoomCost(room.cost !== undefined && room.cost !== null ? String(room.cost) : "");
    setRoomCostUnit((room.cost_unit as any) || "hour");
    setRoomDescription(room.description || "");
    setRoomAmenities((room.amenities || []).join(", "));
    setOpenRoomModal(true);
  };

  const handleDeleteRoom = (roomId: string, name: string) => {
    if (confirm(`Are you sure you want to remove room "${name}"?`)) {
      setSpaces(spaces.filter((s) => s.id !== roomId));
      addToast(`Room "${name}" removed.`, "info");
    }
  };

  // Request approval workflow
  const handleApproveRequest = (request: SpaceBookingRequest) => {
    const updated = requests.map((r) =>
      r.id === request.id
        ? {
            ...r,
            status: "approved" as const,
            approved_at: new Date().toISOString(),
            approved_by: user?.full_name || "Admin"
          }
        : r
    );
    setRequests(updated);

    // Save in-app notification for the member/requester
    const notif = {
      id: `notif-${Date.now()}`,
      org_id: orgId,
      recipient_email: request.requester_email || "",
      title: "Space Rental Request Approved!",
      body: `Your space booking for "${request.space_name}" on ${request.date} has been approved. Click 'Schedule Event' to set up your tasks and schedule.`,
      action: "schedule_event",
      booking_id: request.id,
      created_at: new Date().toISOString()
    };
    try {
      const sends = MockDB.getNotificationSends();
      sends.unshift({
        id: notif.id,
        org_id: orgId,
        title: notif.title,
        body_text: notif.body,
        created_at: notif.created_at
      });
      MockDB.saveNotificationSends(sends);

      if (request.requester_email) {
        const key = `org_member_notifications_${orgId}_${request.requester_email.toLowerCase()}`;
        const prev = JSON.parse(localStorage.getItem(key) || "[]");
        localStorage.setItem(key, JSON.stringify([notif, ...prev]));
      }
    } catch (e) {}

    addToast(`Request for "${request.title}" approved! Requester has been notified.`, "success");
  };

  const handleRejectRequest = (request: SpaceBookingRequest) => {
    const updated = requests.map((r) =>
      r.id === request.id ? { ...r, status: "rejected" as const } : r
    );
    setRequests(updated);
    addToast(`Request for "${request.title}" was rejected.`, "info");
  };

  // Event Scheduling & To-Dos Planner Modal
  const [openScheduleModal, setOpenScheduleModal] = useState(false);
  const [targetBookingForSchedule, setTargetBookingForSchedule] = useState<SpaceBookingRequest | null>(null);
  const [scheduleTitle, setScheduleTitle] = useState("");
  const [scheduleDateTime, setScheduleDateTime] = useState("");
  const [scheduleEndTime, setScheduleEndTime] = useState("");
  const [scheduleLocation, setScheduleLocation] = useState("");
  const [scheduleDesc, setScheduleDesc] = useState("");
  const [scheduleTasks, setScheduleTasks] = useState<EventTask[]>([]);
  const [newTaskTitle, setNewTaskTitle] = useState("");
  const [newTaskMemberName, setNewTaskMemberName] = useState("");
  const [newTaskEstimateTime, setNewTaskEstimateTime] = useState("2 hours");

  const openScheduleFromBooking = (booking: SpaceBookingRequest) => {
    setTargetBookingForSchedule(booking);
    setScheduleTitle(booking.title || `Event in ${booking.space_name}`);
    const dt = booking.date && booking.start_time ? `${booking.date}T${booking.start_time}` : new Date().toISOString().slice(0, 16);
    const endDt = booking.date && booking.end_time ? `${booking.date}T${booking.end_time}` : "";
    setScheduleDateTime(dt);
    setScheduleEndTime(endDt);
    setScheduleLocation(booking.space_name);
    setScheduleDesc(booking.notes ? `Booking notes: ${booking.notes}` : "");
    // Default initial tasks
    setScheduleTasks([
      {
        id: `task-${Date.now()}-1`,
        title: "Room setup, seating arrangement & audio check",
        assigned_to_member_id: user?.id || "admin",
        assigned_to_name: user?.full_name || "Event Lead",
        assigned_to_role: "Organizer",
        progress: 0,
        status: "todo",
        estimated_time: "1 hour 30 mins",
        created_at: new Date().toISOString()
      },
      {
        id: `task-${Date.now()}-2`,
        title: "Guest reception & attendance check-in desk",
        assigned_to_member_id: "volunteer-1",
        assigned_to_name: booking.requester_name || "Front Desk Team",
        assigned_to_role: "Host",
        progress: 0,
        status: "todo",
        estimated_time: "2 hours",
        created_at: new Date().toISOString()
      }
    ]);
    setOpenScheduleModal(true);
  };

  const handleAddTaskToSchedule = () => {
    if (!newTaskTitle.trim()) {
      addToast("Please provide task / to-do title.", "error");
      return;
    }
    const assignee = newTaskMemberName.trim() || user?.full_name || "Assigned Member";
    const task: EventTask = {
      id: `task-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
      title: newTaskTitle.trim(),
      assigned_to_member_id: "member-" + Math.random().toString(36).substr(2, 6),
      assigned_to_name: assignee,
      assigned_to_role: "Assignee",
      progress: 0,
      status: "todo",
      estimated_time: newTaskEstimateTime.trim() || "1 hour",
      created_at: new Date().toISOString()
    };
    setScheduleTasks([...scheduleTasks, task]);
    setNewTaskTitle("");
    setNewTaskEstimateTime("1 hour");
    addToast("Task deliverable added to event schedule!", "success");
  };

  const handleRemoveTaskFromSchedule = (taskId: string) => {
    setScheduleTasks(scheduleTasks.filter((t) => t.id !== taskId));
  };

  const handleConfirmScheduleEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!scheduleTitle.trim() || !scheduleDateTime) {
      addToast("Event title and date are required.", "error");
      return;
    }

    try {
      const res = await createEventMutation.mutateAsync({
        org_id: orgId,
        title: scheduleTitle.trim(),
        description: scheduleDesc.trim(),
        date_time: new Date(scheduleDateTime).toISOString(),
        end_time: scheduleEndTime ? new Date(scheduleEndTime).toISOString() : undefined,
        location: scheduleLocation.trim() || "Organization Facility",
        is_public: true,
        status: "upcoming",
        tasks: scheduleTasks,
        overall_progress: 0
      } as any);

      // Update booking request to scheduled
      if (targetBookingForSchedule) {
        const updated = requests.map((r) =>
          r.id === targetBookingForSchedule.id
            ? {
                ...r,
                status: "scheduled" as const,
                event_id: res?.id || `ev-${Date.now()}`
              }
            : r
        );
        setRequests(updated);
      }

      setOpenScheduleModal(false);
      addToast("Event scheduled successfully with assigned tasks and estimated durations!", "success");

      if (onEventCreated && res) {
        onEventCreated(res);
      }
      if (onSwitchToCalendar) {
        onSwitchToCalendar();
      }
    } catch (err: any) {
      addToast(err.message || "Failed to schedule event.", "error");
    }
  };

  const pendingRequestsCount = useMemo(() => {
    return requests.filter((r) => r.status === "pending").length;
  }, [requests]);

  const navigate = useNavigate();
  const lifecycle = getOrgSubscriptionLifecycle(activeOrg);
  const isProPlan = lifecycle.effectiveTier === "pro" || lifecycle.effectiveTier === "enterprise";

  if (!isProPlan) {
    return (
      <div className="bg-white dark:bg-slate-900 border border-amber-200 dark:border-amber-800 rounded-2xl p-6 sm:p-8 shadow-xs flex flex-col items-center text-center max-w-2xl mx-auto my-4 space-y-4">
        <div className="h-14 w-14 rounded-2xl bg-amber-100 dark:bg-amber-950/80 text-amber-600 dark:text-amber-400 flex items-center justify-center shadow-3xs">
          <Lock className="h-7 w-7" />
        </div>
        <div>
          <h3 className="text-lg font-extrabold text-slate-950 dark:text-white">
            Host External Events & Facility Space Lending requires Pro Plan
          </h3>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-2 max-w-md mx-auto leading-relaxed">
            Monetizing organization venues, listing rooms/boardrooms on the public portal, and managing external facility reservations is available exclusively on the Pro and Enterprise plans.
          </p>
        </div>
        <button
          type="button"
          onClick={() => navigate("/dashboard/settings?tab=subscription")}
          className="px-6 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-extrabold text-xs sm:text-sm transition shadow-xs cursor-pointer inline-flex items-center gap-2"
        >
          <span>Upgrade to Pro Plan →</span>
        </button>
      </div>
    );
  }

  // If "We have space to rent" is NOT enabled yet, show onboarding banner
  if (!hasRentableSpaces) {
    return (
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 sm:p-8 shadow-xs flex flex-col items-center text-center max-w-2xl mx-auto my-4">
        <div className="h-16 w-16 rounded-2xl bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 flex items-center justify-center text-emerald-600 dark:text-emerald-400 mb-4 shadow-3xs">
          <Building2 className="h-8 w-8" />
        </div>
        <h3 className="text-lg sm:text-xl font-extrabold text-slate-950 dark:text-white">
          Rentable Spaces & Event Facility Lending
        </h3>
        <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-2 max-w-lg leading-relaxed">
          Does your organization have a hall, boardroom, training room, or outdoor space to rent?
          Enable this feature to log your rooms, set capacity ranges, upload photos, and allow the community to book through your public calendar.
        </p>

        <div className="mt-6 flex flex-col sm:flex-row items-center gap-3">
          {isAdmin ? (
            <button
              type="button"
              onClick={() => handleToggleSpaceRental(true)}
              className="px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs sm:text-sm transition shadow-xs cursor-pointer flex items-center gap-2"
            >
              <Check className="h-4 w-4" />
              <span>We Have Space to Rent</span>
            </button>
          ) : (
            <span className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-500 text-xs font-semibold">
              Currently disabled by organization administration.
            </span>
          )}
        </div>

        <div className="mt-6 pt-5 border-t border-slate-100 dark:border-slate-800 w-full grid grid-cols-1 sm:grid-cols-3 gap-3 text-left text-xs text-slate-600 dark:text-slate-400">
          <div className="p-3 bg-slate-50 dark:bg-slate-850 rounded-xl">
            <span className="font-bold text-slate-900 dark:text-white block mb-0.5">1. Log Rooms</span>
            <span>Record room names, people ranges, photos, and optional rental rates.</span>
          </div>
          <div className="p-3 bg-slate-50 dark:bg-slate-850 rounded-xl">
            <span className="font-bold text-slate-900 dark:text-white block mb-0.5">2. Public Booking</span>
            <span>Visitors select dates on your public page and submit reservation requests.</span>
          </div>
          <div className="p-3 bg-slate-50 dark:bg-slate-850 rounded-xl">
            <span className="font-bold text-slate-900 dark:text-white block mb-0.5">3. Approve & To-Dos</span>
            <span>Approve requests, notify members, and schedule events with assigned to-dos.</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-5">
      {/* Top Administration Bar */}
      <div className="bg-white dark:bg-slate-900 p-4 sm:p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <Building2 className="h-5 w-5 text-emerald-600" />
            <h3 className="text-base font-extrabold text-slate-950 dark:text-white">
              Rentable Spaces & Facilities Management
            </h3>
            <span className="px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 font-extrabold text-[10px]">
              Active
            </span>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Manage your rooms, people capacities, photos, and public calendar requests.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {isAdmin && (
            <div className="flex items-center gap-2 bg-slate-50 dark:bg-slate-800 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700">
              <input
                id="public-calendar-toggle"
                type="checkbox"
                checked={showSpaceCalendarPublicly}
                onChange={(e) => handleTogglePublicCalendar(e.target.checked)}
                className="h-4 w-4 rounded text-emerald-600 focus:ring-emerald-500 cursor-pointer"
              />
              <label
                htmlFor="public-calendar-toggle"
                className="text-xs font-semibold text-slate-700 dark:text-slate-200 cursor-pointer select-none"
              >
                Allow calendar to public page
              </label>
            </div>
          )}

          {isAdmin && (
            <button
              type="button"
              onClick={() => {
                setEditingRoomId(null);
                setRoomName("");
                setRoomPeopleRange("10 - 50 people");
                setRoomCost("");
                setRoomDescription("");
                setOpenRoomModal(true);
              }}
              className="px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-extrabold transition shadow-xs cursor-pointer flex items-center gap-1.5"
            >
              <Plus className="h-4 w-4" />
              <span>Add Room / Space</span>
            </button>
          )}

          {isAdmin && (
            <button
              type="button"
              onClick={() => {
                if (confirm("Disable space rental mode? Rooms will be preserved in records.")) {
                  handleToggleSpaceRental(false);
                }
              }}
              className="px-2.5 py-1.5 text-xs text-slate-400 hover:text-rose-600 transition"
              title="Disable Space Rentals"
            >
              Disable
            </button>
          )}
        </div>
      </div>

      {/* Sub-Views Selector */}
      <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-2">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setActiveView("rooms")}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-2 cursor-pointer ${
              activeView === "rooms"
                ? "bg-slate-900 text-white dark:bg-emerald-600 shadow-xs"
                : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
            }`}
          >
            <Building2 className="h-3.5 w-3.5" />
            <span>Available Rooms ({spaces.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveView("requests")}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-2 cursor-pointer ${
              activeView === "requests"
                ? "bg-slate-900 text-white dark:bg-emerald-600 shadow-xs"
                : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
            }`}
          >
            <Clock className="h-3.5 w-3.5" />
            <span>Booking Requests</span>
            {pendingRequestsCount > 0 && (
              <span className="px-1.5 py-0.2 rounded-full bg-rose-500 text-white font-extrabold text-[10px]">
                {pendingRequestsCount} new
              </span>
            )}
          </button>
        </div>

        {activeOrg?.slug && showSpaceCalendarPublicly && (
          <a
            href={`/@${activeOrg.slug}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-[11px] font-bold text-emerald-600 hover:text-emerald-700 flex items-center gap-1"
          >
            <span>Preview Public Calendar</span>
            <ExternalLink className="h-3 w-3" />
          </a>
        )}
      </div>

      {/* VIEW 1: ROOMS CATALOG */}
      {activeView === "rooms" && (
        <div>
          {spaces.length === 0 ? (
            <div className="bg-slate-50 dark:bg-slate-900/50 border border-dashed border-slate-300 dark:border-slate-800 rounded-2xl p-8 text-center flex flex-col items-center">
              <Building2 className="h-10 w-10 text-slate-300 dark:text-slate-600 mb-2" />
              <h4 className="text-sm font-bold text-slate-800 dark:text-slate-200">
                No Rentable Rooms Logged Yet
              </h4>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-sm">
                Click below to add your first room with name, capacity range, photo, and optional rental rate.
              </p>
              {isAdmin && (
                <button
                  type="button"
                  onClick={() => setOpenRoomModal(true)}
                  className="mt-4 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-xs transition flex items-center gap-1.5 cursor-pointer"
                >
                  <Plus className="h-4 w-4" />
                  <span>Log Room Details</span>
                </button>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {spaces.map((space) => {
                const spaceBookingsCount = requests.filter(
                  (r) => r.space_id === space.id && (r.status === "approved" || r.status === "scheduled")
                ).length;

                return (
                  <div
                    key={space.id}
                    className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-xs flex flex-col justify-between group hover:border-emerald-500/50 transition-all"
                  >
                    <div>
                      {/* Room Photo */}
                      <div className="relative h-44 w-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                        {space.image_url ? (
                          <img
                            src={space.image_url}
                            alt={space.name}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                            onError={(e) => {
                              // fallback
                              (e.target as any).src = PRESET_ROOM_IMAGES[0].url;
                            }}
                          />
                        ) : (
                          <div className="w-full h-full flex flex-col items-center justify-center text-slate-400">
                            <ImageIcon className="h-8 w-8 mb-1 opacity-50" />
                            <span className="text-[11px] font-mono">No Image Provided</span>
                          </div>
                        )}
                        <div className="absolute top-3 left-3 px-2.5 py-1 rounded-lg bg-slate-950/70 backdrop-blur-xs text-white text-[11px] font-bold flex items-center gap-1.5">
                          <Users className="h-3.5 w-3.5 text-emerald-400" />
                          <span>{space.people_range || "Flexible capacity"}</span>
                        </div>
                        {space.cost !== undefined && space.cost !== null && space.cost > 0 ? (
                          <div className="absolute top-3 right-3 px-2.5 py-1 rounded-lg bg-emerald-600 text-white text-[11px] font-extrabold shadow-xs font-mono">
                            {formatAmount(space.cost)} / {space.cost_unit || "hour"}
                          </div>
                        ) : (
                          <div className="absolute top-3 right-3 px-2.5 py-1 rounded-lg bg-slate-900/80 backdrop-blur-xs text-emerald-300 text-[10px] font-bold">
                            Free Community Access
                          </div>
                        )}
                      </div>

                      {/* Content */}
                      <div className="p-4 sm:p-5 flex flex-col gap-3">
                        <div>
                          <h4 className="font-extrabold text-slate-900 dark:text-white text-base">
                            {space.name}
                          </h4>
                          {space.description && (
                            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 line-clamp-2">
                              {space.description}
                            </p>
                          )}
                        </div>

                        {/* Amenities */}
                        {space.amenities && space.amenities.length > 0 && (
                          <div className="flex flex-wrap gap-1.5">
                            {space.amenities.slice(0, 4).map((amenity, idx) => (
                              <span
                                key={idx}
                                className="text-[10px] font-medium px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300"
                              >
                                ✓ {amenity}
                              </span>
                            ))}
                            {space.amenities.length > 4 && (
                              <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-md text-slate-400">
                                +{space.amenities.length - 4} more
                              </span>
                            )}
                          </div>
                        )}

                        <div className="flex items-center justify-between text-xs text-slate-500 pt-2 border-t border-slate-100 dark:border-slate-800">
                          <span>
                            Bookings: <strong>{spaceBookingsCount} confirmed</strong>
                          </span>
                          <span className="text-emerald-600 font-semibold text-[11px]">
                            ● Available for rent
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Admin Actions */}
                    {isAdmin && (
                      <div className="p-3 bg-slate-50 dark:bg-slate-850 border-t border-slate-100 dark:border-slate-800 flex items-center justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => handleEditRoom(space)}
                          className="px-2.5 py-1 rounded-lg text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 flex items-center gap-1 transition"
                        >
                          <Edit2 className="h-3 w-3" />
                          <span>Edit</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteRoom(space.id, space.name)}
                          className="px-2.5 py-1 rounded-lg text-xs font-bold text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 flex items-center gap-1 transition"
                        >
                          <Trash2 className="h-3 w-3" />
                          <span>Delete</span>
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* VIEW 2: SPACE BOOKING REQUESTS REVIEW TABLE */}
      {activeView === "requests" && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-xs flex flex-col gap-4">
          <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
            <div>
              <h4 className="text-sm font-extrabold text-slate-950 dark:text-white">
                Space Reservation Requests
              </h4>
              <p className="text-xs text-slate-400 mt-0.5">
                Review visitor and member reservation requests. Approve to notify requester and schedule deliverables.
              </p>
            </div>
            <span className="text-xs font-mono font-bold text-slate-500">
              Total Requests: {requests.length}
            </span>
          </div>

          {requests.length === 0 ? (
            <div className="py-12 text-center text-slate-400 text-xs">
              No booking requests received yet. Requests submitted from the public organization page will appear here.
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              {requests.map((req) => {
                const isPending = req.status === "pending";
                const isApproved = req.status === "approved";
                const isScheduled = req.status === "scheduled";
                const isRejected = req.status === "rejected";

                return (
                  <div
                    key={req.id}
                    className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/40 flex flex-col lg:flex-row lg:items-center justify-between gap-4"
                  >
                    {/* Left: Booking Details */}
                    <div className="flex flex-col gap-1.5 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-extrabold text-slate-900 dark:text-white text-sm">
                          {req.title}
                        </span>
                        <span className="text-xs text-emerald-600 font-bold bg-emerald-50 dark:bg-emerald-950/50 px-2 py-0.5 rounded-md border border-emerald-200 dark:border-emerald-800">
                          {req.space_name}
                        </span>
                      </div>

                      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-500 dark:text-slate-400">
                        <span className="flex items-center gap-1">
                          <Calendar className="h-3.5 w-3.5 text-slate-400" />
                          <span>{req.date}</span>
                        </span>
                        <span className="flex items-center gap-1 font-mono">
                          <Clock className="h-3.5 w-3.5 text-slate-400" />
                          <span>{req.start_time} - {req.end_time}</span>
                        </span>
                        <span className="flex items-center gap-1">
                          <User className="h-3.5 w-3.5 text-slate-400" />
                          <span>Requester: <strong>{req.requester_name}</strong></span>
                        </span>
                        {req.requester_email && (
                          <span className="flex items-center gap-1">
                            <Mail className="h-3.5 w-3.5 text-slate-400" />
                            <span>{req.requester_email}</span>
                          </span>
                        )}
                        {req.requester_phone && (
                          <span className="flex items-center gap-1 font-mono">
                            <Phone className="h-3.5 w-3.5 text-slate-400" />
                            <span>{req.requester_phone}</span>
                          </span>
                        )}
                      </div>

                      {req.notes && (
                        <p className="text-xs text-slate-600 dark:text-slate-300 bg-white dark:bg-slate-900 p-2.5 rounded-lg border border-slate-200/60 dark:border-slate-800 mt-1">
                          <strong>Notes:</strong> {req.notes}
                        </p>
                      )}
                    </div>

                    {/* Right: Status and High-Role Actions */}
                    <div className="flex items-center gap-2 shrink-0 self-end lg:self-center">
                      {/* Status Badge */}
                      <span
                        className={`px-3 py-1 rounded-full text-[10px] font-mono font-extrabold uppercase ${
                          isScheduled
                            ? "bg-purple-100 text-purple-900 border border-purple-300 dark:bg-purple-950 dark:text-purple-300"
                            : isApproved
                            ? "bg-emerald-100 text-emerald-900 border border-emerald-300 dark:bg-emerald-950 dark:text-emerald-300"
                            : isRejected
                            ? "bg-rose-100 text-rose-900 border border-rose-300 dark:bg-rose-950 dark:text-rose-300"
                            : "bg-amber-100 text-amber-900 border border-amber-300 dark:bg-amber-950 dark:text-amber-300"
                        }`}
                      >
                        {isPending ? "Pending Review" : req.status}
                      </span>

                      {/* Admin Approve / Reject buttons */}
                      {isAdmin && isPending && (
                        <div className="flex items-center gap-1.5 ml-2">
                          <button
                            type="button"
                            onClick={() => handleApproveRequest(req)}
                            className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs transition shadow-xs flex items-center gap-1 cursor-pointer"
                          >
                            <CheckCircle2 className="h-3.5 w-3.5" />
                            <span>Approve</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => handleRejectRequest(req)}
                            className="px-3 py-1.5 rounded-xl bg-slate-200 dark:bg-slate-800 hover:bg-rose-100 hover:text-rose-700 dark:hover:bg-rose-950 text-slate-700 dark:text-slate-300 font-bold text-xs transition cursor-pointer"
                          >
                            <XCircle className="h-3.5 w-3.5" />
                            <span>Reject</span>
                          </button>
                        </div>
                      )}

                      {/* Scheduled Action Button for approved requests */}
                      {isApproved && (
                        <button
                          type="button"
                          onClick={() => openScheduleFromBooking(req)}
                          className="px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs transition shadow-xs flex items-center gap-1.5 cursor-pointer ml-2"
                        >
                          <ListTodo className="h-3.5 w-3.5" />
                          <span>Schedule Event & To-Dos</span>
                        </button>
                      )}

                      {isScheduled && (
                        <span className="text-xs text-purple-700 dark:text-purple-300 font-bold ml-2">
                          ✓ Event Scheduled
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ==========================================================
          MODAL 1: ADD / EDIT ROOM
          ========================================================== */}
      {openRoomModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-3 animate-in fade-in">
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 max-w-lg w-full p-5 sm:p-6 shadow-2xl flex flex-col gap-4 max-h-[92vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <Building2 className="h-5 w-5 text-emerald-600" />
                <h3 className="text-base font-extrabold text-slate-900 dark:text-white">
                  {editingRoomId ? "Edit Rentable Room" : "Log Rentable Room"}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setOpenRoomModal(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-white p-1 rounded-lg"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSaveRoom} className="flex flex-col gap-4 text-xs">
              {/* Room Name */}
              <div>
                <label className="font-extrabold text-slate-800 dark:text-slate-200 block mb-1">
                  Room Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Innovation Hall Alpha / Executive Boardroom 1"
                  value={roomName}
                  onChange={(e) => setRoomName(e.target.value)}
                  className="w-full text-xs rounded-xl border bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800 px-3.5 py-2.5 outline-none focus:ring-2 focus:ring-emerald-600 font-semibold"
                />
              </div>

              {/* People Range */}
              <div>
                <label className="font-extrabold text-slate-800 dark:text-slate-200 block mb-1">
                  People Range / Capacity *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. 15 - 50 people / Up to 100 people"
                  value={roomPeopleRange}
                  onChange={(e) => setRoomPeopleRange(e.target.value)}
                  className="w-full text-xs rounded-xl border bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800 px-3.5 py-2.5 outline-none focus:ring-2 focus:ring-emerald-600 font-mono"
                />
                <div className="flex flex-wrap gap-1.5 mt-1.5">
                  {["5 - 15 people", "15 - 50 people", "50 - 150 people", "150 - 300 people"].map(
                    (range) => (
                      <button
                        key={range}
                        type="button"
                        onClick={() => setRoomPeopleRange(range)}
                        className="text-[10px] px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 hover:bg-emerald-50 hover:text-emerald-700 text-slate-600 dark:text-slate-300 font-mono"
                      >
                        {range}
                      </button>
                    )
                  )}
                </div>
              </div>

              {/* Cost (Not Required) */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-extrabold text-slate-800 dark:text-slate-200 block mb-1">
                    Cost in RWF <span className="text-slate-400 font-normal">(not required)</span>
                  </label>
                  <input
                    type="number"
                    min="0"
                    placeholder="e.g. 15000 (leave blank for free)"
                    value={roomCost}
                    onChange={(e) => setRoomCost(e.target.value)}
                    className="w-full text-xs rounded-xl border bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800 px-3.5 py-2.5 outline-none focus:ring-2 focus:ring-emerald-600 font-mono"
                  />
                </div>
                <div>
                  <label className="font-extrabold text-slate-800 dark:text-slate-200 block mb-1">
                    Rate Period
                  </label>
                  <select
                    value={roomCostUnit}
                    onChange={(e) => setRoomCostUnit(e.target.value as any)}
                    className="w-full text-xs rounded-xl border bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800 px-3.5 py-2.5 outline-none focus:ring-2 focus:ring-emerald-600"
                  >
                    <option value="hour">Per Hour</option>
                    <option value="day">Per Day</option>
                    <option value="event">Per Entire Event</option>
                  </select>
                </div>
              </div>

              {/* Image of Room */}
              <div>
                <label className="font-extrabold text-slate-800 dark:text-slate-200 block mb-1">
                  Image of Room (URL or select from curated presets below)
                </label>
                <input
                  type="url"
                  placeholder="https://example.com/room-photo.jpg"
                  value={roomImage}
                  onChange={(e) => setRoomImage(e.target.value)}
                  className="w-full text-xs rounded-xl border bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800 px-3.5 py-2.5 outline-none focus:ring-2 focus:ring-emerald-600 font-mono mb-2"
                />

                {/* Preset image buttons */}
                <div className="grid grid-cols-3 gap-2">
                  {PRESET_ROOM_IMAGES.map((preset, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => {
                        setRoomImage(preset.url);
                        if (!roomPeopleRange || roomPeopleRange === "10 - 50 people") {
                          setRoomPeopleRange(preset.suggestedRange);
                        }
                      }}
                      className={`relative rounded-xl overflow-hidden border h-16 transition-all group ${
                        roomImage === preset.url
                          ? "border-emerald-600 ring-2 ring-emerald-500/30"
                          : "border-slate-200 dark:border-slate-800 hover:border-emerald-400"
                      }`}
                    >
                      <img src={preset.url} alt={preset.name} className="w-full h-full object-cover" />
                      <div className="absolute inset-0 bg-slate-950/60 p-1 flex items-end">
                        <span className="text-[9px] text-white font-bold truncate leading-tight">
                          {preset.name}
                        </span>
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Amenities */}
              <div>
                <label className="font-extrabold text-slate-800 dark:text-slate-200 block mb-1">
                  Included Amenities (comma-separated)
                </label>
                <input
                  type="text"
                  placeholder="WiFi, Projector, Sound System, Air Conditioning"
                  value={roomAmenities}
                  onChange={(e) => setRoomAmenities(e.target.value)}
                  className="w-full text-xs rounded-xl border bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800 px-3.5 py-2.5 outline-none focus:ring-2 focus:ring-emerald-600"
                />
              </div>

              {/* Actions */}
              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100 dark:border-slate-800 mt-2">
                <button
                  type="button"
                  onClick={() => setOpenRoomModal(false)}
                  className="px-4 py-2.5 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs shadow-xs cursor-pointer"
                >
                  {editingRoomId ? "Update Room" : "Save Room Details"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ==========================================================
          MODAL 2: SCHEDULE EVENT & CREATE TO-DOS PLANNER
          ========================================================== */}
      {openScheduleModal && targetBookingForSchedule && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-3 animate-in fade-in">
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 max-w-2xl w-full p-5 sm:p-6 shadow-2xl flex flex-col gap-4 max-h-[92vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <div>
                <h3 className="text-base font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
                  <ListTodo className="h-5 w-5 text-emerald-600" />
                  <span>Schedule Event & Assign Deliverable Tasks</span>
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Confirm calendar details and assign responsibilities with estimated times used.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setOpenScheduleModal(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-white p-1 rounded-lg"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleConfirmScheduleEvent} className="flex flex-col gap-4 text-xs">
              {/* Event Title */}
              <div>
                <label className="font-extrabold text-slate-800 dark:text-slate-200 block mb-1">
                  Event Title *
                </label>
                <input
                  type="text"
                  required
                  value={scheduleTitle}
                  onChange={(e) => setScheduleTitle(e.target.value)}
                  className="w-full text-xs rounded-xl border bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800 px-3.5 py-2.5 outline-none focus:ring-2 focus:ring-emerald-600 font-bold"
                />
              </div>

              {/* Date & Location */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="font-extrabold text-slate-800 dark:text-slate-200 block mb-1">
                    Start Date & Time *
                  </label>
                  <input
                    type="datetime-local"
                    required
                    value={scheduleDateTime}
                    onChange={(e) => setScheduleDateTime(e.target.value)}
                    className="w-full text-xs rounded-xl border bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800 px-3 py-2 outline-none font-mono"
                  />
                </div>
                <div>
                  <label className="font-extrabold text-slate-800 dark:text-slate-200 block mb-1">
                    End Time (Optional)
                  </label>
                  <input
                    type="datetime-local"
                    value={scheduleEndTime}
                    onChange={(e) => setScheduleEndTime(e.target.value)}
                    className="w-full text-xs rounded-xl border bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800 px-3 py-2 outline-none font-mono"
                  />
                </div>
                <div>
                  <label className="font-extrabold text-slate-800 dark:text-slate-200 block mb-1">
                    Location / Room
                  </label>
                  <input
                    type="text"
                    required
                    value={scheduleLocation}
                    onChange={(e) => setScheduleLocation(e.target.value)}
                    className="w-full text-xs rounded-xl border bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800 px-3 py-2 outline-none font-semibold"
                  />
                </div>
              </div>

              {/* TO-DO / TASK ASSIGNMENT BUILDER WITH ESTIMATED TIME */}
              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-850/60 border border-slate-200 dark:border-slate-800 flex flex-col gap-3">
                <div className="flex items-center justify-between">
                  <h4 className="font-extrabold text-slate-900 dark:text-white flex items-center gap-1.5 text-xs">
                    <ListTodo className="h-4 w-4 text-emerald-600" />
                    <span>Event To-Dos & Assign Deliverables</span>
                  </h4>
                  <span className="text-[11px] font-mono font-bold text-slate-500">
                    {scheduleTasks.length} tasks scheduled
                  </span>
                </div>

                {/* Add new task input row */}
                <div className="grid grid-cols-1 sm:grid-cols-12 gap-2 bg-white dark:bg-slate-900 p-3 rounded-xl border border-slate-200 dark:border-slate-800">
                  <div className="sm:col-span-5">
                    <input
                      type="text"
                      placeholder="Task deliverable description..."
                      value={newTaskTitle}
                      onChange={(e) => setNewTaskTitle(e.target.value)}
                      className="w-full text-xs rounded-lg border bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800 px-3 py-1.5 outline-none focus:ring-1 focus:ring-emerald-600"
                    />
                  </div>
                  <div className="sm:col-span-3">
                    <input
                      type="text"
                      placeholder="Assigned member name..."
                      value={newTaskMemberName}
                      onChange={(e) => setNewTaskMemberName(e.target.value)}
                      list="org-members-list"
                      className="w-full text-xs rounded-lg border bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800 px-3 py-1.5 outline-none focus:ring-1 focus:ring-emerald-600"
                    />
                    <datalist id="org-members-list">
                      {orgMembers?.map((m) => (
                        <option key={m.id} value={m.user?.full_name || m.user?.email} />
                      ))}
                    </datalist>
                  </div>
                  <div className="sm:col-span-2">
                    <input
                      type="text"
                      placeholder="Est. time (e.g. 2h)"
                      value={newTaskEstimateTime}
                      onChange={(e) => setNewTaskEstimateTime(e.target.value)}
                      className="w-full text-xs rounded-lg border bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800 px-3 py-1.5 outline-none font-mono focus:ring-1 focus:ring-emerald-600"
                    />
                  </div>
                  <div className="sm:col-span-2 flex items-center">
                    <button
                      type="button"
                      onClick={handleAddTaskToSchedule}
                      className="w-full px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs rounded-lg shadow-3xs transition cursor-pointer flex items-center justify-center gap-1"
                    >
                      <Plus className="h-3.5 w-3.5" />
                      <span>Add</span>
                    </button>
                  </div>
                </div>

                {/* Current tasks list */}
                {scheduleTasks.length > 0 ? (
                  <div className="flex flex-col gap-1.5 max-h-48 overflow-y-auto">
                    {scheduleTasks.map((t, index) => (
                      <div
                        key={t.id}
                        className="p-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl flex items-center justify-between text-xs gap-2"
                      >
                        <div className="flex items-center gap-2 min-w-0 flex-1">
                          <span className="font-mono text-slate-400 font-bold text-[10px]">
                            #{index + 1}
                          </span>
                          <span className="font-semibold text-slate-900 dark:text-white truncate">
                            {t.title}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <span className="px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-bold text-[10px] flex items-center gap-1">
                            <User className="h-3 w-3 text-slate-400" />
                            <span>{t.assigned_to_name}</span>
                          </span>
                          <span className="px-2 py-0.5 rounded-md bg-emerald-50 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 font-mono font-bold text-[10px] flex items-center gap-1 border border-emerald-200 dark:border-emerald-800">
                            <Timer className="h-3 w-3 text-emerald-500" />
                            <span>{t.estimated_time || "1 hour"}</span>
                          </span>
                          <button
                            type="button"
                            onClick={() => handleRemoveTaskFromSchedule(t.id)}
                            className="p-1 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded transition"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-[11px] text-slate-400 italic text-center py-2">
                    No deliverables added yet. Add tasks above to designate member responsibilities.
                  </p>
                )}
              </div>

              {/* Actions */}
              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setOpenScheduleModal(false)}
                  className="px-4 py-2.5 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs shadow-xs cursor-pointer flex items-center gap-1.5"
                >
                  <CheckCircle2 className="h-4 w-4" />
                  <span>Confirm Event Schedule</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
