import React from 'react';
import { Link, useNavigate } from 'react-router-dom'; // Added useNavigate
import { format } from 'date-fns';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Checkbox } from '@/components/ui/checkbox';
import { ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';

const STATUS_STYLES = {
  active: "bg-green-100 text-green-700 border-green-200",
  pending: "bg-amber-100 text-amber-700 border-amber-200",
  inactive: "bg-red-100 text-red-700 border-red-200"
};

export default function MemberTable({ members, selectedIds = [], onSelectionChange }) {
  const navigate = useNavigate();

  if (!members?.length) {
    return (
      <div className="text-center py-16 text-muted-foreground">
        No members found.
      </div>
    );
  }

  const allSelected = members.length > 0 && selectedIds.length === members.length;
  
  const handleSelectAll = (checked) => {
    if (checked) {
      onSelectionChange(members.map(m => m.id));
    } else {
      onSelectionChange([]);
    }
  };

  const handleSelectRow = (id, checked) => {
    if (checked) {
      onSelectionChange([...selectedIds, id]);
    } else {
      onSelectionChange(selectedIds.filter(selectedId => selectedId !== id));
    }
  };

  return (
    <div className="rounded-xl border bg-card overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow className="bg-muted/50">
            <TableHead className="w-12">
              <Checkbox 
                checked={allSelected}
                onCheckedChange={handleSelectAll}
                aria-label="Select all members"
              />
            </TableHead>
            <TableHead>Name</TableHead>
            <TableHead className="hidden md:table-cell">Email</TableHead>
            <TableHead className="hidden lg:table-cell">Location</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="hidden sm:table-cell">Joined</TableHead>
            <TableHead className="w-10"></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {members.map(m => {
            const isSelected = selectedIds.includes(m.id);
            return (
              <TableRow 
                key={m.id} 
                className={cn(
                  "hover:bg-muted/30 cursor-pointer group transition-colors",
                  isSelected && "bg-primary/5 hover:bg-primary/10"
                )}
                // Clicking the row now navigates to the detail page
                onClick={() => navigate(`/admin/members/${m.id}`)}
              >
                <TableCell 
                  // CRITICAL: Stop propagation so clicking the checkbox cell 
                  // doesn't trigger the row's navigate()
                  onClick={(e) => e.stopPropagation()}
                >
                  <Checkbox 
                    checked={isSelected}
                    onCheckedChange={(checked) => handleSelectRow(m.id, checked)}
                    aria-label={`Select ${m.first_name}`}
                  />
                </TableCell>
                
                <TableCell>
                  <span className="font-medium group-hover:text-primary transition-colors">
                    {m.first_name} {m.last_name}
                  </span>
                  <div className="text-xs text-muted-foreground md:hidden">{m.email}</div>
                </TableCell>

                <TableCell className="hidden md:table-cell text-muted-foreground">
                  {m.email}
                </TableCell>
                
                <TableCell className="hidden lg:table-cell text-muted-foreground">
                  {[m.city, m.state].filter(Boolean).join(', ') || '—'}
                </TableCell>
                
                <TableCell>
                  <Badge variant="outline" className={cn("text-xs font-medium border", STATUS_STYLES[m.status] || STATUS_STYLES.pending)}>
                    {m.status || 'pending'}
                  </Badge>
                </TableCell>
                
                <TableCell className="hidden sm:table-cell text-muted-foreground text-sm">
                  {m.created_date ? format(new Date(m.created_date), 'dd MMM yyyy') : '—'}
                </TableCell>
                
                <TableCell>
                  <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors" />
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}