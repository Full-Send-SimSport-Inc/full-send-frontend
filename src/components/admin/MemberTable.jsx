import React from 'react';
import { Link } from 'react-router-dom';
import { format } from 'date-fns';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';

const STATUS_STYLES = {
  active: "bg-green-100 text-green-700 border-green-200",
  pending: "bg-amber-100 text-amber-700 border-amber-200",
  inactive: "bg-red-100 text-red-700 border-red-200"
};

export default function MemberTable({ members }) {
  if (!members?.length) {
    return (
      <div className="text-center py-16 text-muted-foreground">
        No members found.
      </div>
    );
  }

  return (
    <div className="rounded-xl border bg-card overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow className="bg-muted/50">
            <TableHead>Name</TableHead>
            <TableHead className="hidden md:table-cell">Email</TableHead>
            <TableHead className="hidden lg:table-cell">Location</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="hidden sm:table-cell">Joined</TableHead>
            <TableHead className="w-10"></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {members.map(m => (
            <TableRow key={m.id} className="hover:bg-muted/30 cursor-pointer group">
              <TableCell>
                <Link to={`/admin/members/${m.id}`} className="font-medium hover:text-primary transition-colors">
                  {m.first_name} {m.last_name}
                </Link>
                <div className="text-xs text-muted-foreground md:hidden">{m.email}</div>
              </TableCell>
              <TableCell className="hidden md:table-cell text-muted-foreground">{m.email}</TableCell>
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
                <Link to={`/admin/members/${m.id}`}>
                  <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors" />
                </Link>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}