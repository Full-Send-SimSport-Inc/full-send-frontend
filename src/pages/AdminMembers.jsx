import React, { useState, useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Search, Download, Mail, CheckSquare, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';
import MemberTable from '../components/admin/MemberTable';
import { toast } from 'sonner';

export default function AdminMembers() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  
  // Selection State
  const [selectedIds, setSelectedIds] = useState([]);
  const [isUpdating, setIsUpdating] = useState(false);

  const { data: members = [], isLoading } = useQuery({
    queryKey: ['members'],
    queryFn: () => base44.get('/members'),
  });

  const filtered = useMemo(() => {
    return members.filter(m => {
      const matchesSearch = !search || 
        `${m.first_name} ${m.last_name} ${m.email}`.toLowerCase().includes(search.toLowerCase());
      const matchesStatus = statusFilter === 'all' || m.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [members, search, statusFilter]);

  // Bulk Edit Handler
  const handleBulkStatusUpdate = async (newStatus) => {
    if (!selectedIds.length) return;
    
    setIsUpdating(true);
    try {
      // Changed from /members/${id}/status to just /members/${id}
      // This matches standard WordPress REST patterns for updating a resource
      await Promise.all(selectedIds.map(id => 
        base44.post(`/members/${id}`, { status: newStatus })
      ));

      toast.success(`Updated ${selectedIds.length} members to ${newStatus}`);
      queryClient.invalidateQueries(['members']); 
      setSelectedIds([]); 
    } catch (error) {
      console.error("Bulk update failed:", error);
      toast.error("Failed to update some members. Verify the endpoint exists.");
    } finally {
      setIsUpdating(false);
    }
  };

  const exportCSV = () => {
    const headers = ['First Name', 'Last Name', 'Email', 'Phone', 'City', 'State', 'Status', 'Date Joined'];
    const rows = filtered.map(m => [
      m.first_name, m.last_name, m.email, m.phone || '', m.city || '', m.state || '', m.status, new Date(m.created_date).toLocaleDateString()
    ]);
    const csvContent = "data:text/csv;charset=utf-8," 
      + [headers.join(","), ...rows.map(e => e.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "members_export.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      {/* Header Section */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Members</h1>
          <p className="text-muted-foreground">{filtered.length} members shown</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" asChild className="shrink-0">
            <Link to="/admin/email"><Mail className="w-4 h-4 mr-2" /> Send Email</Link>
          </Button>
          <Button variant="outline" onClick={exportCSV} className="shrink-0">
            <Download className="w-4 h-4 mr-2" /> Export CSV
          </Button>
        </div>
      </div>

      {/* Bulk Action Bar - Only shows when items are selected */}
      {selectedIds.length > 0 && (
        <div className="bg-primary/5 border border-primary/20 rounded-lg p-4 flex flex-col sm:flex-row items-center justify-between gap-4 animate-in fade-in slide-in-from-top-2">
          <div className="flex items-center gap-2 text-primary font-medium">
            <CheckSquare className="w-5 h-5" />
            {selectedIds.length} members selected
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground mr-2 text-nowrap">Set status to:</span>
            <Button size="sm" variant="outline" onClick={() => handleBulkStatusUpdate('active')} disabled={isUpdating}>Active</Button>
            <Button size="sm" variant="outline" onClick={() => handleBulkStatusUpdate('pending')} disabled={isUpdating}>Pending</Button>
            <Button size="sm" variant="outline" onClick={() => handleBulkStatusUpdate('inactive')} disabled={isUpdating}>Inactive</Button>
            <Button size="sm" variant="ghost" onClick={() => setSelectedIds([])} className="ml-2 text-muted-foreground">
              <X className="w-4 h-4 mr-1" /> Cancel
            </Button>
          </div>
        </div>
      )}

      {/* Search & Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search by name or email..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-full sm:w-40">
            <SelectValue placeholder="All Statuses" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="inactive">Inactive</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-12">
          <div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
        </div>
      ) : (
        <MemberTable 
          members={filtered} 
          selectedIds={selectedIds} 
          onSelectionChange={setSelectedIds} 
        />
      )}
    </div>
  );
}