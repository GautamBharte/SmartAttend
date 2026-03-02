
import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Loader2, Trash2, Plus, Phone } from 'lucide-react';
import { adminService, type WhatsAppNumber } from '@/services/adminService';
import { toast } from '@/hooks/use-toast';

interface WhatsAppConfigModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

export const WhatsAppConfigModal = ({ open, onOpenChange }: WhatsAppConfigModalProps) => {
    const [numbers, setNumbers] = useState<WhatsAppNumber[]>([]);
    const [loading, setLoading] = useState(false);
    const [adding, setAdding] = useState(false);
    const [newPhone, setNewPhone] = useState('');
    const [newLabel, setNewLabel] = useState('');
    const [deletingId, setDeletingId] = useState<number | null>(null);

    useEffect(() => {
        if (open) fetchNumbers();
    }, [open]);

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

    const handleAdd = async () => {
        const phone = newPhone.trim();
        if (!phone) {
            toast({ title: 'Validation', description: 'Phone number is required', variant: 'destructive' });
            return;
        }
        setAdding(true);
        try {
            await adminService.addWhatsAppNumber(phone, newLabel.trim() || undefined);
            toast({ title: 'Added!', description: `${phone} added to WhatsApp notifications` });
            setNewPhone('');
            setNewLabel('');
            fetchNumbers();
        } catch (err: any) {
            toast({ title: 'Error', description: err.message, variant: 'destructive' });
        } finally {
            setAdding(false);
        }
    };

    const handleDelete = async (id: number) => {
        setDeletingId(id);
        try {
            await adminService.deleteWhatsAppNumber(id);
            toast({ title: 'Removed', description: 'Number removed from WhatsApp notifications' });
            setNumbers(prev => prev.filter(n => n.id !== id));
        } catch (err: any) {
            toast({ title: 'Error', description: err.message, variant: 'destructive' });
        } finally {
            setDeletingId(null);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-lg">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        {/* WhatsApp icon (inline SVG) */}
                        <svg viewBox="0 0 24 24" className="w-5 h-5 text-green-500 fill-current" xmlns="http://www.w3.org/2000/svg">
                            <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
                        </svg>
                        WhatsApp Notifications
                    </DialogTitle>
                    <DialogDescription>
                        Manage phone numbers that receive WhatsApp attendance notifications. Numbers should be in international format (e.g. 919876543210).
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-5 mt-2">
                    {/* Add new number form */}
                    <div className="space-y-3 p-4 rounded-lg border border-dashed border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/30">
                        <p className="text-sm font-medium text-gray-700 dark:text-gray-300 flex items-center gap-1.5">
                            <Plus className="w-4 h-4" />
                            Add New Number
                        </p>
                        <div className="flex flex-col sm:flex-row gap-2">
                            <Input
                                placeholder="919876543210"
                                value={newPhone}
                                onChange={(e) => setNewPhone(e.target.value)}
                                className="flex-1"
                            />
                            <Input
                                placeholder="Label (optional)"
                                value={newLabel}
                                onChange={(e) => setNewLabel(e.target.value)}
                                className="flex-1"
                            />
                        </div>
                        <Button
                            onClick={handleAdd}
                            disabled={adding || !newPhone.trim()}
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

                    {/* Current numbers list */}
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
                                No numbers configured yet
                            </div>
                        ) : (
                            <div className="space-y-2 max-h-64 overflow-y-auto">
                                {numbers.map((entry) => (
                                    <div
                                        key={entry.id}
                                        className="flex items-center justify-between p-3 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800"
                                    >
                                        <div className="min-w-0">
                                            <p className="text-sm font-mono font-medium text-gray-900 dark:text-white truncate">
                                                +{entry.phone_number}
                                            </p>
                                            {entry.label && (
                                                <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{entry.label}</p>
                                            )}
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
                </div>
            </DialogContent>
        </Dialog>
    );
};
