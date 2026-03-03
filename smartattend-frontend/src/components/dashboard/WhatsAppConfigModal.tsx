
import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Loader2, Trash2, Plus, Phone, Clock, Save, Users, Check } from 'lucide-react';
import { adminService, type WhatsAppNumber, type WhatsAppSchedule, type Employee } from '@/services/adminService';
import { toast } from '@/hooks/use-toast';

type ScheduleTimeKey = 'reminder_time' | 'morning_report_time' | 'logoff_reminder_time' | 'evening_report_time' | 'midnight_alert_time';
type ScheduleToggleKey = 'reminder_enabled' | 'morning_report_enabled' | 'logoff_reminder_enabled' | 'evening_report_enabled' | 'midnight_alert_enabled' | 'checkin_alert_enabled' | 'checkout_alert_enabled';

const SCHEDULE_FIELDS: { timeKey: ScheduleTimeKey; toggleKey: ScheduleToggleKey; label: string; description: string }[] = [
    { timeKey: 'reminder_time', toggleKey: 'reminder_enabled', label: '⏰ Attendance Reminder', description: 'Remind absent employees before the morning report' },
    { timeKey: 'morning_report_time', toggleKey: 'morning_report_enabled', label: '📋 Morning Report', description: 'Send login status to admins' },
    { timeKey: 'logoff_reminder_time', toggleKey: 'logoff_reminder_enabled', label: '🏃 Logoff Reminder', description: 'Final nudge before the evening report auto-sends' },
    { timeKey: 'evening_report_time', toggleKey: 'evening_report_enabled', label: '📊 Evening Wrap-Up', description: 'Send EOD summary to admin' },
    { timeKey: 'midnight_alert_time', toggleKey: 'midnight_alert_enabled', label: '🦉 Midnight Alert', description: 'Alert employees still checked in late at night' },
];

const INSTANT_TOGGLES: { key: ScheduleToggleKey; label: string; description: string }[] = [
    { key: 'checkin_alert_enabled', label: '✅ Check-In Alert', description: 'Notify admins on employee check-in' },
    { key: 'checkout_alert_enabled', label: '🚪 Check-Out Alert', description: 'Notify admins on employee check-out' },
];

const DEFAULT_SCHEDULE: WhatsAppSchedule = {
    reminder_time: '10:30',
    morning_report_time: '11:00',
    logoff_reminder_time: '18:45',
    evening_report_time: '19:00',
    midnight_alert_time: '23:00',
    reminder_enabled: true,
    morning_report_enabled: true,
    logoff_reminder_enabled: true,
    evening_report_enabled: true,
    midnight_alert_enabled: true,
    checkin_alert_enabled: true,
    checkout_alert_enabled: true,
};

export const WhatsAppConfigSection = () => {
    // ── Admin numbers state ──
    const [numbers, setNumbers] = useState<WhatsAppNumber[]>([]);
    const [loading, setLoading] = useState(false);
    const [newPhone, setNewPhone] = useState('');
    const [newLabel, setNewLabel] = useState('');
    const [adding, setAdding] = useState(false);
    const [deletingId, setDeletingId] = useState<number | null>(null);

    // ── Schedule state ──
    const [schedule, setSchedule] = useState<WhatsAppSchedule>(DEFAULT_SCHEDULE);
    const [loadingSchedule, setLoadingSchedule] = useState(false);
    const [savingSchedule, setSavingSchedule] = useState(false);

    // ── Employee numbers state ──
    const [employees, setEmployees] = useState<Employee[]>([]);
    const [loadingEmployees, setLoadingEmployees] = useState(false);
    const [editingPhones, setEditingPhones] = useState<Record<number, string>>({});
    const [savingEmpId, setSavingEmpId] = useState<number | null>(null);

    useEffect(() => {
        fetchNumbers();
        fetchSchedule();
        fetchEmployees();
    }, []);

    // ── Admin number handlers ──
    const fetchNumbers = async () => {
        setLoading(true);
        try {
            const data = await adminService.getWhatsAppNumbers();
            setNumbers(data);
        } catch (err: any) {
            toast({ title: 'Error', description: err.message, variant: 'destructive' });
        } finally {
            setLoading(false);
        }
    };

    const fetchSchedule = async () => {
        setLoadingSchedule(true);
        try {
            const data = await adminService.getWhatsAppSchedule();
            setSchedule(data);
        } catch (err: any) {
            console.warn('Failed to load schedule', err);
        } finally {
            setLoadingSchedule(false);
        }
    };

    const fetchEmployees = async () => {
        setLoadingEmployees(true);
        try {
            const data = await adminService.getEmployees();
            setEmployees(data);
            const phones: Record<number, string> = {};
            data.forEach((emp: Employee) => { phones[emp.id] = emp.phone_number || ''; });
            setEditingPhones(phones);
        } catch (err: any) {
            toast({ title: 'Error', description: err.message, variant: 'destructive' });
        } finally {
            setLoadingEmployees(false);
        }
    };

    const handleAdd = async () => {
        if (!newPhone.trim() || !newLabel.trim()) return;
        setAdding(true);
        try {
            await adminService.addWhatsAppNumber(newPhone.trim(), newLabel.trim());
            setNewPhone('');
            setNewLabel('');
            toast({ title: 'Number added' });
            fetchNumbers();
        } catch (err: any) {
            toast({ title: 'Failed', description: err.message, variant: 'destructive' });
        } finally {
            setAdding(false);
        }
    };

    const handleDelete = async (id: number) => {
        setDeletingId(id);
        try {
            await adminService.deleteWhatsAppNumber(id);
            toast({ title: 'Number removed' });
            fetchNumbers();
        } catch (err: any) {
            toast({ title: 'Failed', description: err.message, variant: 'destructive' });
        } finally {
            setDeletingId(null);
        }
    };

    const handleSaveSchedule = async () => {
        setSavingSchedule(true);
        try {
            const updated = await adminService.updateWhatsAppSchedule(schedule);
            setSchedule(updated);
            toast({ title: 'Schedule saved' });
        } catch (err: any) {
            toast({ title: 'Failed', description: err.message, variant: 'destructive' });
        } finally {
            setSavingSchedule(false);
        }
    };

    const updateScheduleTime = (key: ScheduleTimeKey, value: string) => {
        setSchedule(prev => ({ ...prev, [key]: value }));
    };

    const updateScheduleToggle = (key: ScheduleToggleKey, value: boolean) => {
        setSchedule(prev => ({ ...prev, [key]: value }));
    };

    const handleSaveEmployeePhone = async (empId: number) => {
        setSavingEmpId(empId);
        try {
            const result = await adminService.updateEmployeePhone(empId, editingPhones[empId] || '');
            setEmployees(prev => prev.map(e => e.id === empId ? { ...e, phone_number: result.phone_number } : e));
            toast({ title: 'Phone updated', description: `${result.phone_number ? '+' + result.phone_number : 'Cleared'}` });
        } catch (err: any) {
            toast({ title: 'Failed', description: err.message, variant: 'destructive' });
        } finally {
            setSavingEmpId(null);
        }
    };

    return (
        <div className="space-y-6">
            {/* ── Top row: Schedule + Toggles & Admin Numbers side by side ── */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

                {/* ── LEFT: Schedule & Toggles ─────────────────────────── */}
                <Card>
                    <CardHeader className="pb-4">
                        <CardTitle className="flex items-center gap-2 text-lg">
                            <Clock className="w-5 h-5 text-blue-500" />
                            Notification Schedule
                            <span className="text-xs font-normal text-blue-400">(IST)</span>
                        </CardTitle>
                        <CardDescription>Configure when each notification is sent</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-3">
                        {loadingSchedule ? (
                            <div className="flex items-center justify-center py-8">
                                <Loader2 className="w-5 h-5 animate-spin text-gray-400" />
                            </div>
                        ) : (
                            <>
                                {/* Scheduled notifications with time + toggle */}
                                <div className="space-y-2">
                                    {SCHEDULE_FIELDS.map(({ timeKey, toggleKey, label, description }) => (
                                        <div key={timeKey} className="flex items-center gap-3 p-2.5 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900">
                                            <Switch
                                                checked={schedule[toggleKey] as boolean}
                                                onCheckedChange={(checked: boolean) => updateScheduleToggle(toggleKey, checked)}
                                            />
                                            <div className="flex-1 min-w-0">
                                                <p className="text-xs font-medium text-gray-700 dark:text-gray-300">{label}</p>
                                                <p className="text-[11px] text-gray-400 dark:text-gray-500">{description}</p>
                                            </div>
                                            <Input
                                                type="time"
                                                value={schedule[timeKey]}
                                                onChange={(e: React.ChangeEvent<HTMLInputElement>) => updateScheduleTime(timeKey, e.target.value)}
                                                className="w-28 text-sm"
                                                disabled={!schedule[toggleKey]}
                                            />
                                        </div>
                                    ))}
                                </div>

                                {/* Instant alert toggles */}
                                <div className="mt-4 pt-3 border-t border-gray-200 dark:border-gray-700">
                                    <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-2 uppercase tracking-wide">Instant Alerts</p>
                                    <div className="space-y-2">
                                        {INSTANT_TOGGLES.map(({ key, label, description }) => (
                                            <div key={key} className="flex items-center gap-3 p-2.5 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900">
                                                <Switch
                                                    checked={schedule[key] as boolean}
                                                    onCheckedChange={(checked: boolean) => updateScheduleToggle(key, checked)}
                                                />
                                                <div className="flex-1 min-w-0">
                                                    <p className="text-xs font-medium text-gray-700 dark:text-gray-300">{label}</p>
                                                    <p className="text-[11px] text-gray-400 dark:text-gray-500">{description}</p>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                <Button
                                    onClick={handleSaveSchedule}
                                    disabled={savingSchedule}
                                    className="w-full bg-blue-600 hover:bg-blue-700 text-white mt-3"
                                >
                                    {savingSchedule ? (
                                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                    ) : (
                                        <Save className="w-4 h-4 mr-2" />
                                    )}
                                    Save Settings
                                </Button>
                            </>
                        )}
                    </CardContent>
                </Card>

                {/* ── RIGHT: Admin Numbers ─────────────────────────── */}
                <Card>
                    <CardHeader className="pb-4">
                        <CardTitle className="flex items-center gap-2 text-lg">
                            <Phone className="w-5 h-5 text-green-500" />
                            Admin WhatsApp Numbers
                        </CardTitle>
                        <CardDescription>These numbers receive reports and check-in/out alerts</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        {/* Add new number form */}
                        <div className="space-y-3 p-4 rounded-lg border border-dashed border-green-300 dark:border-green-700 bg-green-50/50 dark:bg-green-950/20">
                            <p className="text-sm font-medium text-gray-700 dark:text-gray-300 flex items-center gap-1.5">
                                <Plus className="w-4 h-4" />
                                Add Admin Number
                            </p>
                            <div className="flex flex-col sm:flex-row gap-2">
                                <Input
                                    placeholder="Name *"
                                    value={newLabel}
                                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNewLabel(e.target.value)}
                                    className="flex-1"
                                />
                                <Input
                                    placeholder="919876543210 *"
                                    value={newPhone}
                                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNewPhone(e.target.value)}
                                    className="flex-1"
                                />
                            </div>
                            <Button
                                onClick={handleAdd}
                                disabled={adding || !newPhone.trim() || !newLabel.trim()}
                                className="w-full bg-green-600 hover:bg-green-700 text-white"
                                size="sm"
                            >
                                {adding ? (
                                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                ) : (
                                    <Plus className="w-4 h-4 mr-2" />
                                )}
                                Add Number
                            </Button>
                        </div>

                        {/* Active numbers list */}
                        <div className="space-y-2">
                            <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
                                Active Numbers ({numbers.length})
                            </p>
                            {loading ? (
                                <div className="flex items-center justify-center py-6">
                                    <Loader2 className="w-5 h-5 animate-spin text-gray-400" />
                                </div>
                            ) : numbers.length === 0 ? (
                                <div className="text-center py-6 text-sm text-gray-500 dark:text-gray-400">
                                    <Phone className="w-8 h-8 mx-auto mb-2 text-gray-300 dark:text-gray-600" />
                                    No admin numbers configured yet
                                </div>
                            ) : (
                                <div className="space-y-2 max-h-64 overflow-y-auto">
                                    {numbers.map((entry: WhatsAppNumber) => (
                                        <div
                                            key={entry.id}
                                            className="flex items-center justify-between p-3 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800"
                                        >
                                            <div className="min-w-0">
                                                {entry.label && (
                                                    <p className="text-sm font-medium text-gray-900 dark:text-white truncate">{entry.label}</p>
                                                )}
                                                <p className="text-xs font-mono text-gray-500 dark:text-gray-400 truncate">
                                                    +{entry.phone_number}
                                                </p>
                                            </div>
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                onClick={() => handleDelete(entry.id)}
                                                disabled={deletingId === entry.id}
                                                className="text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20 flex-shrink-0 ml-2"
                                            >
                                                {deletingId === entry.id ? (
                                                    <Loader2 className="w-4 h-4 animate-spin" />
                                                ) : (
                                                    <Trash2 className="w-4 h-4" />
                                                )}
                                            </Button>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* ── Employee Numbers ─────────────────────────────────── */}
            <Card>
                <CardHeader className="pb-4">
                    <CardTitle className="flex items-center gap-2 text-lg">
                        <Users className="w-5 h-5 text-purple-500" />
                        Employee WhatsApp Numbers
                    </CardTitle>
                    <CardDescription>
                        Manage employee phone numbers for reminders, checkout nudges, and midnight alerts
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    {loadingEmployees ? (
                        <div className="flex items-center justify-center py-8">
                            <Loader2 className="w-5 h-5 animate-spin text-gray-400" />
                        </div>
                    ) : employees.length === 0 ? (
                        <div className="text-center py-8 text-sm text-gray-500 dark:text-gray-400">
                            <Users className="w-8 h-8 mx-auto mb-2 text-gray-300 dark:text-gray-600" />
                            No employees found
                        </div>
                    ) : (
                        <div className="space-y-2 max-h-96 overflow-y-auto">
                            {employees.map((emp) => {
                                const currentPhone = editingPhones[emp.id] ?? '';
                                const originalPhone = emp.phone_number || '';
                                const isDirty = currentPhone !== originalPhone;

                                return (
                                    <div
                                        key={emp.id}
                                        className="flex items-center gap-3 p-3 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800"
                                    >
                                        <div className="flex-1 min-w-0">
                                            <p className="text-sm font-medium text-gray-900 dark:text-white truncate">{emp.name}</p>
                                            <p className="text-[11px] text-gray-400 dark:text-gray-500 truncate">{emp.email}</p>
                                        </div>
                                        <div className="flex items-center gap-2 flex-shrink-0">
                                            <Input
                                                placeholder="919876543210"
                                                value={currentPhone}
                                                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                                                    setEditingPhones(prev => ({ ...prev, [emp.id]: e.target.value }))
                                                }
                                                className="w-40 text-sm font-mono"
                                            />
                                            <Button
                                                variant={isDirty ? "default" : "ghost"}
                                                size="sm"
                                                onClick={() => handleSaveEmployeePhone(emp.id)}
                                                disabled={!isDirty || savingEmpId === emp.id}
                                                className={isDirty ? "bg-purple-600 hover:bg-purple-700 text-white" : "text-gray-400"}
                                            >
                                                {savingEmpId === emp.id ? (
                                                    <Loader2 className="w-4 h-4 animate-spin" />
                                                ) : (
                                                    <Check className="w-4 h-4" />
                                                )}
                                            </Button>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}

                    {/* Info banner */}
                    <div className="flex items-center gap-3 rounded-lg bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800 px-4 py-3 mt-4">
                        <p className="text-xs text-purple-700 dark:text-purple-300">
                            💡 Employees can also set their own number in their profile. Numbers entered here by admin take effect immediately.
                        </p>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
};
