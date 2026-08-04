// app.js (AJAX / REST Client Version for SQLite Backend)

// Global State
const state = {
    content: {},
    rooms: [],
    providers: [],
    bookings: [],
    clients: [],
    activities: [],
    activityEnrollments: [],
    sicknessBlocks: [],
    popupConfig: { active: false, title: "", text: "" },
    bannerConfig: { active: false, text: "" },
    whatsappConfig: { enabled: false, number: "" },
    currentUser: JSON.parse(sessionStorage.getItem("psicarte_user")) || null
};

// Booking Wizard State
let bookingState = {
    step: 1,
    provider: null,
    service: null,
    room: null,
    date: null,
    timeSlot: null,
    startTime: null,
    endTime: null,
    client: { name: "", rut: "", email: "", phone: "" }
};

// Reschedule State
let rescheduleState = {
    bookingId: null,
    providerId: null,
    serviceType: null,
    date: null,
    timeSlot: null,
    startTime: null,
    endTime: null,
    room: null,
    calendarYear: new Date().getFullYear(),
    calendarMonth: new Date().getMonth()
};

// Search method state
let bookingSearchMethod = 'provider';

// Services Section State
let selectedServicesProviderId = null;
let servicesSearchQuery = '';
let selectedServiceType = 'all';
let servicesView = 'cards';

// Calendar Variables
const now = new Date();
let currentYear = now.getFullYear();
let currentMonth = now.getMonth();

// Community Calendar Variables
let activityYear = new Date().getFullYear();
let activityMonth = new Date().getMonth();
let selectedActivityDate = null;
const MONTH_NAMES = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];
