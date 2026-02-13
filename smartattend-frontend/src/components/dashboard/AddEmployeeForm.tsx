
import { useState, useRef, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DualModeService } from '@/services/dualModeService';
import { adminService, type BulkUploadResult } from '@/services/adminService';
import { toast } from '@/hooks/use-toast';
import { Loader2, UserPlus, Upload, FileSpreadsheet, Download, CheckCircle2, AlertTriangle, XCircle, X } from 'lucide-react';

interface AddEmployeeFormProps {
  onEmployeeAdded?: () => void;
}

export const AddEmployeeForm = ({ onEmployeeAdded }: AddEmployeeFormProps) => {
  // ── Single employee form ───────────────────────────────────────────
  const [isLoading, setIsLoading] = useState(false);
  const [employeeData, setEmployeeData] = useState({
    name: '',
    email: '',
    password: '',
    role: 'employee'
  });

  // ── CSV upload ─────────────────────────────────────────────────────
  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [csvUploading, setCsvUploading] = useState(false);
  const [csvResult, setCsvResult] = useState<BulkUploadResult | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // ── Single employee submit ─────────────────────────────────────────
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      await DualModeService.register(employeeData);
      toast({ 
        title: 'Employee added successfully!', 
        description: `${employeeData.name} has been added to the system` 
      });
      setEmployeeData({ name: '', email: '', password: '', role: 'employee' });
      onEmployeeAdded?.();
    } catch (error: any) {
      toast({ 
        title: 'Failed to add employee', 
        description: error.message || 'Something went wrong',
        variant: 'destructive'
      });
    } finally {
      setIsLoading(false);
    }
  };

  // ── CSV helpers ────────────────────────────────────────────────────
  const handleFileSelect = useCallback((file: File | undefined) => {
    if (!file) return;
    if (!file.name.toLowerCase().endsWith('.csv')) {
      toast({ title: 'Invalid file', description: 'Please select a .csv file', variant: 'destructive' });
      return;
    }
    setCsvFile(file);
    setCsvResult(null);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    handleFileSelect(e.dataTransfer.files[0]);
  }, [handleFileSelect]);

  const handleCsvUpload = async () => {
    if (!csvFile) return;
    setCsvUploading(true);
    setCsvResult(null);

    try {
      const result = await adminService.bulkUploadEmployees(csvFile);
      setCsvResult(result);

      if (result.summary.created > 0) {
        toast({
          title: `${result.summary.created} employee(s) created!`,
          description: result.summary.skipped > 0 || result.summary.errors > 0
            ? `${result.summary.skipped} skipped, ${result.summary.errors} errors`
            : 'All rows processed successfully',
        });
        onEmployeeAdded?.();
      } else {
        toast({
          title: 'No employees created',
          description: `${result.summary.skipped} skipped, ${result.summary.errors} errors`,
          variant: 'destructive',
        });
      }
    } catch (error: any) {
      toast({
        title: 'CSV upload failed',
        description: error.message || 'Something went wrong',
        variant: 'destructive'
      });
    } finally {
      setCsvUploading(false);
    }
  };

  const handleDownloadTemplate = () => {
    // Generate client-side CSV template (no auth needed)
    const csv = 'name,email,password,role\nJohn Doe,john@example.com,securePass123,employee\nJane Smith,jane@example.com,securePass456,employee\n';
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'employee_template.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  const clearCsvState = () => {
    setCsvFile(null);
    setCsvResult(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  // ── Render ─────────────────────────────────────────────────────────
  return (
    <div className="space-y-6">
      {/* Single Employee Form */}
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <UserPlus className="w-5 h-5" />
          <span>Add New Employee</span>
        </CardTitle>
        <CardDescription>Create a new employee account</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="name">Full Name</Label>
              <Input
                id="name"
                placeholder="Enter full name"
                value={employeeData.name}
                onChange={(e) => setEmployeeData({...employeeData, name: e.target.value})}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="Enter email address"
                value={employeeData.email}
                onChange={(e) => setEmployeeData({...employeeData, email: e.target.value})}
                required
              />
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                placeholder="Create password"
                value={employeeData.password}
                onChange={(e) => setEmployeeData({...employeeData, password: e.target.value})}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="role">Role</Label>
              <Select value={employeeData.role} onValueChange={(value) => setEmployeeData({...employeeData, role: value})}>
                <SelectTrigger>
                  <SelectValue placeholder="Select role" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="employee">Employee</SelectItem>
                  <SelectItem value="admin">Admin</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <Button type="submit" disabled={isLoading} className="w-full md:w-auto">
            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Add Employee
          </Button>
        </form>
      </CardContent>
    </Card>

      {/* CSV Bulk Upload */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center space-x-2">
                <FileSpreadsheet className="w-5 h-5" />
                <span>Bulk Upload via CSV</span>
              </CardTitle>
              <CardDescription className="mt-1">
                Upload a CSV file to add multiple employees at once
              </CardDescription>
            </div>
            <Button variant="outline" size="sm" onClick={handleDownloadTemplate}>
              <Download className="w-4 h-4 mr-2" />
              Download Template
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* CSV format hint */}
          <div className="rounded-md bg-muted/50 p-3 text-sm text-muted-foreground">
            <p className="font-medium text-foreground mb-1">CSV Format</p>
            <p>Required columns: <code className="bg-muted px-1 py-0.5 rounded text-xs">name</code>, <code className="bg-muted px-1 py-0.5 rounded text-xs">email</code>, <code className="bg-muted px-1 py-0.5 rounded text-xs">password</code></p>
            <p>Optional column: <code className="bg-muted px-1 py-0.5 rounded text-xs">role</code> (defaults to <em>employee</em>)</p>
          </div>

          {/* Drop zone */}
          <div
            onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className={`
              relative flex flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed p-8 cursor-pointer transition-colors
              ${dragOver
                ? 'border-primary bg-primary/5'
                : 'border-gray-300 dark:border-gray-600 hover:border-gray-400 dark:hover:border-gray-500'}
            `}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv"
              className="hidden"
              onChange={(e) => handleFileSelect(e.target.files?.[0])}
            />
            <Upload className={`w-8 h-8 ${dragOver ? 'text-primary' : 'text-gray-400'}`} />
            <p className="text-sm text-gray-600 dark:text-gray-400">
              <span className="font-medium text-primary">Click to browse</span> or drag & drop a CSV file
            </p>
            <p className="text-xs text-gray-400">Only .csv files are accepted</p>
          </div>

          {/* Selected file + actions */}
          {csvFile && (
            <div className="flex items-center justify-between rounded-md border p-3">
              <div className="flex items-center gap-3">
                <FileSpreadsheet className="w-5 h-5 text-green-600" />
                <div>
                  <p className="text-sm font-medium">{csvFile.name}</p>
                  <p className="text-xs text-muted-foreground">{(csvFile.size / 1024).toFixed(1)} KB</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  onClick={handleCsvUpload}
                  disabled={csvUploading}
                  size="sm"
                >
                  {csvUploading ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Upload className="mr-2 h-4 w-4" />
                  )}
                  {csvUploading ? 'Uploading…' : 'Upload'}
                </Button>
                <Button variant="ghost" size="sm" onClick={clearCsvState}>
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}

          {/* Upload results */}
          {csvResult && (
            <div className="space-y-3">
              {/* Summary row */}
              <div className="grid grid-cols-3 gap-3">
                <div className="flex items-center gap-2 rounded-md bg-green-50 dark:bg-green-900/20 p-3">
                  <CheckCircle2 className="w-5 h-5 text-green-600" />
                  <div>
                    <p className="text-lg font-bold text-green-700 dark:text-green-400">{csvResult.summary.created}</p>
                    <p className="text-xs text-green-600 dark:text-green-500">Created</p>
                  </div>
                </div>
                <div className="flex items-center gap-2 rounded-md bg-yellow-50 dark:bg-yellow-900/20 p-3">
                  <AlertTriangle className="w-5 h-5 text-yellow-600" />
                  <div>
                    <p className="text-lg font-bold text-yellow-700 dark:text-yellow-400">{csvResult.summary.skipped}</p>
                    <p className="text-xs text-yellow-600 dark:text-yellow-500">Skipped</p>
                  </div>
                </div>
                <div className="flex items-center gap-2 rounded-md bg-red-50 dark:bg-red-900/20 p-3">
                  <XCircle className="w-5 h-5 text-red-600" />
                  <div>
                    <p className="text-lg font-bold text-red-700 dark:text-red-400">{csvResult.summary.errors}</p>
                    <p className="text-xs text-red-600 dark:text-red-500">Errors</p>
                  </div>
                </div>
              </div>

              {/* Created list */}
              {csvResult.created.length > 0 && (
                <details className="rounded-md border p-3">
                  <summary className="cursor-pointer text-sm font-medium text-green-700 dark:text-green-400">
                    {csvResult.created.length} employee(s) created
                  </summary>
                  <ul className="mt-2 space-y-1 text-sm text-muted-foreground">
                    {csvResult.created.map((c) => (
                      <li key={c.row}>Row {c.row}: <span className="font-medium text-foreground">{c.name}</span> ({c.email})</li>
                    ))}
                  </ul>
                </details>
              )}

              {/* Skipped list */}
              {csvResult.skipped.length > 0 && (
                <details className="rounded-md border p-3">
                  <summary className="cursor-pointer text-sm font-medium text-yellow-700 dark:text-yellow-400">
                    {csvResult.skipped.length} row(s) skipped
                  </summary>
                  <ul className="mt-2 space-y-1 text-sm text-muted-foreground">
                    {csvResult.skipped.map((s) => (
                      <li key={s.row}>Row {s.row}: {s.email} — {s.reason}</li>
                    ))}
                  </ul>
                </details>
              )}

              {/* Error list */}
              {csvResult.errors.length > 0 && (
                <details className="rounded-md border p-3" open>
                  <summary className="cursor-pointer text-sm font-medium text-red-700 dark:text-red-400">
                    {csvResult.errors.length} row(s) with errors
                  </summary>
                  <ul className="mt-2 space-y-1 text-sm text-muted-foreground">
                    {csvResult.errors.map((e) => (
                      <li key={e.row}>Row {e.row}: {e.email} — {e.reason}</li>
                    ))}
                  </ul>
                </details>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
