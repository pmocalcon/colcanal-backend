"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SLA_CONFIG = void 0;
exports.isBusinessDay = isBusinessDay;
exports.addBusinessDays = addBusinessDays;
exports.calculateBusinessDaysBetween = calculateBusinessDaysBetween;
exports.calculateSLA = calculateSLA;
exports.getSLAForStatus = getSLAForStatus;
const COLOMBIA_HOLIDAYS_2025 = [
    new Date('2025-01-01'),
    new Date('2025-01-06'),
    new Date('2025-03-24'),
    new Date('2025-04-17'),
    new Date('2025-04-18'),
    new Date('2025-05-01'),
    new Date('2025-06-02'),
    new Date('2025-06-23'),
    new Date('2025-06-30'),
    new Date('2025-07-20'),
    new Date('2025-08-07'),
    new Date('2025-08-18'),
    new Date('2025-10-13'),
    new Date('2025-11-03'),
    new Date('2025-11-17'),
    new Date('2025-12-08'),
    new Date('2025-12-25'),
];
const BUSINESS_START_HOUR = 7;
const BUSINESS_END_HOUR = 19;
const BUSINESS_HOURS_PER_DAY = BUSINESS_END_HOUR - BUSINESS_START_HOUR;
function isBusinessDay(date) {
    const dayOfWeek = date.getDay();
    if (dayOfWeek === 0 || dayOfWeek === 6) {
        return false;
    }
    const dateString = date.toISOString().split('T')[0];
    return !COLOMBIA_HOLIDAYS_2025.some(holiday => holiday.toISOString().split('T')[0] === dateString);
}
function normalizeToBusinessHours(date) {
    const normalized = new Date(date);
    while (!isBusinessDay(normalized)) {
        normalized.setDate(normalized.getDate() + 1);
        normalized.setHours(BUSINESS_START_HOUR, 0, 0, 0);
    }
    const hour = normalized.getHours();
    if (hour < BUSINESS_START_HOUR) {
        normalized.setHours(BUSINESS_START_HOUR, 0, 0, 0);
    }
    else if (hour >= BUSINESS_END_HOUR) {
        normalized.setDate(normalized.getDate() + 1);
        normalized.setHours(BUSINESS_START_HOUR, 0, 0, 0);
        return normalizeToBusinessHours(normalized);
    }
    return normalized;
}
function addBusinessDays(startDate, businessDays) {
    if (businessDays <= 0) {
        return new Date(startDate);
    }
    let current = normalizeToBusinessHours(new Date(startDate));
    let daysAdded = 0;
    while (daysAdded < businessDays) {
        current.setDate(current.getDate() + 1);
        if (isBusinessDay(current)) {
            daysAdded++;
        }
    }
    current.setHours(BUSINESS_END_HOUR, 0, 0, 0);
    return current;
}
function calculateBusinessDaysBetween(startDate, endDate) {
    let current = new Date(startDate);
    const end = new Date(endDate);
    let businessDays = 0;
    current.setHours(0, 0, 0, 0);
    end.setHours(0, 0, 0, 0);
    while (current < end) {
        if (isBusinessDay(current)) {
            businessDays++;
        }
        current.setDate(current.getDate() + 1);
    }
    return businessDays;
}
function calculateSLA(startDate, businessDays) {
    const deadline = addBusinessDays(startDate, businessDays);
    const now = new Date();
    const isOverdue = now > deadline;
    let daysOverdue = 0;
    if (isOverdue) {
        daysOverdue = calculateBusinessDaysBetween(deadline, now);
    }
    return { isOverdue, deadline, daysOverdue };
}
exports.SLA_CONFIG = {
    'pendiente': 1,
    'aprobada_revisor': 1,
    'aprobada_gerencia': 1,
    'cotizada': 3,
    'en_cotizacion': 0,
    'en_orden_compra': 0,
    'pendiente_recepcion': 0,
    'en_recepcion': 0,
    'recepcion_completa': 0,
    'rechazada_revisor': 0,
    'rechazada_gerencia': 0,
};
function getSLAForStatus(statusCode) {
    return exports.SLA_CONFIG[statusCode] || 0;
}
//# sourceMappingURL=business-days.util.js.map